const { v4: uuidv4 } = require('uuid');
const Dinero = require('dinero.js');
const Joi = require('joi');
const DB = require('../../loaders/database-loader').loadDB();
const utilities = require('../../../handlers/utilities');
const MaterialLogic = require('./material-logic');
const { mapAsync } = require('../../../utilities/mapAsync');
const priceUtilities = require('../../../utilities/price-utility');
const weightUtility = require('../../../utilities/weight-utility');

const regradesCollection = process.env.REGRADES_TABLE || 'hulk_smash-yard1-Regrades';
const materialsCollection = process.env.MATERIALS_TABLE;
const materialTypesCollection = process.env.MATERIAL_TYPES_TABLE;

class RegradesLogic {
  static async getById(id) {
    const collection = regradesCollection;
    const regrade = await DB.getById(collection, id);
    this.deleteKeysFromRegrade(regrade);
    return regrade;
  }

  // default status is AVAILABLE, sortDescending
  static async getRegradesByStatus(archive, sortDescending) {
    const collection = regradesCollection;
    const index = 'GSI1';
    // archive is the status
    if (archive === undefined || archive === null) {
      // eslint-disable-next-line no-param-reassign
      archive = false;
    }

    // default sort newest regrade to oldest
    if (sortDescending === undefined || sortDescending === null) {
      // eslint-disable-next-line no-param-reassign
      sortDescending = true;
    }

    const queryObj = DB.newIndexQueryObj(collection, index, 'GSI1PK', archive.toString(), sortDescending);
    const regrades = await DB.queryIndex(queryObj);
    for (let i = 0; i < regrades.Items.length; i++) {
      this.deleteKeysFromRegrade(regrades.Items[ i ]);
    }
    return regrades;
  }

  // create regrade
  // 1. validate DTO
  // 2. validate there is enough from material to do this regrade
  // 3. validate toMaterials have valid materialTypeId
  // 4. validate from material is greater than or equal to to material weight
  // 5. Select from materials, the materials we'll consume. This creates the material Items
  // 6. Create to materials, the materials being created. Creates the material Items
  // 7. Create TRASH material
  // 8. Create Regrade PutItem object
  // 9. Save Transaction
  static async create(regradeDTO, userId) {
    try {
      const ddbTransactionArr = [];

      const result = this.schema.validate(regradeDTO);
      if (result.error) {
        throw result.error;
      }

      const fromMaterials =
          await MaterialLogic.getWIPMaterialsOrderedOldestToNewest(regradeDTO.fromMaterial.materialTypeId);

      console.trace(`RegradesLogic.create FROM Materials ${ JSON.stringify(fromMaterials) }`);

      const wipMaterialWeight = MaterialLogic.getNetWeightSumFromMaterials(fromMaterials);

      console.trace(`RegradesLogic.create fromMaterialWeight ${ wipMaterialWeight }`);

      // validate there is enough weight of this material to regrade
      const regradeFromWeight = regradeDTO.fromMaterial.weight;

      this.validateFromMaterial(wipMaterialWeight, regradeFromWeight);

      console.trace('RegradesLogic.create validated from material');

      const { toMaterials } = regradeDTO;
      // validate the materialTypeIds provided are valid
      await this.validateToMaterials(toMaterials);

      console.trace('RegradesLogic.create validated to materialTypeIds');

      const toMaterialsWeight = this.getToMaterialsSum(toMaterials);

      if (toMaterialsWeight > regradeFromWeight) {
        // eslint-disable-next-line max-len
        const msg = `regrade failed total from material type weight ${ regradeFromWeight } lbs is less than total to 
        weight ${ toMaterialsWeight }`;
        console.error(`RegradesLogic.create ${ msg }`);
        throw new Error(msg);
      }

      const {
        netValue,
        selectedFromMaterials,
      } = this.selectFromMaterialsForRegrade(fromMaterials, regradeFromWeight, userId);

      console.trace(`RegradesLogic.create netValue ${ netValue.toFormat() }`);
      console.trace(`RegradesLogic.create Selected FROM Materials ${ JSON.stringify(selectedFromMaterials) }`);

      const selectedFromMaterialsDdbPutItems = selectedFromMaterials.map(m => DB.createPutDynamoDbObject(m,
        materialsCollection));

      ddbTransactionArr.push(...selectedFromMaterialsDdbPutItems);

      const newToMaterials = await this.createDBToMaterials(toMaterials, toMaterialsWeight, netValue, userId);

      const newToMaterialsDdbPutItems = newToMaterials.map(m => DB.createPutDynamoDbObject(m, materialsCollection));

      ddbTransactionArr.push(...newToMaterialsDdbPutItems);

      if (regradeFromWeight > toMaterialsWeight) {
        //    add REGRADE_WASTE material
        const regradeWasteWeight = regradeFromWeight - toMaterialsWeight;
        const regradeWaste = this.getRegradeWasteObj(regradeWasteWeight);

        const regradeWasteMaterial = await MaterialLogic.createMaterialDynamoObject(regradeWaste,
          utilities.getDefaultOrganizationInfoWithUserId(userId));

        newToMaterials.push(regradeWasteMaterial);

        const regradeWasteMaterialPutItem = DB.createPutDynamoDbObject(regradeWasteMaterial, materialsCollection);
        ddbTransactionArr.push(regradeWasteMaterialPutItem);
      }

      const date = Date.now();

      const newRegrade = {
        fromMaterial: regradeDTO.fromMaterial,
        toMaterial: regradeDTO.toMaterials,
        fromMaterials: selectedFromMaterials,
        toMaterials: newToMaterials,
        id: uuidv4(),
        archive: false,
        date,
        userId,
        GSI1PK: false.toString(),
        GSI1SK: date,
      };

      const regradesPutItemObject = DB.createPutDynamoDbObject(newRegrade, regradesCollection);
      ddbTransactionArr.push(regradesPutItemObject);

      await DB.writeItemsArrayWithTransaction(ddbTransactionArr);

      this.deleteKeysFromRegrade(newRegrade);
      return newRegrade;
    } catch (error) {
      console.log('RegradesLogic.create Error Input');
      console.trace(JSON.stringify(regradeDTO));
      console.error(error.message, JSON.stringify(error.stack));
      throw error;
    }
  }

  // query for materials by status = WIP and from material type id
  // throws error if there isn't enough weight of the material type in inventory
  // returns array of materials in WIP status sorted oldest to newest
  static validateFromMaterial(total, regradeFromWeight) {
    // JOI validation weight should be positive
    if (total < regradeFromWeight) {
      const msg = `regrade failed not enough material in WIP from weight: ${ regradeFromWeight } lbs WIP weight: 
      ${ total } lbs`;
      console.error(`RegradesLogic.validateFromMaterial ${ msg }`);
      throw new Error(msg);
    }
  }

  // query material types, make sure the id's exist
  static async validateToMaterials(toMaterials) {
    const results = await mapAsync(toMaterials, mat => DB.getById(materialTypesCollection, mat.materialTypeId));
    results.forEach(materialType => {
      if (utilities.isEmpty(materialType)) {
        const msg = 'regrade failed invalid material type id provided';
        console.error(`RegradesLogic.validateToMaterial ${ msg }`);
        throw new Error(msg);
      }
    });
  }

  // SUM FUNCTIONS
  static getToMaterialsSum(toMaterials) {
    return toMaterials.reduce((prev, current) => prev + current.weight, 0);
  }

  // DATABASE FUNCTIONS

  // fromMaterials should be ordered oldest to newest
  // weight is the regrade weight
  // returns array of material Items
  // { netValue: 123, selectedFromMaterials: []}
  static selectFromMaterialsForRegrade(fromMaterials, regradeFromWeight, userId) {
    let remainingRegradeFromWeight = regradeFromWeight;

    const selectedMaterials = [];
    let netValue = priceUtilities.getDineroValueFuncFromNumber(0);

    let finished = false;

    for (let i = 0; i < fromMaterials.length; i++) {
      if (remainingRegradeFromWeight === 0) {
        break;
      }

      const material = fromMaterials[ i ];
      const fromMaterialNetWeight = material.weightAndPrice.netWeight.amount;

      const weightAndPrice = {
        ...material.weightAndPrice,
      };

      if (remainingRegradeFromWeight >= fromMaterialNetWeight) {
        // use all of this material for regrade - change status to REGRADE, netValue to 0

        const status = {
          value: 'REGRADE',
          date: Date.now(),
          userId,
        };

        material.status = status;
        material.statusHistory.push(status);

        // update GSI2
        material.GSI2PK = `REGRADE#${ material.materialTypeId }`;

        // use all of this material
        weightAndPrice.netWeight = weightUtility.getWeightSchema(0, 'lb');

        netValue = netValue.add(Dinero(weightAndPrice.netValue));
        // update weight and price net value to 0
        const netValueObj = priceUtilities.getValueFromNumber(0);
        const netPriceObj = priceUtilities.getPriceFromValueJSONAndWeight(netValueObj, 0);

        weightAndPrice.netValue = netValueObj;
        weightAndPrice.netPrice = netPriceObj;

        remainingRegradeFromWeight -= fromMaterialNetWeight;
      } else {
        // use some of this material
        // new netValue of this partial material will be old net value * (newWeight / oldWeight)
        const fromMaterialNewWeight = fromMaterialNetWeight - remainingRegradeFromWeight;
        weightAndPrice.netWeight = weightUtility.getWeightSchema(fromMaterialNewWeight, 'lb');

        const fromMaterialCurrentNetValue = Dinero(weightAndPrice.netValue);
        const fromMaterialNewNetValue = this.getNetValueForNewToMaterial(fromMaterialNewWeight, fromMaterialNetWeight,
          weightAndPrice.netValue);

        weightAndPrice.netValue = priceUtilities.getValueFromNumber(fromMaterialNewNetValue.getAmount(),
          fromMaterialNewNetValue.getPrecision());

        const transferredNetValue = fromMaterialCurrentNetValue.subtract(fromMaterialNewNetValue);
        netValue = netValue.add(transferredNetValue);

        // price per pound should be the same
        finished = true;
      }

      material.weightAndPrice = weightAndPrice;
      material.weightAndPriceHistory.push(weightAndPrice);
      selectedMaterials.push(material);

      if (finished) {
        break;
      }
    }
    return {
      netValue,
      selectedFromMaterials: selectedMaterials,
    };
  }

  static getNetValueForNewToMaterial(materialWeight, totalWeight, netValue) {
    let result = Dinero(netValue);
    result = result.multiply(materialWeight);
    result = result.divide(totalWeight);
    return result;
  }

  // returns array of material Items
  static async createDBToMaterials(toMaterials, toMaterialsWeight, netValue, userId) {
    return mapAsync(toMaterials, material => {
      const materialWeight = material.weight;
      const materialNetValue = this.getNetValueForNewToMaterial(materialWeight, toMaterialsWeight, netValue.toJSON());

      const materialNetValueSchema = priceUtilities.getValueFromNumber(materialNetValue.getAmount(),
        materialNetValue.getPrecision());
      const materialNetPriceSchema = priceUtilities.getPriceFromValueJSONAndWeight(materialNetValueSchema,
        materialWeight);

      const toMaterial = {
        materialTypeId: material.materialTypeId,
        status: {
          value: 'WIP',
        },
        weightAndPrice: {
          netWeight: {
            amount: materialWeight,
            units: 'lbs',
          },
          netPrice: materialNetPriceSchema,
          netValue: materialNetValueSchema,
        },
      };
      return MaterialLogic.createMaterialDynamoObject(toMaterial,
        utilities.getDefaultOrganizationInfoWithUserId(userId));
    });
  }

  // material status obj
  static getStatusObj(statusValue, userId) {
    return {
      value: statusValue,
      date: Date.now(),
      userId,
    };
  }

  static getRegradeWasteObj(regradeWasteWeight) {
    return {
      materialTypeId: 'WASTE',
      status: {
        value: 'REGRADE',
      },
      weightAndPrice: {
        netWeight: {
          amount: regradeWasteWeight,
          units: 'lb',
          commonString: `${ regradeWasteWeight } lbs`,
        },
      },
    };
  }

  /* eslint-disable no-param-reassign */
  static deleteKeysFromRegrade(regrade) {
    delete regrade.GSI1PK;
    delete regrade.GSI1SK;
  }
}

const materialTypeAndWeightDTOSchema = Joi.object({
  materialTypeId: Joi.string().required(),
  weight: Joi.number().positive().required(),
});

RegradesLogic.schema = Joi.object({
  id: Joi.string(),
  fromMaterial: materialTypeAndWeightDTOSchema.required(),
  toMaterials: Joi.array().items(materialTypeAndWeightDTOSchema).required(),
  date: Joi.number(),
  userId: Joi.string(),
  notes: Joi.array().items(Joi.object()),
});

module.exports = RegradesLogic;

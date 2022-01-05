const _ = require('lodash');
const uuid = require('uuid');
const { v4: uuidv4 } = require('uuid');
const DB = require('../../loaders/database-loader').loadDB();
const validate = require('../../validations/material-validation');
const { isEmpty } = require('../../../handlers/utilities');
const MaterialTypeLogic = require('./material-type-logic');
const priceUtility = require('../../../utilities/price-utility');
const weightUtility = require('../../../utilities/weight-utility');
const FinishedGoodsLogic = require('./finished-goods');

const STATES = {
  CREATED: 'CREATED',
  SWIP: 'SWIP',
  WIP: 'WIP',
  FINISHEDGOOD: 'FINISHEDGOOD',
  PACKINGLIST: 'PACKINGLIST',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
};

const materialsTable = process.env.MATERIALS_TABLE;
const finishedGoodsTable = process.env.FINISHED_GOOD_TABLE || 'hulk_smash-yard1-FinishedGoods';

class MaterialLogic {
  static async fetchMaterialsByIds(materialIds) {
    return DB.fetchItemsByIds(materialIds, materialsTable);
  }

  static async fetchAll(queryParams, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Materials`;
    return DB.get(collection, queryParams.sort, queryParams.filter, queryParams.page,
      queryParams.pageSize, queryParams.fromKey);
  }

  // eslint-disable-next-line no-unused-vars
  static async fetch(id, organizationInfo) {
    console.log('material logic fetch...');
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Materials`;
    return DB.getById(collection, id);
  }

  static async create(material, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Materials`;

    const newMaterial = await this.createMaterialDynamoObject(material, organizationInfo);

    const result = validate.Validate(newMaterial);
    if (result.error) {
      throw result.error;
    }

    return DB.create(collection, newMaterial);
  }

  static async update(material, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Materials`;

    const updatedMaterial = await this.createMaterialDynamoObject(material, organizationInfo);

    updatedMaterial.statusHistory = material.statusHistory || [];

    // TODO refactor history hack
    // don't add status to history if it's the same as the last status
    if (updatedMaterial.statusHistory.length > 0) {
      const lastStatus = updatedMaterial.statusHistory[ updatedMaterial.statusHistory.length - 1 ];

      if (updatedMaterial.status.value !== lastStatus.value) {
        updatedMaterial.statusHistory.push({ ...updatedMaterial.status });
      }
    }

    updatedMaterial.weightAndPriceHistory = material.weightAndPriceHistory || [];
    updatedMaterial.weightAndPriceHistory.push(_.cloneDeep(updatedMaterial.weightAndPrice));

    const result = validate.Validate(updatedMaterial);
    if (result.error) {
      throw result.error;
    }

    // see if material price has changed
    const originalMaterial = await this.fetch(updatedMaterial.id, organizationInfo);

    if (originalMaterial.weightAndPrice.netValue !== updatedMaterial.weightAndPrice.netValue) {
      if (updatedMaterial.hasOwnProperty('finishedGoodId')) {
      // update finished good net value
        const finishedGood = await this.getFinishedGoodWithUpdateValue(updatedMaterial);

        const finishedGoodPutItem = FinishedGoodsLogic.createFinishedGoodPutItemObject(finishedGood);

        const materialPutItem = this.createMaterialPutItemObject(updatedMaterial);

        await DB.writeItemsArrayWithTransaction([ finishedGoodPutItem, materialPutItem ]);

        return updatedMaterial;
      }
    }

    return DB.update(collection, updatedMaterial);
  }

  static async archive(id, organizationInfo) {
    console.log(`Attempting to archive material ${ id }`);
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Materials`;
    const material = await this.fetch(id, organizationInfo);
    if (material.status?.value === STATES.ARCHIVED) {
      throw new Error(`Material ${ material.id } is already ${ STATES.ARCHIVED }`);
    }
    if (material.finishedGoodId) {
      throw new Error(`Cannot archive material ${ id }. It is in a finished good.`);
    }
    const materialToSave = await this.createMaterialDynamoObject({
      ...material,
      archive: true,
      status: { value: STATES.ARCHIVED },
    }, organizationInfo);
    // TODO refactor history hack
    materialToSave.statusHistory = [ ...material.statusHistory, materialToSave.status ];
    materialToSave.weightAndPriceHistory = [ ...material.weightAndPriceHistory, materialToSave.weightAndPrice ];
    console.log(`Archiving material ${ id }`);
    console.trace('Archiving material', JSON.stringify(materialToSave));
    await DB.update(collection, materialToSave);
  }

  // getFinishedGoodWithUpdateValue - returns finished good with
  static async getFinishedGoodWithUpdateValue(updatedMaterial) {
    const finishedGood = await DB.getById(finishedGoodsTable, updatedMaterial.finishedGoodId);

    let materials = await this.fetchMaterialsByIds(finishedGood.materialIds);

    //  remove the updated original material from materials
    materials = materials.filter(m => m.id !== updatedMaterial.id);
    // add the updated material in
    materials.push(updatedMaterial);

    const newNetValue = this.getNetValueSumFromMaterials(materials);

    finishedGood.netValue = newNetValue;

    const materialsWeight = this.getNetWeightSumFromMaterials(materials);

    finishedGood.weight.net = materialsWeight;

    finishedGood.averageCost = priceUtility.getPriceFromValueJSONAndWeight(finishedGood.netValue,
      finishedGood.weight.net);

    return finishedGood;
  }

  static async createMaterialDynamoObject(material, organizationInfo) {
    const date = Date.now();
    const newMaterial = { ...material, archive: material.archive || false };

    if (!newMaterial.hasOwnProperty('materialTypeId') || !newMaterial.materialTypeId) {
      console.error('material type id required');
      throw new Error('materialTypeId is required');
    }

    const materialType = await MaterialTypeLogic.fetch(newMaterial.materialTypeId, organizationInfo);
    if (isEmpty(materialType)) {
      console.error(`materialType not found for materialTypeId ${ newMaterial.materialTypeId }`);
      throw new Error(`materialType not found for materialTypeId ${ newMaterial.materialTypeId }`);
    }

    newMaterial.materialType = materialType;

    if (!material.hasOwnProperty('id')) {
      newMaterial.id = uuid.v4();
    }

    newMaterial.status = {
      date,
      value: newMaterial.status?.value || STATES.CREATED,
      userId: organizationInfo.userId,
    };

    // Fix prices
    if (newMaterial.weightAndPrice && newMaterial.weightAndPrice.netPrice && newMaterial.weightAndPrice.netValue) {
      let precision = newMaterial.weightAndPrice.netPrice.precision || 0;
      newMaterial.weightAndPrice.netPrice =
                priceUtility.getValueFromNumber(newMaterial.weightAndPrice.netPrice.amount, precision);
      precision = newMaterial.weightAndPrice.netValue.precision || 0;
      newMaterial.weightAndPrice.netValue =
                priceUtility.getValueFromNumber(newMaterial.weightAndPrice.netValue.amount, precision);
    }
    // query all materials by status order by date created
    newMaterial.GSI1PK = newMaterial.status.value;

    // TODO - update shouldn't set date again
    newMaterial.GSI1SK = date;

    // query by status and material type id order by date created
    newMaterial.GSI2PK = `${ newMaterial.status.value }#${ newMaterial.materialTypeId }`;
    // TODO - update shouldn't set date again
    newMaterial.GSI2SK = date;

    newMaterial.statusHistory = []; // TODO refactor
    newMaterial.statusHistory.push({ ...newMaterial.status });
    newMaterial.weightAndPriceHistory = []; // TODO refactor
    newMaterial.weightAndPriceHistory.push(_.cloneDeep(newMaterial.weightAndPrice));
    return newMaterial;
  }

  /* eslint-disable no-param-reassign */
  static setIndexesOnMaterial(material, date) {
    material.GSI1PK = material.status.value;
    material.GSI2PK = `${ material.status.value }#${ material.materialTypeId }`;

    if (date) {
      material.GSI1SK = date;
      material.GSI2SK = date;
    }
  }

  // set status on material
  // add status to status history if it's a new status
  /* eslint-disable no-param-reassign */
  static setStatusOnMaterial(material, status, userId) {
    try {
      if (!userId) {
        throw new Error('MaterialLogic.setMaterialStatus userId is required');
      }

      if (!STATES[ status ]) {
        throw new Error(`MaterialLogic.setMaterialStatus status unknown ${ status }`);
      }

      material.status = {
        value: status,
        userId,
        date: Date.now(),
      };

      if (!material.statusHistory) {
        material.statusHistory = [];
      }
      // add status to status history
      // don't add status to history if it's the same as the last status
      if (material.statusHistory.length > 0) {
        const lastStatus = material.statusHistory[ material.statusHistory.length - 1 ];

        if (material.status.value !== lastStatus.value) {
          material.statusHistory.push({ ...material.status });
        }
      } else {
        material.statusHistory.push({ ...material.status });
      }

      this.setIndexesOnMaterial(material);
    } catch (err) {
      console.error('MaterialLogic.setStatusOnMaterial', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  // weight is a number, netValue
  static getWeightAndPriceSchemaFromNetWeightAndNetValueObjects(netWeightObj, netValueObj) {
    try {
      const tareObj = weightUtility.getWeightSchema(0, 'lbs');
      const netPriceObj = priceUtility.getPriceFromValueJSONAndWeight(netValueObj, netWeightObj.amount);

      return {
        gross: netWeightObj,
        tare: tareObj,
        netWeight: netWeightObj,
        netValue: netValueObj,
        netPrice: netPriceObj,
        deductions: [],
      };
    } catch (err) {
      console.error('MaterialLogic.getWeightAndPriceSchemaFromNetWeightAndNetValueObjects', err.message,
        JSON.stringify(err.stack));
      throw err;
    }
  }

  static getNetValueSumFromMaterials(materials) {
    const zeroNetValue = priceUtility.getValueFromNumber(0);
    return materials.reduce((sum, m) => priceUtility.addTwoJSONValues(m.weightAndPrice.netValue, sum), zeroNetValue);
  }

  static getNetWeightSumFromMaterials(materials) {
    if (!materials || materials.length === 0) {
      return 0;
    }
    return materials.reduce((sum, m) => sum + m.weightAndPrice.netWeight.amount, 0);
  }

  static createMaterialPutItemObject(material) {
    return DB.createPutDynamoDbObject(material, materialsTable);
  }

  static getStates() {
    return STATES;
  }

  // selectMaterialsForTargetWeight - selects materials to equal netWeight, sets selected material status
  // creates partial materials with new status
  // returns
  // {
  //         selectedMaterials,
  //         netValue,
  //         averageCost,
  //       };
  static async selectMaterialsForTargetWeight(materials, netWeight, newMaterialStatus, userId) {
    try {
      let targetWeight = netWeight;

      let netValue = priceUtility.getValueFromNumber(0);

      const selectedMaterials = [];

      for (let i = 0; i < materials.length; i++) {
        if (targetWeight === 0) {
          break;
        }

        const material = materials[ i ];
        const materialWeight = material.weightAndPrice.netWeight.amount;

        let addedNetValue = null;

        if (materialWeight <= targetWeight) {
          //  use all of this material
          MaterialLogic.setStatusOnMaterial(material, newMaterialStatus, userId);

          selectedMaterials.push(material);

          targetWeight -= materialWeight;

          addedNetValue = material.weightAndPrice.netValue;
        } else {
          //  use some of this material
          const newMaterialWeight = targetWeight;
          const currentMaterialWeight = materialWeight - targetWeight;
          targetWeight = 0;

          let newMaterial = this.getMaterialWithNewWeight(material, newMaterialWeight);
          newMaterial.id = uuidv4();

          newMaterial = this.setMaterialStatusAndResetHistories(newMaterial, newMaterialStatus, userId);

          selectedMaterials.push(newMaterial);

          addedNetValue = newMaterial.weightAndPrice.netValue;

          // current material, leave status, update weight and net value
          const currentMaterial = this.getMaterialWithNewWeight(material, currentMaterialWeight);

          selectedMaterials.push(currentMaterial);
        }

        //  add up net value - netValue is JSON
        netValue = priceUtility.addTwoJSONValues(netValue, addedNetValue);
      }

      const averageCost = priceUtility.getPriceFromValueJSONAndWeight(netValue, netWeight);

      return {
        selectedMaterials,
        netValue,
        averageCost,
      };
    } catch (err) {
      console.error('MaterialLogic.selectMaterialsFromWipMaterials', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static async getWIPMaterialsOrderedOldestToNewest(materialTypeId) {
    //  query materials by GSI2
    const statusAndMaterialTypeId = `WIP#${ materialTypeId }`;

    const queryObj = DB.newIndexQueryObj(materialsTable, 'GSI2', 'GSI2PK', statusAndMaterialTypeId, false);

    const materials = await DB.queryIndex(queryObj);
    return materials.Items;
  }

  // returns new material with new netWeight and netValue
  static getMaterialWithNewWeight(material, newWeight) {
    const newMaterial = _.cloneDeep(material);

    const weightObj = weightUtility.getWeightSchema(newWeight, 'lbs');
    const weightFraction = newWeight / material.weightAndPrice.netWeight.amount;
    const netValue = priceUtility.getValueFromValueJSONAndMultiplier(material.weightAndPrice.netValue,
      weightFraction);

    const weightAndPrice = MaterialLogic.getWeightAndPriceSchemaFromNetWeightAndNetValueObjects(
      weightObj, netValue
    );

    newMaterial.weightAndPrice = weightAndPrice;
    newMaterial.weightAndPriceHistory.push(weightAndPrice);
    return newMaterial;
  }

  /* eslint-disable no-param-reassign */
  static setMaterialStatusAndResetHistories(material, status, userId) {
    material.weightAndPriceHistory = [ material.weightAndPrice ];
    // reset status history
    material.statusHistory = [];
    MaterialLogic.setStatusOnMaterial(material, status, userId);
    MaterialLogic.setIndexesOnMaterial(material, Date.now());
    return material;
  }
}

module.exports = MaterialLogic;

const uuid = require('uuid');
const Joi = require('joi');
const _ = require('lodash');
const { loadDB } = require('../../loaders/database-loader');
const MaterialTypeLogic = require('./material-type-logic');
const MaterialLogic = require('./material-logic');
const priceUtility = require('../../../utilities/price-utility');
const DB = require('../../models/dynamodb/dynamo-db');
const { generateTag } = require('../../../utilities/generateTag');

const db = loadDB();
const collection = process.env.FINISHED_GOOD_TABLE || 'hulk_smash-yard1-FinishedGoods';
const materialsCollection = process.env.MATERIALS_TABLE || 'hulk_smash-yard1-Materials';

const statuses = [ 'AVAILABLE', 'UNAVAILABLE', 'VOID' ];

const AVAILABLE = 'AVAILABLE';
const UNAVAILABLE = 'UNAVAILABLE';
const VOID = 'VOID';
const FINISHEDGOOD = 'FINISHEDGOOD';
const WIP = 'WIP';

class FinishedGoodLogic {
  // returns new finished good with net weight
  static setFinishedGoodNetWeight(finishedGood, weight) {
    const newFinishedGood = _.cloneDeep(finishedGood);
    newFinishedGood.weight.net = weight;
    return newFinishedGood;
  }

  static setFinishedGoodsStatus(finishedGoods, status, userId) {
    return finishedGoods.map(fg => FinishedGoodLogic.setFinishedGoodStatus(fg, status, userId));
  }

  // setFinishedGoodStatus - returns new finished good with status
  static setFinishedGoodStatus(finishedGood, status, userId) {
    if (!userId) {
      throw new Error('FinishedGoodLogic.setFinishedGoodStatus userId is required');
    }

    if (!statuses.includes(status)) {
      throw new Error(`FinishedGoodLogic.setFinishedGoodStatus status unknown ${ status }`);
    }

    return {
      ...finishedGood,
      status: {
        value: status,
        userId,
        date: Date.now(),
      },
      statusHashKey: status,
    };
  }

  static async fetchAll(sort, filter = { key: 'statusHashKey', value: AVAILABLE }, page,
    pageSize, fromKey) {
    const result = await db.get(collection, sort, filter, page, pageSize, fromKey);
    return {
      ...result,
      Items: result.Items.map(fg => this.removeInternalFields(fg)),
    };
  }

  static async fetch(id) {
    const finishedGood = await db.getById(collection, id);
    return this.removeInternalFields(finishedGood);
  }

  static async create(finishedGood, userId) {
    try {
      console.trace('FINISHED GOOD:', JSON.stringify(finishedGood));

      const now = Date.now();
      const status = AVAILABLE;

      const fg = {
        ...finishedGood,
        id: uuid.v4(),
        tag: generateTag(),
        status: {
          value: status,
          date: now,
          userId,
        },
        statusHashKey: status,
        dateRangeKey: now,
      };

      const { error } = this.schema.validate(fg);
      if (error) {
        console.error('VALIDATION ERROR:', error.message);
        throw error;
      }

      const finishedGoodAndMaterialsToSave = await this.selectMaterialsForFinishedGood(fg, userId);

      return this.saveFinishedGoodAndMaterialsReturnFinishedGood(finishedGoodAndMaterialsToSave);
    } catch (err) {
      console.error('FinishedGoodsLogic.create', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static async update(finishedGoodDTO, orgInfo) {
    try {
      const finishedGoodToSave = { ...finishedGoodDTO };

      const { error } = this.schema.validate(finishedGoodToSave);
      if (error) {
        console.error('VALIDATION ERROR:', error.message);
        throw error;
      }

      const originalFinishedGood = await db.getById(collection, finishedGoodDTO.id);
      this.validateUpdate(originalFinishedGood, finishedGoodDTO);

      let materialType;
      if (!originalFinishedGood.hasOwnProperty('materialType')) {
        materialType = await MaterialTypeLogic.fetch(originalFinishedGood.materialTypeId, orgInfo);
      } else {
        materialType = originalFinishedGood.materialType;
      }

      finishedGoodToSave.materialType = materialType;
      finishedGoodToSave.tag = originalFinishedGood.tag;
      finishedGoodToSave.status = originalFinishedGood.status;
      finishedGoodToSave.statusHashKey = originalFinishedGood.statusHashKey;
      finishedGoodToSave.dateRangeKey = originalFinishedGood.dateRangeKey;

      finishedGoodToSave.materialIds = originalFinishedGood.materialIds;
      finishedGoodToSave.netValue = originalFinishedGood.netValue;

      const finishedGoodNetWeight = finishedGoodDTO.weight.net;
      const originalFinishedGoodNetWeight = originalFinishedGood.weight.net;

      if (originalFinishedGoodNetWeight > finishedGoodNetWeight) {
        // remove material from finished good
        const weightToRemove = originalFinishedGoodNetWeight - finishedGoodNetWeight;

        const finishedGoodAndMaterialsToSave = await this.removeWeightFromFinishedGood(finishedGoodToSave,
          weightToRemove, orgInfo);

        return this.saveFinishedGoodAndMaterialsReturnFinishedGood(finishedGoodAndMaterialsToSave);
      }

      if (originalFinishedGoodNetWeight < finishedGoodNetWeight) {
        // need to add WIP material to finished good
        const weightToAdd = finishedGoodNetWeight - originalFinishedGoodNetWeight;

        const finishedGoodAndMaterialsToSave = await this.addWeightToFinishedGood(finishedGoodToSave, weightToAdd,
          orgInfo);

        return this.saveFinishedGoodAndMaterialsReturnFinishedGood(finishedGoodAndMaterialsToSave);
      }
      //  not adding or subtracting weight doing nothing
      return this.removeInternalFields(finishedGoodToSave);
    } catch (err) {
      console.error('FinishedGoodsLogic.update', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static async void(id, userId) {
    try {
      if (!id) {
        throw new Error('Finished good ID not specified!');
      }
      const finishedGood = await db.getById(collection, id);
      if (!finishedGood || !finishedGood.id) {
        throw new Error(`Finished good ${ id } not found!`);
      }

      const materials = await MaterialLogic.fetchMaterialsByIds(finishedGood.materialIds);
      const materialsToSave = materials.map(material => {
        const wipMaterial = _.cloneDeep(material);
        MaterialLogic.setStatusOnMaterial(wipMaterial, WIP, userId);
        return wipMaterial;
      });

      const status = VOID;
      const date = Date.now();

      const finishedGoodToSave = {
        ...finishedGood,
        status: {
          value: status,
          date,
          userId,
        },
        statusHashKey: status,
        dateRangeKey: date,
      };

      return this.saveFinishedGoodAndMaterialsReturnFinishedGood({
        finishedGood: finishedGoodToSave,
        materials: materialsToSave,
      });
    } catch (err) {
      console.error('FinishedGoodsLogic.void', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static validateUpdate(originalFinishedGood, updatedFinishedGood) {
    if (!originalFinishedGood || !originalFinishedGood.id) {
      throw new Error(`Finished good ${ updatedFinishedGood.id } not found!`);
    }

    if (originalFinishedGood.materialTypeId !== updatedFinishedGood.materialTypeId) {
      throw new Error('Update Finished good error can\'t change material type');
    }

    if (originalFinishedGood.status.value === UNAVAILABLE || originalFinishedGood.status.value === VOID) {
      throw new Error('Cannot update UNAVAILABLE or VOID finished good');
    }

    // can't update status through api
    // only through VOID or create packing list
    if (updatedFinishedGood.status && originalFinishedGood.status.value !== updatedFinishedGood.status.value) {
      throw new Error('Finished good status can only be updated by creating packing list or voiding finished good');
    }
  }

  // add finishedGoodId to material that is changing status from wip to finished good
  /* eslint-disable no-param-reassign */
  static setFinishedGoodIdOnMaterials(materials, finishedGoodId) {
    const newMaterials = materials.map(m => {
      if (m.status.value === FINISHEDGOOD) {
        m.finishedGoodId = finishedGoodId;
      }
      return m;
    });
    return newMaterials;
  }

  /* eslint-disable no-param-reassign */
  /**
   * remove finishedGoodId from material that is changing status from finished good to wip
   * @param materials
   * @returns {*}
   */
  static unsetFinishedGoodIdOnMaterials(materials) {
    const newMaterials = materials.map(m => {
      if (m.status.value === WIP) {
        delete m.finishedGoodId;
      }
      return m;
    });
    return newMaterials;
  }

  /**
   * selectMaterialsForRemoveWeightFromFinishedGood
   * @param materials
   * @param netWeight
   * @param status
   * @param userId
   * @returns {Promise<{netValue: *, selectedMaterials: [], averageCost: {[p: string]: *}}>}
   */
  static async selectMaterialsForRemoveWeightFromFinishedGood(materials, netWeight, status, userId) {
    const result = await MaterialLogic.selectMaterialsForTargetWeight(materials, netWeight, status, userId);
    result.selectedMaterials = this.unsetFinishedGoodIdOnMaterials(result.selectedMaterials);
    return result;
  }

  static getMaterialIdsWithFinishedGoodStatus(materials) {
    return materials.filter(m => m.status.value === FINISHEDGOOD).map(m => m.id);
  }

  /**
   *
   * @param wipMaterials
   * @param netWeight
   * @param status
   * @param finishedGoodId
   * @param userId
   * @returns {Promise<{netValue: *, selectedMaterials: [], averageCost: {[p: string]: *}}>}
   */
  static async selectMaterialsForCreateFinishedGood(wipMaterials, netWeight, status, finishedGoodId, userId) {
    const result = await MaterialLogic.selectMaterialsForTargetWeight(wipMaterials, netWeight, FINISHEDGOOD, userId);
    result.selectedMaterials = this.setFinishedGoodIdOnMaterials(result.selectedMaterials, finishedGoodId);
    return result;
  }

  /**
   * selectMaterialsForFinishedGood
   * selects materials based on finishedGood.netWeight
   * returns finishedGood with updated netValue, averageCost, and materialIds
   * also returns array of materials to be saved
   * @param finishedGood
   * @param userId
   * @returns {Promise<{materials: [], finishedGood: *}>}
   */
  static async selectMaterialsForFinishedGood(finishedGood, userId) {
    try {
      const wipMaterials = await MaterialLogic.getWIPMaterialsOrderedOldestToNewest(finishedGood.materialTypeId);

      const wipMaterialsWeight = MaterialLogic.getNetWeightSumFromMaterials(wipMaterials);

      if (finishedGood.weight.net > wipMaterialsWeight) {
        const msg = 'not enough WIP material to create this finished good';
        console.error(msg);
        throw new Error(msg);
      }

      const selectedMaterials = await this.selectMaterialsForCreateFinishedGood(wipMaterials, finishedGood.weight.net,
        FINISHEDGOOD, finishedGood.id, userId);

      const finishedGoodToSave = _.cloneDeep(finishedGood);

      finishedGoodToSave.netValue = selectedMaterials.netValue;
      finishedGoodToSave.averageCost = selectedMaterials.averageCost;

      finishedGoodToSave.materialIds = this.getMaterialIdsWithFinishedGoodStatus(selectedMaterials.selectedMaterials);

      return {
        finishedGood: finishedGoodToSave,
        materials: selectedMaterials.selectedMaterials,
      };
    } catch (err) {
      console.error('FinishedGoodsLogic.selectMaterialsForFinishedGoods', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  /**
   * removeWeightFromFinishedGood returns finished good and materials to be saved
   * @param finishedGoodToSave
   * @param weightToRemove
   * @param orgInfo
   * @returns {Promise<{materials: [], finishedGood}>}
   */
  static async removeWeightFromFinishedGood(finishedGoodToSave, weightToRemove, orgInfo) {
    const originalMaterials = await MaterialLogic.fetchMaterialsByIds(finishedGoodToSave.materialIds);

    // material set to WIP to remove weight or partial material left in finished good status and new wip
    // material created
    const removedMaterials = await this.selectMaterialsForRemoveWeightFromFinishedGood(originalMaterials,
      weightToRemove, WIP, orgInfo.userId);

    const newWipMaterialIds = removedMaterials.selectedMaterials.filter(m => m.status.value === WIP).map(m =>
      m.id);

    const finishedGoodMaterialIds = this.getMaterialIdsWithFinishedGoodStatus(removedMaterials.selectedMaterials);
    // de dupe materialIds - material on finished good
    finishedGoodToSave.materialIds = _.union(finishedGoodToSave.materialIds, finishedGoodMaterialIds);
    // remove WIP material ids
    finishedGoodToSave.materialIds = finishedGoodToSave.materialIds.filter(id => !newWipMaterialIds.includes(id));

    // newNetValue = original net value  - removed material net value
    const newNetValue = priceUtility.subtractSecondJSONValueFromFirst(finishedGoodToSave.netValue,
      removedMaterials.netValue);
    finishedGoodToSave.netValue = newNetValue;

    return {
      finishedGood: finishedGoodToSave,
      materials: removedMaterials.selectedMaterials,
    };
  }

  /**
   * addWeightToFinishedGood
   * 1. create new finished good with weight to add (finishedGoodWithWeightToAdd)
   * 2. select materials for finishedGoodWithWeightToAdd
   * 3. combine original finished good with finishedGoodWithWeightToAdd
   * 4. update net weight on finished good - gross and tare weight are not combined
   * @param finishedGood
   * @param weightToAdd
   * @param orgInfo
   * @returns {Promise<{materials: [], finishedGood}>}
   */
  static async addWeightToFinishedGood(finishedGood, weightToAdd, orgInfo) {
    let finishedGoodWithWeightToAdd = _.cloneDeep(finishedGood);
    finishedGoodWithWeightToAdd = this.setFinishedGoodNetWeight(finishedGoodWithWeightToAdd, weightToAdd);

    const addedMaterialsAndFinishedGood = await this.selectMaterialsForFinishedGood(finishedGoodWithWeightToAdd,
      orgInfo.userId);
    finishedGoodWithWeightToAdd = addedMaterialsAndFinishedGood.finishedGood;

    const newMaterialIds = this.getMaterialIdsWithFinishedGoodStatus(addedMaterialsAndFinishedGood.materials);

    finishedGood.materialIds = _.union(finishedGood.materialIds, newMaterialIds);

    finishedGood.netValue = priceUtility.addTwoJSONValues(finishedGood.netValue, finishedGoodWithWeightToAdd.netValue);

    return {
      finishedGood,
      materials: addedMaterialsAndFinishedGood.materials,
    };
  }

  static removeInternalFields(fg) {
    return { ...fg, statusHashKey: undefined, dateRangeKey: undefined };
  }

  /**
   * saveFinishedGoodAndMaterialsReturnFinishedGood helper method used by create, update
   * saves finished good and materials. Returns finished good without internal fields
   * @param {finishedGood: {}, materials: []} finishedGoodAndMaterialsToSave
   * @returns {Promise<*&{finishedGood}>}
   */
  static async saveFinishedGoodAndMaterialsReturnFinishedGood(finishedGoodAndMaterialsToSave) {
    const finishedGoodToSave = finishedGoodAndMaterialsToSave.finishedGood;
    const materialsToSave = finishedGoodAndMaterialsToSave.materials;

    const items = this.getPutItemsArrayOfFinishedGoodAndMaterials(finishedGoodToSave, materialsToSave);
    await this.saveFinishedGoodAndMaterials(items);

    return this.removeInternalFields(finishedGoodToSave);
  }

  // FINISHED GOOD DYNAMO DB FUNCTIONS
  static getPutItemsArrayOfFinishedGoods(finishedGoods) {
    return db.getPutItemsArray(finishedGoods, collection);
  }

  static getPutItemsArrayOfFinishedGoodAndMaterials(finishedGood, materials) {
    let ddbTransactionArr = [];

    if (materials && materials.length > 0) {
      ddbTransactionArr = materials.map(m => DB.createPutDynamoDbObject(m,
        materialsCollection));
    }

    if (finishedGood) {
      ddbTransactionArr.push(DB.createPutDynamoDbObject(finishedGood, collection));
    }
    return ddbTransactionArr;
  }

  static async saveFinishedGoodAndMaterials(ddbTransactionArr) {
    try {
      if (ddbTransactionArr.length === 0) {
        return;
      }

      await DB.writeItemsArrayWithTransaction(ddbTransactionArr);
    } catch (err) {
      console.error('FinishedGoodsLogic.saveFinishedGoodsAndPackingList', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static async fetchFinishedGoodsByIds(finishedGoodsIds) {
    return DB.fetchItemsByIds(finishedGoodsIds, collection);
  }

  static createFinishedGoodPutItemObject(finishedGood) {
    return db.createPutDynamoDbObject(finishedGood, collection);
  }

  static getUpdateStatusFinishedGoodsArray(ids, status) {
    return ids.map(id => DB.createUpdateStatusDynamoDbObject(id, status, collection));
  }

  static getNetWeightSumOfFinishedGoods(finishedGoods) {
    if (!finishedGoods || finishedGoods.length === 0) {
      return 0;
    }

    return finishedGoods.reduce((sum, fg) => sum + fg.weight.net, 0);
  }

  static getDistinctMaterialTypeCodesFromFinishedGoods(finishedGoods) {
    const materialTypeCodeSet = new Set();
    finishedGoods.forEach(fg => {
      materialTypeCodeSet.add(fg.materialType.code);
    });

    const array = [ ...materialTypeCodeSet ];

    return array;
  }
}

FinishedGoodLogic.schema = Joi.object({
  id: Joi.string().uuid().required(),
  tag: Joi.string().min(8).max(8).required(),
  materialTypeId: Joi.string().required(),
  materialType: Joi.any(),
  materialIds: Joi.array().items(Joi.string().uuid()),
  type: Joi.allow('BALE', 'BOX', 'PALLET', 'OTHER').only().required(),
  weight: Joi.object({
    gross: Joi.number().not(0).required(),
    net: Joi.number().not(0).required(),
    tare: Joi.number(),
    units: Joi.string().required(), // TODO enumerate options
  }).required(),
  averageCost: Joi.object(),
  netValue: Joi.object(),
  status: Joi.object({
    value: Joi.allow('AVAILABLE', 'UNAVAILABLE', 'VOID').only().required(),
    date: Joi.date().timestamp('unix').required(),
    userId: Joi.string().required(),
  }).required(),
  statusHashKey: Joi.allow('AVAILABLE', 'UNAVAILABLE', 'VOID').only(),
  dateRangeKey: Joi.date().timestamp('unix'),
  notes: Joi.array().items(Joi.object()),
});

module.exports = FinishedGoodLogic;

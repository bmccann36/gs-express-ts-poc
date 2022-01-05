const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');
const DB = require('../../loaders/database-loader').loadDB();
const Validate = require('./validate');
const utilities = require('../../../handlers/utilities');
const FinishedGoodLogic = require('./finished-goods');
const { mapAsync } = require('../../../utilities/mapAsync');
const MaterialTypeLogic = require('./material-type-logic');
const { generateTag } = require('../../../utilities/generateTag');

const finishedGoodsTable = process.env.FINISHED_GOOD_TABLE || 'FinishedGoods';
const collection = process.env.PACKING_LISTS_TABLE || 'PackingLists';

const AVAILABLE = 'AVAILABLE';
const UNAVAILABLE = 'UNAVAILABLE';
// const SHIPPED = 'SHIPPED';
const VOID = 'VOID';

class PackingListLogic {
  static async fetchPackingListsByIds(ids) {
    return DB.fetchItemsByIds(ids, collection);
  }

  static async getById(id) {
    try {
      const packingList = await DB.getById(collection, id);
      this.deleteKeysFromPackingList(packingList);
      return packingList;
    } catch (err) {
      console.error('PackingListLogic.getById', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static async getPackingListsByStatus(status, sortDescending, fromKey) {
    try {
      const index = 'GSI1';

      const statusOrNew = status || 'AVAILABLE';

      const queryObj = DB.newIndexQueryObj(collection, index, 'GSI1PK', statusOrNew, sortDescending,
        fromKey);
      const packingLists = await DB.queryIndex(queryObj);

      for (let i = 0; i < packingLists.Items.length; i++) {
        this.deleteKeysFromPackingList(packingLists.Items[ i ]);
      }
      return packingLists;
    } catch (err) {
      console.error('PackingListLogic.getPackingListsByStatus', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static async create(packingList, organizationInfo) {
    try {
      const createdDate = Date.now();
      const status = 'AVAILABLE';
      const msg = Validate.getValidationErrors(Validate.PACKING_LIST_CREATE_VALIDATION_RULES, packingList);

      if (msg) {
        throw new Error(`create packing list errors ${ msg }`);
      }

      const newPackingList = {
        ...packingList,
        id: uuidv4(),
        tag: generateTag(),
        createdDate,
        updatedDate: createdDate,
        status,
        GSI1PK: status,
        GSI1SK: createdDate.toString(),
      };

      const finishedGoods = await this.getFinishedGoodsAddedToCreatePackingList(packingList.finishedGoodsIds,
        newPackingList.id, organizationInfo.userId);

      newPackingList.finishedGoods = await this.convertFinishedGoodsToObj(finishedGoods, organizationInfo);

      await this.saveFinishedGoodsAndPackingList(finishedGoods, newPackingList);

      this.deleteKeysFromPackingList(newPackingList);
      return newPackingList;
    } catch (error) {
      console.log('create packing list error');
      console.log(error);
      throw error;
    }
  }

  static async updatePackingList(packingList, organizationInfo) {
    try {
      const msg = Validate.getValidationErrors(Validate.PACKING_LIST_UPDATE_VALIDATION_RULES, packingList);
      if (msg) {
        throw new Error(`update packing list errors ${ msg }`);
      }

      // need to get original record
      const item = await this.getById(packingList.id, organizationInfo);

      if (utilities.isEmpty(item)) {
        throw new Error(`update packing list id ${ packingList.id } doesn't exist`);
      }

      const originalPackingList = item;

      const updatedDate = Date.now();

      const updatedPackingList = {
        ...packingList,
        createdDate: originalPackingList.createdDate,
        updatedDate,
        GSI1PK: packingList.status,
        GSI1SK: updatedDate.toString(),
      };

      // can't update the tag
      updatedPackingList.tag = originalPackingList.tag;

      // removed finished goods - update status to available, remove packingListId
      // added finished goods - update status to unavailable, add packingListId

      const currentFinishedGoodsIds = originalPackingList.finishedGoodsIds;
      const newFinishedGoodsIds = packingList.finishedGoodsIds;

      const addedFinishedGoodsIds = this.getItemsInArr1AndNotInArr2(newFinishedGoodsIds, currentFinishedGoodsIds);
      let addedFinishedGoods = [];
      if (addedFinishedGoodsIds.length > 0) {
        addedFinishedGoods = await this.getFinishedGoodsAddedToCreatePackingList(addedFinishedGoodsIds, packingList.id,
          organizationInfo.userId);

        updatedPackingList.finishedGoods = await this.convertFinishedGoodsToObj(addedFinishedGoods, organizationInfo);
      }

      const removedFinishedGoodsIds = this.getItemsInArr1AndNotInArr2(currentFinishedGoodsIds, newFinishedGoodsIds);
      let removedFinishedGoods = [];
      if (removedFinishedGoodsIds.length > 0) {
        removedFinishedGoods = await this.getFinishedGoodsRemovedFromPackingList(removedFinishedGoodsIds,
          organizationInfo.userId);
      }

      const finishedGoods = addedFinishedGoods.concat(removedFinishedGoods);

      await this.saveFinishedGoodsAndPackingList(finishedGoods, updatedPackingList);

      this.deleteKeysFromPackingList(updatedPackingList);
      return updatedPackingList;
    } catch (err) {
      console.error('PackingListLogic.updatePackingList', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static async void(id, userId) {
    try {
      if (!id) {
        throw new Error('Packing List ID not specified!');
      }
      const packingList = await DB.getById(collection, id);
      if (!packingList || !packingList.id) {
        throw new Error(`Packing list ${ id } not found!`);
      }

      const finishedGoods = await FinishedGoodLogic.fetchFinishedGoodsByIds(packingList.finishedGoodsIds);

      const finishedGoodsToSave = FinishedGoodLogic.setFinishedGoodsStatus(finishedGoods, AVAILABLE, userId);

      const status = VOID;

      const now = Date.now();

      const packingListToSave = {
        ...packingList,
        status,
        updatedDate: now,
        GSI1PK: status,
        GSI1SK: now,
      };

      let ddbTransactionArr = [];

      const packingListPutItem = DB.createPutDynamoDbObject(packingListToSave, collection);
      ddbTransactionArr.push(packingListPutItem);

      const finishedGoodsPutItems = FinishedGoodLogic.getPutItemsArrayOfFinishedGoods(finishedGoodsToSave);
      ddbTransactionArr = _.concat(ddbTransactionArr, finishedGoodsPutItems);

      return DB.writeItemsArrayWithTransaction(ddbTransactionArr);
    } catch (err) {
      console.error('PackingListLogic.void', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static async getFinishedGoodsAddedToCreatePackingList(finishedGoodsIds, packingListId, userId) {
    try {
      let finishedGoods = await FinishedGoodLogic.fetchFinishedGoodsByIds(finishedGoodsIds);
      this.validateFinishedGoods(finishedGoods, finishedGoodsIds);

      finishedGoods = this.setFinishedGoodsToUnavailable(finishedGoods, userId);
      finishedGoods = this.addPackingListIdToFinishedGoods(finishedGoods, packingListId);
      return finishedGoods;
    } catch (err) {
      console.error('PackingListLogic.getFinishedGoodsAddedToCreatePackingList', err.message,
        JSON.stringify(err.stack));
      throw err;
    }
  }

  static async getFinishedGoodsRemovedFromPackingList(finishedGoodsIds, userId) {
    let finishedGoods = await FinishedGoodLogic.fetchFinishedGoodsByIds(finishedGoodsIds);
    finishedGoods = FinishedGoodLogic.setFinishedGoodsStatus(finishedGoods, AVAILABLE, userId);
    finishedGoods = this.removePackingListIdFromFinishedGoods(finishedGoods);
    return finishedGoods;
  }

  // validateFinishedGoods - finishedGoodsIds matches finishedGoods from db. All finished goods are AVAILABLE
  static validateFinishedGoods(finishedGoods, finishedGoodsIds) {
    if (finishedGoods.length !== finishedGoodsIds.length) {
      const foundFinishedGoodsIds = finishedGoods.map(finishedGood => finishedGood.id);

      const notFoundFinishedGoodsIds = finishedGoodsIds.filter(id => !foundFinishedGoodsIds.includes(id));
      const msg = `finishedGoodsIds not found${ notFoundFinishedGoodsIds.join() }`;
      console.error(`PackingListLogic.getFinishedGoods ${ msg }`);
      throw new Error(msg);
    }

    finishedGoods.forEach(fg => {
      if (fg.status.value !== 'AVAILABLE') {
        throw new Error('PackingListLogic.getFinishedGoods finished good status must be AVAILABLE');
      }
    });
  }

  static setFinishedGoodsToUnavailable(finishedGoods, userId) {
    return finishedGoods.map(fg => FinishedGoodLogic.setFinishedGoodStatus(fg, UNAVAILABLE, userId));
  }

  static addPackingListIdToFinishedGoods(finishedGoods, packingListId) {
    return finishedGoods.map(fg => ({
      ...fg,
      packingListId,
    }));
  }

  // array of finishedGoodsId, materialType
  static async convertFinishedGoodsToObj(finishedGoods, organizationInfo) {
    try {
      const finishedGoodsIdsMaterialTypes = await mapAsync(finishedGoods, async finishedGood => {
        let materialType;

        if (finishedGood.hasOwnProperty('materialType')) {
          materialType = finishedGood.materialType;
        } else {
          const { materialTypeId } = finishedGood;

          materialType = await MaterialTypeLogic.fetch(materialTypeId, organizationInfo);
        }

        return {
          finishedGoodId: finishedGood.id,
          materialType,
        };
      });

      return finishedGoodsIdsMaterialTypes;
    } catch (err) {
      console.error('PackingListLogic.convertFinishedGoodsToObj', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  /* eslint-disable no-param-reassign */
  static removePackingListIdFromFinishedGoods(finishedGoods) {
    finishedGoods.forEach(fg => {
      delete fg.packingListId;
    });
    return finishedGoods;
  }

  static getItemsInArr1AndNotInArr2(arr1, arr2) {
    return arr1.filter(a1 => !arr2.includes(a1));
  }

  static async saveFinishedGoodsAndPackingList(finishedGoods, packingList) {
    try {
      const ddbTransactionArr = finishedGoods.map(finishedGood => DB.createPutDynamoDbObject(finishedGood,
        finishedGoodsTable));
      ddbTransactionArr.push(DB.createPutDynamoDbObject(packingList, collection));

      // should consider if this ddbTransactionArr is greater than 25
      return DB.writeItemsArrayWithTransaction(ddbTransactionArr);
    } catch (err) {
      console.error('PackingListLogic.saveFinishedGoodsAndPackingList', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  // validatePackingListIds exist. return packingLists.
  // returns array of packing lists or throws error if packingListIds are not found
  static async validatePackingListIdsExist(packingListIds) {
    const packingLists = await PackingListLogic.fetchPackingListsByIds(packingListIds);
    // validate length is the same

    if (packingLists.length !== packingListIds.length) {
      throw new Error("invalid packing list id's provided");
    }
    return packingLists;
  }

  // getUpdatePackingListArray - get array of dynamodb UpdateItem objects to be used in transaction
  static getUpdateStatusPackingListArray(ids, status) {
    return ids.map(id => DB.createUpdateStatusDynamoDbObject(id, status, collection));
  }

  static setStatusOnPackingList(packingList, status) {
    const copy = _.cloneDeep(packingList);
    copy.status = status;
    copy.GSI1PK = status;
    return copy;
  }

  static getPutItemsArrayOfPackingLists(packingLists) {
    return DB.getPutItemsArray(packingLists, collection);
  }

  /* eslint-disable no-param-reassign */
  static deleteKeysFromPackingList(packingList) {
    delete packingList.GSI1PK;
    delete packingList.GSI1SK;
  }
}

module.exports = PackingListLogic;

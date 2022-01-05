const { v4: uuidv4 } = require('uuid');
const DB = require('../../loaders/database-loader').loadDB();
const PriceEntryLogic = require('./price-entry-logic');
const Validate = require('./validate');

class priceSheetLogic {
  static async fetchAll( queryParams, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceSheets`;
    const sheetList = await DB.get(collection, queryParams.sort, queryParams.filter, queryParams.page,
      queryParams.pageSize, queryParams.fromKey);
    if (sheetList.resultsReturned === 0) {
      return sheetList;
    }
    const sheets = sheetList.Items;
    const entries = await PriceEntryLogic.fetchAll({}, organizationInfo);
    sheetList.Items = Object.keys(sheets).map(key => {
      const sheet = sheets[ key ];
      return {
        ...sheet,
        entriesObj: entries.Items.filter(el => el.priceSheetId === sheet.id),
      };
    });
    return sheetList;
  }

  static async fetch( priceSheetId, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceSheets`;
    const commodityCollection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Commodities`;
    const priceSheet = await DB.getById(collection, priceSheetId);
    if (Validate.isValidResource(priceSheet)) {
      return {
        ...priceSheet,
        commodity: await DB.getById(commodityCollection, priceSheet.commodityId),
      };
    }
    return {};
  }

  static async create( priceSheet, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceSheets`;
    const newPriceSheet = { ...priceSheet, id: uuidv4(), archive: false };
    return DB.create(collection, newPriceSheet);
  }

  static async update( priceSheet, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceSheets`;
    const payload = await DB.getById(collection, priceSheet.id);
    if (Validate.isValidResource(payload)) {
      return (DB.update(collection, priceSheet));
    }
    return {};
  }

  static async fetchAllIds( organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceSheets`;
    const elements = await DB.get(collection, {});
    return Object.values(elements).map(element => element.id);
  }

  static async batchArchive( ids, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceSheets`;
    return DB.batchArchive(collection, ids);
  }

  static async batchCreate( elements, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceSheets`;
    return DB.batchCreate(collection, elements);
  }
}

module.exports = priceSheetLogic;

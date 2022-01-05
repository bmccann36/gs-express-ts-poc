const { v4: uuidv4 } = require('uuid');
const DB = require('../../loaders/database-loader').loadDB();

class CommodityLogic {
  static async fetchAll(queryParams, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Commodities`;
    return DB.get(collection, queryParams.sort, queryParams.filter, queryParams.page,
      queryParams.pageSize, queryParams.fromKey);
  }

  static async fetch(id, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Commodities`;
    return DB.getById(collection, id);
  }

  static async create(commodity, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Commodities`;
    const newCommodity = { ...commodity, id: commodity.id === undefined ? uuidv4() : commodity.id, archive: false };
    return DB.create(collection, newCommodity);
  }

  static async update(commodity, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Commodities`;
    return DB.update(collection, commodity);
  }
}
module.exports = CommodityLogic;

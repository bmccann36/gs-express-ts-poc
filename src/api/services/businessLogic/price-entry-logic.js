const { v4: uuidv4 } = require('uuid');
const DB = require('../../loaders/database-loader').loadDB();
const MaterialTypeLogic = require('./material-type-logic');
const BenchmarkLogic = require('./benchmark-logic');
const validate = require('./validate');

class priceEntryLogic {
  static async fetchAll(queryParams, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceEntries`;
    const entryList = await DB.get(collection, queryParams.sort, queryParams.filter, queryParams.page,
      queryParams.pageSize, queryParams.fromKey);
    const entries = entryList.Items;
    const benchmarks = await BenchmarkLogic.fetchAll({ pageSize: queryParams.pageSize }, organizationInfo);
    const materialTypes = await MaterialTypeLogic.fetchAll({ pageSize: queryParams.pageSize },
      organizationInfo);
    entryList.Items = Object.keys(entries).map(key => {
      const entry = entries[ key ];
      return {
        ...entry,
        benchmark: benchmarks.Items.find(el => el.id === entry.benchmarkId),
        materialTypes: materialTypes.Items.find(el => el.id === entry.materialTypeId),
      };
    });
    return entryList;
  }

  static async priceEntryFetch(priceEntryId, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceEntries`;
    const entry = await DB.getById(collection, priceEntryId);
    if (!validate.isValidResource(entry, 'id')) {
      return entry;
    }
    const benchmark = (entry.benchmarkId) ?
      await BenchmarkLogic.fetch(entry.benchmarkId, organizationInfo) : null;
    const material = await MaterialTypeLogic.fetch(entry.materialId, organizationInfo);
    return {
      ...entry,
      benchmark,
      material,
    };
  }

  static async priceEntryCreate(priceEntry, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceEntries`;
    const newPriceEntry = { ...priceEntry, id: uuidv4(), archive: false };
    return DB.create(collection, newPriceEntry);
  }

  static async priceEntryUpdate(priceEntry, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceEntries`;
    return DB.update(collection, priceEntry);
  }

  static async fetchAllIds(organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceEntries`;
    const elements = await DB.get(collection, {});
    return Object.values(elements).map(element => element.id);
  }

  static async batchArchive(ids, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceEntries`;
    return DB.batchArchive(collection, ids);
  }

  static async batchCreate(elements, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-PriceEntries`;
    return DB.batchCreate(collection, elements);
  }
}

module.exports = priceEntryLogic;

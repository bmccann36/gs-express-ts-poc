const { v4: uuidv4 } = require('uuid');
const DB = require('../../loaders/database-loader').loadDB();
const validate = require('./validate');

class MaterialTypeLogic {
  static async fetchAll(queryParams, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-MaterialTypes`;
    const commoditiesCollection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Commodities`;

    const meta = await DB.get(collection, queryParams.sort, queryParams.filter, queryParams.page,
      queryParams.pageSize, queryParams.fromKey);
    const materials = meta.Items;
    const commodities = await DB.get(commoditiesCollection, {}, {}, 1, 100);
    const Items = Object.keys(materials).map(key => {
      const material = materials[ key ];
      return {
        ...material,
        commodity: commodities.Items.find(el => el.id === material.commodityId),
      };
    });
    return { ...meta, Items };
  }

  static async fetch( materialId, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-MaterialTypes`;
    const commoditiesCollection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Commodities`;
    const material = await DB.getById(collection, materialId);
    if (validate.isValidResource(material, 'id')) {
      return {
        ...material,
        commodity: await DB.getById(commoditiesCollection, material.commodityId),
      };
    }
    return {};
  }

  static async create( material, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-MaterialTypes`;
    const newMaterial = { ...material, id: material.id === undefined ? uuidv4() : material.id, archive: false };
    await DB.create(collection, newMaterial);
    return newMaterial;
  }

  static async update( material, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-MaterialTypes`;
    const payload = await DB.getById(collection, material.id);
    if (validate.isValidResource(payload, 'id')) {
      return DB.update(collection, material);
    }
    return {};
  }

  static async batchCreate( elements, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-MaterialTypes`;
    return DB.batchCreate(collection, elements);
  }

  static batchArchive( ids, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-MaterialTypes`;
    return DB.batchArchive(collection, ids);
  }
}

module.exports = MaterialTypeLogic;

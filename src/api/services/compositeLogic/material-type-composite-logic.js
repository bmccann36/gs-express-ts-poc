const csv = require('fast-csv');
const { v4: uuidv4 } = require('uuid');
const MaterialTypeLogic = require('../businessLogic/material-type-logic');
const CommodityLogic = require('../businessLogic/commodity-logic');
const Validate = require('../businessLogic/validate');

async function processCommodities( entries, organizationInfo ) {
  const existingCommodities = await CommodityLogic.fetchAll({}, organizationInfo);
  const result = [];
  for (const commodity of entries) {
    const tmp = existingCommodities.Items.find(el => el.name === commodity.name);
    if (!tmp) {
      // eslint-disable-next-line no-await-in-loop
      result.push(await CommodityLogic.create(commodity, organizationInfo));
    } else {
      result.push(tmp);
    }
  }
  return result;
}

/**
 * Rules:
 * If missing values then invalid
 * If Two rows have the came commodity code but different names or types invalid
 * */
function isValidationErrorInCommodities( dictionary ) {
  for (let i = 0; i < dictionary.length; i++) {
    const msg = Validate.getValidationErrors(
      Validate.COMMODITY_VALIDATION_RULES,
      dictionary,
      i
    );
    if (msg) {
      return msg;
    }
  }
  return false;
}

function isValidationErrorInMaterials( dictionary ) {
  for (let i = 0; i < dictionary.length; i++) {
    const msg = Validate.getValidationErrors(
      Validate.MATERIAL_VALIDATION_RULES,
      dictionary,
      i
    );
    if (msg) {
      return msg;
    }
  }
  return false;
}

class MaterialTypeCompositeLogic {
  constructor( _s3, _params ) {
    this.S3 = _s3;
    this.params = _params;
  }

  async materialTypesAndCommoditiesUploadUpdate( organizationInfo ) {
    const commodityList = await CommodityLogic.fetchAll({}, organizationInfo);
    const materialTypeList = await MaterialTypeLogic.fetchAll({}, organizationInfo);

    const { materialDictionary, commodityDictionary } =
      await this.processUpdateFile(commodityList.Items, materialTypeList.Items, organizationInfo);

    await MaterialTypeLogic.batchCreate(materialDictionary, organizationInfo);
    for (const commodity of commodityDictionary) {
      // eslint-disable-next-line no-await-in-loop
      await CommodityLogic.create(commodity, organizationInfo);
    }
    return materialDictionary.length;
  }

  processUpdateFile( commodities, materialTypes, organizationInfo ) {
    return new Promise(( resolve, reject ) => {
      const date = Date.now();
      const materialDictionary = [];
      const commodityDictionary = [];
      this.S3.getObject(this.params).createReadStream()
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
          reject(error);
        })
        .on('data', row => {
          const urlString = row.Commodity.toLowerCase().split(' ').join('_');
          const doesCommodityExist = commodities.find(el => el.code === row[ 'Commodity Code' ]);
          const doesMaterialTypeExist = materialTypes.find(el => el.code === row.Code);
          const commodityId = doesCommodityExist.id ? doesCommodityExist.id : uuidv4();
          if (!doesCommodityExist || doesCommodityExist.length === 0) {
            const commodity = {
              id: commodityId,
              name: row.Commodity,
              urlName: urlString,
              type: row.Type,
              code: row[ 'Commodity Code' ],
              user: organizationInfo.userId,
              date,
            };
            commodityDictionary.push(commodity);
          }
          if (!doesMaterialTypeExist || doesMaterialTypeExist.length === 0) {
            const material = {
              commodityId,
              id: uuidv4(),
              code: row.Code,
              commonName: row[ 'Material Name' ],
              user: organizationInfo.userId,
              date,
              commodityName: row.Commodity,
            };
            materialDictionary.push(material);
          }
        })
        .on('end', () => {
          const msg =
            isValidationErrorInCommodities(commodityDictionary) ||
            isValidationErrorInMaterials(materialDictionary);
          if (msg) {
            reject(new Error(msg));
          } else {
            resolve({ materialDictionary, commodityDictionary });
          }
        });
    });
  }

  materialTypesAndCommoditiesUpload( organizationInfo) {
    // eslint-disable-next-line no-console
    console.warn(
      'Warning!  All existing materials will be removed and replaced by the uploaded csv values'
    );
    return new Promise(( resolve, reject ) => {
      const date = Date.now();
      const materialDictionary = [
        {
          id: 'WASTE',
          code: 'WASTE',
          commonName: 'Waste Material',
          user: organizationInfo.userId,
          date,
          commodityName: 'Waste',
        },
      ];
      const commodityDictionary = [
        {
          id: 'WASTE',
          name: 'Waste',
          urlName: 'waste',
          type: 'Waste',
          code: 'WA',
          user: organizationInfo.userId,
          date,
        },
      ];
      this.S3.getObject(this.params).createReadStream()
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
          reject(error);
        })
        .on('data', row => {
          const urlString = row.Commodity.toLowerCase().split(' ').join('_');
          const test = commodityDictionary.find(el => el.name === row.Commodity);
          if (!test || test.length === 0) {
            const commodity = {
              name: row.Commodity,
              urlName: urlString,
              type: row.Type,
              code: row[ 'Commodity Code' ],
              user: organizationInfo.userId,
              date,
            };
            commodityDictionary.push(commodity);
          }
          const material = {
            code: row.Code,
            commonName: row[ 'Material Name' ],
            user: organizationInfo.userId,
            date,
            commodityName: row.Commodity,
          };
          materialDictionary.push(material);
        })
        .on('end', () => {
          const msg =
              isValidationErrorInCommodities(commodityDictionary) ||
              isValidationErrorInMaterials(materialDictionary);
          if (msg) {
            reject(new Error(msg));
          } else {
            const materialsToCreate = [];
            MaterialTypeLogic.fetchAll({}, organizationInfo)
              .then(materialsToArchive => {
                processCommodities(commodityDictionary, organizationInfo)
                  .then(commodityList => {
                    for (const entry of materialDictionary) {
                      const commodity = commodityList.find(el => el.name === entry.commodityName);
                      entry.commodityId = commodity.id;
                      entry.id = entry.id === undefined ? uuidv4() : entry.id;
                      materialsToCreate.push(entry);
                    }
                    const ids = materialsToArchive.Items.map(s => s.id);
                    MaterialTypeLogic.batchArchive(ids, organizationInfo);
                    resolve(MaterialTypeLogic.batchCreate(materialsToCreate, organizationInfo));
                  });
              });
          }
        });
    });
  }
}

module

  .exports = MaterialTypeCompositeLogic;

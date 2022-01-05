const _ = require('lodash');
const baseTestData = require('./mock-database-data.json');
const baseAdminData = require('./admin-db.json');
const validate = require('../../services/businessLogic/validate');

class MockDB {
  static resetDB() {
    // Deep copy not for production, obviously
    this.hulk_smash = JSON.parse(JSON.stringify(baseTestData));
    this.bobs_scrap = JSON.parse(JSON.stringify(baseTestData));
    this.admin = JSON.parse(JSON.stringify(baseAdminData));
    this.dbConnection = this.hulk_smash;
  }

  /**
   * In Mongo/Mongoose database will select the connection to use. In the mock database
   * it is just a hack so I am trying to mimic what mongoose does more or less
   * @param dbId
   */
  static useDB(dbId) {
    if (!this[ dbId ]) {
      this[ dbId ] = [];
    }
    this.dbConnection = this[ dbId ];
  }

  static newBatchQueryObj(tableName, keys) {
    const params = {};

    const requestItems = {};
    requestItems[ tableName ] = {
      Keys: keys,
    };

    params.RequestItems = requestItems;

    return params;
  }

  // eslint-disable-next-line no-unused-vars
  static async get(collection, sort = {}, filter = {}, page = 1, pageSize = Number.MAX_SAFE_INTEGER, fromKey = '') {
    if (!this.dbConnection[ collection ]) {
      throw new Error(`Table: ${ collection } Does not exist`);
    }
    let currentCollection = this.dbConnection[ collection ];
    if (fromKey !== '') {
      for (let i = 0; i < currentCollection.length; i++) {
        if (currentCollection[ i ].id === fromKey) {
          currentCollection = currentCollection.splice(i + 1, currentCollection.length);
          break;
        }
      }
    }

    const payload = currentCollection.filter(el => filter.value === el[ filter.key ]);

    const startIndex = fromKey !== '' ? 0 : (page - 1) * pageSize;
    const stopIndex = (page) * pageSize;
    const result = payload.slice(startIndex, stopIndex);

    const finalKey = ( result.length > 0 && result.length === pageSize ) ? result[ result.length - 1 ].id : '';
    return { page,
      pageSize: pageSize === Number.MAX_SAFE_INTEGER ? undefined : pageSize,
      resultsReturned: result.length,
      fromKey: finalKey,
      Items: _.cloneDeep(result),
    };
  }

  static getById( collection, id ) {
    const currentCollection = this.dbConnection[ collection ];
    const payload = currentCollection.find(el => el.id === id);
    return payload ? _.cloneDeep(payload) : {};
  }

  static create( collection, element ) {
    const myElement = _.cloneDeep(element);
    myElement.archive = false;
    if (!this.dbConnection[ collection ]) {
      this.dbConnection[ collection ] = [];
    }
    this.dbConnection[ collection ].push(myElement);
    return myElement;
  }

  static update( collection, element ) {
    const myElement = _.cloneDeep(element);
    if (!this.dbConnection[ collection ]) {
      this.dbConnection[ collection ] = [];
    }
    const elementToUpdate = this.dbConnection[ collection ].find(el => el.id === element.id);
    if (validate.isValidResource(elementToUpdate, 'id')) {
      for (const [ key, value ] of Object.entries(myElement)) {
        elementToUpdate[ key ] = value;
      }
      return myElement;
    }
    return {};
  }

  static batchCreate(collection, elements) {
    const params = {
      RequestItems: {},
    };
    params.RequestItems[ `${ collection }` ] = [];
    for (const element of elements) {
      params.RequestItems[ `${ collection }` ].push({
        PutRequest: {
          Item: element,
        },
      });
    }
    if (!this.dbConnection[ collection ]) {
      this.dbConnection[ collection ] = [];
    }
    let count = 0;
    for (const element of elements) {
      this.create(collection, element);
      count++;
    }
    return count;
  }

  static archiveAll(collection) {
    for (const material of this.dbConnection[ collection ]) {
      material.archive = true;
    }
  }

  static batchArchive(collection, elementIds) {
    let count = 0;
    for (const id of elementIds) {
      const elementToArchive = this.dbConnection[ collection ].find(el => el.id === id);
      elementToArchive.archive = true;
      count++;
    }
    return count;
  }

  static newIndexQueryObj(collection, index, partitionKey, val, sortDescending, fromKey) {
    return {
      collection,
      index,
      pk: partitionKey,
      val,
      sortDescending,
      fromKey,
    };
  }

  static async queryIndex(newIndexQueryObj) {
    return this.get(newIndexQueryObj.collection);
  }
}

MockDB.resetDB();

module.exports = MockDB;

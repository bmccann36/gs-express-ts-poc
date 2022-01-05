const { GetCommand, PutCommand, UpdateCommand, QueryCommand, TransactWriteCommand, BatchGetCommand } =
    require('@aws-sdk/lib-dynamodb');

const {
  ScanCommand,
  BatchWriteItemCommand,
  CreateTableCommand,
  DeleteTableCommand,
} = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const Joi = require('joi');
const _ = require('lodash');
const docClient = require('../../../libs/ddbDocClient');

function getTableNameWithEnv(tableName) {
  if (tableName === 'migrations') return tableName; // special table spanning envs
  const envName = process.env.ENV_NAME;
  const envPrefix = envName === 'prod' || envName === 'local' ? '' : `${ envName }-`;
  return `${ envPrefix }${ tableName }`;
}

class DynamoDB {
  // keys is an array of dynamodb key value pairs
  // Keys: [
  //   {
  //     pk: "vikram.johnson@somewhere.com",
  //     sk: "metadata",
  //   }
  // ],
  // DOES NOT add env name to collection
  static newBatchQueryObj(tableName, keys) {
    const params = {};

    const requestItems = {};
    requestItems[ tableName ] = {
      Keys: keys,
    };

    params.RequestItems = requestItems;

    return params;
  }

  static async batchQuery(batchQuery) {
    try {
      return docClient.send(new BatchGetCommand(batchQuery));
    } catch (err) {
      console.error('DynamoDB.batchQuery', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static async scanWithFilterAndFromKey(params) {
    const data = await docClient.send(new ScanCommand(params));
    const finalKey = data.LastEvaluatedKey;
    const unmarshalledItems = data.Items.map(item => unmarshall(item));

    return { resultsReturned: unmarshalledItems.length, fromKey: finalKey, Items: unmarshalledItems };
  }

  // eslint-disable-next-line no-unused-vars
  static async get(collection, sort = {}, filter = {}, page,
    pageSize, fromKey) {
    const params = {
      TableName: getTableNameWithEnv(collection),
    };

    if (filter && filter.key && filter.value) {
      params.FilterExpression = 'contains(#filter, :value)';
      params.ExpressionAttributeNames = { '#filter': filter.key };

      let v;
      // filter by number or string
      if (typeof filter.value === 'string') {
        v = { S: filter.value };
      } else {
        v = { N: filter.value };
      }
      params.ExpressionAttributeValues = { ':value': v };
    }

    if (fromKey) {
      params.ExclusiveStartKey = JSON.parse(fromKey);
    }

    if (!page || !pageSize) {
      return this.scanWithFilterAndFromKey(params);
    }

    let done = false;

    if (!fromKey) {
      let skip = (page - 1) * pageSize;

      if (pageSize) {
        params.Limit = pageSize;
      }

      /** Limit does not set the number of matches but rather
       * the maximum number of things searched, so it might not
       * return skipped items.  So we have to loop until we do.
       * This is a bad design for a DB but it is what it is.- djs
       */
      while (skip > 0) {
        params.Limit = skip;
        // eslint-disable-next-line no-await-in-loop
        const data = await docClient.send(new ScanCommand(params));
        skip -= data.Items.length;
        // No more data so nothing in the requested page
        if (!data.LastEvaluatedKey) {
          skip = 0;
          done = true;
        } else {
          params.ExclusiveStartKey = data.LastEvaluatedKey;
          params.Limit = pageSize;
        }
      }
    }

    let matchesNeeded = pageSize;
    const results = [];
    let finalKey = '';
    if (!done) {
      while (matchesNeeded > 0) {
        params.Limit = matchesNeeded;
        // eslint-disable-next-line no-await-in-loop
        const data = await docClient.send(new ScanCommand(params));
        matchesNeeded -= data.Items.length;

        const unmarshalledItems = data.Items.map(item => unmarshall(item));

        results.push(...unmarshalledItems);
        // No more data so nothing in this page
        if (!data.LastEvaluatedKey) {
          matchesNeeded = 0;
        } else {
          params.ExclusiveStartKey = data.LastEvaluatedKey;
          finalKey = JSON.stringify(data.LastEvaluatedKey);
        }
      }
    }
    return { page, pageSize, resultsReturned: results.length, fromKey: finalKey, Items: results.slice(0, pageSize) };
  }

  // returns Item or empty object
  static async getById(collection, iid) {
    const params = {
      TableName: getTableNameWithEnv(collection),
      Key: {
        id: iid,
      },
    };
    const res = await docClient.send(new GetCommand(params));
    if (res.Item === undefined) {
      return {};
    }

    return res.Item;
  }

  static async create(collection, body) {
    if (!body.id) {
      throw new Error(`Missing id on ${ collection }`);
    }
    const status = await docClient.send(new PutCommand({
      TableName: getTableNameWithEnv(collection),
      Item: body,
    }));
    if (status.$metadata.httpStatusCode === 200) {
      return body;
    }
    throw new Error('Error Creating Resource');
  }

  static async update(collection, body) {
    let updateExpression = 'set';
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};
    for (const property in body) {
      if (property !== 'id') {
        updateExpression += ` #${ property } = :${ property } ,`;
        ExpressionAttributeNames[ `#${ property }` ] = property;
        ExpressionAttributeValues[ `:${ property }` ] = body[ property ];
      }
    }

    updateExpression = updateExpression.slice(0, -1);
    const params = {
      TableName: getTableNameWithEnv(collection),
      Key: {
        id: body.id,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    return (await docClient.send(new UpdateCommand(params))).Attributes;
  }

  static async batchCreate25(collection, elements) {
    const params = {
      RequestItems: {},
    };
    params.RequestItems[ `${ getTableNameWithEnv(collection) }` ] = [];
    for (const element of elements) {
      params.RequestItems[ `${ getTableNameWithEnv(collection) }` ].push({
        PutRequest: {
          Item: element,
        },
      });
    }
    return docClient.send(new BatchWriteItemCommand(params));
  }

  static async batchCreate(collection, elements) {
    for (const element of elements) {
      // eslint-disable-next-line no-await-in-loop
      await this.create(collection, element);
    }
    return elements.length;
  }

  static batchArchive(collection, elementIds) {
    return elementIds.length;
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

  // default sort is smallest to largest, oldest date to newest date
  static async queryIndex(indexQuery) {
    this.IndexQuerySchema.validate(indexQuery);
    const { collection, index, pk, val, sortDescending, fromKey } = indexQuery;

    const ExpressionAttributeNames = {};
    ExpressionAttributeNames[ `#${ pk }` ] = pk;

    const ExpressionAttributeValues = {};
    ExpressionAttributeValues[ `:${ pk }` ] = val;

    const KeyConditionExpression = `#${ pk } = :${ pk }`;

    const params = {
      TableName: getTableNameWithEnv(collection),
      IndexName: index,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      KeyConditionExpression,
    };

    if (fromKey) {
      params.ExclusiveStartKey = JSON.parse(fromKey);
    }

    if (sortDescending) {
      params.ScanIndexForward = false;
    }

    return docClient.send(new QueryCommand(params));
  }

  static async writeItemsArrayWithTransaction(itemsArray) {
    try {
      if (!itemsArray || itemsArray.length > 25) {
        throw new Error(`write items transaction limit is 25 provided items ${ itemsArray.length }`);
      }

      return await docClient.send(
        new TransactWriteCommand({ TransactItems: itemsArray })
      );
    } catch (err) {
      console.log('DynamoDB.writeItemsTransaction error', err.message, JSON.stringify(err.stack));

      console.info('DynamoDB.writeItemsTransaction input');
      console.trace(JSON.stringify(itemsArray));
      throw err;
    }
  }

  // used with transaction
  static createPutDynamoDbObject(item, collection) {
    return {
      Put: {
        TableName: getTableNameWithEnv(collection),
        Item: item,
      },
    };
  }

  static createUpdateStatusDynamoDbObject(id, status, collection) {
    return {
      Update: {
        TableName: getTableNameWithEnv(collection),
        Key: {
          id,
        },
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        UpdateExpression: 'set #status = :status',
        ExpressionAttributeValues: {
          ':status': status,
        },
        ReturnValues: 'ALL_NEW',
      },
    };
  }

  static async createCollection(definition) {
    const tableDefinition = { ...definition, TableName: getTableNameWithEnv(definition.TableName) };
    return docClient.send(new CreateTableCommand(tableDefinition));
  }

  static async deleteCollection(collection) {
    return docClient.send(new DeleteTableCommand({ TableName: getTableNameWithEnv(collection) }));
  }

  static async fetchItemsByIds(ids, collection) {
    if (!ids || ids.length === 0) { throw new Error('fetchItemsByIds ids required'); }
    try {
      const keys = ids.map(id => ({ id }));

      const collectionWithEnvName = getTableNameWithEnv(collection);

      const batchQueryObj = this.newBatchQueryObj(collectionWithEnvName, keys);

      const res = await this.batchQuery(batchQueryObj);
      const items = res.Responses[ collectionWithEnvName ];

      return items;
    } catch (err) {
      console.error('FinishedGoodLogic.fetchFinishedGoodsByIds', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static getPutItemsArray(items, collection) {
    let ddbTransactionArr = [];

    if (items && items.length > 0) {
      const putItems = items.map(finishedGood => this.createPutDynamoDbObject(finishedGood, collection));
      ddbTransactionArr = _.concat(ddbTransactionArr, putItems);
    }
    return ddbTransactionArr;
  }
}

DynamoDB.IndexQuerySchema = Joi.object({
  collection: Joi.string().required(),
  index: Joi.string().required(),
  pk: Joi.string().required(),
  val: Joi.any().required(),
  sortDescending: Joi.bool(),
  fromKey: Joi.string(),
});

module.exports = DynamoDB;

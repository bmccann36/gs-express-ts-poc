const MockDB = require('../models/memoryDatabase/mock-db');
const DynamoDB = require('../models/dynamodb/dynamo-db');

exports.loadDB = () => {
  if (process.env.USE_DYNAMODB === '1') {
    return DynamoDB;
  }
  return MockDB;
};

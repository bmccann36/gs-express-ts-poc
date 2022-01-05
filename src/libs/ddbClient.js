const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

let config = {};

if (process.env.LOCAL_DYNAMODB === '1') {
  config = {
    region: 'us-east-2',
    endpoint: process.env.DYNAMO_HOST || 'http://dynamodb-local:8000',
  };
} else if (process.env.ENV_NAME === 'local') {
  throw Error('Cannot use remote DB in local environment. Please set LOCAL_DYNAMODB=1 or change ENV_NAME.');
}

const ddbClient = new DynamoDBClient(config);

module.exports = ddbClient;

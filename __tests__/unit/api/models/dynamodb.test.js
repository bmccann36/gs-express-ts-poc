const ddb = require('@aws-sdk/client-dynamodb');

const { DynamoDBClient } = ddb;
const { ListTablesCommand } = ddb;
// Set the AWS Region.
const REGION = 'us-east-2'; // e.g. "us-east-1"
// Create an Amazon DynamoDB service client object.
const ddbClient = new DynamoDBClient({ region: REGION, endpoint: 'http://localhost:8000' });

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('Test Local Dynamo Connection', () => {
  it('list all tables', async () => {
    try {
      const data = await ddbClient.send(new ListTablesCommand({}));
      console.log(data.TableNames.join('\n'));
      expect(data).toBeDefined();
    } catch (err) {
      console.error(err);
    }
  });
});

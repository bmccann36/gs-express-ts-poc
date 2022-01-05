const lambda = require('../../../src/handlers/inventory-handler');
const utils = require('../../../src/handlers/utilities');

const headers = {
  organization: 'hulk_smash',
  yard: 'yard1',
  Authorization: 'Bearer test.token',
};

const copperId = '7307e828-9953-4405-b0ec-188aa4915772';

describe('Test Inventory Handler', () => {
  const userId = '7307e828-9953-4405-b0ec-188aa4915772';
  beforeEach(() => {
    jest.spyOn(utils, 'decodeAndVerifyJwt')
      .mockReturnValueOnce({ userId, organization: headers.organization, yard: headers.yard });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return inventory summary by commodity', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/inventory/commodity',
      headers,
    };

    const result = await lambda.getInventoryCommodityHandler(event);
    const expectedBody = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(expectedBody).toBeDefined();
  });
  it('should return inventory finished goods list', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/inventory/finished-goods',
      headers,
    };

    const result = await lambda.getInventoryFinishedGoodListHandler(event);
    const expectedBody = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(expectedBody).toBeDefined();
  });
  it('should return inventory packing list', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/inventory/packing-lists/meta',
      headers,
    };

    const result = await lambda.getInventoryPackingListHandler(event);
    const expectedBody = JSON.parse(result.body);
    expect(result.statusCode).toEqual(500);
    expect(expectedBody).toBeDefined();
  });
  it('should return inventory for Copper', async () => {
    const event = {
      httpMethod: 'GET',
      path: `/inventory/commodity/${ copperId }`,
      headers,
      pathParameters: {
        commodityId: copperId,
      },
    };

    const result = await lambda.getInventoryByCommodityHandler(event);
    const commodities = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(commodities).toBeDefined();
    expect(commodities.resultsReturned).toBe(2);
    expect(commodities.page).toBe(1);
    expect(commodities.pageSize).toBe(10);
    expect(commodities.fromKey).toBe('');
    expect(commodities.wipWeight.amount).toBe(7713);
    expect(commodities.wipWeight.units).toBe('lbs');
    expect(commodities.wipWeight.commonString).toBe('7713 lbs');
    expect(commodities.wipCost.amount).toBe(1487285);
    expect(commodities.wipCost.precision).toBe(2);
    expect(commodities.wipCost.currency).toBe('USD');
    expect(commodities.wipCost.commonString).toBe('$14,872.85');
  });
});

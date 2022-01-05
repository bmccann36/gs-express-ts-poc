const lambda = require('../../../src/handlers/commodity-handler');
const utils = require('../../../src/handlers/utilities');

const headers = {
  organization: 'hulk_smash',
  yard: 'yard1',
  Authorization: 'Bearer test.token',
};

describe('Test getCommoditiesHandler', () => {
  const userId = '7307e828-9953-4405-b0ec-188aa4915772';
  beforeEach(() => {
    jest.spyOn(utils, 'decodeAndVerifyJwt')
      .mockReturnValueOnce({ userId, organization: headers.organization, yard: headers.yard });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return all commodities', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/commodities',
      queryStringParameters: {
        page: 1,
        pageSize: 2,
        filter: JSON.stringify({}),
      },
      headers,
    };

    const result = await lambda.getCommoditiesHandler(event);
    const expectedBody = JSON.parse(result.body);

    const expectedResult = {
      statusCode: 200,
      body: [
        {
          id: '7307e828-9953-4405-b0ec-188aa4915772',
          name: 'Copper',
          type: 'NON_FERROUS',
          archive: false,
        },
        {
          id: '7307e828-9953-4405-b0ec-188aa4915773',
          name: 'Steel',
          type: 'FERROUS',
          archive: false,
        },
      ],
    };
    expect(result.statusCode).toEqual(expectedResult.statusCode);
    expect(expectedBody.page).toEqual(1);
    expect(expectedBody.resultsReturned).toEqual(2);
    expect(expectedBody.Items).toEqual(expectedResult.body);
  });
  it('page 2 of commodities with pageSize = 1', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/commodities',
      queryStringParameters: {
        page: 2,
        pageSize: 1,
        filter: JSON.stringify({}),
      },
      headers,
    };

    const result = await lambda.getCommoditiesHandler(event);
    const expectedBody = JSON.parse(result.body);

    const expectedResult = {
      statusCode: 200,
      body: [
        {
          id: '7307e828-9953-4405-b0ec-188aa4915773',
          name: 'Steel',
          type: 'FERROUS',
          archive: false,
        },
      ],
    };
    expect(result.statusCode).toEqual(expectedResult.statusCode);
    expect(expectedBody.page).toEqual(2);
    expect(expectedBody.resultsReturned).toEqual(1);
    expect(expectedBody.Items).toEqual(expectedResult.body);
  });
  it('page 2 of commodities with pageSize = 1 using fromKey', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/commodities',
      queryStringParameters: {
        page: 2,
        pageSize: 1,
        fromKey: '7307e828-9953-4405-b0ec-188aa4915772',
        filter: JSON.stringify({}),
      },
      headers,
    };

    const result = await lambda.getCommoditiesHandler(event);
    const expectedBody = JSON.parse(result.body);

    const expectedResult = {
      statusCode: 200,
      body: [
        {
          id: '7307e828-9953-4405-b0ec-188aa4915773',
          name: 'Steel',
          type: 'FERROUS',
          archive: false,
        },
        {
          id: '4fb99630-3eba-4d10-9b7b-33dc85828c37',
          name: 'Waste Product',
          type: 'WASTE',
          archive: false,
        },
      ],
    };
    expect(result.statusCode).toEqual(expectedResult.statusCode);
    expect(expectedBody.page).toEqual(2);
    expect(expectedBody.resultsReturned).toEqual(2);
    expect(expectedBody.Items).toEqual(expectedResult.body);
  });
  it('page 2 of commodities with pageSize = 10', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/commodities',
      queryStringParameters: {
        page: 2,
        pageSize: 10,
        filter: JSON.stringify({}),
      },
      headers,
    };

    const result = await lambda.getCommoditiesHandler(event);
    const expectedBody = JSON.parse(result.body);

    const expectedResult = {
      statusCode: 200,
      body: [
      ],
    };
    expect(result.statusCode).toEqual(expectedResult.statusCode);
    expect(expectedBody.page).toEqual(2);
    expect(expectedBody.resultsReturned).toEqual(0);
    expect(expectedBody.Items).toEqual(expectedResult.body);
  });
  it('should return all NON_FERROUS commodities', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/commodities',
      queryStringParameters: {
        page: 1,
        pageSize: 10,
        filter: JSON.stringify({ key: 'type', value: 'NON_FERROUS' }),
      },
      headers,
    };

    const result = await lambda.getCommoditiesHandler(event);
    const expectedBody = JSON.parse(result.body);

    const expectedResult = {
      statusCode: 200,
      body: [
        {
          id: '7307e828-9953-4405-b0ec-188aa4915772',
          name: 'Copper',
          type: 'NON_FERROUS',
          archive: false,
        },
      ],
    };
    expect(result.statusCode).toEqual(expectedResult.statusCode);
    expect(expectedBody.page).toEqual(1);
    expect(expectedBody.resultsReturned).toEqual(1);
    expect(expectedBody.Items).toEqual(expectedResult.body);
  });
  it('should return copper', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/commodities/{commodityId}',
      pathParameters: {
        commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
      },
      headers,
    };
    const result = await lambda.getCommodityByIdHandler(event);

    const expectedResult = {
      statusCode: 200,
      body:
        JSON.stringify({
          id: '7307e828-9953-4405-b0ec-188aa4915772',
          name: 'Copper',
          type: 'NON_FERROUS',
          archive: false,
        }),
    };

    // Compare the result with the expected result
    expect(result.statusCode).toEqual(expectedResult.statusCode);
    expect(result.body).toEqual(expectedResult.body);
  });

  it('should return new id and 200', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/commodities',
      body: JSON.stringify({
        name: 'Brass',
        type: 'NON_FERROUS',
        archive: false,
      }),
      headers,
    };

    const result = await lambda.createCommodityHandler(event);
    const expectedBody = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(expectedBody).toBeDefined();
  });
  it('should return updated copper', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/commodities',
      body: JSON.stringify({
        id: '7307e828-9953-4405-b0ec-188aa4915772',
        name: 'Copper2',
        type: 'NON_FERROUS',
        archive: false,
      }),
      headers,
    };

    const result = await lambda.updateCommodityHandler(event);

    expect(result.statusCode).toEqual(200);
    expect(result.body).toBeDefined();
    const parsedBody = JSON.parse(result.body);
    expect(parsedBody.name).toBe('Copper2');
  });
});

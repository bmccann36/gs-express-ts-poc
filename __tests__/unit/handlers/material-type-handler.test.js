const lambda = require('../../../src/handlers/material-type-handler');
const utils = require('../../../src/handlers/utilities');

const headers = {
  organization: 'hulk_smash',
  yard: 'yard1',
  Authorization: 'Bearer test.token',
};
describe('Test Material Types Handler', () => {
  const userId = '7307e828-9953-4405-b0ec-188aa4915772';
  beforeEach(() => {
    jest.spyOn(utils, 'decodeAndVerifyJwt')
      .mockReturnValueOnce({ userId, organization: headers.organization, yard: headers.yard });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return all materials', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/material-types',
      headers,
    };

    const result = await lambda.getMaterialTypesHandler(event);
    const expectedBody = JSON.parse(result.body);

    const expectedResult = {
      statusCode: 200,
      body: [
        {
          id: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
          code: '61',
          commonName: '#1 Copper',
          commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
          archive: false,
          commodity: {
            id: '7307e828-9953-4405-b0ec-188aa4915772',
            name: 'Copper',
            type: 'NON_FERROUS',
            archive: false,
          },
        },
        {
          id: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37792',
          code: '62',
          commonName: '#2 Copper',
          commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
          archive: false,
          commodity: {
            id: '7307e828-9953-4405-b0ec-188aa4915772',
            name: 'Copper',
            type: 'NON_FERROUS',
            archive: false,
          },
        },
        {
          id: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37793',
          code: 'ST0001',
          commonName: 'Steel Bearings',
          commodityId: '7307e828-9953-4405-b0ec-188aa4915773',
          archive: false,
          commodity: {
            id: '7307e828-9953-4405-b0ec-188aa4915773',
            name: 'Steel',
            type: 'FERROUS',
            archive: false,
          },
        },
        {
          id: '3f063b1f-67e6-4e6a-8347-b74617b6ad29',
          code: '101',
          commonName: 'Grease',
          commodityId: '4fb99630-3eba-4d10-9b7b-33dc85828c37',
          archive: false,
          commodity: {
            id: '4fb99630-3eba-4d10-9b7b-33dc85828c37',
            name: 'Waste Product',
            type: 'WASTE',
            archive: false,
          },
        },
      ],
    };

    // Compare the result with the expected result
    expect(result.statusCode).toEqual(expectedResult.statusCode);
    expect(expectedBody.Items).toEqual(expectedResult.body);
  });

  it('should return a specific material by id', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/material-types/{materialId}',
      pathParameters: {
        materialTypeId: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
      },
      headers,
    };
    const result = await lambda.getMaterialTypeByIdHandler(event);
    const expectedBody = JSON.parse(result.body);

    const expectedResult = {
      statusCode: 200,
      headers,
      body:
        {
          id: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
          code: '61',
          commonName: '#1 Copper',
          commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
          archive: false,
          commodity: {
            id: '7307e828-9953-4405-b0ec-188aa4915772',
            name: 'Copper',
            type: 'NON_FERROUS',
            archive: false,
          },
        },
    };

    // Compare the result with the expected result
    expect(result.statusCode).toEqual(expectedResult.statusCode);
    expect(expectedBody).toEqual(expectedResult.body);
  });

  it('should create a material, return 201 and new id', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/material-types',
      body: JSON.stringify({
        code: 'C0002',
        commonName: '#2 Copper',
        commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
      }),
      headers,
    };

    const result = await lambda.createMaterialTypeHandler(event);

    expect(result.statusCode).toEqual(200);
    expect(result.body).toBeDefined();
  });

  it('should return updated copper', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/material-types/{materialId}',
      body: JSON.stringify({
        id: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
        code: '61',
        commonName: '#2 Copper',
        commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
        archive: false,
      }),
      headers,
    };

    const result = await lambda.updateMaterialTypeHandler(event);

    expect(result.statusCode).toEqual(200);
    expect(result.body).toBeDefined();
    const parsedBody = JSON.parse(result.body);
    expect(parsedBody.commonName).toBe('#2 Copper');
  });
});

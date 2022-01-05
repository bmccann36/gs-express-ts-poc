const handlers = require('../../../src/handlers/finished-goods');
const finishedGoodService = require('../../../src/api/services/businessLogic/finished-goods');
const materialService = require('../../../src/api/services/businessLogic/material-logic');
const materialTypeService = require('../../../src/api/services/businessLogic/material-type-logic');
const handlerUtils = require('../../../src/handlers/utilities');
const headerUtils = require('../../../src/handlers/utilities');

jest.mock('../../../src/api/services/businessLogic/finished-goods');
jest.mock('../../../src/api/services/businessLogic/material-type-logic');

describe('Finished Goods API', () => {
  const userId = '082b670f-c9eb-43c0-8f95-ee6dd2e06df5';
  const orgInfo = { organization: 'lopez', yard: 'houston', userId };

  beforeEach(() => {
    jest.spyOn(handlerUtils, 'decodeAndVerifyJwt')
      .mockReturnValueOnce(orgInfo);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET / handler', () => {
    it('passes all query params to fetchAll', async () => {
      // Arrange
      const event = {
        headers: {
          Authorization: 'Bearer thisisatoken',
        },
        httpMethod: 'GET',
        queryStringParameters: {
          sort: '{}',
          filter: '{}',
          page: 123,
          pageSize: 42,
          fromKey: 'testkey',
        },
      };
      const expectedFinishedGoods = [{ id: 'test-id' }];
      finishedGoodService.fetchAll.mockResolvedValueOnce(expectedFinishedGoods);
      // Act
      const response = await handlers.list(event);
      // Assert
      expect(finishedGoodService.fetchAll.mock.calls.length).toBe(1);
      expect(finishedGoodService.fetchAll.mock.calls[ 0 ]).toEqual([
        JSON.parse(event.queryStringParameters.sort),
        JSON.parse(event.queryStringParameters.filter),
        event.queryStringParameters.page,
        event.queryStringParameters.pageSize,
        event.queryStringParameters.fromKey,
      ]);
      expect(response).toStrictEqual({
        statusCode: 200,
        headers: handlerUtils.getCorsHeaders(),
        body: JSON.stringify(expectedFinishedGoods),
      });
    });
  });

  describe('GET /:id handler', () => {
    it('passes id to fetch', async () => {
      // Arrange
      const event = {
        headers: {
          Authorization: '',
        },
        httpMethod: 'GET',
        pathParameters: { id: 'test-id' },
      };
      const expectedFinishedGood = { id: event.pathParameters };
      finishedGoodService.fetch.mockResolvedValueOnce(expectedFinishedGood);
      // Act
      const response = await handlers.get(event);
      // Assert
      expect(finishedGoodService.fetch.mock.calls.length).toBe(1);
      expect(finishedGoodService.fetch.mock.calls[ 0 ][ 0 ]).toBe(event.pathParameters.id);
      expect(response).toStrictEqual({
        statusCode: 200,
        headers: handlerUtils.getCorsHeaders(),
        body: JSON.stringify(expectedFinishedGood),
      });
    });
  });

  // TODO fix test
  describe('POST / handler', () => {
    it('passes body and userId to create', async () => {
      // Arrange
      const materialId = 'f9565f9f-dbcf-442f-9e79-5fac64983cb7';
      const finishedGood = {
        id: 'f9565f9f-dbcf-442f-9e79-5fac64983cb7',
        type: 'BALE',
        materialTypeId: 'f9565f9f-dbcf-442f-9e79-5fac64983cb7',
        notes: [{ name: '' }],
        weight: {
          gross: 973,
          net: 973,
          tare: 36,
          units: 'lbs',
        },
      };
      const event = {
        httpMethod: 'POST',
        headers: { Authorization: 'Bearer: test-token' },
        body: JSON.stringify({ finishedGood }),
      };

      materialTypeService.fetch.mockResolvedValueOnce({ id: finishedGood.materialTypeId });

      jest.spyOn(materialService, 'fetch').mockResolvedValueOnce({ id: materialId });
      jest.spyOn(materialService, 'update').mockImplementation(m => m);
      finishedGoodService.create.mockImplementationOnce(fg => fg);
      jest.spyOn(finishedGoodService.schema, 'validate').mockReturnValueOnce({});
      // Act
      const response = await handlers.create(event);
      // Assert
      expect(finishedGoodService.create.mock.calls.length).toBe(1);

      expect(response).toStrictEqual({
        statusCode: 201,
        headers: headerUtils.getCorsHeaders(),
        body: JSON.stringify({ ...finishedGood, materialType: { id: finishedGood.materialTypeId } }),
      });
    });
  });

  describe('PUT /:id handler', () => {
    it('passes body and userId to update', async () => {
      // Arrange
      const id = 'test-id';
      const finishedGood = { id, type: 'BALE' };
      const event = {
        httpMethod: 'PUT',
        headers: { Authorization: 'Bearer: test-token' },
        pathParameters: { id },
        body: JSON.stringify({ finishedGood }),
      };
      finishedGoodService.update.mockImplementationOnce(fg => fg);
      const expectedFinishedGood = { ...finishedGood, id: event.pathParameters.id };
      // Act
      const response = await handlers.update(event);

      // Assert
      expect(finishedGoodService.update.mock.calls.length).toBe(1);
      expect(finishedGoodService.update.mock.calls[ 0 ]).toEqual([ expectedFinishedGood, orgInfo ]);
      expect(response).toStrictEqual({
        statusCode: 200,
        headers: handlerUtils.getCorsHeaders(),
        body: JSON.stringify(expectedFinishedGood),
      });
    });
  });
});

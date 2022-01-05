const handler = require('../../../src/handlers/customer-handler');
const utils = require('../../../src/handlers/utilities');
const CustomerLogic = require('../../../src/api/services/businessLogic/customer-logic');

jest.mock('../../../src/api/services/businessLogic/customer-logic.js');

describe('Test Customer Handler', () => {
  const fakeUuid = '00000000-0000-0000-0000-000000000000';
  const headers = {
    Organization: 'hulk_smash',
    Yard: 'yard1',
    Authorization: 'Bearer test.token',
  };
  const user = { userId: fakeUuid, organization: headers.Organization, yard: headers.Yard };

  beforeAll(() => {
    jest.spyOn(utils, 'decodeAndVerifyJwt')
      .mockReturnValue(user);
  });

  describe('GET /customers', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return a customer list', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: '/customers',
        headers,
      };
      const mockFetchResult = { Items: [] };
      CustomerLogic.fetchAll.mockResolvedValueOnce(mockFetchResult);
      // Act
      const result = await handler.getCustomerListHandler(event);
      // Assert
      expect(result.statusCode).toEqual(200);
      expect(CustomerLogic.fetchAll).toHaveBeenCalledTimes(1);
      expect(CustomerLogic.fetchAll.mock.calls[ 0 ]).toEqual([ utils.getQueryParams(event), user ]);
      expect(JSON.parse(result.body)).toStrictEqual(mockFetchResult);
    });

    it('passes query params to fetchAll', async () => {
      // Arrange
      const filter = { type: 'test' };
      const event = {
        httpMethod: 'GET',
        path: '/customers',
        headers,
        queryStringParameters: {
          filter: JSON.stringify(filter),
          page: 1,
          pageSize: 10,
          fromKey: fakeUuid,
        },
      };
      const mockFetchResult = { Items: [] };
      CustomerLogic.fetchAll.mockResolvedValueOnce(mockFetchResult);
      // Act
      const result = await handler.getCustomerListHandler(event);
      // Assert
      expect(result.statusCode).toEqual(200);
      expect(CustomerLogic.fetchAll).toHaveBeenCalledTimes(1);
      expect(CustomerLogic.fetchAll.mock.calls[ 0 ][ 0 ]).toStrictEqual({
        ...event.queryStringParameters,
        filter: JSON.parse(event.queryStringParameters.filter),
        sort: {},
      });
    });
  });

  describe('POST /customers', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('creates a customer', async () => {
      // Arrange
      const customer = {
        customerCommonIdentifierString: 'Big Bobs Scrap',
        companyName: 'Big Bobs Scrap',
      };
      const event = {
        httpMethod: 'POST',
        path: '/customers',
        headers,
        body: JSON.stringify(customer),
      };
      CustomerLogic.create.mockResolvedValueOnce(customer);
      // Act
      const result = await handler.createCustomerHandler(event);
      const body = JSON.parse(result.body);
      // Assert
      expect(result.statusCode).toEqual(200);
      expect(CustomerLogic.create).toHaveBeenCalledTimes(1);
      expect(CustomerLogic.create.mock.calls[ 0 ][ 0 ]).toStrictEqual(customer);
      expect(body.customerCommonIdentifierString).toBe('Big Bobs Scrap');
    });
  });

  describe('GET /customers/:id', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('gets a customer', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: `/customers/${ fakeUuid }`,
        headers,
        pathParameters: {
          customerId: fakeUuid,
        },
      };
      const customer = { id: fakeUuid, type: 'test' };
      CustomerLogic.fetch.mockResolvedValueOnce(customer);
      // Act
      const result = await handler.getCustomerByIdHandler(event);
      const body = JSON.parse(result.body);
      // Assert
      expect(result.statusCode).toEqual(200);
      expect(CustomerLogic.fetch).toHaveBeenCalledTimes(1);
      expect(CustomerLogic.fetch).toHaveBeenCalledWith(fakeUuid, user);
      expect(body).toStrictEqual(customer);
    });
  });

  describe('PUT /customers/:id', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('updates a customer', async () => {
      // Arrange
      const customer = {
        id: fakeUuid,
        customerCommonIdentifierString: 'Big Bobs Scrap',
        companyName: 'Big Bobs Scrap',
      };
      const event = {
        httpMethod: 'PUT',
        path: `/customers/${ fakeUuid }`,
        headers,
        pathParameters: {
          customerId: fakeUuid,
        },
        body: JSON.stringify(customer),
      };
      CustomerLogic.update.mockResolvedValueOnce(customer);
      // Act
      const result = await handler.updateCustomerHandler(event);
      // Assert
      expect(result.statusCode).toEqual(200);
      expect(CustomerLogic.update).toHaveBeenCalledTimes(1);
      expect(CustomerLogic.update.mock.calls[ 0 ][ 0 ]).toBe(event.pathParameters.customerId);
      expect(CustomerLogic.update.mock.calls[ 0 ][ 1 ]).toStrictEqual(customer);
    });
  });
});

const handlers = require('../../../src/handlers/outbound-ticket-handler');
const handlerUtils = require('../../../src/handlers/utilities');
const utils = require('../../../src/handlers/utilities');

jest.mock('../../../src/api/services/businessLogic/finished-goods');
jest.mock('../../../src/api/services/businessLogic/material-type-logic');

const headers = {
  organization: 'hulk_smash',
  yard: 'yard1',
  Authorization: 'Bearer test.token',
};

describe('Outbound Tickets API', () => {
  const userId = '7307e828-9953-4405-b0ec-188aa4915772';
  beforeEach(() => {
    jest.spyOn(utils, 'decodeAndVerifyJwt')
      .mockReturnValueOnce({ userId, organization: headers.organization, yard: headers.yard });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CREATE outbound tickets / handler', () => {
    it('Validate OutboundTicketRequestDTO', async () => {
      // Arrange
      const event = {
        body: null,
        headers,
      };

      const response = await handlers.create(event);

      expect(response).toStrictEqual({
        statusCode: 400,
        headers: handlerUtils.getCorsHeaders(),
        body: '{"error":"\\"value\\" must be of type object"}',
      });
    });

    it('Validate OutboundTicketRequestDTO invalid customerId', async () => {
      // Arrange
      const event = {
        body: JSON.stringify({ customerId: '123' }),
        headers,
      };

      const response = await handlers.create(event);

      expect(response).toStrictEqual({
        statusCode: 400,
        headers: handlerUtils.getCorsHeaders(),
        body: '{"error":"\\"customerId\\" must be a valid GUID"}',
      });
    });
  });
});

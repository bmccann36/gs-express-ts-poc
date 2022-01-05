const lambda = require('../../../../src/handlers/inbound-ticket-handler');
const utils = require('../../../../src/handlers/utilities');

describe('Test Ticket Handler', () => {
  const userId = '7307e828-9953-4405-b0ec-188aa4915772';
  const headers = {
    Organization: 'hulk_smash',
    Yard: 'yard1',
    Authorization: 'Bearer test.token',
  };

  beforeEach(() => {
    jest.spyOn(utils, 'decodeAndVerifyJwt')
      .mockReturnValue({ userId, organization: headers.Organization, yard: headers.Yard });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return a inbound ticket list (summary)', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/inbound-ticket',
      headers,
    };
    const result = await lambda.getInboundTicketListHandler(event);
    const expectedBody = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(expectedBody).toBeDefined();
  });
  it('create a ticket and return 200', async () => {
    const ticket = {
      customer: {
        customerCommonIdentifierString: 'Bob Frog Scrap',
      },
      materials: [
        {
          materialTypeId: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
          weightAndPrice: {
            gross: {
              amount: 3973,
              units: 'lbs',
              commonString: '3973 lbs',
            },
            tare: {
              amount: 10,
              units: 'lbs',
              commonString: '10 lbs',
            },
            deductions: [],
            netWeight: {
              amount: 3963,
              units: 'lbs',
              commonString: '3963 lbs',
            },
            um: 'lbs',
            netPrice: {
              commonString: '$0.25/lb',
              currency: 'usd',
              precision: 2,
              amount: 25,
            },
            netValue: {
              commonString: '$990.75',
              currency: 'usd',
              precision: 2,
              amount: 99075,
            },
          },
        },
      ],
    };
    const event = {
      httpMethod: 'POST',
      path: '/inbound-ticket',
      body: JSON.stringify(ticket),
      headers,
    };

    const result = await lambda.createInboundTicketHandler(event);
    const expectedBody = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(expectedBody).toBeDefined();
    expect(expectedBody).toHaveProperty('id');
  });
  it('get a ticket and return 200', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/inbound-ticket/4c0f5271-9222-47f3-a4b1-f14eb3f1e5a3',
      pathParameters: {
        inboundTicketId: '4c0f5271-9222-47f3-a4b1-f14eb3f1e5a3',
      },
      headers,
    };

    const result = await lambda.getInboundTicketByIdHandler(event);
    const expectedBody = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(expectedBody).toBeDefined();
    expect(expectedBody).toHaveProperty('id');
  });
  it('update a ticket and return 200', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/inbound-ticket/4c0f5271-9222-47f3-a4b1-f14eb3f1e5a3',
      body: JSON.stringify(
        {
          id: '4c0f5271-9222-47f3-a4b1-f14eb3f1e5a3',
          customer: {
            customerCommonIdentifierString: 'Bob Frog Scrap',
          },
        }
      ),
      headers,
    };

    const result = await lambda.updateInboundTicketHandler(event);
    const expectedBody = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(expectedBody).toBeDefined();
    expect(expectedBody).toHaveProperty('customer');
  });
});

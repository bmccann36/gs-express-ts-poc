const lambda = require('../../../../src/handlers/inbound-ticket-handler');
const { createInboundTicketRequest, materials } = require('./InboundTicketHelpers');

describe('Test Inbound Ticket Handler Validation Tests', () => {
  // INCOMPLETE STATUS TESTS
  it('Create Ticket with INCOMPLETE Status, no body returns 400', async () => {
    const body = {};
    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(400);
  });

  it('Create ticket with customerCommonIdentifierString returns 200', async () => {
    // empty object
    const body = {
      customer: {
        customerCommonIdentifierString: 'test customer',
      },
    };
    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(200);
  });

  it('INCOMPLETE Status with blank transportation info returns 400', async () => {
    const body = {
      transportationInfo: {},
    };
    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(400);
  });

  it('INCOMPLETE Status with transportation info returns 200', async () => {
    const body = {
      transportationInfo: {
        carrier: 'test carrier',
      },
    };
    let result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(200);

    body.transportationInfo = {
      carrierNumber: 123,
    };

    result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(200);

    body.transportationInfo = {
      trailerNumber: 123,
    };

    result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(200);
  });

  it('INCOMPLETE Status with invalid materials returns 400', async () => {
    const body = {
      materials: [
        {
          code: '123',
        },
      ],
    };
    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(400);
  });

  it('INCOMPLETE Status with valid materials returns 200', async () => {
    const body = {
      materials,
    };
    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(200);
  });
});

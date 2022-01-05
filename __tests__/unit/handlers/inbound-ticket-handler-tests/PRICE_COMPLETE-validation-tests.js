const lambda = require('../../../../src/handlers/inbound-ticket-handler');
const { createInboundTicketRequest, customer, materials } = require('./InboundTicketHelpers');

// Price Complete
// Customer Name AND every material must have a code, price, and individual weights
describe('Test Inbound Ticket Handler Validation Tests With PRICE_COMPLETE Status', () => {
  // PRICE COMPLETE STATUS TESTS
  let body;

  beforeEach(() => {
    body = {
      status: {
        value: 'PRICE_COMPLETE',
      },
    };
  });

  it('Create Ticket with PRICE_COMPLETE Status, no body returns 400', async () => {
    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(400);
  });

  it('Create Ticket with PRICE_COMPLETE Status, customer only returns 400', async () => {
    body.customer = customer;
    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(400);
  });

  it('Create Ticket with PRICE_COMPLETE Status, customer, materials NO weights returns 400', async () => {
    body.customer = customer;
    body.materials = materials;

    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(400);
  });

  it('Create Ticket with PRICE_COMPLETE Status, customer, materials and weights returns 200', async () => {
    body.customer = customer;
    body.materials = materials;

    // these keys are checked, the values are not validated
    body.scaleType = {};
    body.transportationInfo = {};
    body.truckWeight = {};
    body.loadWeight = {};

    body.netValue = {};

    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(200);
  });
});

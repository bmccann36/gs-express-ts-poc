const lambda = require('../../../../src/handlers/inbound-ticket-handler');

const { createInboundTicketRequest, customer, materials } = require('./InboundTicketHelpers');

// Scale Complete
// (Customer Name OR transportation information – any field) AND (material code/name AND truck weights and all
// material Weights)
describe('Test Inbound Ticket Handler Validation Tests, Status SCALE_COMPLETE', () => {
  // INCOMPLETE STATUS TESTS
  let body;

  beforeEach(() => {
    body = {
      status: {
        value: 'SCALE_COMPLETE',
      },
    };
  });

  it('Create Ticket with no customer and no transportation info returns 400', async () => {
    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(400);
  });

  it('Create Ticket with customer and no materials and no truck weights returns 400', async () => {
    body.customer = customer;
    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(400);
  });

  it('Create Ticket with customer and materials and no truck weights returns 400', async () => {
    body.customer = customer;
    body.materials = materials;
    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(400);
  });

  it('Create Ticket with customer and materials and truck weights returns 200', async () => {
    body.customer = customer;
    body.materials = materials;

    // these keys are checked, the values are not validated
    body.scaleType = {};
    body.transportationInfo = {};
    body.truckWeight = {};
    body.loadWeight = {};

    const result = await lambda.createInboundTicketHandler(createInboundTicketRequest(body));
    expect(result.statusCode).toEqual(200);
  });
});

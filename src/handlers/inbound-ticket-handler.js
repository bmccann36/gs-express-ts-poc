const { handler, getCorsHeaders, getQueryParams, isEmpty, createResponse } = require('./utilities');
const MockInventory = require('../api/models/memoryDatabase/inbound-ticket-list.json');
const InboundTicketLogic = require('../api/services/businessLogic/inbound-ticket-logic');

const getInboundTicketListHandler = handler(async event => {
  const Items = await InboundTicketLogic.fetchAll(getQueryParams(event), event.user);
  return createResponse(Items, 200);
});

const getInboundTicketByIdHandler = handler(async event => {
  const { pathParameters: { inboundTicketId } } = event;
  const Item = await InboundTicketLogic.fetch(inboundTicketId, event.user);
  const statusCode = isEmpty(Item) ? 404 : 200;
  return createResponse(Item, statusCode);
});

const createInboundTicketHandler = handler(async event => {
  const NewItem = await InboundTicketLogic.create(event.body, event.user);
  return createResponse(NewItem, 200);
});

const updateInboundTicketHandler = handler(async event => {
  const UpdatedItem = await InboundTicketLogic.update(event.body, event.user);
  const statusCode = isEmpty(UpdatedItem) ? 404 : 200;
  return createResponse(UpdatedItem, statusCode);
});

const voidHandler = handler(async event => {
  await InboundTicketLogic.void(event.pathParameters.inboundTicketId, event.user);
  return createResponse(null, 204);
});

/**
 * Mock Handlers
 */
const getInboundTicketListMockHandler = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify(MockInventory),
});

module.exports = {
  getInboundTicketListHandler: event => getInboundTicketListHandler(event),
  getInboundTicketByIdHandler: event => getInboundTicketByIdHandler(event),
  createInboundTicketHandler: event => createInboundTicketHandler(event),
  updateInboundTicketHandler: event => updateInboundTicketHandler(event),
  void: event => voidHandler(event),
  getInboundTicketListMockHandler,
};

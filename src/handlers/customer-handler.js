const Logic = require('../api/services/businessLogic/customer-logic');
const MockInventory = require('../api/models/memoryDatabase/customer-list.json');
const { handler, getCorsHeaders, getQueryParams, isEmpty, createResponse } = require('./utilities');

const getCustomerListHandler = handler(async event => {
  const customers = await Logic.fetchAll(getQueryParams(event), event.user);
  return createResponse(customers, 200);
});

const getCustomerByIdHandler = handler(async event => {
  const { pathParameters: { customerId } } = event;
  const customer = await Logic.fetch(customerId, event.user);
  const statusCode = isEmpty(customer) ? 404 : 200;
  return createResponse(customer, statusCode);
});

const createCustomerHandler = handler(async event => {
  const customer = await Logic.create(event.body, event.user);
  return createResponse(customer, 200);
});

const updateCustomerHandler = handler(async event => {
  const customer = await Logic.update(event.pathParameters.customerId, event.body, event.user);
  const statusCode = isEmpty(customer) ? 404 : 200;
  return createResponse(customer, statusCode);
});

/**
 * Mock Handlers
 */
const getCustomerListMockHandler = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify(MockInventory),
});

module.exports = {
  getCustomerListHandler: event => getCustomerListHandler(event),
  getCustomerByIdHandler: event => getCustomerByIdHandler(event),
  createCustomerHandler: event => createCustomerHandler(event),
  updateCustomerHandler: event => updateCustomerHandler(event),
  getCustomerListMockHandler,
};

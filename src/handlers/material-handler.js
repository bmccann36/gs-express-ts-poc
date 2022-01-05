const Logic = require('../api/services/businessLogic/material-logic');
const MockInventory = require('../api/models/memoryDatabase/material-list.json');
const { handler, getCorsHeaders, getQueryParams, isEmpty, createResponse } = require('./utilities');

const getMaterialListHandler = handler(async event => {
  const items = await Logic.fetchAll(getQueryParams(event), event.user);
  return createResponse(items, 200);
});

const getMaterialByIdHandler = handler(async event => {
  const { pathParameters: { materialId } } = event;
  const Item = await Logic.fetch(materialId, event.user);
  const statusCode = isEmpty(Item) ? 404 : 200;
  return createResponse(Item, statusCode);
});

const createMaterialHandler = handler(async event => {
  const NewItem = await Logic.create(event.body, event.user);
  return createResponse(NewItem, 200);
});

const updateMaterialHandler = handler(async event => {
  const NewItem = await Logic.update(event.body, event.user);
  const statusCode = isEmpty(NewItem) ? 404 : 200;
  return createResponse(NewItem, statusCode);
});

/**
 * Mock Handlers
 */
const getMaterialListMockHandler = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify(MockInventory),
});

module.exports = {
  getMaterialListHandler: event => getMaterialListHandler(event),
  getMaterialByIdHandler: event => getMaterialByIdHandler(event),
  createMaterialHandler: event => createMaterialHandler(event),
  updateMaterialHandler: event => updateMaterialHandler(event),
  getMaterialListMockHandler,
};

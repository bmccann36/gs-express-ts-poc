const CommodityLogic = require('../api/services/businessLogic/commodity-logic');
const MockCommodityList = require('../api/models/memoryDatabase/commodity-list.json');
const { handler, getCorsHeaders, getQueryParams, isEmpty, createResponse } = require('./utilities');

const getCommoditiesHandler = handler(async event => {
  const Items = await CommodityLogic.fetchAll(getQueryParams(event), event.user);
  return createResponse(Items, 200);
});

const getCommodityByIdHandler = handler(async event => {
  const { pathParameters: { commodityId } } = event;
  const Item = await CommodityLogic.fetch(commodityId, event.user);
  const statusCode = isEmpty(Item) ? 404 : 200;
  return createResponse(Item, statusCode);
});

const createCommodityHandler = handler(async event => {
  const NewItem = await CommodityLogic.create(event.body, event.user);
  return createResponse(NewItem, 200);
});

const updateCommodityHandler = handler(async event => {
  const NewItem = await CommodityLogic.update(event.body, event.user);
  const statusCode = isEmpty(NewItem) ? 404 : 200;
  return createResponse(NewItem, statusCode);
});

/**
 * Mock Handlers
 */
const getCommoditiesMockHandler = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify(MockCommodityList),
});

module.exports = {
  getCommoditiesHandler: event => getCommoditiesHandler(event),
  getCommodityByIdHandler: event => getCommodityByIdHandler(event),
  createCommodityHandler: event => createCommodityHandler(event),
  updateCommodityHandler: event => updateCommodityHandler(event),
  getCommoditiesMockHandler,
};

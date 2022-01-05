const { handler, getCorsHeaders, getQueryParams, isEmpty, createResponse } = require('./utilities');
const { isUuid } = require('../utilities/isUuid');
// services
const Logic = require('../api/services/businessLogic/inventory-logic');
const CompositeLogic = require('../api/services/compositeLogic/upload-inventory-logic');
// mocks
const MockInventoryCommodity = require('../api/models/memoryDatabase/inventory-overview-list.json');
const MockInventoryRegrades = require('../api/models/memoryDatabase/inventory-regrades-list.json');
const MockInventoryFinishedGoods = require('../api/models/memoryDatabase/inventory-finished-goods-list.json');
const MockInventoryPackingLists = require('../api/models/memoryDatabase/inventory-packing-list.json');
const MockInventoryByCommodity = require('../api/models/memoryDatabase/inventory-by-commodity-aluminum.json');

const uploadInventoryHandler = handler(async event => {
  const cl = new CompositeLogic();
  const Items = await cl.inventoryUpload(event.user);
  return createResponse({ uploadedItems: Items }, 200);
});

const getInventoryByCommodityHandler = handler(async event => {
  const { pathParameters: { commodityId } } = event;
  const Item = isUuid(commodityId) ? await Logic.fetchByCommodityId(commodityId, event.user) :
    await Logic.fetchByCommodityName(commodityId, event.user);
  const statusCode = isEmpty(Item) ? 404 : 200;
  return createResponse(Item, statusCode);
});

const getInventoryCommodityHandler = handler(async event => {
  const Items = await Logic.fetchCommoditySummary(getQueryParams(event), event.user);
  return createResponse(Items, 200);
});

const getInventoryFinishedGoodListHandler = handler(async event => {
  const Items = await Logic.fetchFinishedGoodSummary(getQueryParams(event), event.user);
  return createResponse(Items, 200);
});

const getInventoryPackingListHandler = handler(async event => {
  const Items = await Logic.fetchPackingListMeta(getQueryParams(event), event.user);
  return createResponse(Items, 200);
});

const getInventoryRegradeListHandler = handler(async event => {
  const Items = await Logic.fetchRegradesMeta(getQueryParams(event), event.user);
  return createResponse(Items, 200);
});

const getInventoryCommodityMockHandler = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify(MockInventoryCommodity),
});

const getInventoryByCommodityMockHandler = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify(MockInventoryByCommodity),
});

const getInventoryRegradeListMockHandler = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify(MockInventoryRegrades),
});

const getInventoryFinishedGoodListMockHandler = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify(MockInventoryFinishedGoods),
});

const getInventoryPackingListMockHandler = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify(MockInventoryPackingLists),
});

module.exports = {
  uploadInventoryHandler: event => uploadInventoryHandler(event),
  getInventoryByCommodityHandler: event => getInventoryByCommodityHandler(event),
  getInventoryCommodityHandler: event => getInventoryCommodityHandler(event),
  getInventoryFinishedGoodListHandler: event => getInventoryFinishedGoodListHandler(event),
  getInventoryPackingListHandler: event => getInventoryPackingListHandler(event),
  getInventoryRegradeListHandler: event => getInventoryRegradeListHandler(event),
  getInventoryByCommodityMockHandler,
  getInventoryCommodityMockHandler,
  getInventoryRegradeListMockHandler,
  getInventoryFinishedGoodListMockHandler,
  getInventoryPackingListMockHandler,
};

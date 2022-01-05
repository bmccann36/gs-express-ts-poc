const { handler, getCorsHeaders, getQueryParams, isEmpty, createResponse, getS3params } = require('./utilities');
const MockInventory = require('../api/models/memoryDatabase/price-sheet-list.json');
const Logic = require('../api/services/businessLogic/price-sheet-logic');
const CompositeLogic = require('../api/services/compositeLogic/price-sheet-composite-logic');

const getPriceSheetListHandler = handler(async event => {
  const Items = await Logic.fetchAll(getQueryParams(event), event.user);
  return createResponse(Items, 200);
});

const uploadPriceSheetHandler = handler(async event => {
  const { S3, params } = getS3params();
  const cl = new CompositeLogic(S3, params);
  const Items = await cl.priceSheetUpload(event.user);
  return createResponse({ uploadedItems: Items }, 200);
});

const uploadUpdatePriceSheetHandler = handler(async event => {
  const { S3, updateParams } = getS3params();
  const cl = new CompositeLogic(S3, updateParams);
  const Items = await cl.priceSheetUploadUpdate(event.user);
  return createResponse({ uploadedItems: Items }, 200);
});

const getPriceSheetByIdHandler = handler(async event => {
  const { pathParameters: { priceSheetId } } = event;
  const Item = await Logic.fetch(priceSheetId, event.user);
  const statusCode = isEmpty(Item) ? 404 : 200;
  return createResponse(Item, statusCode);
});

const createPriceSheetHandler = handler(async event => {
  const NewItem = await Logic.create(event.body, event.user);
  return createResponse(NewItem, 200);
});

const updatePriceSheetHandler = handler(async event => {
  const NewItem = await Logic.update(event.body, event.user);
  const statusCode = isEmpty(NewItem) ? 404 : 200;
  return createResponse(NewItem, statusCode);
});

/**
 * Mock Handlers
 */
const getPriceSheetListMockHandler = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify(MockInventory),
});

const getPriceSheetListOptions = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify({ msg: 'Testing Option' }),
});

module.exports = {
  getPriceSheetListHandler: event => getPriceSheetListHandler(event),
  uploadPriceSheetHandler: event => uploadPriceSheetHandler(event),
  uploadUpdatePriceSheetHandler: event => uploadUpdatePriceSheetHandler(event),
  getPriceSheetByIdHandler: event => getPriceSheetByIdHandler(event),
  createPriceSheetHandler: event => createPriceSheetHandler(event),
  updatePriceSheetHandler: event => updatePriceSheetHandler(event),
  getPriceSheetListMockHandler,
  getPriceSheetListOptions,
};

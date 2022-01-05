const AWS = require('aws-sdk');
const { handler, getCorsHeaders, getQueryParams, isEmpty, createResponse } = require('./utilities');
const Logic = require('../api/services/businessLogic/material-type-logic');
const MockMaterialsList = require('../api/models/memoryDatabase/material-type-list.json');
const CompositeLogic = require('../api/services/compositeLogic/material-type-composite-logic');

const S3 = new AWS.S3();
const params = {
  Bucket: 'aws-us-east-2-088407289953-greenspark-aws-pipe',
  Key: 'upload.csv',
};
const updateParams = {
  Bucket: 'aws-us-east-2-088407289953-greenspark-aws-pipe',
  Key: 'material_type_update.csv',
};

const getMaterialTypesHandler = handler(async event => {
  const Items = await Logic.fetchAll(getQueryParams(event), event.user);
  return createResponse(Items, 200);
});

const uploadMaterialTypesHandler = handler(async event => {
  const cl = new CompositeLogic(S3, params);
  const Items = await cl.materialTypesAndCommoditiesUpload(event.user);
  return createResponse({ uploadedItems: Items }, 200);
});

const uploadUpdateMaterialTypesHandler = handler(async event => {
  const cl = new CompositeLogic(S3, updateParams);
  const Items = await cl.materialTypesAndCommoditiesUploadUpdate(event.user);
  return createResponse({ uploadedItems: Items }, 200);
});

const getMaterialTypeByIdHandler = handler(async event => {
  const { pathParameters: { materialTypeId } } = event;
  const Item = await Logic.fetch(materialTypeId, event.user);
  const statusCode = isEmpty(Item) ? 404 : 200;
  return createResponse(Item, statusCode);
});

const createMaterialTypeHandler = handler(async event => {
  const NewItem = await Logic.create(event.body, event.user);
  return createResponse(NewItem, 200);
});

const updateMaterialTypeHandler = handler(async event => {
  const NewItem = await Logic.update(event.body, event.user);
  const statusCode = isEmpty(NewItem) ? 404 : 200;
  return createResponse(NewItem, statusCode);
});

/**
 * Mock Handlers
 */
const getMaterialTypesMockHandler = async () => ({
  statusCode: 200,
  headers: getCorsHeaders(),
  body: JSON.stringify(MockMaterialsList),
});

module.exports = {
  getMaterialTypesHandler: event => getMaterialTypesHandler(event),
  uploadMaterialTypesHandler: event => uploadMaterialTypesHandler(event),
  uploadUpdateMaterialTypesHandler: event => uploadUpdateMaterialTypesHandler(event),
  getMaterialTypeByIdHandler: event => getMaterialTypeByIdHandler(event),
  createMaterialTypeHandler: event => createMaterialTypeHandler(event),
  updateMaterialTypeHandler: event => updateMaterialTypeHandler(event),
  getMaterialTypesMockHandler,
};

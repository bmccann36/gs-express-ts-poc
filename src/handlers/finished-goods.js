const Joi = require('joi');
const { getQueryParams, createResponse, createErrorResponse, handler } = require('./utilities');
const finishedGoodService = require('../api/services/businessLogic/finished-goods');
const materialTypeService = require('../api/services/businessLogic/material-type-logic');

const FinishedGoodRequestDTO = Joi.object({
  id: Joi.string().uuid(),
  type: Joi.allow('BALE', 'BOX', 'PALLET', 'OTHER').only().required(),
  materialTypeId: Joi.string().uuid().required(),
  notes: Joi.array().items(Joi.object()),
  weight: Joi.object({
    gross: Joi.number().greater(0).required(),
    net: Joi.number().greater(0).required(),
    tare: Joi.number().required(),
    units: Joi.string().required(),
  }).required(),
});

const get = handler(async event => {
  const { pathParameters: { id } } = event;
  const finishedGood = await finishedGoodService.fetch(id);
  return createResponse(finishedGood);
});

const list = handler(async event => {
  const { sort, filter, page, pageSize, fromKey } = getQueryParams(event);
  const finishedGoods = await finishedGoodService.fetchAll(sort, filter, page, pageSize, fromKey);
  return createResponse(finishedGoods);
});

const create = handler(async event => {
  const { error } = FinishedGoodRequestDTO.validate(event.body.finishedGood);
  if (error) {
    console.error('FinishedGoodHandler.create', 'VALIDATION ERROR:', error.message);
    throw error;
  }

  const materialType = await materialTypeService.fetch(event.body.finishedGood.materialTypeId, event.user);

  if (!materialType?.id) {
    return createErrorResponse(new Error('Material type not found!'), 404);
  }

  /* eslint-disable no-param-reassign */
  event.body.finishedGood.materialType = materialType;

  let finishedGood;
  try {
    finishedGood = await finishedGoodService.create(event.body.finishedGood, event.user.userId);
  } catch (err) {
    return createErrorResponse(err, err.isJoi ? 400 : 500);
  }

  return createResponse(finishedGood, 201);
});

const update = handler(async event => {
  const { pathParameters: { id } } = event;
  let finishedGood;
  try {
    finishedGood = await finishedGoodService.update({ ...event.body.finishedGood, id }, event.user);
  } catch (err) {
    return createErrorResponse(err, err.isJoi ? 400 : 500);
  }
  return createResponse(finishedGood);
});

const voidHandler = handler(async event => {
  try {
    const { pathParameters: { id } } = event;
    await finishedGoodService.void(id, event.user.userId);
    return createResponse(null, 204);
  } catch (error) {
    return createErrorResponse(error, 500);
  }
});

module.exports = {
  get: event => get(event),
  list: event => list(event),
  create: event => create(event),
  update: event => update(event),
  void: event => voidHandler(event),
  FinishedGoodRequestDTO,
};

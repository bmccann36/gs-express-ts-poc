const Joi = require('joi');
const { createResponse, handler, getQueryParams, isEmpty } = require('./utilities');
const OutboundTicketsLogic = require('../api/services/businessLogic/outbound-tickets-logic');

const OutboundTicketRequestDTO = Joi.object({
  id: Joi.string().uuid(),
  customerId: Joi.string().uuid().required(),
  packingListIds: Joi.array().items(Joi.string().uuid()).required(),
  finishedGoods: Joi.array().items(Joi.object({
    id: Joi.string().uuid().required(),
    weight: Joi.object({
      gross: Joi.number().not(0).required(),
      net: Joi.number().not(0).required(),
      tare: Joi.number(),
      units: Joi.string().required(), // TODO enumerate options
    }).required(),
  }).options({ allowUnknown: true })).required(),
  materialWeights: Joi.array().items(Joi.object({
    materialTypeId: Joi.string().uuid().required(),
    weight: Joi.number().required(),
  })).required(),
  transportationInfo: Joi.object().required(),
  status: Joi.string().valid('SHIPPED', 'CREATED', 'VOID'),
});

const get = handler(async event => {
  const { pathParameters: { id } } = event;
  const outboundTicket = await OutboundTicketsLogic.fetch(id);
  return createResponse(outboundTicket);
});

const list = handler(async event => {
  const { fromKey } = getQueryParams(event);
  const outboundTickets = await OutboundTicketsLogic.fetchAll(fromKey);
  return createResponse(outboundTickets, 200);
});

const create = handler(async event => {
  const { error } = OutboundTicketRequestDTO.validate(event.body);
  if (error) {
    console.error('VALIDATION ERROR:', error.message);
    throw error;
  }

  const outboundTicket = await OutboundTicketsLogic.create(event.body, event.user);
  return createResponse(outboundTicket, 201);
});

const update = handler(async event => {
  const { pathParameters: { id } } = event;

  if (!event.body.status) {
    throw new Error('status is required to update outbound ticket');
  }

  OutboundTicketRequestDTO.validate(event.body);

  const outboundTicketRequestDTO = {
    ...event.body,
    id,
  };

  const outboundTicket = await OutboundTicketsLogic.update(outboundTicketRequestDTO, event.user);
  return createResponse(outboundTicket, isEmpty(outboundTicket) ? 404 : 200);
});

const voidHandler = handler(async event => {
  const { pathParameters: { id } } = event;
  console.log(id);
  await OutboundTicketsLogic.void(id, event.user);

  createResponse(null, 204);
});

module.exports = {
  get: event => get(event),
  list: event => list(event),
  create: event => create(event),
  update: event => update(event),
  void: event => voidHandler(event),
  OutboundTicketRequestDTO,
};

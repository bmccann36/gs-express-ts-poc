const Joi = require('joi');

const weightSchema = Joi.object({
  amount: Joi.number(),
  units: Joi.string(),
  commonString: Joi.string(),
}).id('weightSchema');

const priceSchema = Joi.object({
  amount: Joi.number(),
  currency: Joi.string(),
  precision: Joi.number(),
  commonString: Joi.string(),
});

const weightAndPriceSchema = Joi.object({
  gross: weightSchema,
  tare: weightSchema,
  netWeight: weightSchema,
  um: Joi.string(),
  netPrice: priceSchema,
  netValue: priceSchema,
  deductions: Joi.array(),
});

const statusSchema = Joi.object({
  value: Joi.string().valid('CREATED', 'SWIP', 'WIP', 'FINISHEDGOOD', 'PACKINGLIST', 'CLOSED', 'ARCHIVED'),
  date: Joi.number(),
  userId: Joi.string(),
});

const schema = Joi.object({
  id: Joi.string(),
  materialTypeId: Joi.string().required(),
  materialType: Joi.object(),
  commodityId: Joi.string(),
  inboundTicketId: Joi.string().required(),
  outboundTicketId: Joi.string(),
  finishedGoodId: Joi.string().allow(''),
  weightAndPrice: weightAndPriceSchema,
  weightAndPriceHistory: Joi.array().items(weightAndPriceSchema),
  status: statusSchema.required(),
  statusHistory: Joi.array().items(statusSchema),
  archive: Joi.boolean(),
  GSI1PK: Joi.string(),
  GSI1SK: Joi.number(),
  GSI2PK: Joi.string(),
  GSI2SK: Joi.number(),
});

// GSI1PK material status - WIP
// GSI1SK date

// GSI2PK material status#materialTypeId - WIP#abc-123-1234
// GSI2PK date

exports.Validate = payload => schema.validate(payload);
exports.ValidateWAP = payload => weightAndPriceSchema.validate(payload);

const uuid = require('uuid');
const Joi = require('joi');
const { states } = require('../../../utilities/states');
const DB = require('../../loaders/database-loader').loadDB();

class CustomerLogic {
  // eslint-disable-next-line no-unused-vars
  static async fetchAll( queryParams, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Customers`;
    return DB.get(collection, queryParams.sort, queryParams.filter, queryParams.page,
      queryParams.pageSize, queryParams.fromKey);
  }

  // eslint-disable-next-line no-unused-vars
  static async fetch( customerId, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Customers`;
    return DB.getById(collection, customerId);
  }

  static async create( customer, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Customers`;
    const newCustomer = { ...customer, id: uuid.v4(), archive: false };
    const date = Date.now();
    newCustomer.status = {
      date,
      value: 'CREATED',
      userId: organizationInfo.userId,
    };
    newCustomer.statusHistory = [
      {
        date,
        value: 'CREATED',
        userId: organizationInfo.userId,
      },
    ];
    const { error: saveError } = this.schema.validate(newCustomer);
    if (saveError) throw saveError;
    return DB.create(collection, newCustomer);
  }

  static async update(id, customer, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Customers`;
    const status = {
      date: Date.now(),
      value: 'UPDATED',
      userId: organizationInfo.userId,
    };
    const { error: idError } = Joi.string().uuid().required().validate(id);
    if (idError) throw idError;
    const oldCustomer = await DB.getById(collection, id);
    if (!oldCustomer || !oldCustomer.id) return {}; // will return a 404
    const newCustomer = {
      ...customer,
      id,
      externalId: oldCustomer.externalId,
      status,
      statusHistory: [
        ...oldCustomer.statusHistory,
        status,
      ],
    };
    const { error: saveError } = this.schema.validate(newCustomer);
    if (saveError) throw saveError;
    return DB.update(collection, newCustomer);
  }
}

if (process.env.ENABLE_LEGACY_CUSTOMERS === '1') {
  CustomerLogic.schema = Joi.object({
    id: Joi.string().uuid().required(),
    customerCommonIdentifierString: Joi.string().required(),
  }).unknown();
} else {
  const customerStatusSchema = Joi.object({
    date: Joi.date().timestamp().required(),
    value: Joi.valid('CREATED', 'UPDATED').required(),
    userId: Joi.string().uuid().required(),
  });

  CustomerLogic.schema = Joi.object({
    id: Joi.string().uuid().required(),
    externalId: Joi.number().integer(),
    archive: Joi.boolean(),
    status: customerStatusSchema.required(),
    statusHistory: Joi.array().items(customerStatusSchema).min(1).required(),
    isSupplier: Joi.boolean(),
    isConsumer: Joi.boolean(),
    customerCommonIdentifierString: Joi.string().required(),
    companyName: Joi.string(),
    type: Joi.valid('retail', 'industrial').required(),
    vendorClass: Joi.when('type', {
      is: Joi.valid('industrial'),
      then: Joi.valid('demolition', 'construction', 'manufacturing'),
      otherwise: Joi.valid('retail-preferred'),
    }),
    priceSheetId: Joi.string().uuid(),
    buysForbidden: Joi.boolean(),
    notes: Joi.string(),
    locations: Joi.array().items(Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      address1: Joi.string().required(),
      address2: Joi.string(),
      city: Joi.string().required(),
      state: Joi.valid(...states).required(),
      zip: Joi.string().required(),
      isCorporate: Joi.boolean(),
      isShipping: Joi.boolean(),
      primaryContactId: Joi.string().uuid(),
      notes: Joi.string(),
    })).min(1).required(),
    vehicles: Joi.array().items(Joi.object({
      plateNumber: Joi.string().required(),
      plateState: Joi.valid(...states).required(),
      make: Joi.string(),
      model: Joi.string(),
      body: Joi.string(),
      color: Joi.string(),
      titleNumber: Joi.string(),
      titleState: Joi.valid(...states),
      registrationExpiration: Joi.date().timestamp(),
    })),
    contacts: Joi.array().items(Joi.object({
      id: Joi.string().uuid().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      phone1: Joi.number().integer(),
      phone2: Joi.number().integer(),
      email: Joi.string().email(),
      locationId: Joi.string().uuid(),
      role: Joi.string(),
      notes: Joi.string(),
      firstNameLegal: Joi.string(),
      lastNameLegal: Joi.string(),
      address1: Joi.string(),
      address2: Joi.string(),
      city: Joi.string(),
      state: Joi.valid(...states),
      zip: Joi.string(),
      idType: Joi.valid('license'),
      licenseNumber: Joi.string(),
      licenseExpiration: Joi.date().timestamp(),
      height: Joi.string(),
      eyes: Joi.string(),
      gender: Joi.string(),
      hair: Joi.string(),
    })).min(1).required(),
  })
    .when( // for allowing ticket uploads
      Joi.object({
        customerCommonIdentifierString: Joi.valid('Preexisting Inventory'),
      }).unknown(),
      {
        then: Joi.object({
          type: Joi.optional(),
          locations: Joi.optional(),
          contacts: Joi.optional(),
        }),
      }
    );
}

module.exports = CustomerLogic;

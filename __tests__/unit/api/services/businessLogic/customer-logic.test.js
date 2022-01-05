const Joi = require('joi');

const mockDb = {
  getById: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  writeItemsArrayWithTransaction: jest.fn(),
};
const CustomerLogic = require('../../../../../src/api/services/businessLogic/customer-logic');
const { states } = require('../../../../../src/utilities/states');

jest.mock('../../../../../src/api/loaders/database-loader', () => ( { loadDB: () => mockDb } ));

const fakeUuid = '00000000-0000-0000-0000-000000000000';
const organizationInfo = {
  organization: 'hulk_smash',
  yard: 'yard1',
  userId: fakeUuid,
};

describe('Test Customer Logic', () => {
  describe('fetchAll', () => {
    it('fetches all customers for a yard', async () => {
      // Arrange
      mockDb.get.mockResolvedValueOnce({ Items: [{}, {}] });
      // Act
      const customers = await CustomerLogic.fetchAll({}, organizationInfo);
      // Assert
      expect(customers.Items.length).toBe(2);
    });
  });

  describe('fetch', () => {
    it('fetch customer by Id', async () => {
      // Arrange
      const customerId = 'fake-id';
      const mockCustomer = { id: customerId };
      mockDb.getById.mockResolvedValueOnce(mockCustomer);
      // Act
      const customer = await CustomerLogic.fetch(customerId, organizationInfo);
      // Assert
      expect(customer).toStrictEqual(mockCustomer);
    });
  });

  describe('create', () => {
    it('allows creation of valid customer', async () => {
      // Arrange
      const customer = {
        type: 'retail',
        customerCommonIdentifierString: 'Chaos, Inc.',
        locations: [{
          id: fakeUuid,
          name: 'The Seventh Circle of Hell',
          address1: '7 Hell Circle',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
        }],
        contacts: [{
          id: fakeUuid,
          firstName: 'Lucifer',
          lastName: 'Satan',
        }],
      };
      mockDb.create.mockImplementationOnce((...args) => args);
      // Act
      const result = await CustomerLogic.create(customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).not.toBeInstanceOf(Error);
    });

    it('does not allow creation of customer with unexpected properties', async () => {
      // Arrange
      const customer = {
        type: 'retail',
        customerCommonIdentifierString: 'Chaos, Inc.',
        locations: [{
          id: fakeUuid,
          name: 'The Seventh Circle of Hell',
          address1: '7 Hell Circle',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
        }],
        contacts: [{
          id: fakeUuid,
          firstName: 'Lucifer',
          lastName: 'Satan',
        }],
        randomProperty: true, // not in schema
      };
      // Act
      const result = await CustomerLogic.create(customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Joi.ValidationError);
      expect(result.details[ 0 ].path[ 0 ]).toBe('randomProperty');
    });

    it('does not allow retail customer to have industrial vendor class', async () => {
      // Arrange
      const customer = {
        type: 'retail',
        vendorClass: 'demolition', // industrial vendor class
        customerCommonIdentifierString: 'Chaos, Inc.',
        locations: [{
          id: fakeUuid,
          name: 'The Seventh Circle of Hell',
          address1: '7 Hell Circle',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
        }],
        contacts: [{
          id: fakeUuid,
          firstName: 'Lucifer',
          lastName: 'Satan',
        }],
      };
      // Act
      const result = await CustomerLogic.create(customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Joi.ValidationError);
      expect(result.details[ 0 ].path[ 0 ]).toBe('vendorClass');
    });

    it('does not allow customer to have no locations', async () => {
      // Arrange
      const customer = {
        type: 'industrial',
        vendorClass: 'demolition',
        customerCommonIdentifierString: 'Chaos, Inc.',
        locations: [],
        contacts: [{
          id: fakeUuid,
          firstName: 'Lucifer',
          lastName: 'Satan',
        }],
      };
      // Act
      const result = await CustomerLogic.create(customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Joi.ValidationError);
      expect(result.details[ 0 ].path[ 0 ]).toBe('locations');
    });

    it('does not allow customer to have no contacts', async () => {
      // Arrange
      const customer = {
        type: 'retail',
        vendorClass: 'retail-preferred',
        customerCommonIdentifierString: 'Chaos, Inc.',
        locations: [{
          id: fakeUuid,
          name: 'The Seventh Circle of Hell',
          address1: '7 Hell Circle',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
        }],
        contacts: [],
      };
      // Act
      const result = await CustomerLogic.create(customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Joi.ValidationError);
      expect(result.details[ 0 ].path[ 0 ]).toBe('contacts');
    });

    it('allows creation of customer with all possible fields', async () => {
      // Arrange
      const customer = {
        type: 'retail',
        customerCommonIdentifierString: 'Chaos, Inc.',
        isSupplier: true,
        isConsumer: false,
        priceSheetId: fakeUuid,
        locations: [{
          id: fakeUuid,
          name: 'The Seventh Circle of Hell',
          address1: '7 Hell Circle',
          address2: 'PO Box 666',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
          isCorporate: true,
          isShipping: false,
          primaryContactId: fakeUuid,
          notes: 'Make sure to bring a goat.',
        }],
        vehicles: [{
          plateNumber: '123abc',
          plateState: states[ 9 ],
          make: 'Lamborghini',
          model: 'Diablo',
          body: 'rocket ship',
          color: 'red',
          titleNumber: '666BAAL666',
          titleState: states[ 19 ],
          registrationExpiration: Date.now(),
        }],
        contacts: [{
          id: fakeUuid,
          firstName: 'Lucifer',
          lastName: 'Satan',
          phone1: 6666666666,
          phone2: 6666666666,
          email: 'luci@hell.com',
          locationId: fakeUuid,
          role: 'Prince of Darkness, Antichrist, Personification of Evil',
          notes: 'Likes spicy food.',
          firstNameLegal: 'Lucifer',
          lastNameLegal: 'Mephistopheles',
          address1: '7 Hell Circle',
          address2: 'PO Box 666',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
          idType: 'license',
          licenseNumber: '666BAAL666',
          licenseExpiration: Date.now(),
          height: '5\'7"',
          eyes: 'red',
          gender: 'X',
          hair: 'black',
        }],
      };
      mockDb.create.mockImplementation((...args) => args);
      // Act
      const result = await CustomerLogic.create(customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).not.toBeInstanceOf(Error);
    });
  });

  describe('update', () => {
    it('allows update of customer with basic info', async () => {
      // Arrange
      const customer = {
        id: fakeUuid,
        type: 'retail',
        customerCommonIdentifierString: 'Chaos, Inc.',
        locations: [{
          id: fakeUuid,
          name: 'The Seventh Circle of Hell',
          address1: '7 Hell Circle',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
        }],
        contacts: [{
          id: fakeUuid,
          firstName: 'Lucifer',
          lastName: 'Satan',
        }],
      };
      const statusHistory = [{ value: 'CREATED', date: 1, userId: fakeUuid }];
      mockDb.getById.mockResolvedValueOnce({ id: fakeUuid, statusHistory });
      mockDb.update.mockImplementationOnce((...args) => args);
      // Act
      const result = await CustomerLogic.update(customer.id, customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).not.toBeInstanceOf(Error);
      expect(result[ 1 ].statusHistory[ 0 ]).toStrictEqual(statusHistory[ 0 ]);
      expect(result[ 1 ].statusHistory[ 1 ]).toMatchObject({ userId: fakeUuid, value: 'UPDATED' });
    });

    it('returns empty object when customer not found', async () => {
      // Arrange
      const customer = {
        id: fakeUuid,
        type: 'retail',
        vendorClass: 'demolition', // industrial vendor class
        customerCommonIdentifierString: 'Chaos, Inc.',
        locations: [{
          id: fakeUuid,
          name: 'The Seventh Circle of Hell',
          address1: '7 Hell Circle',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
        }],
        contacts: [{
          id: fakeUuid,
          firstName: 'Lucifer',
          lastName: 'Satan',
        }],
      };
      mockDb.getById.mockResolvedValueOnce({});
      // Act
      const result = await CustomerLogic.update(customer.id, customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).not.toBeInstanceOf(Error);
      expect(result).toStrictEqual({});
    });

    it('does not allow update of customer with unexpected properties', async () => {
      // Arrange
      const customer = {
        id: fakeUuid,
        type: 'retail',
        customerCommonIdentifierString: 'Chaos, Inc.',
        locations: [{
          id: fakeUuid,
          name: 'The Seventh Circle of Hell',
          address1: '7 Hell Circle',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
        }],
        contacts: [{
          id: fakeUuid,
          firstName: 'Lucifer',
          lastName: 'Satan',
        }],
        randomProperty: true, // not in schema
      };
      const statusHistory = [{ value: 'CREATED', date: 1, userId: fakeUuid }];
      mockDb.getById.mockResolvedValueOnce({ id: fakeUuid, statusHistory });
      // Act
      const result = await CustomerLogic.update(customer.id, customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Joi.ValidationError);
      expect(result.details[ 0 ].path[ 0 ]).toBe('randomProperty');
    });

    it('does not allow retail customer to have industrial vendor class', async () => {
      // Arrange
      const customer = {
        id: fakeUuid,
        type: 'retail',
        vendorClass: 'demolition', // industrial vendor class
        customerCommonIdentifierString: 'Chaos, Inc.',
        locations: [{
          id: fakeUuid,
          name: 'The Seventh Circle of Hell',
          address1: '7 Hell Circle',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
        }],
        contacts: [{
          id: fakeUuid,
          firstName: 'Lucifer',
          lastName: 'Satan',
        }],
      };
      const statusHistory = [{ value: 'CREATED', date: 1, userId: fakeUuid }];
      mockDb.getById.mockResolvedValueOnce({ id: fakeUuid, statusHistory });
      // Act
      const result = await CustomerLogic.update(customer.id, customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Joi.ValidationError);
      expect(result.details[ 0 ].path[ 0 ]).toBe('vendorClass');
    });

    it('does not allow customer to have no locations', async () => {
      // Arrange
      const customer = {
        id: fakeUuid,
        type: 'industrial',
        vendorClass: 'demolition',
        customerCommonIdentifierString: 'Chaos, Inc.',
        locations: [],
        contacts: [{
          id: fakeUuid,
          firstName: 'Lucifer',
          lastName: 'Satan',
        }],
      };
      const statusHistory = [{ value: 'CREATED', date: 1, userId: fakeUuid }];
      mockDb.getById.mockResolvedValueOnce({ id: fakeUuid, statusHistory });
      // Act
      const result = await CustomerLogic.update(customer.id, customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Joi.ValidationError);
      expect(result.details[ 0 ].path[ 0 ]).toBe('locations');
    });

    it('does not allow customer to have no contacts', async () => {
      // Arrange
      const customer = {
        id: fakeUuid,
        type: 'retail',
        vendorClass: 'retail-preferred',
        customerCommonIdentifierString: 'Chaos, Inc.',
        locations: [{
          id: fakeUuid,
          name: 'The Seventh Circle of Hell',
          address1: '7 Hell Circle',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
        }],
        contacts: [],
      };
      const statusHistory = [{ value: 'CREATED', date: 1, userId: fakeUuid }];
      mockDb.getById.mockResolvedValueOnce({ id: fakeUuid, statusHistory });
      // Act
      const result = await CustomerLogic.update(customer.id, customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Joi.ValidationError);
      expect(result.details[ 0 ].path[ 0 ]).toBe('contacts');
    });

    it('allows update of customer with all possible fields', async () => {
      // Arrange
      const customer = {
        id: fakeUuid,
        externalId: 1,
        type: 'retail',
        vendorClass: 'retail-preferred',
        isSupplier: true,
        isConsumer: false,
        customerCommonIdentifierString: 'Chaos, Inc.',
        companyName: 'Chaos, Inc.',
        priceSheetId: fakeUuid,
        buysForbidden: false,
        locations: [{
          id: fakeUuid,
          name: 'The Seventh Circle of Hell',
          address1: '7 Hell Circle',
          address2: 'PO Box 666',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
          isCorporate: true,
          isShipping: false,
          primaryContactId: fakeUuid,
          notes: 'Make sure to bring a goat.',
        }],
        vehicles: [{
          plateNumber: '123abc',
          plateState: states[ 9 ],
          make: 'Lamborghini',
          model: 'Diablo',
          body: 'rocket ship',
          color: 'red',
          titleNumber: '666BAAL666',
          titleState: states[ 19 ],
          registrationExpiration: Date.now(),
        }],
        contacts: [{
          id: fakeUuid,
          firstName: 'Lucifer',
          lastName: 'Satan',
          phone1: 6666666666,
          phone2: 6666666666,
          email: 'luci@hell.com',
          locationId: fakeUuid,
          role: 'Prince of Darkness, Antichrist, Personification of Evil',
          notes: 'Likes spicy food.',
          firstNameLegal: 'Lucifer',
          lastNameLegal: 'Mephistopheles',
          address1: '7 Hell Circle',
          address2: 'PO Box 666',
          city: 'Pandemonium',
          state: states[ 0 ],
          zip: '00000',
          idType: 'license',
          licenseNumber: '666BAAL666',
          licenseExpiration: Date.now(),
          height: '5\'7"',
          eyes: 'red',
          gender: 'X',
          hair: 'black',
        }],
      };
      const statusHistory = [{ value: 'CREATED', date: 1, userId: fakeUuid }];
      mockDb.getById.mockResolvedValueOnce({ id: fakeUuid, statusHistory });
      mockDb.update.mockImplementation((...args) => args);
      // Act
      const result = await CustomerLogic.update(customer.id, customer, organizationInfo).catch(err => err);
      // Assert
      expect(result).not.toBeInstanceOf(Error);
    });
  });
});

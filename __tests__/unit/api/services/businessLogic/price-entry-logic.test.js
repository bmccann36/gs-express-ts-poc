const PriceEntryLogic = require('../../../../../src/api/services/businessLogic/price-entry-logic');
const MockDB = require('../../../../../src/api/models/memoryDatabase/mock-db');

const organizationInfo = {
  organization: 'hulk_smash',
  yard: 'yard1',
  userId: 'testuser',
};

describe('Test PriceEntry Logic', () => {
  it('fetch all priceEntries', async () => {
    MockDB.resetDB();
    const priceEntries = await PriceEntryLogic.fetchAll({}, organizationInfo);
    expect(priceEntries.Items.length).toBe(0);
  });

  it('fetch nonexistent priceEntry by Id', async () => {
    MockDB.resetDB();
    const priceEntry = await PriceEntryLogic.priceEntryFetch('fake-id', organizationInfo);
    expect(priceEntry).toStrictEqual({});
  });

  it('create & update priceEntry', async () => {
    MockDB.resetDB();
    const date = Date.now();
    const price = {
      amount: 200,
      currency: 'USD',
      precision: 2,
      commonString: '$2.00',
    };
    const result = await PriceEntryLogic.priceEntryCreate({
      materialId: '7307e828-9953-4405-b0ec-188aa4915772',
      priceType: 'SPOT',
      price,
      weightUnits: 'LBS',
      date,
      priceSheetId: 'test1',
    }, organizationInfo);
    expect(result).toBeDefined();
    const check = await PriceEntryLogic.priceEntryFetch(result.id, organizationInfo);
    expect(check.id).toBe(result.id);
    expect(check.priceType).toBe('SPOT');
    expect(check.date).toBe(date);
    expect(check.price).toStrictEqual(price);

    const date2 = Date.now();
    const price2 = {
      amount: 250,
      currency: 'USD',
      precision: 2,
      commonString: '$2.50',
    };
    const result2 = await PriceEntryLogic.priceEntryUpdate({
      id: check.id,
      materialId: '7307e828-9953-4405-b0ec-188aa4915772',
      priceType: 'SPOT',
      price: price2,
      weightUnits: 'LBS',
      date: date2,
      priceSheetId: 'test1',
    }, organizationInfo);
    expect(result2).toBeDefined();
    const check2 = await PriceEntryLogic.priceEntryFetch(result2.id, organizationInfo);
    expect(check2.id).toBe(result2.id);
    expect(check2.priceType).toBe('SPOT');
    expect(check2.date).toBe(date2);
    expect(check2.price).toStrictEqual(price2);

    const priceEntries = await PriceEntryLogic.fetchAll({}, organizationInfo);
    expect(priceEntries.Items.length).toBe(1);
  });
});

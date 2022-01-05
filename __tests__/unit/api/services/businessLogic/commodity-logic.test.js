const CommodityLogic = require('../../../../../src/api/services/businessLogic/commodity-logic');
const MockDB = require('../../../../../src/api/models/memoryDatabase/mock-db');

const organizationInfo = {
  organization: 'hulk_smash',
  yard: 'yard1',
  user: 'testuser',
};

describe('Test Commodity Logic', () => {
  it('fetch all commodities', async () => {
    MockDB.resetDB();
    const commodities = await CommodityLogic.fetchAll({}, organizationInfo);
    expect(commodities.Items.length).toBe(3);
    // TODO order is not guaranteed with a DB so this may have to be refactored
    expect(commodities.Items[ 0 ].id).toBe('7307e828-9953-4405-b0ec-188aa4915772');
    expect(commodities.Items[ 0 ].name).toBe('Copper');
    expect(commodities.Items[ 0 ].type).toBe('NON_FERROUS');
    expect(commodities.Items[ 1 ].id).toBe('7307e828-9953-4405-b0ec-188aa4915773');
    expect(commodities.Items[ 1 ].name).toBe('Steel');
    expect(commodities.Items[ 1 ].type).toBe('FERROUS');
    expect(commodities.Items[ 2 ].id).toBe('4fb99630-3eba-4d10-9b7b-33dc85828c37');
    expect(commodities.Items[ 2 ].name).toBe('Waste Product');
    expect(commodities.Items[ 2 ].type).toBe('WASTE');
  });

  it('fetch commodity copper by Id', async () => {
    MockDB.resetDB();
    const commodity = await CommodityLogic.fetch('7307e828-9953-4405-b0ec-188aa4915772', organizationInfo);
    expect(commodity.id).toBe('7307e828-9953-4405-b0ec-188aa4915772');
    expect(commodity.name).toBe('Copper');
    expect(commodity.type).toBe('NON_FERROUS');
  });

  it('fetch commodity waste by Id', async () => {
    MockDB.resetDB();
    const commodity = await CommodityLogic.fetch('4fb99630-3eba-4d10-9b7b-33dc85828c37', organizationInfo);
    expect(commodity.id).toBe('4fb99630-3eba-4d10-9b7b-33dc85828c37');
    expect(commodity.name).toBe('Waste Product');
    expect(commodity.type).toBe('WASTE');
  });

  it('fetch nonexistant commodity by Id', async () => {
    MockDB.resetDB();
    const commodity = await CommodityLogic.fetch('fake_id', organizationInfo);
    expect(commodity)
      .toStrictEqual(
        {}
      );
  });

  it('create commodity', async () => {
    MockDB.resetDB();
    const result = await CommodityLogic.create({
      name: 'Aluminum',
      type: 'NON_FERROUS',
    }, organizationInfo);
    expect(result).toBeDefined();
    const check = await CommodityLogic.fetch(result.id, organizationInfo);
    expect(check.id).toBe(result.id);
    expect(check.name).toBe('Aluminum');
    expect(check.type).toBe('NON_FERROUS');
  });

  it('update commodity', async () => {
    MockDB.resetDB();
    const result = await CommodityLogic.update({
      name: 'NewCopper',
      type: 'NON_FERROUS',
      id: '7307e828-9953-4405-b0ec-188aa4915772',
    }, organizationInfo);
    expect(result).toStrictEqual(
      {
        id: '7307e828-9953-4405-b0ec-188aa4915772',
        name: 'NewCopper',
        type: 'NON_FERROUS',
      }
    );
  });
});

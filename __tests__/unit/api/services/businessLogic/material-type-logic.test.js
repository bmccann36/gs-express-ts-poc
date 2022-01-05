const MaterialLogic = require('../../../../../src/api/services/businessLogic/material-type-logic');
const MockDB = require('../../../../../src/api/models/memoryDatabase/mock-db');

const organizationInfo = {
  organization: 'hulk_smash',
  yard: 'yard1',
  userId: 'testuser',
};

describe('Test Material Type Logic', () => {
  test('fetch all materials', async () => {
    MockDB.resetDB();
    const materials = await MaterialLogic.fetchAll({}, organizationInfo);
    expect(materials.page).toBe(1);
    expect(materials.resultsReturned).toBe(4);
    expect(materials.Items).toHaveLength(4);
    expect(materials.Items[ 0 ]).toStrictEqual(
      {
        id: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
        code: '61',
        commonName: '#1 Copper',
        commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
        archive: false,
        commodity: {
          id: '7307e828-9953-4405-b0ec-188aa4915772',
          name: 'Copper',
          type: 'NON_FERROUS',
          archive: false,
        },
      }
    );
    expect(materials.Items[ 3 ]).toStrictEqual(
      {
        id: '3f063b1f-67e6-4e6a-8347-b74617b6ad29',
        code: '101',
        commonName: 'Grease',
        commodityId: '4fb99630-3eba-4d10-9b7b-33dc85828c37',
        archive: false,
        commodity: {
          id: '4fb99630-3eba-4d10-9b7b-33dc85828c37',
          name: 'Waste Product',
          type: 'WASTE',
          archive: false,
        },
      }
    );
  });

  test('fetch material by Id', async () => {
    MockDB.resetDB();
    const material = await MaterialLogic.fetch('a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791', organizationInfo);
    expect(material)
      .toStrictEqual(
        {
          id: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
          code: '61',
          commonName: '#1 Copper',
          commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
          archive: false,
          commodity: {
            id: '7307e828-9953-4405-b0ec-188aa4915772',
            name: 'Copper',
            type: 'NON_FERROUS',
            archive: false,
          },
        }
      );
    expect(await MaterialLogic.fetch('fake_id', organizationInfo))
      .toStrictEqual(
        {}
      );
  });

  test('create material', async () => {
    MockDB.resetDB();
    const result = await MaterialLogic.create(
      {
        code: '62',
        commonName: '#2 Copper',
        commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
      }, organizationInfo
    );
    expect(result.id).toBeDefined();
    expect(await MaterialLogic.fetch(result.id, organizationInfo))
      .toStrictEqual(
        {
          id: result.id,
          code: '62',
          commonName: '#2 Copper',
          commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
          archive: false,
          commodity: {
            id: '7307e828-9953-4405-b0ec-188aa4915772',
            name: 'Copper',
            type: 'NON_FERROUS',
            archive: false,
          },
        }
      );
    const material = await MaterialLogic.fetchAll({}, organizationInfo);
    expect(material).toHaveProperty('resultsReturned');
    expect(material.resultsReturned).toBe(5);
  });

  test('update material', async () => {
    MockDB.resetDB();
    const materialType = {
      id: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
      code: '61',
      commonName: '#1 Copper Update',
      commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
    };
    const result = await MaterialLogic.update(materialType, organizationInfo);
    expect(result.id).toBeDefined();
    expect(await MaterialLogic.fetch(result.id, organizationInfo))
      .toStrictEqual(
        {
          id: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
          code: '61',
          commonName: '#1 Copper Update',
          commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
          archive: false,
          commodity: {
            id: '7307e828-9953-4405-b0ec-188aa4915772',
            name: 'Copper',
            type: 'NON_FERROUS',
            archive: false,
          },
        }
      );

    expect(await MaterialLogic.update(
      {
        id: 'fake_id',
        code: '61',
        commonName: '#1 Copper Update',
        commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
      }, organizationInfo
    ))
      .toStrictEqual({});
    MockDB.resetDB();
  });
});

const MaterialLogic = require('../../../../../src/api/services/businessLogic/material-logic');
const MockDB = require('../../../../../src/api/models/memoryDatabase/mock-db');
const priceUtility = require('../../../../../src/utilities/price-utility');
const weightUtility = require('../../../../../src/utilities/weight-utility');
const [ expectedMaterial ] = require('../../../../../src/api/models/memoryDatabase/material-list.json').Items;

const organizationInfo = {
  organization: 'hulk_smash',
  yard: 'yard1',
  userId: 'testuser',
};

describe('Test Material Logic', () => {
  it('getNetValueSumFromMaterials works', () => {
    const netValue1 = priceUtility.getValueFromNumber(100);
    const netValue2 = priceUtility.getValueFromNumber(200);
    const netValue3 = priceUtility.getValueFromNumber(300);

    const m1 = { weightAndPrice: { netValue: netValue1 } };
    const m2 = { weightAndPrice: { netValue: netValue2 } };
    const m3 = { weightAndPrice: { netValue: netValue3 } };

    const netValueSum = MaterialLogic.getNetValueSumFromMaterials([ m1, m2, m3 ]);
    expect(netValueSum).toEqual(priceUtility.getValueFromNumber(600));
  });

  it('getNetWeightSumFromMaterials works', () => {
    const netWeight1 = weightUtility.getWeightSchema(100);
    const netWeight2 = weightUtility.getWeightSchema(200);
    const netWeight3 = weightUtility.getWeightSchema(300);

    const m1 = { weightAndPrice: { netWeight: netWeight1 } };
    const m2 = { weightAndPrice: { netWeight: netWeight2 } };
    const m3 = { weightAndPrice: { netWeight: netWeight3 } };

    const netValueSum = MaterialLogic.getNetWeightSumFromMaterials([ m1, m2, m3 ]);
    expect(netValueSum).toEqual(600);
  });

  it('fetch all materials: expect 1 material', async () => {
    MockDB.resetDB();
    const queryParms = {
      sort: {},
      filter: {},
      page: 1,
      pageSize: 10,
      fromKey: '',
    };
    const materials = await MaterialLogic.fetchAll(queryParms, organizationInfo);
    expect(materials.resultsReturned).toBe(4);
    expect(materials.Items.length).toBe(4);
    expect(materials.pageSize).toBe(10);
    const [ actualMaterial ] = materials.Items;
    for (const [ key ] of Object.entries(expectedMaterial)) {
      expect(actualMaterial[ key ]).toStrictEqual(expectedMaterial[ key ]);
    }
  });

  it('fetch all materials: page 2 should return 0 results', async () => {
    MockDB.resetDB();
    const queryParms = {
      sort: {},
      filter: {},
      page: 2,
      pageSize: 10,
      fromKey: '',
    };
    const materials = await MaterialLogic.fetchAll(queryParms, organizationInfo);
    expect(materials.resultsReturned).toBe(0);
    expect(materials.Items.length).toBe(0);
  });
  it('fetch all materials: pageSize 2 should return 2 results', async () => {
    MockDB.resetDB();
    const queryParms = {
      sort: {},
      filter: {},
      page: 1,
      pageSize: 2,
      fromKey: '',
    };
    const materials = await MaterialLogic.fetchAll(queryParms, organizationInfo);
    expect(materials.resultsReturned).toBe(2);
    expect(materials.Items.length).toBe(2);
    expect(materials.pageSize).toBe(2);
  });

  it('fetch nonexistent material by Id', async () => {
    MockDB.resetDB();
    const material = await MaterialLogic.fetch('fake-id', organizationInfo);
    expect(material).toStrictEqual({});
  });
  it('fetch existing material by Id', async () => {
    MockDB.resetDB();
    const material = await MaterialLogic.fetch('7a6ce777-2cdb-4587-bcc1-c5af61402182',
      organizationInfo);
    expect(material).toBeDefined();
    expect(material).toHaveProperty('id');
  });

  it('create & update material', async () => {
    MockDB.resetDB();
    const material = {
      materialTypeId: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
      inboundTicketId: 'ticket1',
      weightAndPrice: {
        gross: {
          amount: 3973,
          units: 'lbs',
          commonString: '3973 lbs',
        },
        tare: {
          amount: 10,
          units: 'lbs',
          commonString: '10 lbs',
        },
        deductions: [],
        netWeight: {
          amount: 3963,
          units: 'lbs',
          commonString: '3963 lbs',
        },
        um: 'lbs',
        netPrice: {
          commonString: '$0.25/lb',
          currency: 'USD',
          precision: 2,
          amount: 25,
        },
        netValue: {
          commonString: '$990.75',
          currency: 'USD',
          precision: 2,
          amount: 99075,
        },
      },
      weightAndPriceHistory: [],
      status: {},
      statusHistory: [],
    };
    const actualCreate = await MaterialLogic.create(material, organizationInfo);
    expect(actualCreate).toBeDefined();
    expect(actualCreate).toHaveProperty('id');
    expect(actualCreate.materialTypeId).toBe('a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791');
    expect(actualCreate.inboundTicketId).toBe('ticket1');

    expect(actualCreate.status.value).toBe('CREATED');
    expect(actualCreate.status.userId).toBe('testuser');
    expect(actualCreate.status.date).toBeDefined();
    expect(actualCreate.statusHistory).toHaveLength(1);
    const [ statusHistoryItem ] = actualCreate.statusHistory;
    expect(statusHistoryItem.value).toBe('CREATED');
    expect(statusHistoryItem.userId).toBe('testuser');
    expect(statusHistoryItem.date).toBeDefined();

    const { weightAndPrice } = actualCreate;
    expect(weightAndPrice.gross.amount).toBe(3973);
    expect(weightAndPrice.tare.amount).toBe(10);
    expect(weightAndPrice.netWeight.amount).toBe(3963);

    expect(weightAndPrice.netPrice.amount).toBe(25);
    expect(weightAndPrice.netPrice.precision).toBe(2);

    expect(weightAndPrice.netValue).toStrictEqual({
      commonString: '$990.75',
      currency: 'USD',
      precision: 2,
      amount: 99075,
    });
    expect(weightAndPrice.um).toBe('lbs');
    expect(weightAndPrice.deductions).toStrictEqual([]);

    const [ weightAndPriceHistoryItem ] = actualCreate.weightAndPriceHistory;
    expect(weightAndPriceHistoryItem.gross).toStrictEqual({
      amount: 3973,
      units: 'lbs',
      commonString: '3973 lbs',
    });
    expect(weightAndPriceHistoryItem.tare).toStrictEqual({
      amount: 10,
      units: 'lbs',
      commonString: '10 lbs',
    });
    expect(weightAndPriceHistoryItem.netWeight).toStrictEqual({
      amount: 3963,
      units: 'lbs',
      commonString: '3963 lbs',
    });
    expect(weightAndPriceHistoryItem.netPrice.amount).toBe(25);
    expect(weightAndPriceHistoryItem.netPrice.precision).toBe(2);
    expect(weightAndPriceHistoryItem.netValue.amount).toBe(99075);
    expect(weightAndPriceHistoryItem.netValue.precision).toBe(2);

    expect(weightAndPriceHistoryItem.um).toBe('lbs');
    expect(weightAndPriceHistoryItem.deductions).toStrictEqual([]);

    const updatedMaterial = { ...actualCreate };
    updatedMaterial.weightAndPrice.netPrice.amount = 35;
    updatedMaterial.weightAndPrice.netPrice.commonString = '$0.35/lb';
    updatedMaterial.status.value = 'WIP';
    updatedMaterial.weightAndPrice.netWeight.amount = 3000;
    updatedMaterial.weightAndPrice.netWeight.commonString = '3000 lbs';
    updatedMaterial.weightAndPrice.tare.amount = 973;
    updatedMaterial.weightAndPrice.tare.commonString = '973 lbs';

    const actualUpdate = await MaterialLogic.update(updatedMaterial, organizationInfo);
    expect(actualUpdate.status.value).toBe('WIP');
    expect(actualUpdate.status.userId).toBe('testuser');
    expect(actualUpdate.status.date).toBeDefined();
    expect(actualUpdate.statusHistory).toHaveLength(2);
    const statusHistoryItem1 = actualUpdate.statusHistory[ 0 ];
    expect(statusHistoryItem1.value).toBe('CREATED');
    expect(statusHistoryItem1.userId).toBe('testuser');
    expect(statusHistoryItem1.date).toBeDefined();
    const statusHistoryItem2 = actualUpdate.statusHistory[ 1 ];
    expect(statusHistoryItem2.value).toBe('WIP');
    expect(statusHistoryItem2.userId).toBe('testuser');
    expect(statusHistoryItem2.date).toBeDefined();
    const weightAndPriceUpdated = actualUpdate.weightAndPrice;
    expect(weightAndPriceUpdated.gross).toStrictEqual({
      amount: 3973,
      units: 'lbs',
      commonString: '3973 lbs',
    });
    expect(weightAndPriceUpdated.tare).toStrictEqual({
      amount: 973,
      units: 'lbs',
      commonString: '973 lbs',
    });
    expect(weightAndPriceUpdated.netWeight).toStrictEqual({
      amount: 3000,
      units: 'lbs',
      commonString: '3000 lbs',
    });
    expect(weightAndPriceUpdated.netPrice.amount).toBe(35);
    expect(weightAndPriceUpdated.netPrice.precision).toBe(2);
    expect(weightAndPriceUpdated.netValue.amount).toBe(99075);
    expect(weightAndPriceUpdated.netValue.precision).toBe(2);

    expect(weightAndPriceUpdated.um).toBe('lbs');
    expect(weightAndPriceUpdated.deductions).toStrictEqual([]);

    expect(actualUpdate.weightAndPriceHistory).toHaveLength(2);
    expect(actualUpdate.weightAndPriceHistory[ 1 ].netPrice.amount).toBe(35);
    expect(actualUpdate.weightAndPriceHistory[ 1 ].netPrice.precision).toBe(2);
    expect(actualUpdate.weightAndPriceHistory[ 1 ].netValue.amount).toBe(99075);
    expect(actualUpdate.weightAndPriceHistory[ 1 ].netValue.precision).toBe(2);

    expect(actualUpdate.weightAndPriceHistory[ 1 ].tare).toStrictEqual({
      amount: 973,
      units: 'lbs',
      commonString: '973 lbs',
    });
    expect(actualUpdate.weightAndPriceHistory[ 1 ].netWeight).toStrictEqual({
      amount: 3000,
      units: 'lbs',
      commonString: '3000 lbs',
    });
    expect(actualUpdate.weightAndPriceHistory[ 0 ].netPrice.amount).toBe(25);
    expect(actualUpdate.weightAndPriceHistory[ 0 ].netPrice.precision).toBe(2);

    expect(actualUpdate.weightAndPriceHistory[ 0 ].tare).toStrictEqual({
      amount: 10,
      units: 'lbs',
      commonString: '10 lbs',
    });
    expect(actualUpdate.weightAndPriceHistory[ 0 ].netWeight).toStrictEqual({
      amount: 3963,
      units: 'lbs',
      commonString: '3963 lbs',
    });
    const queryParms = {
      sort: {},
      filter: {},
      page: 1,
      pageSize: 10,
      fromKey: '',
    };
    const materials = await MaterialLogic.fetchAll(queryParms,
      organizationInfo);
    expect(materials.Items.length).toBe(5);
  });
});

function createTestMaterial(netWeight, netValue, status) {
  const netWeightObj = weightUtility.getWeightSchema(netWeight, 'lb');
  const netValueObj = priceUtility.getValueFromNumber(netValue);
  const weightAndPrice = MaterialLogic.getWeightAndPriceSchemaFromNetWeightAndNetValueObjects(netWeightObj,
    netValueObj);

  const statusObj = {
    value: status,
    userId: '',
  };

  return {
    status: statusObj,
    weightAndPrice,
    weightAndPriceHistory: [ weightAndPrice ],
    statusHistory: [ statusObj ],
  };
}

describe('selectMaterialsForTargetWeight', () => {
  it('works 1 material to 1 material', async () => {
    const targetWeight = 100;
    const targetStatus = 'FINISHEDGOOD';
    const material = createTestMaterial(100, 100, 'WIP');
    const userId = 'test';

    const materials = [ material ];

    const expectedNetValue = priceUtility.getValueFromNumber(100);
    const expectedNetWeight = weightUtility.getWeightSchema(targetWeight, 'lb');
    const expectedAverageCost = priceUtility.getPriceFromValueJSONAndWeight(expectedNetValue, targetWeight);

    const res = await MaterialLogic.selectMaterialsForTargetWeight(materials, targetWeight, targetStatus, userId);
    expect(res.selectedMaterials.length).toBe(1);
    expect(res.selectedMaterials[ 0 ].status.value).toBe(targetStatus);
    expect(res.selectedMaterials[ 0 ].weightAndPrice.netValue).toEqual(expectedNetValue);
    expect(res.selectedMaterials[ 0 ].weightAndPrice.netWeight).toEqual(expectedNetWeight);

    expect(res.netValue).toEqual(expectedNetValue);
    expect(res.averageCost).toEqual(expectedAverageCost);
  });

  it('works 1 material to 2 material', async () => {
    const targetWeight = 100;
    const targetStatus = 'FINISHEDGOOD';
    const material1 = createTestMaterial(25, 25, 'WIP');
    const material2 = createTestMaterial(100, 100, 'WIP');
    const userId = 'test';

    const materials = [ material1, material2 ];

    const expectedNetValue = priceUtility.getValueFromNumber(100);
    // const expectedNetWeight = weightUtility.getWeightSchema(targetWeight, 'lb');
    const expectedAverageCost = priceUtility.getPriceFromValueJSONAndWeight(expectedNetValue, targetWeight);

    const res = await MaterialLogic.selectMaterialsForTargetWeight(materials, targetWeight, targetStatus, userId);
    expect(res.selectedMaterials.length).toBe(3);

    // second material has 75 lbs in FINISHEDGOOD
    expect(res.selectedMaterials[ 1 ].status.value).toBe(targetStatus);

    const seventyFiveNetValue = priceUtility.getValueFromNumber(75);
    const seventyFiveNetWeight = weightUtility.getWeightSchema(75);
    const seventyFivePrice = priceUtility.getPriceFromValueJSONAndWeight(seventyFiveNetValue, 75);

    expect(res.selectedMaterials[ 1 ].weightAndPrice.netValue).toEqual(seventyFiveNetValue);
    expect(res.selectedMaterials[ 1 ].weightAndPrice.netWeight).toEqual(seventyFiveNetWeight);
    expect(res.selectedMaterials[ 1 ].weightAndPrice.netPrice).toEqual(seventyFivePrice);

    // second material has 25 lbs left in WIP

    const twentyFiveNetValue = priceUtility.getValueFromNumber(25);
    const twentyFiveNetWeight = weightUtility.getWeightSchema(25);
    const twentyFivePrice = priceUtility.getPriceFromValueJSONAndWeight(twentyFiveNetValue, 25);

    expect(res.selectedMaterials[ 2 ].weightAndPrice.netValue).toEqual(twentyFiveNetValue);
    expect(res.selectedMaterials[ 2 ].weightAndPrice.netWeight).toEqual(twentyFiveNetWeight);
    expect(res.selectedMaterials[ 2 ].weightAndPrice.netPrice).toEqual(twentyFivePrice);

    expect(res.selectedMaterials[ 2 ].status.value).toBe('WIP');

    // price history and status history checks

    expect(res.netValue).toEqual(expectedNetValue);
    expect(res.averageCost).toEqual(expectedAverageCost);
  });
});

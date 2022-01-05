const AWSMock = require('mock-aws-s3');
const path = require('path');
const PriceSheetCompositeLogic = require('../../../../../src/api/services/compositeLogic/price-sheet-composite-logic');
const MockDB = require('../../../../../src/api/models/memoryDatabase/mock-db');
const Logic = require('../../../../../src/api/services/businessLogic/price-sheet-logic');
const PriceEntryLogic = require('../../../../../src/api/services/businessLogic/price-entry-logic');
const BenchMarkLogic = require('../../../../../src/api/services/businessLogic/benchmark-logic');
const MaterialTypeCompositeLogic =
  require('../../../../../src/api/services/compositeLogic/material-type-composite-logic');

AWSMock.config.basePath = path.join(__dirname, '../../../../../__tests__/files');
const params = { Bucket: 'unit-test-bucket', Key: 'upload.csv' };
const updateParams = { Bucket: 'unit-test-bucket', Key: 'material_type_update.csv' };

const s3 = AWSMock.S3({});

const organizationInfo = {
  organization: 'hulk_smash',
  yard: 'yard1',
  userId: 'tester',
};

const expected = {
  page: 1,
  pageSize: 10,
  resultsReturned: 1,
  fromKey: '',
  Items: [
    {
      type: 'DEFAULT',
      baseName: 'Default',
      date: '2021-10-04T03:27:00.929Z',
      archive: false,
      entries: [
        {
          materialTypeId: 'a181147f-2146-4633-9afd-327e5d4ee206',
          materialCode: 'CU0001',
          price: { amount: 420, currency: 'USD', precision: 3 },
          priceType: 'SPOT',
          sellPrice: { amount: 460, currency: 'USD', precision: 3 },
          weightUnits: 'LB',
          date: '2021-10-04T03:43:58.626Z',
          archive: false,
          id: '3fc51df5-071f-497e-aab9-568651b70ee8',
          priceSheetId: '653af607-b953-472f-8637-b5f0a9c9a395',
          benchmark: undefined,
          material: {
            code: 'CU0001',
            commonName: 'Alternator',
            user: 'tester',
            date: '2021-10-04T03:43:58.621Z',
            commodityName: 'Copper',
            commodityId: '7307e828-9953-4405-b0ec-188aa4915772',
            id: 'a181147f-2146-4633-9afd-327e5d4ee206',
            archive: false,
            commodity: {
              id: '7307e828-9953-4405-b0ec-188aa4915772',
              name: 'Copper',
              type: 'NON_FERROUS',
              archive: false,
            },
          },
        },
      ],
    },
  ],
};

const expectedEntry = expected.Items[ 0 ].entries[ 0 ];
test('upload price sheet', async () => {
  MockDB.resetDB();
  const mcl = new MaterialTypeCompositeLogic(s3, params);
  const rowCount = await mcl.materialTypesAndCommoditiesUpload(organizationInfo);
  expect(rowCount).toBe(91);
  const pscl = new PriceSheetCompositeLogic(s3, params);
  const result = await pscl.priceSheetUpload(organizationInfo);
  expect(result).toBe(1);
  const sheet = await Logic.fetchAll({ }, organizationInfo);
  expect(sheet.resultsReturned).toBe(1);
  expect(sheet.Items).toHaveLength(1);
  expect(sheet.page).toBe(expected.page);
  // expect(sheet.pageSize).toBe(expected.pageSize);
  expect(sheet.resultsReturned).toBe(expected.resultsReturned);
  expect(sheet.fromKey).toBe(expected.fromKey);
  const [ item ] = sheet.Items;
  expect(item.type).toBe(expected.Items[ 0 ].type);
  expect(item.baseName).toBe(expected.Items[ 0 ].baseName);
  expect(item.archive).toBe(expected.Items[ 0 ].archive);
  expect(item.status).toBeDefined();
  expect(item.statusHistory).toBeDefined();
  expect(item.entriesObj.length).toBe(90);
  const [ entry ] = item.entriesObj;
  expect(entry.materialCode).toBe('BAREBRIGHT');
  expect(entry.price.amount).toBe(4210);
  expect(entry.priceType).toBe(expectedEntry.priceType);
  expect(entry.weightUnits).toBe(expectedEntry.weightUnits);
  expect(entry.status).toBeDefined();
  expect(entry.statusHistory).toBeDefined();

  for (const entryItem of item.entriesObj) {
    expect(entryItem.materialTypes).toBeDefined();
    expect(entryItem.materialTypes).toHaveProperty('id');
  }
});
test('update price sheet', async () => {
  MockDB.resetDB();
  const mcl = new MaterialTypeCompositeLogic(s3, params);
  let rowCount = await mcl.materialTypesAndCommoditiesUpload(organizationInfo);
  expect(rowCount).toBe(91);
  const pscl = new PriceSheetCompositeLogic(s3, params);
  let result = await pscl.priceSheetUpload(organizationInfo);
  expect(result).toBe(1);
  const mcl2 = new MaterialTypeCompositeLogic(s3, updateParams);
  rowCount = await mcl2.materialTypesAndCommoditiesUploadUpdate(organizationInfo);
  expect(rowCount).toBe(5);
  const pscl2 = new PriceSheetCompositeLogic(s3, updateParams);
  result = await pscl2.priceSheetUploadUpdate(organizationInfo);
  expect(result).toBe(5);
  const priceEntries = await PriceEntryLogic.fetchAll({}, organizationInfo);
  expect(priceEntries.resultsReturned).toBe(95);

  const sheets = await Logic.fetchAll({ }, organizationInfo);
  expect(sheets.resultsReturned).toBe(1);
  const sheet = sheets.Items[ 0 ];
  expect(sheet.entries).toHaveLength(95);
  expect(sheet.type).toBe('DEFAULT');
  expect(sheet.entriesObj).toHaveLength(95);

  const priceEntry = sheet.entriesObj.filter(e => e.materialCode === 'INS245');
  expect(priceEntry).toHaveLength(1);
  expect(priceEntry[ 0 ].weightUnits).toBe('LB');
  expect(priceEntry[ 0 ].price.amount).toBe(1610);
  expect(priceEntry[ 0 ].price.precision).toBe(3);

  const benchmarks = await BenchMarkLogic.fetchAll({}, organizationInfo);
  expect(benchmarks.resultsReturned).toBe(0);
});

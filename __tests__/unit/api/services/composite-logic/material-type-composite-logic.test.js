const AWSMock = require('mock-aws-s3');
const path = require('path');
const MaterialTypeCompositeLogic =
  require('../../../../../src/api/services/compositeLogic/material-type-composite-logic');
const MaterialTypeLogic = require('../../../../../src/api/services/businessLogic/material-type-logic');
const MockDB = require('../../../../../src/api/models/memoryDatabase/mock-db');
const CommodityTypeLogic = require('../../../../../src/api/services/businessLogic/commodity-logic');

AWSMock.config.basePath = path.join(__dirname, '../../../../../__tests__/files');
// const params = { Bucket: 'unit-test-bucket', Key: 'test_new_upload.csv' };
const params = { Bucket: 'unit-test-bucket', Key: 'upload.csv' };
const updateParams = { Bucket: 'unit-test-bucket', Key: 'material_type_update.csv' };

const s3 = AWSMock.S3({
  params,
});

const organizationInfo = {
  organization: 'hulk_smash',
  yard: 'yard1',
  userId: 'tester',
};
describe('Material Type Composite Tests', () => {
  test('upload material type', async () => {
    MockDB.resetDB();
    let commodities = await CommodityTypeLogic.fetchAll({}, organizationInfo);
    expect(commodities.resultsReturned).toBe(3);
    const mcl = new MaterialTypeCompositeLogic(s3, params);
    const rowCount = await mcl.materialTypesAndCommoditiesUpload(organizationInfo);
    expect(rowCount).toBe(91);
    const materials = await MaterialTypeLogic.fetchAll({},
      organizationInfo);
    expect(materials).toBeDefined();
    commodities = await CommodityTypeLogic.fetchAll({}, organizationInfo);
    expect(commodities.resultsReturned).toBe(11);
    const mts = await MaterialTypeLogic.fetchAll({}, organizationInfo);
    expect(mts.resultsReturned).toBe(95);
  });
  test('update upload material type', async () => {
    MockDB.resetDB();
    const mclInital = new MaterialTypeCompositeLogic(s3, params);
    const rowCountInital = await mclInital.materialTypesAndCommoditiesUpload(organizationInfo);
    expect(rowCountInital).toBe(91);
    let commodities = await CommodityTypeLogic.fetchAll({}, organizationInfo);
    expect(commodities.resultsReturned).toBe(11);
    const mcl = new MaterialTypeCompositeLogic(s3, updateParams);
    const rowCount = await mcl.materialTypesAndCommoditiesUploadUpdate(organizationInfo);
    expect(rowCount).toBe(5);
    const materials = await MaterialTypeLogic.fetchAll({},
      organizationInfo);
    expect(materials).toBeDefined();
    commodities = await CommodityTypeLogic.fetchAll({}, organizationInfo);
    expect(commodities.resultsReturned).toBe(11);
    const mts = await MaterialTypeLogic.fetchAll({}, organizationInfo);
    expect(mts.resultsReturned).toBe(100);
  });
});

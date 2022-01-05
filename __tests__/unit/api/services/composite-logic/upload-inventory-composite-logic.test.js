const AWSMock = require('mock-aws-s3');
const path = require('path');
const UploadInventoryLogic = require('../../../../../src/api/services/compositeLogic/upload-inventory-logic');
const MockDB = require('../../../../../src/api/models/memoryDatabase/mock-db');
const MaterialTypeCompositeLogic =
  require('../../../../../src/api/services/compositeLogic/material-type-composite-logic');
const PriceSheetCompositeLogic =
  require('../../../../../src/api/services/compositeLogic/price-sheet-composite-logic');
const MaterialLogic = require('../../../../../src/api/services/businessLogic/material-logic');
const FinishedGoodLogic = require('../../../../../src/api/services/businessLogic/finished-goods');
const TicketLogic = require('../../../../../src/api/services/businessLogic/inbound-ticket-logic');

AWSMock.config.basePath = path.join(__dirname, '../../../../../__tests__/files');
const materialPriceParams = { Bucket: 'unit-test-bucket', Key: 'upload.csv' };
const params = { Bucket: 'unit-test-bucket', Key: 'existing_inventory.csv' };
const s3 = AWSMock.S3({
  params,
});

const organizationInfo = {
  organization: 'hulk_smash',
  yard: 'yard1',
  userId: '7d825b09-75c0-4a1a-942a-9d4825ea147f',
};

test('upload inventory', async () => {
  MockDB.resetDB();
  let ticketList = await TicketLogic.fetchAll({}, organizationInfo);
  const initalTickets = ticketList.resultsReturned;
  const mcl = new MaterialTypeCompositeLogic(s3, materialPriceParams);
  let rowCount = await mcl.materialTypesAndCommoditiesUpload(organizationInfo);
  const psul = new PriceSheetCompositeLogic(s3, materialPriceParams);
  rowCount = await psul.priceSheetUpload(organizationInfo);

  const ucl = new UploadInventoryLogic(s3, params);
  rowCount = await ucl.inventoryUpload(organizationInfo);
  expect(rowCount).toBe(386);
  const ticket = await TicketLogic.fetch('DFWI', organizationInfo);
  expect(ticket.ticketId).toBe(999999);
  expect(ticket.materials.length).toBe(386);
  const materialId = ticket.materials[ 0 ].id;
  const material = await MaterialLogic.fetch(materialId, organizationInfo);
  expect(material.id).toBe(materialId);
  expect(material.status.value).toBe('FINISHEDGOOD');
  expect(material).toHaveProperty('finishedGoodId');
  const fgId = material.finishedGoodId;
  const fg = await FinishedGoodLogic.fetch(fgId);
  expect(fg).toHaveProperty('id');
  ticketList = await TicketLogic.fetchAll({}, organizationInfo);
  expect(ticketList.resultsReturned).toBe(initalTickets);
});

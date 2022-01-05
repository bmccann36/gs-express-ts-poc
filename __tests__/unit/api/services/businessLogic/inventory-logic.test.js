const Logic = require('../../../../../src/api/services/businessLogic/inventory-logic');
const MockDB = require('../../../../../src/api/models/memoryDatabase/mock-db');

const PackingListLogic = require('../../../../../src/api/services/businessLogic/packing-list-logic');

jest.mock('../../../../../src/api/services/businessLogic/packing-list-logic');

const organizationInfo = {
  organization: 'hulk_smash',
  yard: 'yard1',
  user: 'testuser',
};

const copperId = '7307e828-9953-4405-b0ec-188aa4915772';
const steelId = '7307e828-9953-4405-b0ec-188aa4915773';

/**
 * Finished Goods:
 * #1 Copper 1000 lbs at $2.00 lb
 * #2 Copper 500 lbs at $1.25/lb
 * Steel Bearings 2 NT at $100.00/NT
 */
describe('Test Inventory Logic', () => {
  it('fetch copper inventory', async () => {
    MockDB.resetDB();
    const commodities = await Logic.fetchByCommodityId(copperId, organizationInfo);
    expect(commodities.resultsReturned).toBe(2);
    expect(commodities.page).toBe(1);
    expect(commodities.pageSize).toBe(10);
    expect(commodities.fromKey).toBe('');
    expect(commodities.Items.length).toBe(2);
    expect(commodities.wipWeight.amount).toBe(7713);
    expect(commodities.wipWeight.units).toBe('lbs');
    expect(commodities.wipWeight.commonString).toBe('7713 lbs');
    expect(commodities.wipCost.amount).toBe(1487285);
    expect(commodities.wipCost.precision).toBe(2);
    expect(commodities.wipCost.currency).toBe('USD');
    expect(commodities.wipCost.commonString).toBe('$14,872.85');
    expect(commodities.finishedGoodWeight.amount).toBe(2000);
    expect(commodities.finishedGoodWeight.units).toBe('lbs');
    expect(commodities.finishedGoodWeight.commonString).toBe('2000 lbs');
    expect(commodities.finishedGoodCost.amount).toBe(325000);
    expect(commodities.finishedGoodCost.precision).toBe(2);
    expect(commodities.finishedGoodCost.currency).toBe('USD');
    expect(commodities.finishedGoodCost.commonString).toBe('$3,250.00');
  });
  it('fetch steel inventory', async () => {
    const commodities2 = await Logic.fetchByCommodityId(steelId, organizationInfo);
    expect(commodities2.resultsReturned).toBe(1);
    expect(commodities2.page).toBe(1);
    expect(commodities2.pageSize).toBe(10);
    expect(commodities2.fromKey).toBe('');
    expect(commodities2.wipWeight.amount).toBe(99);
    expect(commodities2.wipWeight.units).toBe('NT');
    expect(commodities2.wipWeight.commonString).toBe('99 NT');
    expect(commodities2.wipCost.amount).toBe(99000);
    expect(commodities2.wipCost.precision).toBe(2);
    expect(commodities2.wipCost.currency).toBe('USD');
    expect(commodities2.wipCost.commonString).toBe('$990.00');
    expect(commodities2.finishedGoodWeight.amount).toBe(2);
    expect(commodities2.finishedGoodWeight.units).toBe('NT');
    expect(commodities2.finishedGoodWeight.commonString).toBe('2 NT');
    expect(commodities2.finishedGoodCost.amount).toBe(20000);
    expect(commodities2.finishedGoodCost.precision).toBe(2);
    expect(commodities2.finishedGoodCost.currency).toBe('USD');
    expect(commodities2.finishedGoodCost.commonString).toBe('$200.00');
  });
  it('fetch inventory summary', async () => {
    MockDB.resetDB();
    const commodities = await Logic.fetchCommoditySummary({}, organizationInfo);
    expect(commodities.resultsReturned).toBe(3);
    expect(commodities.largestMaterialByValue).toBe('#1 Copper');
    expect(commodities.largestMaterialByWeight).toBe('#1 Copper');
    expect(commodities.totalWeight.amount).toBe(211713);
    expect(commodities.totalWeight.commonString).toBe('211713 lbs');
    expect(commodities.totalCost.amount).toBe(1931285);
    expect(commodities.totalCost.commonString).toBe('$19,312.85');
    expect(commodities.Items.length).toBe(3);
  });
  it('fetch finished good summary', async () => {
    MockDB.resetDB();
    let finishedGoods = await Logic.fetchFinishedGoodSummary({ pageSize: 1 }, organizationInfo);
    expect(finishedGoods.resultsReturned).toBe(1);
    expect(finishedGoods.largestFinishedGoodMaterialByWeight).toBe('Steel Bearings');
    expect(finishedGoods.finishedGoodsAvailable.count).toBe(3);
    expect(finishedGoods.finishedGoodsAvailable.weight.amount).toBe(5500);
    expect(finishedGoods.finishedGoodsAvailable.weight.units).toBe('lbs');
    expect(finishedGoods.finishedGoodsAvailable.weight.commonString).toBe('5500 lbs');
    expect(finishedGoods.finishedGoodsTotal.count).toBe(3);
    expect(finishedGoods.finishedGoodsTotal.weight.amount).toBe(5500);
    expect(finishedGoods.finishedGoodsTotal.weight.units).toBe('lbs');
    expect(finishedGoods.finishedGoodsTotal.weight.commonString).toBe('5500 lbs');

    expect(finishedGoods.Items.length).toBe(1);
    for (const item of finishedGoods.Items) {
      expect(item).toHaveProperty('materialTypeId');
      expect(item).toHaveProperty('materials');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('weight');
      expect(item).toHaveProperty('averageCost');
      expect(item).toHaveProperty('netValue');
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('tag');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('materialTypeName');
      expect(item).toHaveProperty('materialTypeCode');
      expect(item).toHaveProperty('commodityName');
    }
    finishedGoods = await Logic.fetchFinishedGoodSummary({ pageSize: 10 }, organizationInfo);
    expect(finishedGoods.largestFinishedGoodMaterialByWeight).toBe('Steel Bearings');
    expect(finishedGoods.finishedGoodsAvailable.count).toBe(3);
    expect(finishedGoods.finishedGoodsAvailable.weight.amount).toBe(5500);
    expect(finishedGoods.finishedGoodsAvailable.weight.units).toBe('lbs');
    expect(finishedGoods.finishedGoodsAvailable.weight.commonString).toBe('5500 lbs');
    expect(finishedGoods.finishedGoodsTotal.count).toBe(3);
    expect(finishedGoods.finishedGoodsTotal.weight.amount).toBe(5500);
    expect(finishedGoods.finishedGoodsTotal.weight.units).toBe('lbs');
    expect(finishedGoods.finishedGoodsTotal.weight.commonString).toBe('5500 lbs');
    expect(finishedGoods.Items.length).toBe(3);
    for (const item of finishedGoods.Items) {
      expect(item).toHaveProperty('materialTypeId');
      expect(item).toHaveProperty('materials');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('weight');
      expect(item).toHaveProperty('averageCost');
      expect(item).toHaveProperty('netValue');
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('tag');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('materialTypeName');
      expect(item).toHaveProperty('materialTypeCode');
      expect(item).toHaveProperty('commodityName');
    }
  });
  it('fetch packing list meta', async () => {
    const mockPackingListResponse = {
      Items: [
        {
          id: 'a25af461-706e-46b0-848e-111111111111',
          status: 'AVAILABLE',
          finishedGoodsIds: [
            'a25af461-706e-46b0-848e-412cbb6b8cdb',
          ],
        },
        {
          id: 'a25af461-706e-46b0-848e-222222222222',
          status: 'SHIPPED',
          finishedGoodsIds: [
            'a25af461-706e-46b0-848e-333333333333',
          ],
        },
      ],
    };

    PackingListLogic.getPackingListsByStatus.mockResolvedValueOnce(mockPackingListResponse);

    const packingList = await Logic.fetchPackingListMeta({ }, organizationInfo);
    expect(packingList.resultsReturned).toBe(2);
    expect(packingList.largestPackingListMaterialByWeight).toBe('#1 Copper');
    expect(packingList.packingListsAvailable.count).toBe(1);
    expect(packingList.packingListsAvailable.weight.amount).toBe(1000);
    expect(packingList.packingListsAvailable.weight.units).toBe('lbs');
    expect(packingList.packingListsAvailable.weight.commonString).toBe('1000 lbs');
    expect(packingList.packingListTotal.count).toBe(2);
    expect(packingList.packingListTotal.weight.amount).toBe(1500);
    expect(packingList.packingListTotal.weight.units).toBe('lbs');
    expect(packingList.packingListTotal.weight.commonString).toBe('1500 lbs');
  });
  it('fetch regrade meta', async () => {
    MockDB.resetDB();
    const regradeMeta = await Logic.fetchRegradesMeta({}, organizationInfo);
    expect(regradeMeta.resultsReturned).toBe(1);
  });
});

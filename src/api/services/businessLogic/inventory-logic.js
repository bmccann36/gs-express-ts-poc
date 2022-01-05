const dinero = require('dinero.js');
const weightUtility = require('../../../utilities/weight-utility');
const CommodityLogic = require('./commodity-logic');
const MaterialTypeLogic = require('./material-type-logic');
const MaterialLogic = require('./material-logic');
const FinishedGoodLogic = require('./finished-goods');
const PackingListLogic = require('./packing-list-logic');
const RegradeLogic = require('./regrades-logic');

const STATES = {
  CREATED: 'CREATED',
  SWIP: 'SWIP',
  WIP: 'WIP',
  FINISHEDGOOD: 'FINISHEDGOOD',
  PACKINGLIST: 'PACKINGLIST',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
  AVAILABLE: 'AVAILABLE',
};

const STATUS_KEY = 'GSI1PK';

function buildItem( materialType ) {
  return {
    materialTypeId: materialType.id,
    materialTypeCode: materialType.code,
    materialTypeName: materialType.commonName,
    wip: {
      amount: 0,
      units: 'lbs',
      commonString: '0 lbs',
    },
    wipCost: dinero(0),
    finishedGoods: {
      amount: 0,
      units: 'lbs',
      commonString: '0 lbs',
    },
    finishedGoodCost: dinero(0),
    totalWeight: {
      amount: 0,
      units: 'lbs',
      commonString: '0 lbs',
    },
    averageCost: dinero(0),
    value: dinero(0),
  };
}

function calculateWip( materialType, allMaterials ) {
  const item = {
    wip: {
      amount: 0,
      units: 'lbs',
      commonString: '0 lbs',
    },
    wipCost: dinero(0),
  };
  item.wipCost = dinero(item.wipCost);
  const materials = allMaterials.Items.filter(material =>
    material.materialTypeId === materialType.id &&
    material.status.value === STATES.WIP);
  for (const m of materials) {
    item.wip = weightUtility.addWeight(item.wip, m.weightAndPrice.netWeight, m.weightAndPrice.netWeight.units);
    item.wipCost = item.wipCost.add(dinero(m.weightAndPrice.netValue));
  }
  return item;
}

function calculateFinishedGoods( materialType, allFinishedGoods ) {
  const item = {
    finishedGoods: {
      amount: 0,
      units: 'lbs',
      commonString: '0 lbs',
    },
    finishedGoodCost: dinero(0),
  };
  item.finishedGoodCost = dinero(item.finishedGoodCost);
  const fgs = allFinishedGoods.Items.filter(fg => fg.materialTypeId === materialType.id);
  for (const fg of fgs) {
    item.finishedGoods = weightUtility.addWeight(item.finishedGoods, fg.weight, fg.weight.units);
    item.finishedGoodCost = item.finishedGoodCost.add(dinero(fg.netValue));
  }
  return item;
}

function addUpWips( wipItems ) {
  const result = {
    wip: {
      amount: 0,
      units: 'lbs',
      commonString: '0 lbs',
    },
    wipCost: dinero(0),
  };
  for (const wip of wipItems) {
    result.wip = weightUtility.addWeight(result.wip, wip.wip);
    result.wipCost = result.wipCost.add(wip.wipCost);
  }
  return result;
}

function addUpFinishedGoods( fgItems ) {
  const result = {
    finishedGoods: {
      amount: 0,
      units: 'lbs',
      commonString: '0 lbs',
    },
    finishedGoodCost: dinero(0),
  };
  for (const fg of fgItems) {
    result.finishedGoods = weightUtility.addWeight(result.finishedGoods, fg.finishedGoods, fg.finishedGoods.units);
    result.finishedGoodCost = result.finishedGoodCost.add(fg.finishedGoodCost);
  }
  return result;
}

class InventoryLogic {
  static async fetchByCommodityName(commodityName, organizationInfo) {
    const decodedName = decodeURIComponent(commodityName);
    console.log(decodedName);
    const commodity = await CommodityLogic.fetchAll({ pageSize: 100,
      filter: { key: 'urlName', value: decodedName } }, organizationInfo);
    console.log(JSON.stringify(commodity) );
    if (commodity && commodity.resultsReturned === 1) {
      return this.fetchByCommodityId(commodity.Items[ 0 ].id, organizationInfo);
    }
    throw new Error('Commodity Name does not exist');
  }

  static async fetchByCommodityId( commodityId, organizationInfo ) {
    const result = {
      page: 1,
      pageSize: 10,
      resultsReturned: 10,
      fromKey: '',
      wipWeight: {
        amount: 0,
        units: 'lbs',
        commonString: '0 lbs',
      },
      wipCost: dinero(0),
      finishedGoodWeight: {
        amount: 0,
        units: 'lbs',
        commonString: '0 lbs',
      },
      finishedGoodCost: dinero(0),
      largestMaterialByWeight: '',
      largestMaterialByValue: '',
      weightReceivedYesterday: {
        amount: 0,
        units: 'lbs',
        commonString: '0 lbs',
      },
      weightShippedYesterday: {
        amount: 0,
        units: 'lbs',
        commonString: '0 lbs',
      },
    };

    let maxMaterial = { amount: 0, units: 'lbs' };
    let maxValue = 0;

    const commodity = await CommodityLogic.fetch(commodityId, organizationInfo);
    result.commodity = {
      name: commodity.name,
    };
    console.log(JSON.stringify(commodity));
    result.Items = [];
    const materialTypes = await MaterialTypeLogic.fetchAll(
      { filter: { key: 'commodityId', value: commodityId } }, organizationInfo
    );
    result.resultsReturned = materialTypes.Items.length;
    const allMaterials = await MaterialLogic.fetchAll({ filter: { key: STATUS_KEY, value: STATES.WIP } },
      organizationInfo);
    const allFinishedGoods = await FinishedGoodLogic.fetchAll({ filter: {} },
      organizationInfo);

    for (const materialType of materialTypes.Items) {
      // Build Item object for this materialType
      const wipItem = calculateWip(materialType, allMaterials);
      const fgItem = calculateFinishedGoods(materialType, allFinishedGoods);
      const item = {
        ...buildItem(materialType),
        wip: wipItem.wip,
        wipCost: wipItem.wipCost.toJSON(),
        finishedGoods: fgItem.finishedGoods,
        finishedGoodCost: fgItem.finishedGoodCost.toJSON(),
        // TODO: I am assuming the same units for now, but I may have to do conversions at some point
        totalWeight: {
          amount: wipItem.wip.amount + fgItem.finishedGoods.amount,
          units: wipItem.wip.units,
        },
      };
      item.value = wipItem.wipCost.add(fgItem.finishedGoodCost);
      item.value.commonString = item.value.toFormat();
      item.averageCost = item.totalWeight.amount === 0 ? dinero(0) : item.value.divide(item.totalWeight.amount);
      item.averageCost.commonString = item.averageCost.toFormat();
      item.value = item.value.toJSON();
      item.averageCost = item.averageCost.toJSON();

      // Update Global Metadata
      // Weights
      result.wipWeight = weightUtility.addWeight(result.wipWeight, wipItem.wip, wipItem.wip.units);
      result.finishedGoodWeight = weightUtility.addWeight(result.finishedGoodWeight,
        fgItem.finishedGoods, fgItem.finishedGoods.units);

      // Costs
      result.wipCost = result.wipCost.add(wipItem.wipCost);
      result.finishedGoodCost = result.finishedGoodCost.add(fgItem.finishedGoodCost);

      if (weightUtility.isBigger(item.totalWeight, maxMaterial)) {
        result.largestMaterialByWeight = item.materialTypeName;
        maxMaterial = item.totalWeight;
      }
      if (item.value.amount > maxValue) {
        result.largestMaterialByValue = item.materialTypeName;
        maxValue = item.value.amount;
      }
      result.Items.push(item);
    }
    result.wipCost = { ...result.wipCost.toJSON(), commonString: result.wipCost.toFormat() };
    result.finishedGoodCost = { ...result.finishedGoodCost.toJSON(), commonString: result.finishedGoodCost.toFormat() };
    return result;
  }

  static async fetchCommoditySummary( queryParams, organizationInfo ) {
    const result = {
      page: 1,
      pageSize: 10,
      resultsReturned: 10,
      fromKey: '',
      totalWeight: {
        amount: 0,
        units: 'lbs',
        commonString: '0 lbs',
      },
      totalCost: dinero(0),
      largestMaterialByWeight: '',
      largestMaterialByValue: '',
      weightReceivedYesterday: {
        amount: 0,
        units: 'lbs',
        commonString: '0 lbs',
      },
      weightShippedYesterday: {
        amount: 0,
        units: 'lbs',
        commonString: '0 lbs',
      },
    };
    result.Items = [];
    let maxMaterial = 0;
    let maxValue = dinero(0);

    const commodityList = await CommodityLogic.fetchAll({ },
      organizationInfo);
    result.resultsReturned = commodityList.resultsReturned;
    const materialTypes = await MaterialTypeLogic.fetchAll(
      { filter: {} },
      organizationInfo
    );
    const allMaterials = await MaterialLogic.fetchAll({ filter: { key: STATUS_KEY, value: STATES.WIP } },
      organizationInfo);
    const allFinishedGoods = await FinishedGoodLogic.fetchAll({ filter: {} },
      organizationInfo);

    for (const commodity of commodityList.Items) {
      const wipItems = [];
      const fgItems = [];
      const materialTypesOfThisCommodity =
        materialTypes.Items.filter(materialType => materialType.commodityId === commodity.id);
      for (const materialType of materialTypesOfThisCommodity) {
        const wipItem = calculateWip(materialType, allMaterials);
        const fgItem = calculateFinishedGoods(materialType, allFinishedGoods);
        if (wipItem.wip.amount + fgItem.finishedGoods.amount > maxMaterial) {
          maxMaterial = wipItem.wip.amount + fgItem.finishedGoods.amount;
          result.largestMaterialByWeight = materialType.commonName;
        }
        if (wipItem.wipCost.add(fgItem.finishedGoodCost).greaterThan(maxValue)) {
          maxValue = wipItem.wipCost.add(fgItem.finishedGoodCost);
          result.largestMaterialByValue = materialType.commonName;
        }
        wipItems.push(calculateWip(materialType, allMaterials));
        fgItems.push(calculateFinishedGoods(materialType, allFinishedGoods));
      }
      const item = {
        ...addUpWips(wipItems),
        ...addUpFinishedGoods(fgItems),
        name: commodity.name,
      };
      item.totalWeight = weightUtility.addWeight(item.wip, item.finishedGoods, weightUtility.UNITS.LBS);
      item.value = item.wipCost.add(item.finishedGoodCost);
      item.averageCost = item.totalWeight.amount === 0 ? dinero(0) : item.value.divide(item.totalWeight.amount);

      item.wip.commonString = `${ item.wip.amount } ${ item.wip.units }`;
      item.finishedGoods.commonString = `${ item.finishedGoods.amount } ${ item.finishedGoods.units }`;
      item.totalWeight.commonString = `${ item.totalWeight.amount } ${ item.totalWeight.units }`;

      result.totalWeight.amount += item.totalWeight.amount;
      result.totalWeight.commonString = `${ result.totalWeight.amount } ${ result.totalWeight.units }`;
      result.totalCost = result.totalCost.add(item.value);

      item.wipCost = {
        ...item.wipCost.toJSON(),
        commonString: item.wipCost.toFormat(),
      };
      item.finishedGoodCost = {
        ...item.finishedGoodCost.toJSON(),
        commonString: item.finishedGoodCost.toFormat(),
      };
      item.value = {
        ...item.value.toJSON(),
        commonString: item.value.toFormat(),
      };
      item.averageCost = {
        ...item.averageCost.toJSON(),
        commonString: item.averageCost.toFormat(),
      };
      result.Items.push(item);
    }
    result.totalCost = {
      ...result.totalCost.toJSON(),
      commonString: result.totalCost.toFormat(),
    };
    return result;
  }

  static async fetchFinishedGoodSummary( queryParams, organizationInfo ) {
    const result = {
      page: 1,
      pageSize: 10,
      resultsReturned: 10,
      fromKey: '',
      finishedGoodsAvailable: {
        count: 0,
        weight: {
          amount: 0,
          units: 'lbs',
          commonString: '0 lbs',
        },
      },
      finishedGoodsTotal: {
        count: 0,
        weight: {
          amount: 0,
          units: 'lbs',
          commonString: '0 lbs',
        },
      },
      createdToday: 0,
      createdYesterday: 0,
      largestFinishedGoodMaterialByWeight: '',
    };
    result.Items = [];
    const materialTypeKey = [];
    const materialTypeWeight = [];

    const allFinishedGoods = await FinishedGoodLogic.fetchAll({}, queryParams.filter, 1,
      undefined, '');

    const requestedFinishedGoods = await FinishedGoodLogic.fetchAll(queryParams.sort, queryParams.filter,
      queryParams.page, queryParams.pageSize, queryParams.fromKey);

    const fgMaterialTypes = await MaterialTypeLogic.fetchAll({

      filter: { },
    },
    organizationInfo);

    for (const fg of allFinishedGoods.Items) {
      result.finishedGoodsTotal.count += 1;
      result.finishedGoodsTotal.weight = weightUtility.addWeight(result.finishedGoodsTotal.weight, fg.weight);
      if (fg.status.value === STATES.AVAILABLE) {
        result.finishedGoodsAvailable.count += 1;
        result.finishedGoodsAvailable.weight = weightUtility.addWeight(result.finishedGoodsAvailable.weight, fg.weight);
      }
      const index = materialTypeKey.indexOf(fg.materialTypeId);
      if (index >= 0) {
        const weightInLbs = weightUtility.convertWeight(fg.weight);
        materialTypeWeight[ index ] += weightInLbs;
      } else {
        materialTypeKey.push(fg.materialTypeId);
        materialTypeWeight.push(weightUtility.convertWeight(fg.weight));
      }
    }
    const maxIndex = materialTypeWeight.indexOf(Math.max(...materialTypeWeight));
    const maxMaterialId = materialTypeKey[ maxIndex ];
    const maxMaterialName = fgMaterialTypes.Items.find(el => el.id === maxMaterialId);
    result.largestFinishedGoodMaterialByWeight = maxMaterialName?.commonName || '';

    const Items = Object.keys(requestedFinishedGoods.Items).map(key => {
      const fg = requestedFinishedGoods.Items[ key ];
      const materialType = fgMaterialTypes.Items.find(el => el.id === fg.materialTypeId);
      return {
        ...fg,
        materialTypeName: materialType?.commonName || '',
        materialTypeCode: materialType?.code || '',
        commodityName: materialType?.commodity.name || '',
      };
    });

    result.resultsReturned = requestedFinishedGoods.resultsReturned;
    result.Items = Items;
    return result;
  }

  static async fetchPackingListMeta( queryParams, organizationInfo ) {
    const result = {
      page: 1,
      pageSize: 10,
      resultsReturned: 10,
      fromKey: '',
      packingListsAvailable: {
        count: 0,
        weight: {
          amount: 0,
          units: 'lbs',
          commonString: '0 lbs',
        },
      },
      packingListTotal: {
        count: 0,
        weight: {
          amount: 0,
          units: 'lbs',
          commonString: '0 lbs',
        },
      },
      createdToday: 0,
      createdYesterday: 0,
      largestPackingListMaterialByWeight: '',
    };
    const materialTypeKey = [];
    const materialTypeWeight = [];
    const allPackingLists =
      await PackingListLogic.getPackingListsByStatus(STATES.AVAILABLE, true, '', organizationInfo);
    const allFinishedGoods = await FinishedGoodLogic.fetchAll({

      filter: { },
    },
    organizationInfo);
    result.resultsReturned = allPackingLists.Items.length;
    for (const pl of allPackingLists.Items) {
      for (const fgId of pl.finishedGoodsIds) {
        const fg = allFinishedGoods.Items.find(el => el.id === fgId);
        if (fg && fg.weight) {
          result.packingListTotal.count += 1;
          result.packingListTotal.weight = weightUtility.addWeight(result.packingListTotal.weight, fg.weight);
          if (pl.status === STATES.AVAILABLE) {
            result.packingListsAvailable.count += 1;
            result.packingListsAvailable.weight =
              weightUtility.addWeight(result.packingListsAvailable.weight, fg.weight);
          }
          const index = materialTypeKey.indexOf(fg.materialTypeId);
          if (index >= 0) {
            const weightInLbs = weightUtility.convertWeight(fg.weight);
            materialTypeWeight[ index ] += weightInLbs;
          } else {
            materialTypeKey.push(fg.materialTypeId);
            materialTypeWeight.push(weightUtility.convertWeight(fg.weight));
          }
        } else {
          console.log(`Invalid Finished Good FG: ${ fgId } in PL: ${ pl.id }`);
        }
      }
    }
    const maxIndex = materialTypeWeight.indexOf(Math.max(...materialTypeWeight));
    const maxMaterialId = materialTypeKey[ maxIndex ];
    if (maxMaterialId) {
      const maxMaterialName = await MaterialTypeLogic.fetch(maxMaterialId, organizationInfo);
      result.largestPackingListMaterialByWeight = maxMaterialName?.commonName || '';
    }
    return result;
  }

  // eslint-disable-next-line no-unused-vars
  static async fetchRegradesMeta( queryParams, organizationInfo ) {
    const result = {
      resultsReturned: 0,
      totalRegradesLast30Days: 0,
      regradedToday: 0,
      largestRegradedMaterialByWeight: '',
      totalValueGained: dinero(0),
    };

    const allRegrades = await RegradeLogic.getRegradesByStatus();
    result.resultsReturned = allRegrades.Items.length;
    const today = new Date();
    const yesterday = new Date().setDate(today.getDate() - 1);
    const thirtyDays = new Date().setDate(today.getDate() - 30);
    const materialTypeKey = [];
    const materialTypeWeight = [];

    for (const regrade of allRegrades.Items) {
      result.regradedToday += regrade.date > yesterday ? 1 : 0;
      result.totalRegradesLast30Days += regrade.date > thirtyDays ? 1 : 0;
      // result.totalValueGained = result.totalValueGained.add(regrade.totalValueGained);
      const index = materialTypeKey.indexOf(regrade.fromMaterial.materialTypeId);
      if (index >= 0) {
        const weightInLbs = weightUtility.convertWeight(regrade.fromMaterial.weight);
        materialTypeWeight[ index ] += weightInLbs;
      } else {
        materialTypeKey.push(regrade.fromMaterial.materialTypeId);
        materialTypeWeight.push(weightUtility.convertWeight(regrade.fromMaterial.weight));
      }
    }
    const maxIndex = materialTypeWeight.indexOf(Math.max(...materialTypeWeight));
    const maxMaterialId = materialTypeKey[ maxIndex ];
    const maxMaterialName = await MaterialTypeLogic.fetch(maxMaterialId, organizationInfo);
    result.largestRegradedMaterialByWeight = maxMaterialName?.commonName || '';
    result.totalValueGained = result.totalValueGained.toJSON();
    return result;
  }
}

module.exports = InventoryLogic;

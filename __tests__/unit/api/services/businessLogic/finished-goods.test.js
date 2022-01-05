const uuid = require('uuid');
const Joi = require('joi');

const mockDb = {
  getById: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  writeItemsArrayWithTransaction: jest.fn(),
};
jest.mock('../../../../../src/api/loaders/database-loader', () => ({ loadDB: () => mockDb }));

const finishedGoodLogic = require('../../../../../src/api/services/businessLogic/finished-goods');
const priceUtility = require('../../../../../src/utilities/price-utility');
const MaterialLogic = require('../../../../../src/api/services/businessLogic/material-logic');
const { generateTag } = require('../../../../../src/utilities/generateTag');

describe('FinishedGoodLogic', () => {
  // const collection = 'FinishedGoods';
  const collection = 'hulk_smash-yard1-FinishedGoods';

  afterEach(() => {
    jest.restoreAllMocks();
    mockDb.getById.mockReset();
    mockDb.get.mockReset();
    mockDb.create.mockReset();
    mockDb.update.mockReset();
  });

  describe('setFinishedGoodStatus', () => {
    it('setFinishedGoodsStatusToAvailable', () => {
      const finishedGoods = [{ status: { value: 'UNAVAILABLE' } }, { status: { value: 'UNAVAILABLE' } },
        { status: { value: 'UNAVAILABLE' } }];
      const updatedPackingList = finishedGoodLogic.setFinishedGoodsStatus(finishedGoods, 'AVAILABLE', 'test');

      updatedPackingList.forEach(pl => {
        expect(pl.status.value).toEqual('AVAILABLE');
        expect(pl.status.userId).toEqual('test');
      });
    });

    it('throws error if userid is undefined', () => {
      const res = () => finishedGoodLogic.setFinishedGoodStatus();
      expect(res).toThrow();
    });

    it('throws error if bad status', () => {
      const res = () => finishedGoodLogic.setFinishedGoodStatus({}, 'BAD_SANTUS', '123');
      expect(res).toThrow();
    });

    it('test return values', () => {
      const fg = finishedGoodLogic.setFinishedGoodStatus({}, 'VOID', '123');
      expect(fg.status.value).toEqual('VOID');
      expect(fg.status.userId).toEqual('123');
      expect(fg.statusHashKey).toEqual('VOID');
    });
  });

  describe('helper functions', () => {
    it('setFinishedGoodIdOnMaterials', () => {
      const materials = [{ status: { value: 'WIP' } }, { status: { value: 'FINISHEDGOOD' } }];
      const finishedFoodiId = '123';

      const res = finishedGoodLogic.setFinishedGoodIdOnMaterials(materials, finishedFoodiId);
      expect(res[ 0 ].hasOwnProperty('finishedGoodId')).toBeFalsy();
      expect(res[ 1 ].finishedGoodId).toEqual(finishedFoodiId);
    });

    it('unsetFinishedGoodIdOnMaterials', () => {
      const materials = [{ status: { value: 'WIP', finishedGoodId: '123' } }, {
        status: { value: 'FINISHEDGOOD' },
        finishedGoodId: '123',
      }];
      const res = finishedGoodLogic.unsetFinishedGoodIdOnMaterials(materials);
      expect(res[ 0 ].hasOwnProperty('finishedGoodId')).toBeFalsy();
      expect(res[ 1 ].finishedGoodId).toEqual('123');
    });

    it('setMaterialStatusAndResetHistories', () => {
      const material = {
        weightAndPriceHistory: [{}, {}, {}],
        statusHistory: [{}, {}, {}],
        status: {},
        weightAndPrice: {},
      };

      const newMaterial = MaterialLogic.setMaterialStatusAndResetHistories(material, 'WIP', '123');
      expect(newMaterial.statusHistory.length).toBe(1);
      expect(newMaterial.weightAndPriceHistory.length).toBe(1);
      expect(newMaterial.status.value).toEqual('WIP');
    });

    it('getMaterialWithNewWeight', () => {
      const firstMaterial = {
        weightAndPrice: {
          netValue: {
            commonString: '$100.00',
            currency: 'usd',
            precision: 0,
            amount: 100,
          },
          netWeight: {
            amount: 100,
          },
        },
        weightAndPriceHistory: [],
      };

      const res = MaterialLogic.getMaterialWithNewWeight(firstMaterial, 50);
      expect(res.weightAndPrice.netWeight.amount).toEqual(50);
      expect(res.weightAndPrice.netValue).toEqual(priceUtility.getValueFromNumber(50));
    });
  });

  describe('schema', () => {
    it('test setFinishedGoodStatus', () => {
      const finishedGood = {
        status: {
          status: {
            value: 'AVAILABLE',
            date: 1,
            userId: uuid.v4(),
          },
          statusHashKey: 'AVAILABLE',
        },
      };

      const userId = 'tester';

      const newFinishedGood = finishedGoodLogic.setFinishedGoodStatus(finishedGood, 'UNAVAILABLE', userId);
      expect(newFinishedGood.status.value).toEqual('UNAVAILABLE');
      expect(newFinishedGood.status.userId).toEqual(userId);
      expect(newFinishedGood.status.date).toBeTruthy();
      expect(newFinishedGood.statusHashKey).toEqual('UNAVAILABLE');
    });

    it('validates new finished good', () => {
      // Arrange
      const newFinishedGood = {
        id: 'a25af461-706e-46b0-848e-412cbb6b8cdb',
        materialTypeId: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
        tag: 'test-tag',
        type: 'BALE',
        weight: {
          gross: 105,
          net: 100,
          tare: 5,
          units: 'lbs',
        },
        status: {
          value: 'AVAILABLE',
          date: 1,
          userId: uuid.v4(),
        },
        statusHashKey: 'AVAILABLE',
        dateRangeKey: 1,
        notes: [
          {
            name: 'Note on truck',
            value: 'Bob tried to get water jugs in the truck.',
            userId: 'fredf',
            date: '2021-9-12',
            internal: true,
          },
        ],
      };
      // Assert
      expect(() => Joi.assert(newFinishedGood, finishedGoodLogic.schema)).not.toThrowError(Error);
    });
  });

  describe('fetch', () => {
    it('calls DB.getById with parameters', async () => {
      // Arrange
      const id = 'test';
      // Act
      await finishedGoodLogic.fetch(id);
      // Assert
      expect(mockDb.getById.mock.calls.length).toBe(1);
      expect(mockDb.getById.mock.calls[ 0 ][ 0 ]).toBe(collection);
      expect(mockDb.getById.mock.calls[ 0 ][ 1 ]).toBe(id);
    });
  });

  describe('fetchAll', () => {
    it('calls DB.get', async () => {
      // Arrange
      const sort = {};
      const filter = {};
      const page = 2;
      const size = 100;
      const fromKey = 'test';
      mockDb.get.mockResolvedValueOnce({ Items: [] });
      // Act
      await finishedGoodLogic.fetchAll(sort, filter, page, size, fromKey);
      // Assert
      expect(mockDb.get.mock.calls.length).toBe(1);
      expect(mockDb.get.mock.calls[ 0 ][ 0 ]).toBe(collection);
      expect(mockDb.get.mock.calls[ 0 ][ 1 ]).toBe(sort);
      expect(mockDb.get.mock.calls[ 0 ][ 2 ]).toBe(filter);
      expect(mockDb.get.mock.calls[ 0 ][ 3 ]).toBe(page);
      expect(mockDb.get.mock.calls[ 0 ][ 4 ]).toBe(size);
      expect(mockDb.get.mock.calls[ 0 ][ 5 ]).toBe(fromKey);
    });
  });

  describe('create', () => {
    it('fails if no finished good is passed', async () => {
      // Arrange
      const userId = 'test-user';
      // Act
      const result = await finishedGoodLogic.create(undefined, userId).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Error);
    });

    it('fails if invalid finished good is passed', async () => {
      // Arrange
      const userId = 'test-user';
      // Act
      const result = await finishedGoodLogic.create({}, userId).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Joi.ValidationError);
    });
  });

  describe('update', () => {
    it('calls DB.update', async () => {
      // Arrange
      const userId = 'test-user';
      const now = Date.now();
      const tag = 'test-tag';
      jest.spyOn(Date, 'now').mockReturnValueOnce(now);
      const status = 'AVAILABLE';
      const newFinishedGood = {
        id: 'test-fg',
        tag,
        commodity: { name: 'Unobtanium' },
        materials: [ uuid.v4() ],
        type: 'BALE',
        weight: {
          net: 100,
          tare: 5,
          units: 'lbs',
        },
        status: {
          value: status,
          date: now,
        },
        statusHashKey: status,
        dateRangeKey: now,
        materialTypeId: '123',
        materialType: {},
      };
      mockDb.getById.mockResolvedValueOnce(newFinishedGood);
      jest.spyOn(finishedGoodLogic.schema, 'validate').mockReturnValueOnce({});

      jest.spyOn(mockDb, 'writeItemsArrayWithTransaction').mockResolvedValue({});
      // Act
      const res = await finishedGoodLogic.update(newFinishedGood, userId);

      newFinishedGood.statusHashKey = undefined;
      newFinishedGood.dateRangeKey = undefined;
      expect(res).toEqual(newFinishedGood);
    });

    it('fails if no finished good is passed', async () => {
      // Arrange
      const userId = 'test-user';
      // Act
      const result = await finishedGoodLogic.update(undefined, userId).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Joi.ValidationError);
    });

    it('fails if finished good passed has no id', async () => {
      // Arrange
      const userId = 'test-user';
      // Act
      const result = await finishedGoodLogic.update({}, userId).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Joi.ValidationError);
    });

    it('fails if finished good id is not found', async () => {
      // Arrange
      const userId = 'test-user';
      const finishedGood = { id: 'test-id' };
      jest.spyOn(mockDb, 'getById').mockResolvedValueOnce({});
      // Act
      const result = await finishedGoodLogic.update(finishedGood, userId).catch(err => err);
      // Assert
      expect(result).toBeInstanceOf(Error);
      // expect(result.message).toBe(`Finished good ${ finishedGood.id } not found!`);
    });

    it('fails if invalid finished good is passed', async () => {
      // Arrange
      const userId = 'test-user';
      const finishedGood = { id: 'test-id' };
      jest.spyOn(mockDb, 'getById').mockResolvedValue(finishedGood);

      const result = await finishedGoodLogic.update(finishedGood, userId).catch(err => err);
      // Assert

      expect(result).toBeInstanceOf(Joi.ValidationError);
    });
  });

  describe('generateTag', () => {
    it('generates strings that are 8 chars long', () => {
      // Arrange
      // Act
      const tag = generateTag();
      // Assert
      expect(tag.length).toBe(8);
    });

    it('generates unique strings', () => {
      // Arrange
      const iterations = 100000;
      const ids = {};
      // Act
      for (let i = 0; i < iterations; ++i) {
        const tag = generateTag();
        if (ids[ tag ]) throw new Error('duplicate IDs generated!');
        ids[ tag ] = true;
      }
      // Assert
      expect(Object.keys(ids).length).toBe(iterations);
    });
  });

  describe('FinishedGood Weight Functions', () => {
    it('removes weight from finished good', async () => {
      const finishedGood = {
        id: 'abc',
        weight: {
          net: 90,
        },
        netValue: priceUtility.getValueFromNumber(100),
      };
      const originalMaterials = [{ id: 'bar' }];

      const selectedMaterials = [
        {
          id: '1',
          finishedGoodId: '123',
          status: {
            value: 'WIP',
          },
        },
        {
          id: '2',
          finishedGoodId: '123',
          status: {
            value: 'FINISHEDGOOD',
          },
        },
      ];

      const selectMaterialsForTargetWeightResult = {
        selectedMaterials,
        netValue: priceUtility.getValueFromNumber(10),
      };

      jest.spyOn(MaterialLogic, 'fetchMaterialsByIds').mockReturnValue(originalMaterials);
      jest.spyOn(MaterialLogic, 'selectMaterialsForTargetWeight').mockReturnValue(selectMaterialsForTargetWeightResult);

      const res = await finishedGoodLogic.removeWeightFromFinishedGood(finishedGood, 10, {});

      const finishedGoodToSave = res.finishedGood;
      const materialsToSave = res.materials;

      expect(finishedGoodToSave.netValue).toEqual(priceUtility.getValueFromNumber(90));
      expect(finishedGoodToSave.weight.net).toEqual(90);
      expect(materialsToSave).toEqual(selectedMaterials);
    });

    it('adds weight from finished good', async () => {
      const finishedGood = {
        id: '123',
        weight: {
          net: 110,
        },
        netValue: priceUtility.getValueFromNumber(100),
      };
      const wipMaterials = [{
        id: 'bar',
        weightAndPrice: {
          netWeight: {
            amount: 10,
          },
        },

      }];

      // these materials have a sum of 10 lbs of weight
      const selectedMaterials = [
        {
          id: '1',
          status: {
            value: 'FINISHEDGOOD',
          },
        },
        {
          id: '2',
          status: {
            value: 'FINISHEDGOOD',
          },
        },
      ];

      const selectMaterialsForTargetWeightResult = {
        selectedMaterials,
        netValue: priceUtility.getValueFromNumber(10),
      };

      // mock getWIPMaterialsOrderedOldestToNewest
      jest.spyOn(MaterialLogic, 'getWIPMaterialsOrderedOldestToNewest').mockReturnValue(wipMaterials);
      jest.spyOn(MaterialLogic, 'selectMaterialsForTargetWeight').mockReturnValue(selectMaterialsForTargetWeightResult);

      const res = await finishedGoodLogic.addWeightToFinishedGood(finishedGood, 10, {});

      const finishedGoodToSave = res.finishedGood;
      const materialsToSave = res.materials;

      expect(finishedGoodToSave.netValue).toEqual(priceUtility.getValueFromNumber(110));
      expect(finishedGoodToSave.weight.net).toEqual(110);
      expect(materialsToSave).toEqual(selectedMaterials);
    });
  });
});

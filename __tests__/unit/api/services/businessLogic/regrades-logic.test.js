const mockDb = {
  getById: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};
jest.mock('../../../../../src/api/loaders/database-loader', () => ({ loadDB: () => mockDb }));

const regradesLogic = require('../../../../../src/api/services/businessLogic/regrades-logic');

describe('RegradesLogic', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockDb.getById.mockReset();
    mockDb.get.mockReset();
    mockDb.create.mockReset();
    mockDb.update.mockReset();
  });

  describe('Sum Functions', () => {
    it('getToMaterialsSum', () => {
      const toMaterials = [{ weight: 5 }, { weight: 10 }, { weight: 5 }];
      const sum = regradesLogic.getToMaterialsSum(toMaterials);
      expect(sum).toEqual(20);
    });
  });

  describe('Validate DTO Schema', () => {
    it('test getStatus Object', () => {
      const userId = 'tester';

      const status = regradesLogic.getStatusObj('REGRADE', userId);
      expect(status.value).toEqual('REGRADE');
      expect(status.userId).toEqual(userId);
      expect(status.date).toBeDefined();
    });

    it('Call create with invalid schema', async () => {
      let regrade = {};
      await expect(regradesLogic.create(regrade, {}))
        .rejects
        .toThrowError('"fromMaterial" is required');
      regrade = {
        fromMaterial: {
          materialTypeId: 'copper',
        },
      };

      await expect(regradesLogic.create(regrade, {}))
        .rejects
        .toThrowError('"fromMaterial.weight" is required');

      regrade = {
        fromMaterial: {
          materialTypeId: 'copper',
          weight: 10000,
        },
      };

      await expect(regradesLogic.create(regrade, {}))
        .rejects
        .toThrowError('"toMaterials" is required');

      regrade = {
        fromMaterial: {
          materialTypeId: 'copper',
          weight: 10000,
        },
        toMaterials: [{
          materialTypeId: 'aluminum',

        }],
      };

      await expect(regradesLogic.create(regrade, {}))
        .rejects
        .toThrowError('"toMaterials[0].weight" is required');
    });

    it('Validate allows notes', () => {
      const regrade = {
        fromMaterial: {
          materialTypeId: 'copper',
          weight: 10000,
        },
        toMaterials: [{
          materialTypeId: 'aluminum',
          weight: 10000,
        }],
        notes: [{ name: '' }],
      };

      const res = regradesLogic.schema.validate(regrade);
      expect(res.error).toBeUndefined();
    });
  });
});

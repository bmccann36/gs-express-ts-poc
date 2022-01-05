const mockDb = {
  getById: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  writeItemsArrayWithTransaction: jest.fn(),
  createPutDynamoDbObject: jest.fn(),
};
const FinishedGoodLogic = require('../../../../../src/api/services/businessLogic/finished-goods');

jest.mock('../../../../../src/api/loaders/database-loader', () => ({ loadDB: () => mockDb }));
jest.mock('../../../../../src/api/services/businessLogic/finished-goods');

const PackingListLogic = require('../../../../../src/api/services/businessLogic/packing-list-logic');

describe('PackingList Logic', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockDb.getById.mockReset();
    mockDb.get.mockReset();
    mockDb.create.mockReset();
    mockDb.update.mockReset();
    mockDb.writeItemsArrayWithTransaction.mockReset();
    mockDb.createPutDynamoDbObject.mockReset();
  });

  describe('Update Packing List', () => {
    it('removePackingListIdFromFinishedGoods', () => {
      const packingList = [{ packingListId: '123' }, { packingListId: '123' }, { packingListId: '123' }];
      const updatedPackingList = PackingListLogic.removePackingListIdFromFinishedGoods(packingList);

      updatedPackingList.forEach(pl => {
        expect(pl.hasOwnProperty('packingListId')).toBeFalsy();
      });
    });

    it('getItemsInArr1AndNotInArr2', () => {
      const arr1 = [ '1', '2', '3' ];
      const arr2 = [ '3' ];

      const arr3 = PackingListLogic.getItemsInArr1AndNotInArr2(arr1, arr2);

      expect(arr3).toEqual([ '1', '2' ]);
    });
  });

  describe('Void Packing List', () => {
    it('test void packing list without id', async () => {
      const res = async () => {
        await PackingListLogic.void();
      };
      await expect(res).rejects.toThrowError('Packing List ID not specified!');
    });

    it("test void packing list where db can't find id", async () => {
      mockDb.getById.mockResolvedValueOnce({});

      const id = '1';
      const res = async () => {
        await PackingListLogic.void(id);
      };
      await expect(res).rejects.toThrowError(`Packing list ${ id } not found!`);
    });

    it('test void with no errors', async () => {
      const finishedGoodIds = [ '1', '12' ];
      const mockPackingList = { id: '123', finishedGoodsIds: finishedGoodIds };
      const id = '123';
      const userId = '1234';

      const mockedFinishedGoods = [{ id: '1', status: { value: 'AVAILABLE' } }, {
        id: '12',
        status: { value: 'AVAILABLE' },
      }];
      const mockedFinishedGoodsUnavailable = [{ id: '1', status: { value: 'UNAVAILABLE' } }, {
        id: '12',
        status: { value: 'UNAVAILABLE' },
      }];

      mockDb.getById.mockResolvedValueOnce(mockPackingList);

      FinishedGoodLogic.fetchFinishedGoodsByIds.mockResolvedValueOnce(mockedFinishedGoods);

      FinishedGoodLogic.setFinishedGoodsStatus.mockReturnValue(mockedFinishedGoodsUnavailable);

      const mockFinishedGoodsPutItems = mockedFinishedGoodsUnavailable.map(fg => ({
        Put: {
          TableName: 'FinishedGoods',
          Item: fg,
        },
      }));

      FinishedGoodLogic.getPutItemsArrayOfFinishedGoods.mockReturnValueOnce(mockFinishedGoodsPutItems);

      const mockPackingListPutItem = {
        Put: {
          TableName: 'PackingList',
          Item: mockPackingList,
        },
      };

      Date.now = jest.fn(() => 1);

      const expectedPutItemPackingList = {
        ...mockPackingList,
        updatedDate: 1,
        status: 'VOID',
        GSI1PK: 'VOID',
        GSI1SK: 1,
      };

      mockDb.createPutDynamoDbObject.mockReturnValue(mockPackingListPutItem);
      mockDb.writeItemsArrayWithTransaction.mockResolvedValueOnce({});

      await PackingListLogic.void(id, userId);

      expect(mockDb.getById).toBeCalledWith('PackingLists', id);
      expect(FinishedGoodLogic.fetchFinishedGoodsByIds).toBeCalledWith(finishedGoodIds);

      expect(FinishedGoodLogic.setFinishedGoodsStatus).toBeCalledWith(mockedFinishedGoods,
        'AVAILABLE', userId);

      expect(FinishedGoodLogic.getPutItemsArrayOfFinishedGoods).toBeCalledWith(mockedFinishedGoodsUnavailable);
      expect(mockDb.createPutDynamoDbObject).toBeCalledWith(expectedPutItemPackingList, 'PackingLists');

      const res = [ mockPackingListPutItem, ...mockFinishedGoodsPutItems ];

      expect(mockDb.writeItemsArrayWithTransaction).toBeCalledWith(res);
    });
  });
});

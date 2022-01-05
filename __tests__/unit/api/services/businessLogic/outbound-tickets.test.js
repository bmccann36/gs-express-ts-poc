const mockDb = {
  getById: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  writeItemsArrayWithTransaction: jest.fn(),
  createPutDynamoDbObject: jest.fn(),
};
jest.mock('../../../../../src/api/loaders/database-loader', () => ({ loadDB: () => mockDb }));

const uuid = require('uuid');

const CustomerLogic = require('../../../../../src/api/services/businessLogic/customer-logic');
const FinishedGoodsLogic = require('../../../../../src/api/services/businessLogic/finished-goods');
const OutboundTicketsLogic = require('../../../../../src/api/services/businessLogic/outbound-tickets-logic');
const PackingListLogic = require('../../../../../src/api/services/businessLogic/packing-list-logic');

jest.mock('../../../../../src/api/services/businessLogic/packing-list-logic');
jest.mock('../../../../../src/api/services/businessLogic/finished-goods');
jest.mock('../../../../../src/api/services/businessLogic/customer-logic');
jest.mock('../../../../../src/utilities/generateTag', () => ({ generateTag: () => 'tag' }));
jest.mock('uuid');

const GSI1PK = 'OUTBOUND_TICKETS';
const AVAILABLE = 'AVAILABLE';
// const UNAVAILABLE = 'UNAVAILABLE';
const SHIPPED = 'SHIPPED';
// const VOID = 'VOID';
const collection = process.env.OUTBOUND_TICKETS_TABLE || 'OutboundTickets';

describe('OutboundTicket Logic', () => {
  const id1 = '10000000-0000-0000-0000-000000000000';
  const id2 = '20000000-0000-0000-0000-000000000000';
  const id3 = '30000000-0000-0000-0000-000000000000';

  const outboundTicketId = id1;
  const userId = id1;
  const customerId = id1;
  const finishedGoodId = id1;

  const orgInfo = { userId };
  const statusAvailableObj = { date: 1, userId, value: AVAILABLE };
  const statusShippedObj = { date: 1, userId, value: SHIPPED };
  const ExpectedCustomer = 'Tony Soprano Waste Management';
  const ExpectedMaterialTypeCodes = [ 'AL' ];
  const CreatedDate = 1;
  const ExpectedOutboundTicket = { GSI1PK, GSI1SK: CreatedDate };

  Date.now = jest.fn(() => CreatedDate);
  uuid.v4 = jest.fn(() => outboundTicketId);

  let baseOutboundTicket;
  let baseOutboundTicketRequestDTO;
  let baseFinishedGood;
  let baseFinishedGoods;

  beforeEach(() => {
    baseOutboundTicket = {
      id: outboundTicketId,
      customerId,
      customerDisplayName: ExpectedCustomer,
      tag: 'tag',
      status: 'AVAILABLE',
      userId,
      date: 1,
      materialIds: [],
      statusHistory: [ statusAvailableObj ],
      GSI1PK,
      GSI1SK: 1,
      finishedGoodIds: [],
      materialTypeCodes: [],
      netWeight: 0,
      packingListIds: [],
      transportationInfo: {},
    };
    baseOutboundTicketRequestDTO = {
      customerId,
      packingListIds: [],
      finishedGoods: [],
      materialWeights: [],
      transportationInfo: {},
    };
    baseFinishedGood = {
      id: finishedGoodId,
      weight: {
        net: 100,
        gross: 100,
        tare: 0,
        units: 'lb',
      },
      materialType: {},
      status: { value: AVAILABLE },
    };
    baseFinishedGoods = [ baseFinishedGood ];

    FinishedGoodsLogic.getDistinctMaterialTypeCodesFromFinishedGoods.mockReturnValue(ExpectedMaterialTypeCodes);
    FinishedGoodsLogic.getNetWeightSumOfFinishedGoods.mockReturnValue(100);

    FinishedGoodsLogic.getPutItemsArrayOfFinishedGoodAndMaterials.mockReturnValue([]);

    FinishedGoodsLogic.saveFinishedGoodAndMaterials.mockReturnValue([]);

    const mockCustomer = { customerCommonIdentifierString: ExpectedCustomer };
    CustomerLogic.fetch.mockReturnValue(mockCustomer);

    mockDb.create.mockResolvedValue(ExpectedOutboundTicket);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockDb.getById.mockReset();
    mockDb.get.mockReset();
    mockDb.create.mockReset();
    mockDb.update.mockReset();
  });

  describe('OutboundTicket Logic create', () => {
    it('create works with only customer info and transportation info', async () => {
      const outboundTicketRequestDTO = {
        customerId,
        packingListIds: [],
        finishedGoods: [],
        materialWeights: [],
        transportationInfo: {},
      };

      // mocks
      const mockCustomer = { customerCommonIdentifierString: ExpectedCustomer };
      CustomerLogic.fetch.mockReturnValue(mockCustomer);

      // let ExpectedOutboundTicket = { GSI1PK: 'OUTBOUND_TICKETS', GSI1SK: 123 };
      mockDb.create.mockResolvedValue(ExpectedOutboundTicket);

      const res = await OutboundTicketsLogic.create(outboundTicketRequestDTO, orgInfo);

      expect(CustomerLogic.fetch).toBeCalledWith(outboundTicketRequestDTO.customerId, orgInfo);

      const outboundTicket = {
        id: outboundTicketId,
        customerId,
        customerDisplayName: ExpectedCustomer,
        tag: 'tag',
        status: 'AVAILABLE',
        userId,
        date: 1,
        materialIds: [],
        statusHistory: [ statusAvailableObj ],
        GSI1PK,
        GSI1SK: 1,
        finishedGoodIds: [],
        materialTypeCodes: [],
        netWeight: 0,
        packingListIds: [],
        transportationInfo: {},
      };

      expect(mockDb.create).toBeCalledWith('OutboundTickets', outboundTicket);

      const expectedRes = { ...ExpectedOutboundTicket, GSI1PK: undefined, GSI1SK: undefined };
      expect(expectedRes).toEqual(res);
    });

    it('create works with finished goods', async () => {
      const outboundTicketRequestDTO = {
        ...baseOutboundTicketRequestDTO,
        finishedGoods: baseFinishedGoods,
      };

      // mocks
      // saved customer
      const mockCustomer = { customerCommonIdentifierString: ExpectedCustomer };
      CustomerLogic.fetch.mockReturnValue(mockCustomer);

      // saved ticket
      // let ExpectedOutboundTicket = { GSI1PK, GSI1SK: CreatedDate };
      mockDb.create.mockResolvedValue(ExpectedOutboundTicket);

      // mock finished goods returned
      FinishedGoodsLogic.fetchFinishedGoodsByIds.mockReturnValue(baseFinishedGoods);

      FinishedGoodsLogic.getDistinctMaterialTypeCodesFromFinishedGoods.mockReturnValue(ExpectedMaterialTypeCodes);
      FinishedGoodsLogic.getNetWeightSumOfFinishedGoods.mockReturnValue(100);

      FinishedGoodsLogic.getPutItemsArrayOfFinishedGoodAndMaterials.mockReturnValue([]);

      FinishedGoodsLogic.saveFinishedGoodAndMaterials.mockReturnValue([]);

      const res = await OutboundTicketsLogic.create(outboundTicketRequestDTO, orgInfo);

      expect(CustomerLogic.fetch).toBeCalledWith(outboundTicketRequestDTO.customerId, orgInfo);

      const outboundTicket1 = {
        ...baseOutboundTicket,
        id: outboundTicketId,
        customerId,
        customerDisplayName: ExpectedCustomer,
        tag: 'tag',
        status: 'AVAILABLE',
        userId,
        date: 1,
        materialIds: [],
        statusHistory: [ statusAvailableObj ],
        GSI1PK,
        GSI1SK: 1,
        finishedGoodIds: [ finishedGoodId ],
        materialTypeCodes: ExpectedMaterialTypeCodes,
        netWeight: 100,
        packingListIds: [],
        transportationInfo: {},
      };

      expect(mockDb.create).toBeCalledWith('OutboundTickets', outboundTicket1);

      const expectedRes = { ...ExpectedOutboundTicket, GSI1PK: undefined, GSI1SK: undefined };
      expect(expectedRes).toEqual(res);
    });

    it('update returns empty object with bad outbound ticket id', async () => {
      // mock getById
      mockDb.getById.mockReturnValue({});
      expect(await OutboundTicketsLogic.update(baseOutboundTicketRequestDTO, orgInfo)).toEqual({});
      expect(mockDb.getById).toBeCalledWith(collection, baseOutboundTicketRequestDTO.id);
    });

    it('update works', async () => {
      const originalOutboundTicket = {
        ...baseOutboundTicket,
        id: id1,
        status: AVAILABLE,
        packingListIds: [ id3, id2, id1 ],
        finishedGoodIds: [ id1, id2, id3 ],
      };

      const outboundTicketRequestDTO = {
        ...baseOutboundTicketRequestDTO,
        status: SHIPPED,
        id: id1,
        finishedGoods: [ baseFinishedGood ],
        packingListIds: [ id1 ],
      };

      mockDb.getById.mockReturnValue(originalOutboundTicket);

      const ExpectedPackingListPut = [{ id: id2 }, { id: id3 }];
      PackingListLogic.getUpdateStatusPackingListArray.mockReturnValue(ExpectedPackingListPut);

      const ExpectedFinishedGoodsPut = [{ id: id2 }, { id: id3 }];
      FinishedGoodsLogic.getUpdateStatusFinishedGoodsArray.mockReturnValue(ExpectedFinishedGoodsPut);

      PackingListLogic.validatePackingListIdsExist.mockResolvedValue(null);
      FinishedGoodsLogic.fetchFinishedGoodsByIds.mockResolvedValue(baseFinishedGoods);

      mockDb.createPutDynamoDbObject.mockReturnValue({});

      const res = await OutboundTicketsLogic.update(outboundTicketRequestDTO, orgInfo);

      expect(PackingListLogic.getUpdateStatusPackingListArray).toBeCalledWith([ id3, id2 ], AVAILABLE);
      expect(FinishedGoodsLogic.getUpdateStatusFinishedGoodsArray).toBeCalledWith([ id2, id3 ], statusAvailableObj);

      expect(CustomerLogic.fetch).toBeCalledWith(outboundTicketRequestDTO.customerId, orgInfo);

      const outboundTicketToSave = {
        ...baseOutboundTicket,
        id: outboundTicketId,
        customerId,
        customerDisplayName: ExpectedCustomer,
        tag: 'tag',
        status: SHIPPED,
        userId,
        date: 1,
        materialIds: [],
        statusHistory: [ statusAvailableObj, statusShippedObj ],
        GSI1PK,
        GSI1SK: 1,
        finishedGoodIds: [ finishedGoodId ],
        materialTypeCodes: ExpectedMaterialTypeCodes,
        netWeight: 100,
        packingListIds: outboundTicketRequestDTO.packingListIds,
        transportationInfo: {},
      };

      expect(mockDb.createPutDynamoDbObject).toBeCalledWith(outboundTicketToSave, collection);
      const expectedOutboundTicket = OutboundTicketsLogic.removeInternalFields(outboundTicketToSave);
      expect(expectedOutboundTicket).toEqual(res);
    });
  });

  it('test removeInternalFields', () => {
    const ob = {
      GSI1PK: 'TABLE',
      GSI1SK: 123,
      id: '123',
    };
    const expected = { id: '123' };

    const res = OutboundTicketsLogic.removeInternalFields(ob);
    expect(res).toEqual(expected);
  });

  it('updateFinishedGoodToTargetWeight', async () => {
    const finishedGood = {
      id: '1',
      weight: {
        net: 105,
      },
    };

    let targetWeight = { net: 100, gross: 100, tare: 0 };

    const expectedRes = {
      finishedGood: {},
      materials: [],
    };

    const removeWeightFromFinishedGood = jest.spyOn(FinishedGoodsLogic, 'removeWeightFromFinishedGood')
      .mockReturnValue(expectedRes);

    let res = await OutboundTicketsLogic.updateFinishedGoodToTargetWeight(finishedGood, targetWeight, orgInfo);
    expect(res).toEqual(expectedRes);
    expect(removeWeightFromFinishedGood).toBeCalledWith(finishedGood, 5, orgInfo);

    targetWeight = { net: 110, gross: 100, tare: 0 };
    const addWeightToFinishedGood = jest.spyOn(FinishedGoodsLogic, 'addWeightToFinishedGood')
      .mockReturnValue(expectedRes);
    res = await OutboundTicketsLogic.updateFinishedGoodToTargetWeight(finishedGood, targetWeight, orgInfo);
    expect(res).toEqual(expectedRes);
    expect(addWeightToFinishedGood).toBeCalledWith(finishedGood, 5, orgInfo);
  });
});

const lambda = require('../../../../src/handlers/packing-list-handler');
const { createPackingListRequest, createValidPackingListRequest } = require('./packingListHelpers');
const MockDB = require('../../../../src/api/models/memoryDatabase/mock-db');
const PackingListLogic = require('../../../../src/api/services/businessLogic/packing-list-logic');
const utils = require('../../../../src/handlers/utilities');

jest.mock('../../../../src/api/services/businessLogic/packing-list-logic');

describe('Test Packing List Handler Tests', () => {
  const userId = '7307e828-9953-4405-b0ec-188aa4915772';
  beforeEach(() => {
    const { headers } = createPackingListRequest({});
    jest.spyOn(utils, 'decodeAndVerifyJwt')
      .mockReturnValueOnce({ userId, organization: headers.organization, yard: headers.yard });
    MockDB.resetDB();
  });

  it('Create packing list create rejecting returns 500', async () => {
    PackingListLogic.create.mockRejectedValueOnce('error');

    const result = await lambda.createPackingListHandler(createPackingListRequest({}));
    expect(result.statusCode).toEqual(500);
  });

  it('Create packing list with create resolving returns 200', async () => {
    const body = {
      finishedGoodsIds: [ 'abc' ],
    };

    PackingListLogic.create.mockResolvedValueOnce(body);

    const result = await lambda.createPackingListHandler(createPackingListRequest(body));
    expect(result.statusCode).toEqual(200);
    expect(result.body).toBeDefined();

    const resBody = JSON.parse(result.body);

    expect(resBody.finishedGoodsIds).toEqual(body.finishedGoodsIds);
  });

  //  getPackingListByIdHandler
  it('Get Packing List by invalid id returns 500', async () => {
    const event = createPackingListRequest({});

    const result = await lambda.getPackingListByIdHandler(event);
    expect(result.statusCode).toEqual(500);
  });

  it('Get Packing List by valid id returns 200 and Packing List', async () => {
    const mockPackingList = {
      id: '123',
    };

    const event = {
      ...createValidPackingListRequest(),
      pathParameters: { id: mockPackingList.id },
    };

    PackingListLogic.getById.mockResolvedValueOnce(mockPackingList);

    const result = await lambda.getPackingListByIdHandler(event);
    expect(result.statusCode).toEqual(200);

    const packingListResponseBody = JSON.parse(result.body);
    expect(packingListResponseBody).toEqual(mockPackingList);
  });

  it('Update Packing List with logic rejecting returns 500', async () => {
    PackingListLogic.getById.mockRejectedValueOnce('rejected');

    const result = await lambda.updatePackingListHandler(createValidPackingListRequest());
    expect(result.statusCode).toEqual(500);
  });

  it('Update Packing List with logic resolving returns 200', async () => {
    const mockPackingList = {
      id: '123',
    };
    const event = {
      ...createValidPackingListRequest(),
      pathParameters: { id: mockPackingList.id },
    };
    PackingListLogic.updatePackingList.mockResolvedValueOnce(mockPackingList);

    const updatePackingListResponse = await lambda.updatePackingListHandler(event);
    expect(updatePackingListResponse.statusCode).toEqual(200);

    const updatedPackingList = JSON.parse(updatePackingListResponse.body);
    expect(updatedPackingList).toEqual(mockPackingList);
  });

  it('Get Packing Lists returns 200', async () => {
    const mockResponse = [];
    PackingListLogic.getPackingListsByStatus.mockResolvedValueOnce(mockResponse);

    // aws event has queryStringParameters as null if there are none
    const event = createValidPackingListRequest();

    const packingListsResponse = await lambda.getPackingListsHandler(event);
    expect(packingListsResponse.statusCode).toEqual(200);

    const packingLists = JSON.parse(packingListsResponse.body);
    expect(packingLists).toEqual(mockResponse);
  });
});

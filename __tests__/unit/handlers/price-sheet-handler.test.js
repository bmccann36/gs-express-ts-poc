const lambda = require('../../../src/handlers/price-sheet-handler');
const utils = require('../../../src/handlers/utilities');

const headers = {
  organization: 'hulk_smash',
  yard: 'yard1',
  Authorization: 'Bearer test.token',
};
describe('Test Price Sheet Handler', () => {
  const userId = '7307e828-9953-4405-b0ec-188aa4915772';
  beforeEach(() => {
    jest.spyOn(utils, 'decodeAndVerifyJwt')
      .mockReturnValueOnce({ userId, organization: headers.organization, yard: headers.yard });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return a price sheet list (summary)', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/price-sheets',
      headers,
    };

    const result = await lambda.getPriceSheetListHandler(event);
    const expectedBody = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(expectedBody).toBeDefined();
  });
});

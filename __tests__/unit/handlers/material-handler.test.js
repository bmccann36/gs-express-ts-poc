const lambda = require('../../../src/handlers/material-handler');
const baseMaterial = require('../../../src/api/models/memoryDatabase/material-list.json');
const utils = require('../../../src/handlers/utilities');

describe('Test Material Handler', () => {
  const userId = '7307e828-9953-4405-b0ec-188aa4915772';
  const headers = {
    Organization: 'hulk_smash',
    Yard: 'yard1',
    Authorization: 'Bearer test.token',
  };

  beforeEach(() => {
    jest.spyOn(utils, 'decodeAndVerifyJwt')
      .mockReturnValue({ userId, organization: headers.Organization, yard: headers.Yard });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return an empty material list', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/materials',
      headers,
    };

    const result = await lambda.getMaterialListHandler(event);
    const expectedBody = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(expectedBody).toBeDefined();
  });
  it('should fail 500 Table Missing', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/materials',
      headers: {
        ...headers,
        Organization: 'fake',
      },
    };
    utils.decodeAndVerifyJwt.mockReset();
    utils.decodeAndVerifyJwt
      .mockReturnValueOnce({ userId, organization: event.headers.Organization, yard: event.headers.Yard });

    const result = await lambda.getMaterialListHandler(event);
    const expectedBody = JSON.parse(result.body);
    expect(result.statusCode).toEqual(500);
    expect(expectedBody).toBeDefined();
    expect(expectedBody).toHaveProperty('error');
    expect(expectedBody.error).toBe('Table: fake-yard1-Materials Does not exist');
  });
  it('created, get, update, get material', async () => {
    const [ material ] = baseMaterial.Items;

    let event = {
      httpMethod: 'POST',
      path: '/materials',
      headers,
      body: JSON.stringify(material),
    };

    let result = await lambda.createMaterialHandler(event);
    const actualCreate = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(actualCreate).toBeDefined();
    expect(actualCreate).toHaveProperty('id');

    event = {
      httpMethod: 'GET',
      path: `/materials/${ actualCreate.id }`,
      headers,
      pathParameters: {
        materialId: actualCreate.id,
      },
    };
    result = await lambda.getMaterialByIdHandler(event);
    const actualGet = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(actualGet).toBeDefined();
    expect(actualGet).toHaveProperty('id');
    expect(actualGet.id).toBe(actualCreate.id);

    material.id = actualGet.id;
    material.inboundTicketId = 'ticket1';
    event = {
      httpMethod: 'PUT',
      path: `/materials/${ actualCreate.id }`,
      headers,
      pathParameters: {
        materialId: actualCreate.id,
      },
      body: JSON.stringify(material),
    };
    result = await lambda.updateMaterialHandler(event);
    const actualUpdate = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(actualUpdate).toBeDefined();
    expect(actualUpdate).toHaveProperty('id');
    expect(actualUpdate.id).toBe(actualCreate.id);
    expect(actualUpdate.inboundTicketId).toBe(material.inboundTicketId);

    event = {
      httpMethod: 'GET',
      path: '/materials',
      headers,
    };
    result = await lambda.getMaterialListHandler(event);
    const materialList = JSON.parse(result.body);
    expect(result.statusCode).toEqual(200);
    expect(materialList.resultsReturned).toBe(5);
    expect(materialList.page).toBe(1);
    expect(materialList.pageSize).toBeUndefined();
    expect(materialList.fromKey).toBe('');
    expect(materialList.Items).toHaveLength(5);
  });
  it('created invalid material', async () => {
    const [ material ] = baseMaterial.Items;
    material.materialTypeId = '';
    const event = {
      httpMethod: 'POST',
      path: '/materials',
      headers,
      body: JSON.stringify(material),
    };

    let result = await lambda.createMaterialHandler(event);
    expect(result.statusCode).toBe(500);
    let body = JSON.parse(result.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('materialTypeId is required');

    material.materialTypeId = 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791';
    material.extraid = 'failure';
    event.body = JSON.stringify(material);
    result = await lambda.createMaterialHandler(event);
    expect(result.statusCode).toBe(400);
    body = JSON.parse(result.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('"extraid" is not allowed');
  });
  it('update invalid material', async () => {
    let event = {
      httpMethod: 'PUT',
      path: '/materials/7a6ce777-2cdb-4587-bcc1-c5af61402182',
      headers,
      pathParameters: {
        materialId: '7a6ce777-2cdb-4587-bcc1-c5af61402182',
      },
    };
    const materialString = await lambda.getMaterialByIdHandler(event);
    const material = JSON.parse(materialString.body);
    material.materialTypeId = '';
    event = {
      httpMethod: 'PUT',
      path: '/materials/7a6ce777-2cdb-4587-bcc1-c5af61402182',
      headers,
      pathParameters: {
        materialId: '7a6ce777-2cdb-4587-bcc1-c5af61402182',
      },
      body: JSON.stringify(material),
    };

    let result = await lambda.updateMaterialHandler(event);
    expect(result.statusCode).toBe(500);
    let body = JSON.parse(result.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('materialTypeId is required');

    material.materialTypeId = 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791';
    material.extraid = 'failure';
    event.body = JSON.stringify(material);
    result = await lambda.updateMaterialHandler(event);
    expect(result.statusCode).toBe(400);
    body = JSON.parse(result.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('"extraid" is not allowed');
  });
});

const { handler, isEmpty, createResponse } = require('./utilities');
const PackingListLogic = require('../api/services/businessLogic/packing-list-logic');

const AVAILABLE_STATUS = 'AVAILABLE';
const SHIPPED = 'SHIPPED';

const createPackingListHandler = handler(async event => {
  const NewPackingList = await PackingListLogic.create(event.body, event.user);
  return createResponse(NewPackingList, 200);
});

const getPackingListByIdHandler = handler(async event => {
  const { pathParameters: { id } } = event;

  const Item = await PackingListLogic.getById(id, event.user);

  const statusCode = isEmpty(Item) ? 404 : 200;
  return createResponse(Item, statusCode);
});

const updatePackingListHandler = handler(async event => {
  const UpdatedItem = await PackingListLogic.updatePackingList(event.body, event.user);
  const statusCode = isEmpty(UpdatedItem) ? 404 : 200;
  return createResponse(UpdatedItem, statusCode);
});

// query parameters sortDescending and status
// sortDescending boolean true, sort results from newest created date to oldest.
// default sort is newest updatedDate to oldest
// status options are AVAILABLE or SHIPPED, defaults to SHIPPED
// fromKey
const getPackingListsHandler = handler(async event => {
  const { queryStringParameters } = event;
  let status = AVAILABLE_STATUS;
  let sortDescending = true;
  let fromKey;

  if (queryStringParameters) {
    status = queryStringParameters.status === SHIPPED ? SHIPPED : AVAILABLE_STATUS;
    if (queryStringParameters.sortDescending === 'false') {
      sortDescending = false;
    }

    if (queryStringParameters.fromKey) {
      fromKey = queryStringParameters.fromKey;
    }
  }
  const packingLists = await PackingListLogic.getPackingListsByStatus(status, sortDescending, fromKey, event.user);
  return createResponse(packingLists, 200);
});

const voidHandler = handler(async event => {
  const { pathParameters: { id } } = event;
  await PackingListLogic.void(id, event.user.userId);
  return createResponse(null, 204);
});

module.exports = {
  createPackingListHandler: event => createPackingListHandler(event),
  getPackingListByIdHandler: event => getPackingListByIdHandler(event),
  updatePackingListHandler: event => updatePackingListHandler(event),
  getPackingListsHandler: event => getPackingListsHandler(event),
  voidPackingListHandler: event => voidHandler(event),
};

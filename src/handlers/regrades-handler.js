const { handler, isEmpty, createResponse } = require('./utilities');
const RegradesLogic = require('../api/services/businessLogic/regrades-logic');

const create = handler(async event => {
  const regrade = event.body;
  const { userId } = event.user;

  const newRegrade = await RegradesLogic.create(regrade, userId);
  return createResponse(newRegrade);
});

const list = handler(async event => {
  const { queryStringParameters } = event;

  // default is archive false, sort descending true
  let archive = false;
  let sortDescending = true;

  if (queryStringParameters) {
    archive = queryStringParameters.archive === 'true';

    if (queryStringParameters.sortDescending === 'false') {
      sortDescending = false;
    }
  }

  const item = await RegradesLogic.getRegradesByStatus(archive, sortDescending);

  const statusCode = isEmpty(item) ? 404 : 200;
  return createResponse(item, statusCode);
});

const get = handler(async event => {
  const { pathParameters: { id } } = event;

  const item = await RegradesLogic.getById(id);
  const statusCode = isEmpty(item) ? 404 : 200;
  return createResponse(item, statusCode);
});

exports.create = async event => create(event);
exports.list = async event => list(event);
exports.get = async event => get(event);

module.exports = {
  createPackingListRequest: json => ({
    httpMethod: 'POST',
    path: '/packing-list',
    body: JSON.stringify(json),
    headers: {
      Organization: 'fake',
      Yard: 'yard1',
      Authorization: 'Bearer test.token',
    },
  }),
  createValidPackingListRequest: () => ({
    httpMethod: 'POST',
    path: '/packing-list',
    body: JSON.stringify({
      finishedGoodsIds: [ '123', 'abc', 'test' ],
    }),
    headers: {
      Organization: 'fake',
      Yard: 'yard1',
      Authorization: 'Bearer test.token',
    },
  }),

};

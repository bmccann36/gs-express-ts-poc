module.exports = {
  createInboundTicketRequest: json => ({
    httpMethod: 'POST',
    path: '/inbound-ticket',
    body: JSON.stringify(json),
  }),

  customer: {
    customerCommonIdentifierString: "Bob'scrap",
  },
  materials: [
    {
      code: '123',
      gross: {
        // amount: 100,
        // units: 'lbs',
      },
      tare: {
        // amount: 10,
        // units: 'lbs',
      },
      netWeight: {
        // amount: 90,
        // units: 'lbs',
      },
    },
  ],
};

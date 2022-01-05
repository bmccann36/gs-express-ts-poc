const Logic = require('../../../../../src/api/services/businessLogic/inbound-ticket-logic');
const MockDB = require('../../../../../src/api/models/memoryDatabase/mock-db');

const organizationInfo = {
  organization: 'hulk_smash',
  yard: 'yard1',
  userId: 'testuser',
};

describe('Test Ticket Logic', () => {
  it('fetch all tickets', async () => {
    MockDB.resetDB();
    const tickets = await Logic.fetchAll({}, organizationInfo);
    expect(tickets.page).toBe(1);
    expect(tickets.resultsReturned).toBe(1);
    expect(tickets.pageSize).toBeUndefined();
    expect(tickets.Items.length).toBe(1);
  });
  it('fetch one tickets', async () => {
    MockDB.resetDB();
    const ticket = await Logic.fetch('4c0f5271-9222-47f3-a4b1-f14eb3f1e5a3',
      organizationInfo);
    expect(ticket.id).toBe('4c0f5271-9222-47f3-a4b1-f14eb3f1e5a3');
  });
  it('create one minimum ticket', async () => {
    MockDB.resetDB();
    const ticket = {
      customer: {
        customerCommonIdentifierString: 'Bob Frog Scrap',
      },
    };
    const newTicket = await Logic.create(ticket,
      {
        organization: 'hulk_smash',
        yard: 'yard1',
        userId: 'testuser',
      });
    expect(newTicket).toHaveProperty('id');
    expect(newTicket).toHaveProperty('ticketId');
  });
  it('create one tickets', async () => {
    MockDB.resetDB();
    const ticket = {
      customer: {
        customerCommonIdentifierString: 'Bob Frog Scrap',
      },
      materials: [
        {
          materialTypeId: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
          weightAndPrice: {
            gross: {
              amount: 3973,
              units: 'lbs',
              commonString: '3973 lbs',
            },
            tare: {
              amount: 10,
              units: 'lbs',
              commonString: '10 lbs',
            },
            deductions: [],
            netWeight: {
              amount: 3963,
              units: 'lbs',
              commonString: '3963 lbs',
            },
            um: 'lbs',
            netPrice: {
              commonString: '$0.25/lb',
              currency: 'usd',
              precision: 2,
              amount: 25,
            },
            netValue: {
              commonString: '$990.75',
              currency: 'usd',
              precision: 2,
              amount: 99075,
            },
          },
        },
      ],
    };
    const newTicket = await Logic.create(ticket, organizationInfo);
    expect(newTicket.id).toBeDefined();
    expect(newTicket.customer).toBeDefined();
    expect(newTicket).toHaveProperty('status');
    expect(newTicket.status).toHaveProperty('value');
    expect(newTicket.status).toHaveProperty('date');
    expect(newTicket.status).toHaveProperty('userId');
    expect(newTicket.status.value).toBe('INCOMPLETE');
    expect(newTicket.status.userId).toBe('testuser');
    expect(newTicket).toHaveProperty('statusHistory');
    expect(newTicket.statusHistory).toHaveLength(1);
  });
  it('create one ticket: SCALE COMPLETE', async () => {
    MockDB.resetDB();
    const ticket = {
      customer: {
        customerCommonIdentifierString: 'Bob Frog Scrap',
      },
      status: {
        value: 'SCALE_COMPLETE',
        date: '2021-9-12',
        userId: 'testuser',
      },
      scaleType: 'Scale1',
      transportationInfo: {
        carrier: 'Carrier1',
        carrierNumber: 1234,
        trailerNumber: 88889,
      },
      truckWeight: {
        gross: {
          amount: 100,
          units: 'lbs',
        },
        tare: {
          amount: 100,
          units: 'lbs',
        },
        net: {
          amount: 100,
          units: 'lbs',
        },
      },
      loadWeight: {
        gross: {
          amount: 100,
          units: 'lbs',
        },
        tare: {
          amount: 100,
          units: 'lbs',
        },
        net: {
          amount: 100,
          units: 'lbs',
        },
        deductions: {
          amount: 10,
          units: 'lbs',
        },
      },
      materials: [
        {
          materialTypeId: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
          weightAndPrice: {
            gross: {
              amount: 3973,
              units: 'lbs',
              commonString: '3973 lbs',
            },
            tare: {
              amount: 10,
              units: 'lbs',
              commonString: '10 lbs',
            },
            deductions: [],
            netWeight: {
              amount: 3963,
              units: 'lbs',
              commonString: '3963 lbs',
            },
            um: 'lbs',
            netPrice: {
              commonString: '$0.25/lb',
              currency: 'usd',
              precision: 2,
              amount: 25,
            },
            netValue: {
              commonString: '$990.75',
              currency: 'usd',
              precision: 2,
              amount: 99075,
            },
          },
        },
      ],
    };
    const newTicket = await Logic.create(ticket, organizationInfo);
    expect(newTicket.id).toBeDefined();
    expect(newTicket.customer).toBeDefined();
    expect(newTicket).toHaveProperty('status');
    expect(newTicket.status).toHaveProperty('value');
    expect(newTicket.status).toHaveProperty('date');
    expect(newTicket.status).toHaveProperty('userId');
    expect(newTicket.status.value).toBe('SCALE_COMPLETE');
    expect(newTicket.status.userId).toBe('testuser');
    expect(newTicket).toHaveProperty('statusHistory');
    expect(newTicket.statusHistory).toHaveLength(1);
  });
  it('create one ticket: PRICE COMPLETE', async () => {
    MockDB.resetDB();
    const ticket = {
      customer: {
        customerCommonIdentifierString: 'Bob Frog Scrap',
      },
      status: {
        value: 'PRICE_COMPLETE',
        date: '2021-9-12',
        userId: 'testuser',
      },
      scaleType: 'Scale1',
      transportationInfo: {
        carrier: 'Carrier1',
        carrierNumber: 1234,
        trailerNumber: 88889,
      },
      truckWeight: {
        gross: {
          amount: 100,
          units: 'lbs',
        },
        tare: {
          amount: 100,
          units: 'lbs',
        },
        net: {
          amount: 100,
          units: 'lbs',
        },
      },
      loadWeight: {
        gross: {
          amount: 100,
          units: 'lbs',
        },
        tare: {
          amount: 100,
          units: 'lbs',
        },
        net: {
          amount: 100,
          units: 'lbs',
        },
        deductions: {
          amount: 10,
          units: 'lbs',
        },
      },
      netValue: {
        amount: 1000,
        currency: 'USD',
        precision: 0,
        priceString: '$1000',
      },
      materials: [
        {
          materialTypeId: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
          weightAndPrice: {
            gross: {
              amount: 3973,
              units: 'lbs',
              commonString: '3973 lbs',
            },
            tare: {
              amount: 10,
              units: 'lbs',
              commonString: '10 lbs',
            },
            deductions: [],
            netWeight: {
              amount: 3963,
              units: 'lbs',
              commonString: '3963 lbs',
            },
            um: 'lbs',
            netPrice: {
              commonString: '$0.25/lb',
              currency: 'usd',
              precision: 2,
              amount: 25,
            },
            netValue: {
              commonString: '$990.75',
              currency: 'usd',
              precision: 2,
              amount: 99075,
            },
          },
        },
      ],
    };
    const newTicket = await Logic.create(ticket, organizationInfo);
    expect(newTicket.id).toBeDefined();
    expect(newTicket.customer).toBeDefined();
    expect(newTicket).toHaveProperty('status');
    expect(newTicket.status).toHaveProperty('value');
    expect(newTicket.status).toHaveProperty('date');
    expect(newTicket.status).toHaveProperty('userId');
    expect(newTicket.status.value).toBe('PRICE_COMPLETE');
    expect(newTicket.status.userId).toBe('testuser');
    expect(newTicket).toHaveProperty('statusHistory');
    expect(newTicket.statusHistory).toHaveLength(1);

    const fetchTicket = await Logic.fetch(newTicket.id,
      organizationInfo);
    expect(fetchTicket).toHaveProperty('materials');
    expect(fetchTicket.materials).toHaveLength(1);
    expect(fetchTicket.materials[ 0 ]).toHaveProperty('weightAndPrice');
    expect(fetchTicket).toHaveProperty('customer');
    expect(fetchTicket.customer).toHaveProperty('customerCommonIdentifierString');
    expect(fetchTicket.customer).toHaveProperty('id');

    const allTickets = await Logic.fetchAll({}, organizationInfo);
    expect(allTickets.Items).toHaveLength(2);
    expect(allTickets.Items[ 1 ]).toHaveProperty('customer');
    expect(allTickets.Items[ 1 ]).toHaveProperty('materials');
    expect(allTickets.Items[ 1 ].customer).toHaveProperty('id');
    expect(allTickets.Items[ 1 ].customer).toHaveProperty('customerCommonIdentifierString');
    expect(allTickets.Items[ 1 ].materials[ 0 ]).toHaveProperty('weightAndPrice');
  });

  it('create invalid ticket: incomplete material', async () => {
    MockDB.resetDB();
    const ticket = {
      customer: {
        customerCommonIdentifierString: 'Bob Frog Scrap',
      },
      materials: [
        {
          gross: {
            amount: 100,
            units: 'lbs',
          },
          tare: {
            amount: 10,
            units: 'lbs',
          },
          netWeight: {
            amount: 90,
            units: 'lbs',
          },
        },
      ],
    };
    const t = async () => {
      await Logic.create(ticket, organizationInfo);
    };
    await expect(t).rejects.toThrowError('INCOMPLETE ticket errors materials are invalid');
  });
  it('create invalid ticket: Scale Complete no weights', async () => {
    MockDB.resetDB();
    const ticket = {
      customer: {
        customerCommonIdentifierString: 'Bob Frog Scrap',
      },
      status: {
        value: 'SCALE_COMPLETE',
        date: '2021-9-12',
        userId: 'testuser',
      },
      materials: [
        {
          gross: {
            amount: 100,
            units: 'lbs',
          },
          tare: {
            amount: 10,
            units: 'lbs',
          },
          netWeight: {
            amount: 90,
            units: 'lbs',
          },
        },
      ],
    };
    const t = async () => {
      await Logic.create(ticket, organizationInfo);
    };
    await expect(t).rejects.toThrowError('SCALE_COMPLETE ticket errors weights required');
  });
  it('create invalid ticket: PRICE COMPLETE no net value', async () => {
    MockDB.resetDB();
    const ticket = {
      customer: {
        customerCommonIdentifierString: 'Bob Frog Scrap',
      },
      status: {
        value: 'PRICE_COMPLETE',
        date: '2021-9-12',
        userId: 'testuser',
      },
      scaleType: 'Scale1',
      transportationInfo: {
        carrier: 'Carrier1',
        carrierNumber: 1234,
        trailerNumber: 88889,
      },
      truckWeight: {
        gross: {
          amount: 100,
          units: 'lbs',
        },
        tare: {
          amount: 100,
          units: 'lbs',
        },
        net: {
          amount: 100,
          units: 'lbs',
        },
      },
      loadWeight: {
        gross: {
          amount: 100,
          units: 'lbs',
        },
        tare: {
          amount: 100,
          units: 'lbs',
        },
        net: {
          amount: 100,
          units: 'lbs',
        },
        deductions: {
          amount: 10,
          units: 'lbs',
        },
      },
      materials: [
        {
          materialTypeId: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
          weightAndPrice: {
            gross: {
              amount: 3973,
              units: 'lbs',
              commonString: '3973 lbs',
            },
            tare: {
              amount: 10,
              units: 'lbs',
              commonString: '10 lbs',
            },
            deductions: [],
            netWeight: {
              amount: 3963,
              units: 'lbs',
              commonString: '3963 lbs',
            },
            um: 'lbs',
            netPrice: {
              commonString: '$0.25/lb',
              currency: 'usd',
              precision: 2,
              amount: 25,
            },
            netValue: {
              commonString: '$990.75',
              currency: 'usd',
              precision: 2,
              amount: 99075,
            },
          },
        },
      ],
    };
    const t = async () => {
      await Logic.create(ticket, organizationInfo);
    };
    await expect(t).rejects.toThrowError('PRICE_COMPLETE ticket errors netValue required');
  });
  it('update one tickets', async () => {
    MockDB.resetDB();
    const ticket = {
      customer: {
        customerCommonIdentifierString: 'Bob Frog Scrap',
      },
      materials: [
        {
          materialTypeId: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
          weightAndPrice: {
            gross: {
              amount: 3973,
              units: 'lbs',
              commonString: '3973 lbs',
            },
            tare: {
              amount: 10,
              units: 'lbs',
              commonString: '10 lbs',
            },
            deductions: [],
            netWeight: {
              amount: 3963,
              units: 'lbs',
              commonString: '3963 lbs',
            },
            um: 'lbs',
            netPrice: {
              commonString: '$0.25/lb',
              currency: 'usd',
              precision: 2,
              amount: 25,
            },
            netValue: {
              commonString: '$990.75',
              currency: 'usd',
              precision: 2,
              amount: 99075,
            },
          },
        },
      ],
    };
    const newTicket = await Logic.create(ticket, organizationInfo);
    expect(newTicket).toHaveProperty('id');
    const updatedTicket = { ...newTicket, scaleType: 'Scale1' };
    const newUpdatedTicket = await Logic.update(updatedTicket, organizationInfo);
    expect(newUpdatedTicket).toHaveProperty('id');
    expect(newUpdatedTicket).toHaveProperty('scaleType');
    expect(newUpdatedTicket.scaleType).toBe('Scale1');
  });

  it('update invalid ticket: Missing Material Gross', async () => {
    MockDB.resetDB();
    const ticket = {
      customer: {
        customerCommonIdentifierString: 'Bob Frog Scrap',
      },
      materials: [
        {
          materialTypeId: 'a4a5bfc5-e33f-44f8-8fa0-1b21bfa37791',
          weightAndPrice: {
            gross: {
              amount: 3973,
              units: 'lbs',
              commonString: '3973 lbs',
            },
            tare: {
              amount: 10,
              units: 'lbs',
              commonString: '10 lbs',
            },
            deductions: [],
            netWeight: {
              amount: 3963,
              units: 'lbs',
              commonString: '3963 lbs',
            },
            um: 'lbs',
            netPrice: {
              commonString: '$0.25/lb',
              currency: 'usd',
              precision: 2,
              amount: 25,
            },
            netValue: {
              commonString: '$990.75',
              currency: 'usd',
              precision: 2,
              amount: 99075,
            },
          },
        },
      ],
    };
    const newTicket = await Logic.create(ticket, organizationInfo);
    expect(newTicket).toHaveProperty('id');
    const updatedTicket = { ...newTicket, scaleType: 'Scale1', materials: [{ }] };
    const t = async () => {
      await Logic.update(updatedTicket, organizationInfo);
    };
    await expect(t).rejects.toThrowError('INCOMPLETE ticket errors materials are invalid');
  });
});

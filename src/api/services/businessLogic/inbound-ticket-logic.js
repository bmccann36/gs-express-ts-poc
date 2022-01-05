const { v4: uuidv4 } = require('uuid');
const DB = require('../../loaders/database-loader').loadDB();
const Validate = require('./validate');
const Customer = require('./customer-logic');
const Material = require('./material-logic');
const priceUtility = require('../../../utilities/price-utility');
const { mapAsync } = require('../../../utilities/mapAsync');

const INCOMPLETE_STATUS = 'INCOMPLETE';
const SCALE_COMPLETE_STATUS = 'SCALE_COMPLETE';
const PRICE_COMPLETE_STATUS = 'PRICE_COMPLETE';
const VOID_STATUS = 'VOID';
const DFWI = 'DFWI';
const MATERIAL_STATES = Material.getStates();

function validateTicket( inboundTicket ) {
  let msg;
  switch (inboundTicket.status.value) {
  case INCOMPLETE_STATUS:
    msg = Validate.getValidationErrors(Validate.INBOUND_TICKET_INCOMPLETE_VALIDATION_RULES, inboundTicket);
    break;
  case SCALE_COMPLETE_STATUS:
    msg = Validate.getValidationErrors(Validate.INBOUND_TICKET_SCALE_COMPLETE_VALIDATION_RULES, inboundTicket);
    break;
  case PRICE_COMPLETE_STATUS:
    msg = Validate.getValidationErrors(Validate.INBOUND_TICKET_PRICE_COMPLETE_VALIDATION_RULES, inboundTicket);
    break;
  default:
    msg = 'unknown status';
  }

  if (msg) {
    throw new Error(`${ inboundTicket.status.value } ticket errors ${ msg }`);
  }
}

// returns a customer id, may create new customer
async function setCustomerId( customer, organizationInfo ) {
  if (Validate.isValidResource(customer, 'id')) {
    return customer.id;
  }
  const existingCustomer = await Customer.fetchAll(
    {
      page: 1,
      filter: { key: 'customerCommonIdentifierString', value: customer.customerCommonIdentifierString },
    },
    organizationInfo
  );

  if (existingCustomer.resultsReturned > 0) {
    // returns just the id

    return existingCustomer.Items[ 0 ].id;
  }

  const newCustomer = await Customer.create(customer, organizationInfo);
  return newCustomer.id;
}

class InboundTicketLogic {
  // eslint-disable-next-line no-unused-vars
  static async fetchAll( queryParams, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-InboundTickets`;
    const ticketList = await DB.get(collection, queryParams.sort, queryParams.filter, queryParams.page,
      queryParams.pageSize, queryParams.fromKey);
    ticketList.Items = ticketList.Items.filter(ticket => ticket.status.value !== VOID_STATUS);
    ticketList.Items = ticketList.Items.filter(ticket => ticket.id !== DFWI);
    ticketList.resultsReturned = ticketList.Items.length;
    for (const ticket of ticketList.Items) {
      const materialList = [];
      if (ticket.materials) {
        for (const material of ticket.materials) {
          // eslint-disable-next-line no-await-in-loop
          const temp = await Material.fetch(material, organizationInfo);
          materialList.push(temp);
        }
      }
      if (ticket.customer) {
        // eslint-disable-next-line no-await-in-loop
        ticket.customer = await Customer.fetch(ticket.customer, organizationInfo);
      }
      ticket.materials = materialList;
    }
    return ticketList;
  }

  // eslint-disable-next-line no-unused-vars
  static async fetch( inboundTicketId, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-InboundTickets`;
    const ticket = await DB.getById(collection, inboundTicketId);
    const materialList = [];
    if (ticket.materials) {
      for (const material of ticket.materials) {
        // eslint-disable-next-line no-await-in-loop
        const temp = await Material.fetch(material, organizationInfo);
        materialList.push(temp);
      }
    }
    if (ticket.customer) {
      ticket.customer = await Customer.fetch(ticket.customer, organizationInfo);
    }
    ticket.materials = materialList;
    return ticket;
  }

  /**
   * New Tickets
   *  1.  Validate Required fields
   *  2.  Set createdDate
   *  3.  Set Status
   *  4.  Lookup/Create Customer (inject id)
   *  5.  Create Material(s) (inject id)
   *  6.  Save Ticket to DB
   * @param inboundTicket
   * @returns {Promise<*&{archive: boolean, id: (*|string)}>}
   */
  static async create( inboundTicket, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-InboundTickets`;
    try {
      const createdDate = Date.now();
      const today = new Date();
      const ticketId = parseInt(
        `${ today.getMonth() }${ today.getDay() }${ today.getHours() }${ today.getMinutes() }`, 10
      );
      const newInboundTicket = {
        ...inboundTicket,
        id: uuidv4(),
        ticketId,
        archive: false,
        createdDate,
        status: inboundTicket.status ||
          {
            value: INCOMPLETE_STATUS,
            date: createdDate,
            userId: organizationInfo.userId,
          },
        statusHistory: inboundTicket.statusHistory || [],
      };
      // ticket will have status
      validateTicket(newInboundTicket);

      newInboundTicket.statusHistory.push(newInboundTicket.status);

      if (typeof newInboundTicket.netPrice === 'number') {
        newInboundTicket.netPrice = priceUtility.getValueFromNumber(newInboundTicket.netPrice);
      }
      if (typeof newInboundTicket.netValue === 'number') {
        newInboundTicket.netValue = priceUtility.getValueFromNumber(newInboundTicket.netValue);
      }

      let customerObj;
      if (newInboundTicket.customer) {
        customerObj = newInboundTicket.customer;
        newInboundTicket.customer = await setCustomerId(newInboundTicket.customer, organizationInfo);
      }

      const materialObjectList = [];
      if (newInboundTicket.materials && newInboundTicket.materials.length > 0) {
        const materialIdLists = [];
        for (const material of newInboundTicket.materials) {
          material.inboundTicketId = newInboundTicket.id;
          if (newInboundTicket.status.value === PRICE_COMPLETE_STATUS) {
            material.status = {
              value: MATERIAL_STATES.WIP,
              date: createdDate,
              userId: organizationInfo.userId,
            };
          } else if (newInboundTicket.status.value === SCALE_COMPLETE_STATUS) {
            material.status = {
              value: MATERIAL_STATES.SWIP,
              date: createdDate,
              userId: organizationInfo.userId,
            };
          } else if (newInboundTicket.status.value === INCOMPLETE_STATUS) {
            material.status = {
              value: MATERIAL_STATES.CREATED,
              date: createdDate,
              userId: organizationInfo.userId,
            };
          }
          // eslint-disable-next-line no-await-in-loop
          const materialObj = await Material.create(material, organizationInfo);
          materialIdLists.push(materialObj.id);
          materialObjectList.push(materialObj);
        }
        newInboundTicket.materials = materialIdLists;
      }

      await DB.create(collection, newInboundTicket);

      // return whole customer object
      if (customerObj) {
        newInboundTicket.customer = {
          ...customerObj,
          id: newInboundTicket.customer,
        };
      }
      if (materialObjectList && materialObjectList.length > 0) {
        newInboundTicket.materials = [ ...materialObjectList ];
      }

      return newInboundTicket;
    } catch (error) {
      console.log('Create Inbound Ticket Error');
      console.log(error);
      throw error;
    }
  }

  /**
   *  Updated Tickets
   *  1.  Validate Required fields
   *  3.  Update Status & Status History
   *  4.  Lookup/Create Customer (inject id)
   *  5.  Create Material(s) (inject id)
   *  6.  Save Ticket to DB
   * @param inboundTicket ticket body
   * @param organizationInfo org and user info
   * @returns {Promise<DocumentClient.AttributeMap>}
   */
  static async update( inboundTicket, organizationInfo ) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-InboundTickets`;
    // validate inbound ticket has id in json
    if (!Validate.isValidResource(inboundTicket, 'id')) {
      throw new Error('Update is missing ticket id');
    }

    try {
      const updatedDate = Date.now();
      const updatedInboundTicket = {
        ...inboundTicket,
        status: inboundTicket.status ||
          {
            value: INCOMPLETE_STATUS,
            date: updatedDate,
            userId: organizationInfo.userId,
          },
        statusHistory: inboundTicket.statusHistory || [],
      };
      updatedInboundTicket.statusHistory.push(updatedInboundTicket.status);

      validateTicket(updatedInboundTicket);

      if (typeof updatedInboundTicket.netPrice === 'number') {
        updatedInboundTicket.netPrice = priceUtility.getValueFromNumber(updatedInboundTicket.netPrice);
      }
      if (typeof updatedInboundTicket.netValue === 'number') {
        updatedInboundTicket.netValue = priceUtility.getValueFromNumber(updatedInboundTicket.netValue);
      }

      let customerObj;
      if (updatedInboundTicket.customer) {
        customerObj = updatedInboundTicket.customer;
        // only save customer id in db
        updatedInboundTicket.customer = await setCustomerId(updatedInboundTicket.customer, organizationInfo);
      }
      const materialObjectList = [];
      if (updatedInboundTicket.materials && updatedInboundTicket.materials.length > 0) {
        const materialIdLists = [];
        for (const material of updatedInboundTicket.materials) {
          let materialObj;
          material.inboundTicketId = updatedInboundTicket.id;
          if (updatedInboundTicket.status.value === PRICE_COMPLETE_STATUS) {
            material.status = {
              value: MATERIAL_STATES.WIP,
              date: updatedDate,
              userId: organizationInfo.userId,
            };
          } else if (updatedInboundTicket.status.value === SCALE_COMPLETE_STATUS) {
            material.status = {
              value: MATERIAL_STATES.SWIP,
              date: updatedDate,
              userId: organizationInfo.userId,
            };
          } else if (updatedInboundTicket.status.value === INCOMPLETE_STATUS) {
            material.status = {
              value: MATERIAL_STATES.CREATED,
              date: updatedDate,
              userId: organizationInfo.userId,
            };
          }
          if (Validate.isValidResource(material, 'id')) {
            // eslint-disable-next-line no-await-in-loop
            materialObj = await Material.update(material, organizationInfo);
            if (!materialObj.id) {
              throw new Error('Material Id does not exist');
            }
          } else {
            // eslint-disable-next-line no-await-in-loop
            materialObj = await Material.create(material, organizationInfo);
          }
          materialIdLists.push(materialObj.id);
          materialObjectList.push(materialObj);
        }
        updatedInboundTicket.materials = materialIdLists;
      }

      await DB.update(collection, updatedInboundTicket);

      // return whole customer object
      if (customerObj) {
        updatedInboundTicket.customer = {
          ...customerObj,
          id: updatedInboundTicket.customer,
        };
      }
      if (materialObjectList && materialObjectList.length > 0) {
        updatedInboundTicket.materials = [ ...materialObjectList ];
      }

      return updatedInboundTicket;
    } catch (error) {
      console.log('Update Inbound Ticket Error');
      console.log(error);
      throw error;
    }
  }

  static async void(id, organizationInfo) {
    console.log(`Voiding ticket ${ id }`);
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-InboundTickets`;
    const ticket = await DB.getById(collection, id);
    if (ticket.status.value === VOID_STATUS) {
      throw new Error(`Inbound ticket ${ id } already ${ VOID_STATUS }`);
    }
    // fetch materials on ticket which are not already archived
    const materials = (await mapAsync(ticket.materials, materialId => Material.fetch(materialId, organizationInfo)))
      .filter(mat => mat.status?.value !== Material.getStates().ARCHIVED);
    const materialInFinishedGood = materials.find(m => m.finishedGoodId);
    if (materialInFinishedGood) {
      throw new Error(`Cannot void ticket because its material ${ materialInFinishedGood.id } is in a finished good.`);
    }
    console.log(`Updating ticket ${ id } with status ${ VOID_STATUS }`);
    const status = { value: VOID_STATUS };
    const newTicket = {
      ...ticket,
      status,
      statusHistory: [ ...ticket.statusHistory, status ],
    };
    await DB.update(collection, newTicket);
    await mapAsync(ticket.materials, materialId => Material.archive(materialId, organizationInfo));
  }
}

module.exports = InboundTicketLogic;

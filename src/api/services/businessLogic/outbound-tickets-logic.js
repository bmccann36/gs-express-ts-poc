const uuid = require('uuid');
const Joi = require('joi');
const _ = require('lodash');
const { loadDB } = require('../../loaders/database-loader');
const PackingListLogic = require('./packing-list-logic');
const FinishedGoodsLogic = require('./finished-goods');
const { mapAsync } = require('../../../utilities/mapAsync');
const { generateTag } = require('../../../utilities/generateTag');
const utilities = require('../../../handlers/utilities');
const CustomerLogic = require('./customer-logic');

const db = loadDB();
const collection = process.env.OUTBOUND_TICKETS_TABLE || 'OutboundTickets';

const GSI1PK = 'OUTBOUND_TICKETS';
const AVAILABLE = 'AVAILABLE';
const UNAVAILABLE = 'UNAVAILABLE';
const SHIPPED = 'SHIPPED';
const VOID = 'VOID';

class OutboundTicketsLogic {
  static async fetchAll() {
    const query = db.newIndexQueryObj(collection, 'GSI1', 'GSI1PK', GSI1PK, true);
    const result = await db.queryIndex(query);
    return {
      ...result,
      Items: result.Items.map(fg => this.removeInternalFields(fg)),
    };
  }

  static async fetch(id) {
    const outboundTicket = await db.getById(collection, id);
    return this.removeInternalFields(outboundTicket);
  }

  static getStatusObj(statusValue, date, userId) {
    return {
      value: statusValue,
      date,
      userId,
    };
  }

  static getRemovedPackingListsForUpdate(originalOutboundTicket, outboundTicketRequestDTO) {
    return _.differenceWith(originalOutboundTicket.packingListIds,
      outboundTicketRequestDTO.packingListIds, _.isEqual);
  }

  static getRemovedFinishedGoodsForUpdate(originalOutboundTicket, outboundTicketRequestDTO) {
    const finishedGoodIds = outboundTicketRequestDTO.finishedGoods.map(fg => fg.id);

    return _.differenceWith(originalOutboundTicket.finishedGoodIds,
      finishedGoodIds, _.isEqual);
  }

  static async update(outboundTicketRequestDTO, orgInfo) {
    try {
      const originalOutboundTicket = await db.getById(collection, outboundTicketRequestDTO.id);

      if (utilities.isEmpty(originalOutboundTicket)) {
        return {};
      }

      const updatedStatus = outboundTicketRequestDTO.status;

      const originalStatus = originalOutboundTicket.status;

      if (originalStatus !== AVAILABLE) {
        throw new Error('Cannot update a VOID or SHIPPED outbound ticket');
      }

      const currentStatus = originalOutboundTicket.status;

      const { statusHistory } = originalOutboundTicket;

      const updatedDate = Date.now();

      if (currentStatus !== updatedStatus) {
        statusHistory.push(this.getStatusObj(updatedStatus, updatedDate, orgInfo.userId));
      }

      const updatedOutboundTicket = {
        id: outboundTicketRequestDTO.id,
        tag: originalOutboundTicket.tag,
        status: outboundTicketRequestDTO.status,
        userId: orgInfo.userId,
        date: originalOutboundTicket.date,
        statusHistory,
        GSI1PK,
        GSI1SK: originalOutboundTicket.date,
        packingListIds: outboundTicketRequestDTO.packingListIds,
        transportationInfo: outboundTicketRequestDTO.transportationInfo,
        customerId: outboundTicketRequestDTO.customerId,
        materialIds: [],
        finishedGoodIds: outboundTicketRequestDTO.finishedGoods.map(finishedGood => finishedGood.id),
      };

      let ddbPutItems = [];

      // packingLists
      const removedPackingListIds = this.getRemovedPackingListsForUpdate(originalOutboundTicket,
        outboundTicketRequestDTO);

      if (removedPackingListIds && removedPackingListIds.length > 0) {
        //  change packing list status to AVAILABLE
        const packingListStatusUpdates = PackingListLogic.getUpdateStatusPackingListArray(removedPackingListIds,
          AVAILABLE);
        ddbPutItems = _.concat(ddbPutItems, packingListStatusUpdates);
      }

      // removed finishedGoods -
      const removedFinishedGoodIds = this.getRemovedFinishedGoodsForUpdate(originalOutboundTicket,
        outboundTicketRequestDTO);

      // change finished good status to AVAILABLE
      if (removedFinishedGoodIds && removedFinishedGoodIds.length > 0) {
        const finishedGoodsStatusUpdates = FinishedGoodsLogic.getUpdateStatusFinishedGoodsArray(removedFinishedGoodIds,
          this.getStatusObj(AVAILABLE, updatedDate, orgInfo.userId));
        ddbPutItems = _.concat(ddbPutItems, finishedGoodsStatusUpdates);
      }

      const outboundTicketToSave = await this.outboundTicketCreateFlow(updatedOutboundTicket, outboundTicketRequestDTO,
        orgInfo);

      const { error } = this.OutboundTicketSchema.validate(outboundTicketToSave);

      if (error) {
        console.error('VALIDATION ERROR:', error.message);
        throw error;
      }

      // outbound ticket status is SHIPPED -> update PackingList status to SHIPPED
      if (outboundTicketToSave.status === SHIPPED) {
        //  update packing list status to SHIPPED
        if (outboundTicketToSave.packingListIds && outboundTicketToSave.packingListIds.length > 0) {
          const packingListsToSave =
                        PackingListLogic.getUpdateStatusPackingListArray(outboundTicketToSave.packingListIds,
                          SHIPPED);
          ddbPutItems = _.concat(PackingListLogic.getPutItemsArrayOfPackingLists(packingListsToSave));
        }
      }

      ddbPutItems.push(db.createPutDynamoDbObject(outboundTicketToSave, collection));

      await db.writeItemsArrayWithTransaction({
        TransactItems: ddbPutItems,
      });

      return this.removeInternalFields(outboundTicketToSave);
    } catch (err) {
      console.error('OutboundTicketLogic.update', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  /**
     * outboundTicketCreateFlow
     * @param  {} outboundTicket outbound ticket to be save. Create or Update
     * @param  {} outboundTicketRequestDTO request DTO provided from
     * @param  {} orgInfo standard org info
     * Create or Update
     * @return  outboundTicket to be saved
     */
  static async outboundTicketCreateFlow(outboundTicket, outboundTicketRequestDTO, orgInfo) {
    try {
      const outboundTicketToSave = _.cloneDeep(outboundTicket);

      if (outboundTicket.packingListIds.length > 0) {
        await PackingListLogic.validatePackingListIdsExist(outboundTicket.packingListIds);
      }

      if (outboundTicket.finishedGoodIds.length > 0) {
        const finishedGoods = await FinishedGoodsLogic.fetchFinishedGoodsByIds(outboundTicket.finishedGoodIds);

        // fields for table
        outboundTicketToSave.materialTypeCodes =
                    FinishedGoodsLogic.getDistinctMaterialTypeCodesFromFinishedGoods(finishedGoods);

        // netWeight
        const netWeight = FinishedGoodsLogic.getNetWeightSumOfFinishedGoods(outboundTicketRequestDTO.finishedGoods);
        // add materials net weight TODO

        outboundTicketToSave.netWeight = netWeight;

        // add or remove weight to finished goods
        await this.updateFinishedGoodsWeights(outboundTicketRequestDTO.finishedGoods, finishedGoods, orgInfo);
      }

      const customer = await CustomerLogic.fetch(outboundTicket.customerId, orgInfo);

      if (utilities.isEmpty(customer)) {
        throw new Error('invalid customerId provided');
      }

      outboundTicketToSave.customerDisplayName = customer.customerCommonIdentifierString;

      // validate outboundTicket
      const { error } = this.OutboundTicketSchema.validate(outboundTicketToSave);
      if (error) {
        console.error('VALIDATION ERROR:', error.message);
        throw error;
      }

      return outboundTicketToSave;
    } catch (err) {
      console.error('OutboundTicketLogic.outboundTicketCreateFlow', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  /**
     * create
     * packingListIds - validate that the packing list exists
     * finishedGoods with weight - includes all finished goods, on packing list and separate finished goods
     * push or pull material from WIP
     * @param outboundTicketRequestDTO
     * @param orgInfo
     * @returns {Promise<*&{GSI1PK: undefined, GSI1SK: undefined}>}
     */
  static async create(outboundTicketRequestDTO, orgInfo) {
    try {
      const now = Date.now();
      const status = AVAILABLE;

      let outboundTicket = {
        id: uuid.v4(),
        tag: generateTag(),
        status,
        userId: orgInfo.userId,
        date: now,
        statusHistory: [ this.getStatusObj(status, now, orgInfo.userId) ],
        GSI1PK,
        GSI1SK: now,
        packingListIds: outboundTicketRequestDTO.packingListIds,
        transportationInfo: outboundTicketRequestDTO.transportationInfo,
        customerId: outboundTicketRequestDTO.customerId,
        materialIds: [],
        finishedGoodIds: outboundTicketRequestDTO.finishedGoods.map(finishedGood => finishedGood.id),
        materialTypeCodes: [],
        netWeight: 0,
        customerDisplayName: '',
      };

      outboundTicket = await this.outboundTicketCreateFlow(outboundTicket, outboundTicketRequestDTO, orgInfo);

      const savedOutboundTicket = await db.create(collection, outboundTicket);

      return this.removeInternalFields(savedOutboundTicket);
    } catch (err) {
      console.error('OutboundTicketLogic.create', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static async void(id, orgInfo) {
    try {
      if (!id) {
        throw new Error('Finished good ID not specified!');
      }
      const outboundTicket = await db.getById(collection, id);
      if (!outboundTicket || !outboundTicket.id) {
        throw new Error(`Outbound Ticket ${ id } not found!`);
      }

      if (outboundTicket.status === SHIPPED) {
        throw new Error('Cannot void a SHIPPED outbound ticket');
      }

      let finishedGoods = [];
      if (outboundTicket.finishedGoodIds && outboundTicket.finishedGoodIds.length > 0) {
        finishedGoods = await FinishedGoodsLogic.fetchFinishedGoodsByIds(outboundTicket.finishedGoodIds);
      }

      const finishedGoodsWithoutPackingList = finishedGoods.filter(finishedGood => !finishedGood.packingListId)
        .map(finishedGood => FinishedGoodsLogic.setFinishedGoodStatus(finishedGood, AVAILABLE, orgInfo.userId));

      const { statusHistory } = outboundTicket;
      const updatedDate = Date.now();
      statusHistory.push(this.getStatusObj(VOID, updatedDate, orgInfo.userId));
      //  outbound ticket status to VOID
      const voidOutboundTicket = {
        ...outboundTicket,
        status: VOID,
        statusHistory,
      };

      //  save finishedGoodsWithoutPackingList, packingLists
      const ddbPutItems = FinishedGoodsLogic.getPutItemsArrayOfFinishedGoods(finishedGoodsWithoutPackingList);

      const putVoidOutboundTicket = db.createPutDynamoDbObject(voidOutboundTicket, collection);

      ddbPutItems.push(putVoidOutboundTicket);

      return db.writeItemsArrayWithTransaction({
        TransactItems: ddbPutItems,
      });
    } catch (err) {
      console.error('OutboundTicketLogic.void', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  /**
     * updateFinishedGoodsWeights - add or remove weight to finished goods.
     * @param [{ id: '123', weight:{ net: , tare: , gross: , units: }] finishedGoodsIdAndWeightArray
     * @param finishedGoods - finishedGoods from dynamo
     * @param orgInfo
     * @returns {Promise<{finishedGoods: (null|*)[], materials: *[]}>}
     */
  static async updateFinishedGoodsWeights(finishedGoodsIdAndWeightArray, finishedGoods, orgInfo) {
    try {
      // returns material meta data, material type code
      const ids = finishedGoodsIdAndWeightArray.map(fg => fg.id);

      if (ids.length !== finishedGoods.length) {
        throw new Error('invalid finished goods provided');
      }

      //  for each finished good, check total material weight
      //  if fg.targetWeight < sum(netWeight materials) => move excess materials weight to WIP
      //  if fg.targetWeight > sum(netWeight materials) => move required weight from WIP

      await mapAsync(finishedGoods, async finishedGood => {
        let finishedGoodToSave;
        let materialsToSave;

        const finishedGoodIdAndWeight = finishedGoodsIdAndWeightArray.find(element => element.id === finishedGood.id);

        const targetWeight = finishedGoodIdAndWeight.weight;
        const finishedGoodNetWeight = finishedGood.weight.net;

        if (targetWeight.net === finishedGoodNetWeight) {
          finishedGoodToSave = _.cloneDeep(finishedGood);
          finishedGoodToSave.weight = targetWeight;
          //  only update finished good status to UNAVAILABLE
          if (finishedGoodToSave.status.value === AVAILABLE) {
            finishedGoodToSave.status = this.getStatusObj(UNAVAILABLE, Date.now(), orgInfo.userId);
          }
        } else {
          const finishedGoodAndMaterialsToSave = await this.updateFinishedGoodToTargetWeight(finishedGood, targetWeight,
            orgInfo);

          finishedGoodToSave = finishedGoodAndMaterialsToSave.finishedGood;
          finishedGoodToSave.weight = targetWeight;
          finishedGoodToSave.status = this.getStatusObj(UNAVAILABLE, Date.now(), orgInfo.userId);

          materialsToSave = finishedGoodAndMaterialsToSave.materials;
        }

        // save finished good and materials
        const ddbPutItems = FinishedGoodsLogic.getPutItemsArrayOfFinishedGoodAndMaterials(finishedGoodToSave,
          materialsToSave);
        await FinishedGoodsLogic.saveFinishedGoodAndMaterials(ddbPutItems);
      });
    } catch (err) {
      console.error('OutboundTicketLogic.updateFinishedGoodsWeights', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  /**
     * updateFinishedGoodToTargetWeight
     * @param finishedGood
     * @param {gross: 123, net: 123, tare: 0, units: 'lbs'} targetWeight
     * @param orgInfo
     * @returns {Promise<{materials: [], finishedGood}>}
     */
  static async updateFinishedGoodToTargetWeight(finishedGood, targetWeight, orgInfo) {
    try {
      const finishedGoodNetWeight = finishedGood.weight.net;
      const targetNetWeight = targetWeight.net;

      if (finishedGoodNetWeight === targetNetWeight) {
        throw new Error('updateFinishedGoodToTargetWeight finishedGoodNetWeight equals target weight nothing to do');
      }

      let finishedGoodAndMaterialsToSave;
      if (targetNetWeight < finishedGoodNetWeight) {
        //  move material weight to WIP
        //  remove weight from finished good
        const weightToRemove = finishedGoodNetWeight - targetNetWeight;
        finishedGoodAndMaterialsToSave = await FinishedGoodsLogic.removeWeightFromFinishedGood(finishedGood,
          weightToRemove, orgInfo);
      } else {
        const weightToAdd = targetNetWeight - finishedGoodNetWeight;
        finishedGoodAndMaterialsToSave = await FinishedGoodsLogic.addWeightToFinishedGood(finishedGood, weightToAdd,
          orgInfo);
      }
      //  add material weight from WIP
      return finishedGoodAndMaterialsToSave;
    } catch (err) {
      console.error('OutboundTicketLogic.updateFinishedGoodsWeights', err.message, JSON.stringify(err.stack));
      throw err;
    }
  }

  static removeInternalFields(ob) {
    return { ...ob, GSI1PK: undefined, GSI1SK: undefined };
  }
}

OutboundTicketsLogic.OutboundTicketSchema = Joi.object({
  id: Joi.string().uuid().required(),
  customerId: Joi.string().uuid().required(),
  date: Joi.number().required(),
  finishedGoodIds: Joi.array().items(Joi.string().uuid()).required(),
  GSI1PK: Joi.string().required(),
  GSI1SK: Joi.number().required(),
  materialIds: Joi.array().items(Joi.string().uuid()).required(),
  packingListIds: Joi.array().items(Joi.string().uuid()).required(),
  status: Joi.string(),
  statusHistory: Joi.array(),
  tag: Joi.string().required(),
  transportationInfo: Joi.object().required(),
  userId: Joi.string().uuid().required(),
  customerDisplayName: Joi.string().required(),
  materialTypeCodes: Joi.array().required(),
  netWeight: Joi.number().required(),
});

module.exports = OutboundTicketsLogic;

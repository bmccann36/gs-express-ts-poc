const AWS = require('aws-sdk');
const csv = require('fast-csv');
const { v4: uuidv4 } = require('uuid');
const dinero = require('dinero.js');
const materialTypeLogic = require('../businessLogic/material-type-logic');
const PriceEntryLogic = require('../businessLogic/price-entry-logic');
const CustomerLogic = require('../businessLogic/customer-logic');
const { generateTag } = require('../../../utilities/generateTag');
const DB = require('../../loaders/database-loader').loadDB();

const S3 = new AWS.S3();
const params = {
  Bucket: 'aws-us-east-2-088407289953-greenspark-aws-pipe',
  Key: 'existing_inventory.csv',
};

class UploadInventoryLogic {
  constructor( _s3, _params ) {
    if (!_s3) {
      this.S3 = S3;
    } else {
      this.S3 = _s3;
    }
    if (!_params) {
      this.params = params;
    } else {
      this.params = _params;
    }
  }

  createTicket(customer, date, organizationInfo) {
    return {
      id: 'DFWI',
      ticketId: 999999,
      customer: customer.id,
      truckWeight: {
        gross: {
          amount: 0,
          units: 'lbs',
          commonString: '0 lbs',
        },
        tare: {
          amount: 0,
          units: 'lbs',
          commonString: '0 lbs',
        },
        net: {
          amount: 0,
          units: 'lbs',
          commonString: '0 lbs',
        },
      },
      loadWeight: {
        gross: 0,
        deductions: 0,
        net: 0,
        tare: 0,
      },
      materials: [],
      netWeight: 0,
      netWeightObj: {
        amount: 0,
        units: 'lbs',
        commonString: '0 lbs',
      },
      netPrice: {
        commonString: '$0.00/lb',
        currency: 'USD',
        precision: 0,
        amount: 0,
      },
      netValue: {
        commonString: '$0.00',
        currency: 'USD',
        precision: 0,
        amount: 0,
      },
      status: {
        value: 'PRICE_COMPLETE',
        date,
        userId: organizationInfo.userId,
      },
      statusHistory: [
        {
          value: 'PRICE_COMPLETE',
          date,
          userId: organizationInfo.userId,
        },
      ],
    };
  }

  createMaterial(finishedGoodId, materialTypeId, date, code, gross, tare, net, priceEntry, organizationInfo) {
    const grossInt = parseInt(gross, 10);
    const tareInt = parseInt(tare, 10);
    const netInt = parseInt(net, 10);
    const priceEntryObj = dinero(priceEntry);
    const valueEntryObj = priceEntryObj.multiply(netInt);
    const priceString = `${ priceEntryObj.toFormat(('$0,0.00')) }/lb `;
    const valueString = valueEntryObj.toFormat(('$0,0.00'));
    return {
      id: uuidv4(),
      materialTypeId,
      inboundTicketId: 'DFWI',
      weightAndPrice: {
        gross: {
          amount: grossInt,
          units: 'lbs',
          commonString: `${ gross } lbs`,
        },
        tare: {
          amount: tareInt,
          units: 'lbs',
          commonString: `${ tare } lbs`,
        },
        deductions: [],
        netWeight: {
          amount: netInt,
          units: 'lbs',
          commonString: `${ net } lbs`,
        },
        um: 'lbs',
        netPrice: { ...priceEntryObj.toJSON(), commonString: priceString },
        netValue: { ...valueEntryObj.toJSON(), commonString: valueString },
      },
      finishedGoodId,
      weightAndPriceHistory: [],
      status: {
        value: 'FINISHEDGOOD',
        date,
        userId: organizationInfo.userId,
      },
      statusHistory: [
        {
          value: 'FINISHEDGOOD',
          date,
          userId: organizationInfo.userId,
        },
      ],
      GSI1PK: 'FINISHEDGOOD',
      GSI1SK: date,
    };
  }

  createFinishedGood(id, materialTypeId, materialId, type,
    gross, tare, net, date, priceEntry, organizationInfo, materialType) {
    const grossInt = parseInt(gross, 10);
    const tareInt = parseInt(tare, 10);
    const netInt = parseInt(net, 10);
    const priceEntryObj = dinero(priceEntry);
    const valueEntryObj = priceEntryObj.multiply(netInt);
    const priceString = `${ priceEntryObj.toFormat(('$0,0.00')) }/lb `;
    const valueString = valueEntryObj.toFormat(('$0,0.00'));
    return {
      id,
      materialTypeId,
      tag: generateTag(),
      type: type.toUpperCase(),
      materialType,
      packingListId: '',
      notes: [],
      weight: {
        gross: grossInt,
        tare: tareInt,
        net: netInt,
        units: 'lbs',
      },
      averageCost: { ...priceEntryObj.toJSON(), commonString: priceString },
      netValue: { ...valueEntryObj.toJSON(), commonString: valueString },
      status: {
        value: 'AVAILABLE',
        date,
        userId: organizationInfo.userId,
      },
      statusHashKey: 'AVAILABLE',
      dateRangeKey: date,

    };
  }

  async inventoryUpload( organizationInfo ) {
    const priceEntries = await PriceEntryLogic.fetchAll({}, organizationInfo);
    const customer = await CustomerLogic.create({ customerCommonIdentifierString: 'Preexisting Inventory' },
      organizationInfo);

    const { ticket, materialDictionary, finishedGoodDictionary } =
      await this.processFile(customer, priceEntries, organizationInfo);
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-`;
    await DB.create(`${ collection }InboundTickets`, ticket);
    await DB.batchCreate(`${ collection }Materials`, materialDictionary);
    await DB.batchCreate(`${ collection }FinishedGoods`, finishedGoodDictionary);
    return finishedGoodDictionary.length;
  }

  processFile( customer, priceEntries, organizationInfo ) {
    return new Promise(( resolve, reject ) => {
      materialTypeLogic.fetchAll({}, organizationInfo)
        .then(materialTypes => {
          const date = Date.now();
          const ticket = this.createTicket(customer, date, organizationInfo);
          const materialDictionary = [];
          const finishedGoodDictionary = [];
          this.S3.getObject(this.params).createReadStream()
            .pipe(csv.parse({ headers: true }))
            .on('error', error => {
              reject(error);
            })

            .on('data', row => {
              // 1. Create Material for material Type with weights
              // 2. Add Material Ids to ticket
              // 3. Create Finished good for the material
              const finishedGoodId = uuidv4();
              const mt = materialTypes.Items.find(material => material.code === row.Code);
              if (!mt) {
                reject(new Error(`Invalid Material Code ${ row.Code }`));
              }
              if (!mt) {
                reject(new Error(`Invalid Material Type ${ row.Code }`));
              } else {
                const priceEntry = priceEntries.Items.find(price => price.materialTypeId === mt.id);
                if (!priceEntry) {
                  reject(new Error(`No Price For Material ${ row.Code }`));
                }
                const material = this.createMaterial(finishedGoodId, mt.id,
                  date, row.Code, row.Gross, row.Tare, row.Net, priceEntry.price, organizationInfo);
                materialDictionary.push(material);
                const finishedGood = this.createFinishedGood(finishedGoodId, mt.id, material.id, row.Type,
                  row.Gross, row.Tare, row.Net, date, priceEntry.price, organizationInfo, mt);
                finishedGoodDictionary.push(finishedGood);
                ticket.materials.push(material.id);
                ticket.netWeight += material.weightAndPrice.netWeight.amount;
              }
            })
            .on('end', () => {
              resolve({ ticket, materialDictionary, finishedGoodDictionary });
            });
        });
    });
  }
}

module.exports = UploadInventoryLogic;

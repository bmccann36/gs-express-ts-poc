const csv = require('fast-csv');
const { v4: uuidv4 } = require('uuid');
const PriceSheetLogic = require('../businessLogic/price-sheet-logic');
const BenchmarkLogic = require('../businessLogic/benchmark-logic');
const PriceEntryLogic = require('../businessLogic/price-entry-logic');
const MaterialTypeLogic = require('../businessLogic/material-type-logic');
const Validate = require('../businessLogic/validate');
const priceUtility = require('../../../utilities/price-utility');
const { mapAsync } = require('../../../utilities/mapAsync');

const ROW_KEYS = {
  priceType: 'Price Type',
  formula: 'FORMULA',
  default: 'Default',
  formulaType: '%/Diff?',
  spread: 'SPREAD',
  spreadLowerCase: 'Spread',
  spot: 'SPOT',
  percentage: 'PERCENTAGE',
  percentageSymbol: '%',
  defaultSell: 'Default Sell',
  otherCost: 'Other Costs',
  usd: 'USD',
  usdSymbol: '$',
  metric: 'Metric',
  benchmark: 'Benchmark',
  benchmarkPrice: 'Benchmark Price',
  defaultBuy: 'Default Buy',
  materialTypeId: 'Material Id',
};

function isValidationErrorSheets( sheets ) {
  for (let i = 0; i < sheets.length; i++) {
    const msg = Validate.getValidationErrors(
      Validate.PRICE_SHEET_VALIDATION_RULES,
      sheets,
      i
    );
    if (msg) {
      return msg;
    }
  }
  return false;
}

class PriceSheetCompositeLogic {
  constructor( _s3, _params ) {
    this.S3 = _s3;
    this.params = _params;
    this.priceSheetList = [];
    this.materialTypeList = [];
    this.defaultPrice = {};
    this.organizationInfo = {};
    this.entries = [];
    this.benchmarks = [];
    this.benchmarksFound = [];
  }

  async priceSheetUploadUpdate( organizationInfo ) {
    this.now = Date();
    this.organizationInfo = organizationInfo;
    this.materialTypeList = await MaterialTypeLogic.fetchAll({}, organizationInfo);
    this.priceSheetList = await PriceSheetLogic.fetchAll({}, organizationInfo);
    this.materialTypeList = this.materialTypeList.Items;
    this.priceSheetList = this.priceSheetList.Items;
    delete this.priceSheetList[ 0 ].entriesObj;
    await this.processUpdateFile();
    if (this.entries.length > 0) {
      const status = {
        date: this.now,
        value: 'UPDATED',
        userId: this.organizationInfo.userId,
      };
      await mapAsync(this.priceSheetList, priceSheet => PriceSheetLogic.update(
        { ...priceSheet,
          status: { ...status },
          statusHistory: [ ...priceSheet.statusHistory, { ...status }] },
        this.organizationInfo
      ));
    }
    await PriceEntryLogic.batchCreate(this.entries, this.organizationInfo);
    await PriceEntryLogic.batchCreate(this.benchmarks, this.organizationInfo);
    return this.entries.length;
  }

  processUpdateFile() {
    this.now = Date.now();
    return new Promise(( resolve, reject ) => {
      this.S3.getObject(this.params).createReadStream()
        .on('error', error => {
          reject(error);
        })
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
          reject(error);
        })
        .on('data', row => {
          for (const priceSheet of this.priceSheetList) {
            const materialTypeId = this.materialTypeList.find(el => el.code === row.Code).id;
            if (!materialTypeId) {
              reject(new Error(`${ row.Code } does not exist as a Material Type`));
            }
            const entry = this.createPriceEntry(materialTypeId, priceSheet, row);
            if (row[ ROW_KEYS.benchmark ]) {
              this.getBenchmark(row);
              entry.benchmarkId = this.benchmarks.find(
                el => el.benchmarkType === row[ ROW_KEYS.benchmark ].toUpperCase()
              ).id;
            }
            if (priceSheet.baseName === ROW_KEYS.default) {
              this.defaultPrice = entry.price;
            } else if (!entry.price) {
              entry.price = this.defaultPrice || undefined;
              entry.spreadValue = priceUtility.getValueFromNumber(0);
            }
            priceSheet.entries.push(entry.id);
            this.entries.push(entry);
          }
        })
        .on('end', () => {
          const msg =
            isValidationErrorSheets(this.priceSheetList) ||
            this.isValidationErrorInBenchMarks() ||
            this.isValidationErrorInEntries();
          if (msg) {
            reject(new Error(msg));
          }
          resolve();
        });
    });
  }

  getBenchmark( row ) {
    if (!this.benchmarksFound.includes(row[ ROW_KEYS.benchmark ])) {
      this.benchmarks.push({
        benchmarkType: row[ ROW_KEYS.benchmark ].toUpperCase(),
        benchmarkPrice: priceUtility.convertDollarStringToPrice(
          row[ ROW_KEYS.benchmarkPrice ]
        ),
        status: {
          date: this.now,
          value: 'CREATED',
          userId: this.organizationInfo.userId,
        },
        statusHistory: [
          {
            date: this.now,
            value: 'CREATED',
            userId: this.organizationInfo.userId,
          },
        ],
        id: uuidv4(),
      });
      this.benchmarksFound.push(row[ ROW_KEYS.benchmark ]);
    }
  }

  getPriceType( priceSheet, row ) {
    let priceType = ROW_KEYS.spread;
    if (priceSheet.baseName === ROW_KEYS.default) {
      priceType = row[ ROW_KEYS.priceType ].toUpperCase();
      if (priceType === ROW_KEYS.formula) {
        if (ROW_KEYS.spreadLowerCase === row[ ROW_KEYS.formulaType ]) {
          priceType = ROW_KEYS.spread;
        } else {
          priceType = ROW_KEYS.percentage;
        }
      }
    }
    return priceType;
  }

  createPriceEntry( materialTypeId, priceSheet, row ) {
    const priceType = this.getPriceType(priceSheet, row);
    const entry = {
      materialTypeId,
      materialCode: row.Code,
      price: priceUtility.convertDollarStringToPrice(row[ `${ priceSheet.baseName } Buy` ]),
      priceType,
      sellPrice: priceUtility.convertDollarStringToPrice(row[ ROW_KEYS.defaultSell ]),
      weightUnits: row.UM.toUpperCase(),
      status: {
        date: this.now,
        value: 'CREATED',
        userId: this.organizationInfo.userId,
      },
      statusHistory: [
        {
          date: this.now,
          value: 'CREATED',
          userId: this.organizationInfo.userId,
        },
      ],
      archive: false,
      id: uuidv4(),
      priceSheetId: priceSheet.id,
    };

    if (entry.priceType === ROW_KEYS.spread) {
      entry.spreadValue = priceUtility.convertDollarStringToPrice(
        row[ priceSheet.spreadName ]
      );
    } else if (entry.priceType === ROW_KEYS.percentage) {
      entry.percentageValue = priceUtility.convertPercentageToDecimal(
        row[ ROW_KEYS.metric ]
      );
    }
    if (row[ ROW_KEYS.otherCost ]) {
      entry.otherCosts = priceUtility.convertDollarStringToPrice(
        row[ ROW_KEYS.otherCost ]
      );
    }
    return entry;
  }

  priceSheetUpload( organizationInfo ) {
    return new Promise(( resolve, reject ) => {
      MaterialTypeLogic.fetchAll({}, organizationInfo)
        .then(materials => {
          this.S3.getObject(this.params).createReadStream()
            .on('error', error => {
              reject(error);
            })
            .pipe(csv.parse({ headers: true }))
            .on('error', error => {
              reject(error);
            })
            .on('headers', headers => {
              this.now = Date.now();
              this.sheetNames = [];
              this.entries = [];
              for (const header of headers) {
                if (header.includes('Buy')) {
                  const baseName = header
                    .substring(0, header.indexOf('Buy'))
                    .trim();
                  const spreadName =
                    baseName === ROW_KEYS.default
                      ? ROW_KEYS.metric
                      : `${ baseName } Spread`;
                  const typeName = baseName.toUpperCase();
                  this.sheetNames.push({
                    buyName: header,
                    baseName,
                    spreadName,
                    typeName,
                  });
                  this[ baseName ] = {
                    id: uuidv4(),
                    type: typeName,
                    baseName,
                    status: {
                      date: this.now,
                      value: 'CREATED',
                      userId: organizationInfo.userId,
                    },
                    statusHistory: [
                      {
                        date: this.now,
                        value: 'CREATED',
                        userId: organizationInfo.userId,
                      },
                    ],
                    archive: false,
                    entries: [],
                  };
                }
              }
            })
            .on('data', row => {
              let defaultPrice;
              for (const type of this.sheetNames) {
                // Default price sheets can have SPOT, SPREAD OR PERCENTAGE.
                // Special price sheets are (I think) always spread off the default
                let priceType;
                if (type.baseName === ROW_KEYS.default) {
                  priceType = row[ ROW_KEYS.priceType ].toUpperCase();
                  if (priceType === ROW_KEYS.formula) {
                    if (ROW_KEYS.spreadLowerCase === row[ ROW_KEYS.formulaType ]) {
                      priceType = ROW_KEYS.spread;
                    } else {
                      priceType = ROW_KEYS.percentage;
                    }
                  }
                } else {
                  priceType = ROW_KEYS.spread;
                }
                const entry = {
                  materialTypeId: row[ ROW_KEYS.materialTypeId ],
                  materialCode: row.Code,
                  price: priceUtility.convertDollarStringToPrice(row[ type.buyName ]),
                  priceType,
                  sellPrice: priceUtility.convertDollarStringToPrice(row[ ROW_KEYS.defaultSell ]),
                  weightUnits: row.UM.toUpperCase(),
                  status: {
                    date: this.now,
                    value: 'CREATED',
                    userId: organizationInfo.userId,
                  },
                  statusHistory: [
                    {
                      date: this.now,
                      value: 'CREATED',
                      userId: organizationInfo.userId,
                    },
                  ],
                  archive: false,
                  id: uuidv4(),
                  priceSheetId: this[ type.baseName ].id,
                };
                if (!entry.materialTypeId && entry.materialCode) {
                  const tmp = materials.Items.find(el => el.code === entry.materialCode);
                  if (tmp) {
                    entry.materialTypeId = tmp.id;
                  }
                }
                if (entry.priceType === ROW_KEYS.spread) {
                  entry.spreadValue = priceUtility.convertDollarStringToPrice(
                    row[ type.spreadName ]
                  );
                } else if (entry.priceType === ROW_KEYS.percentage) {
                  entry.percentageValue = priceUtility.convertPercentageToDecimal(
                    row[ ROW_KEYS.metric ]
                  );
                }
                if (row[ ROW_KEYS.otherCost ]) {
                  entry.otherCosts = priceUtility.convertDollarStringToPrice(
                    row[ ROW_KEYS.otherCost ]
                  );
                }
                if (row[ ROW_KEYS.benchmark ]) {
                  if (!this.benchmarksFound.includes(row[ ROW_KEYS.benchmark ])) {
                    this.benchmarks.push({
                      benchmarkType: row[ ROW_KEYS.benchmark ].toUpperCase(),
                      benchmarkPrice: priceUtility.convertDollarStringToPrice(
                        row[ ROW_KEYS.benchmarkPrice ]
                      ),
                      status: {
                        date: this.now,
                        value: 'CREATED',
                        userId: organizationInfo.userId,
                      },
                      statusHistory: [
                        {
                          date: this.now,
                          value: 'CREATED',
                          userId: organizationInfo.userId,
                        },
                      ],
                      id: uuidv4(),
                    });
                    this.benchmarksFound.push(row[ ROW_KEYS.benchmark ]);
                  }
                  entry.benchmarkId = this.benchmarks.find(
                    el =>
                      el.benchmarkType === row[ ROW_KEYS.benchmark ].toUpperCase()
                  ).id;
                }
                if (type.baseName === ROW_KEYS.default) {
                  defaultPrice = entry.price;
                } else if (!entry.price) {
                  entry.price = defaultPrice || undefined;
                  entry.spreadValue = {
                    amount: 0.0,
                    currency: ROW_KEYS.usd,
                  };
                }
                this[ type.baseName ].entries.push(entry.id);
                this.entries.push(entry);
              }
            })
            .on('end', () => {
              const sheets = [];
              for (const sheet of this.sheetNames) {
                sheets.push(this[ sheet.baseName ]);
              }
              const msg =
                isValidationErrorSheets(sheets) ||
                this.isValidationErrorInBenchMarks() ||
                this.isValidationErrorInEntries();
              if (msg) {
                reject(new Error(msg));
              } else {
                BenchmarkLogic.batchCreate(this.benchmarks, organizationInfo)
                  .then(() => {
                    PriceEntryLogic.batchCreate(this.entries, organizationInfo)
                      .then(() => {
                        resolve(PriceSheetLogic.batchCreate(sheets, organizationInfo));
                      })
                      .catch(error => {
                        reject(error);
                      });
                  })
                  .catch(error => {
                    reject(error);
                  });
              }
            });
        });
    });
  }

  // eslint-disable-next-line no-unused-vars
  static priceSheetDownload( organization, yard, user ) {
    return new Promise(( resolve, reject ) => {
      const sheets = PriceSheetLogic.fetchAll({});
      if (sheets.length === 0) {
        reject(new Error('No Price Sheets Exist'));
      }
      const rows = [];
      const header = [
        'Code',
        'Default Buy',
        'Price Type',
        'Default Sell',
        'UM',
        'Benchmark',
        'Other Costs',
        ROW_KEYS.formulaType,
        'Metric',
      ];
      const numSheets = sheets.length;
      for (let sheetIndex = 1; sheetIndex < numSheets; sheetIndex++) {
        const sheet = sheets[ sheetIndex ];
        header.push(`${ sheet.baseName } Spread`);
        header.push(`${ sheet.baseName } Buy`);
      }
      rows.push(header);
      const entries = PriceEntryLogic.fetchAll({});
      for (
        let entryGroup = 0;
        entryGroup < entries.length / numSheets;
        entryGroup++
      ) {
        const entry = entries[ entryGroup * numSheets ]; // Get the default entry
        const row = [
          entry.material.code,
          priceUtility.convertPriceToDollarString(entry.price),
          entry.priceType === 'SPOT' ? ROW_KEYS.spot : ROW_KEYS.formula,
          priceUtility.convertPriceToDollarString(entry.sellPrice),
          entry.weightUnits,
          entry.benchmark ? entry.benchmark.benchmarkType : '',
          priceUtility.convertPriceToDollarString(entry.otherCosts),
        ];
        if (entry.priceType === ROW_KEYS.spread) {
          row.push(ROW_KEYS.spreadLowerCase);
          row.push(priceUtility.convertPriceToDollarString(entry.spreadValue));
        } else if (entry.priceType === ROW_KEYS.percentage) {
          row.push(ROW_KEYS.percentageSymbol);
          row.push(priceUtility.convertDecimalToPercentage(entry.percentageValue));
        } else {
          row.push('');
          row.push('');
        }
        for (let sheetIndex = 1; sheetIndex < numSheets; sheetIndex++) {
          const specialEntry = entries[ entryGroup * numSheets + sheetIndex ];
          row.push(priceUtility.convertPriceToDollarString(specialEntry.spreadValue));
          row.push(priceUtility.convertPriceToDollarString(specialEntry.price));
        }
        // csvStream.write(row);
        rows.push(row);
      }
      // csvStream.end();
      csv.writeToBuffer(rows).then(data => {
        resolve(data);
      });
    });
  }

  isValidationErrorInBenchMarks() {
    for (let i = 0; i < this.benchmarks.length; i++) {
      const msg = Validate.getValidationErrors(
        Validate.BENCHMARK_VALIDATION_RULES,
        this.benchmarks,
        i
      );
      if (msg) {
        return msg;
      }
    }
    return false;
  }

  isValidationErrorInEntries() {
    for (let i = 0; i < this.entries.length; i++) {
      const msg = Validate.getValidationErrors(
        Validate.PRICE_ENTRY_VALIDATION_RULES,
        this.entries,
        i
      );
      if (msg) {
        return msg;
      }
    }
    return false;
  }
}

module.exports = PriceSheetCompositeLogic;

const dinero = require('dinero.js');
const currency = require('currency.js');

const PERCENTAGE_SYMBOL = '%';

function getDineroValueFuncFromNumber(n, p = 0) {
  let precision = p;
  let checkInteger = n;
  while (checkInteger % 1 !== 0 && precision < 4) {
    checkInteger *= 10;
    precision += 1;
  }
  checkInteger = Math.floor(checkInteger);

  return dinero({
    amount: checkInteger,
    currency: 'USD',
    precision,
  });
}

function getValueFromNumber(n, p = 0) {
  const dineroFunc = getDineroValueFuncFromNumber(n, p);
  const priceSchema = dineroFunc.toJSON();

  priceSchema.commonString = dineroFunc.toFormat('$0,0.00');
  return priceSchema;
}

function getValueFromValueJSONAndMultiplier(valueJSON, multiplier) {
  const dineroFunc = dinero(valueJSON);

  const newValue = dineroFunc.multiply(multiplier);

  const json = newValue.toJSON();

  json.commonString = newValue.toFormat('$0,0.00');
  json.currency = 'USD';
  return json;
}

// value is a number, weight is a number
function getPriceFromValueJSONAndWeight(valueJSON, weight, units = 'lb') {
  const valueDinero = dinero(valueJSON);
  const netPriceDinero = weight > 0 ? valueDinero.divide(weight) : dinero(0);

  const commonString = `${ netPriceDinero.toFormat(('$0,0.00')) }/${ units }`;
  return {
    ...netPriceDinero.toJSON(),
    commonString,
  };
}

function addTwoJSONValues(v1, v2) {
  const v1Dinero = dinero(v1);
  const v2Dinero = dinero(v2);

  const sum = v1Dinero.add(v2Dinero);

  const sumJSON = sum.toJSON();
  sumJSON.commonString = sum.toFormat(('$0,0.00'));
  return sumJSON;
}

function subtractSecondJSONValueFromFirst(v1, v2) {
  const v1Dinero = dinero(v1);
  const v2Dinero = dinero(v2);

  const res = v1Dinero.subtract(v2Dinero);

  const json = res.toJSON();
  json.commonString = res.toFormat(('$0,0.00'));
  return json;
}

function convertDollarStringToPrice( dollar, cur = 'USD' ) {
  if (dollar) {
    return dinero({
      amount: currency(dollar, { precision: 3 }).intValue,
      currency: cur,
      precision: 3,
    }).toJSON();
  }
  return dinero({ amount: 0, currency: cur, precision: 3 }).toJSON();
}

function convertPriceToDollarString( price ) {
  // currency is already included in the price object from above.
  return dinero(price).toFormat();
}

function convertPercentageToDecimal( percent ) {
  if (percent) {
    let value;
    if (percent.includes('%')) {
      value = `.${ percent.substring(0, percent.indexOf('%')) }`;
    } else {
      value = Number(percent);
    }
    return value;
  }
  return null;
}

function convertDecimalToPercentage( decimal ) {
  return PERCENTAGE_SYMBOL + decimal * 100;
}

module.exports = { addTwoJSONValues,
  getPriceFromValueJSONAndWeight,
  getValueFromNumber,
  getValueFromValueJSONAndMultiplier,
  subtractSecondJSONValueFromFirst,
  getDineroValueFuncFromNumber,
  convertDecimalToPercentage,
  convertPercentageToDecimal,
  convertDollarStringToPrice,
  convertPriceToDollarString,
};

const UNITS = {
  LBS: 'lbs',
  NT: 'NT',
};
const NT_CONVERSION = 2000;

function addWeight(weight1, weight2, units = 'lbs') {
  const w1Number = convertWeight(weight1, units);
  const w2Number = convertWeight(weight2, units);
  return {
    amount: w1Number + w2Number,
    units,
    commonString: `${ w1Number + w2Number } ${ units }`,
  };
}

// TODO:  Weights need to be a single format this is chaos
function convertWeight(weight, units = 'lbs') {
  if (typeof weight === 'number') {
    return parseInt(weight, 10);
  }
  let wInLbs = 0;
  if (!weight) {
    throw new Error('Missing weight in convertWeight');
  } else if (weight.amount || weight.amount === 0) {
    wInLbs = parseInt(weight.amount, 10);
  } else if (weight.net || weight.net === 0) {
    wInLbs = parseInt(weight.net, 10);
  } else {
    throw new Error('Unrecognized weight format');
  }
  if (weight.units && units === UNITS.LBS) {
    wInLbs = weight.units === UNITS.NT ? wInLbs * NT_CONVERSION : wInLbs;
  }
  return wInLbs;
}

function isBigger(weight1, weight2) {
  const w1 = convertWeight(weight1, UNITS.LBS);
  const w2 = convertWeight(weight2, UNITS.LBS);
  return w1 > w2;
}

function getWeightSchema(weight, units = 'lbs') {
  return {
    amount: weight,
    units,
    commonString: `${ weight } ${ units }`,
  };
}

module.exports = { addWeight, convertWeight, isBigger, UNITS, getWeightSchema };

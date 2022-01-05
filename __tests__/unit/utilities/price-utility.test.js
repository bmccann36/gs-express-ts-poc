const priceUtility = require('../../../src/utilities/price-utility');

describe('mapAsync', () => {
  it('maintains order despite asynchronous resolution', async () => {
    const test = 103.49999999999999;
    const result = priceUtility.getValueFromNumber(test);
    expect(result.amount).toBe(1034999);
    expect(result.precision).toBe(4);
  });

  it('test net price', async () => {
    const test = 103.49999999999999;
    const result = priceUtility.getValueFromNumber(test);

    const price = priceUtility.getPriceFromValueJSONAndWeight(result, 100);

    expect(price).toEqual({
      amount: 10350,
      currency: 'USD',
      precision: 4,
      commonString: '$1.04/lb',
    });
  });

  it('test net price with 0 price', async () => {
    const test = 0;
    const result = priceUtility.getValueFromNumber(test);

    const price = priceUtility.getPriceFromValueJSONAndWeight(result, 100);
    expect(price).toEqual({
      amount: 0,
      currency: 'USD',
      precision: 0,
      commonString: '$0.00/lb',
    });
  });

  it('test new value', async () => {
    const value = 100;
    const valueJSON = priceUtility.getValueFromNumber(value);

    let price = priceUtility.getPriceFromValueJSONAndWeight(valueJSON, 100);
    expect(price).toEqual({
      amount: 1,
      currency: 'USD',
      precision: 0,
      commonString: '$1.00/lb',
    });

    price = priceUtility.getPriceFromValueJSONAndWeight(valueJSON, 100, 'NT');
    expect(price).toEqual({
      amount: 1,
      currency: 'USD',
      precision: 0,
      commonString: '$1.00/NT',
    });
  });

  it('test add two jsons', async () => {
    const v1 = 100.4999999999999;
    const v1JSON = priceUtility.getValueFromNumber(v1);

    const v2 = 43.4999999999999;
    const v2JSON = priceUtility.getValueFromNumber(v2);

    const result = priceUtility.addTwoJSONValues(v1JSON, v2JSON);
    expect(result).toEqual({
      amount: 1439998,
      currency: 'USD',
      precision: 4,
      commonString: '$144.00',
    });
  });

  it('test subtract two jsons', async () => {
    const v1 = 100.4999999999999;
    const v1JSON = priceUtility.getValueFromNumber(v1);

    const v2 = 43.4999999999999;
    const v2JSON = priceUtility.getValueFromNumber(v2);

    const result = priceUtility.subtractSecondJSONValueFromFirst(v1JSON, v2JSON);
    expect(result).toEqual({
      amount: 570000,
      currency: 'USD',
      precision: 4,
      commonString: '$57.00',
    });
  });
});

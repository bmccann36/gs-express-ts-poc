const BenchmarkLogic = require('../../../../../src/api/services/businessLogic/benchmark-logic');
const MockDB = require('../../../../../src/api/models/memoryDatabase/mock-db');

const organizationInfo = {
  organization: 'hulk_smash',
  yard: 'yard1',
  user: 'testuser',
};

describe('Test Benchmark Logic', () => {
  it('fetch all benchmarks', async () => {
    MockDB.resetDB();
    const benchmarks = await BenchmarkLogic.fetchAll({}, organizationInfo );
    expect(benchmarks.Items.length).toBe(0);
  });

  it('fetch nonexistent benchmark by Id', async () => {
    MockDB.resetDB();
    const benchmark = await BenchmarkLogic.fetch('fake-id', organizationInfo);
    expect(benchmark).toStrictEqual({});
  });

  it('create & update benchmark', async () => {
    MockDB.resetDB();
    const date = Date.now();
    const price = {
      amount: 200,
      currency: 'USD',
      precision: 2,
      commonString: '$2.00',
    };
    const result = await BenchmarkLogic.create({
      benchmarkType: 'COMMEX',
      price,
      date,
    }, organizationInfo);
    expect(result).toBeDefined();
    const check = await BenchmarkLogic.fetch(result.id, organizationInfo);
    expect(check.id).toBe(result.id);
    expect(check.benchmarkType).toBe('COMMEX');
    expect(check.date).toBe(date);
    expect(check.price).toStrictEqual(price);

    const date2 = Date.now();
    const price2 = {
      amount: 250,
      currency: 'USD',
      precision: 2,
      commonString: '$2.50',
    };
    const result2 = await BenchmarkLogic.update({
      id: check.id,
      benchmarkType: 'COMMEX',
      price: price2,
      date: date2,
    }, organizationInfo);
    expect(result2).toBeDefined();
    const check2 = await BenchmarkLogic.fetch(result2.id, organizationInfo);
    expect(check2.id).toBe(result2.id);
    expect(check2.benchmarkType).toBe('COMMEX');
    expect(check2.date).toBe(date2);
    expect(check2.price).toStrictEqual(price2);

    const benchmarks = await BenchmarkLogic.fetchAll({}, organizationInfo);
    expect(benchmarks.Items.length).toBe(1);
  });
});

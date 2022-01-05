const { v4: uuidv4 } = require('uuid');
const DB = require('../../loaders/database-loader').loadDB();

class BenchmarkLogic {
  static async fetchAll( queryParams, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Benchmarks`;
    return DB.get(collection, queryParams.sort, queryParams.filter, queryParams.page,
      queryParams.pageSize, queryParams.fromKey);
  }

  static async fetch( benchmarkId, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Benchmarks`;
    return DB.getById(collection, benchmarkId);
  }

  static async fetchByName( name, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Benchmarks`;
    const benchmarks = DB.get(collection, {}, { name });
    if (!benchmarks || benchmarks.length === 0) {
      return {};
    }

    return benchmarks[ 0 ];
  }

  static async create( benchmark, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Benchmarks`;
    const newBenchmark = { ...benchmark, id: uuidv4(), archive: false };
    return DB.create(collection, newBenchmark);
  }

  static async update( benchmark, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Benchmarks`;
    const payload = await DB.getById(collection, benchmark.id);
    if (Object.prototype.hasOwnProperty.call(payload, 'id')) {
      return DB.update(collection, benchmark);
    }
    return {};
  }

  static async batchCreate(elements, organizationInfo) {
    const collection = `${ organizationInfo.organization }-${ organizationInfo.yard }-Benchmarks`;
    return DB.batchCreate(collection, elements);
  }
}
module.exports = BenchmarkLogic;

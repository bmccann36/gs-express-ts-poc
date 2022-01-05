async function mapAsync(array, cb, options) {
  const results = [];
  const resultsAsync = {};
  const concurrency = (options && options.concurrency) || array.length;
  let position = -1;
  async function processItem() {
    ++position;
    if (position >= array.length) return;
    const item = array[ position ];
    resultsAsync[ position ] = await cb(item);
    await processItem();
  }
  const concurrentOps = [];
  for (let ops = 0; ops < concurrency; ++ops) {
    concurrentOps.push(processItem());
  }
  await Promise.all(concurrentOps);
  for (let i = 0; i < array.length; ++i) {
    results.push(resultsAsync[ i ]);
  }
  return results;
}

module.exports = { mapAsync };

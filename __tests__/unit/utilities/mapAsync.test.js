const { mapAsync } = require('../../../src/utilities/mapAsync');

describe('mapAsync', () => {
  it('maintains order despite asynchronous resolution', async () => {
    // Arrange
    const numbers = [ 1, 2, 3, 4, 5, 6 ];
    const returnAsync = num => new Promise(resolve => {
      setTimeout(() => {
        resolve(num);
      }, Math.ceil(Math.random() * 1000));
    });
    // Act
    const result = await mapAsync(numbers, returnAsync);
    // Assert
    expect(result).toEqual(numbers);
  });

  it('respects concurrency option', async () => {
    // Arrange
    const numbers = [ 1, 2, 3, 4, 5, 6 ];
    const concurrencyLimit = 3;
    let concurrentOps = 0;
    const returnAsync = num => new Promise((resolve, reject) => {
      ++concurrentOps;
      if (concurrentOps > concurrencyLimit) {
        reject(new Error('concurrency over limit!'));
      } else {
        setTimeout(() => {
          --concurrentOps;
          resolve(num);
        }, Math.ceil(Math.random() * 1000));
      }
    });
    // Act
    const result = await mapAsync(numbers, returnAsync, { concurrency: concurrencyLimit });
    // Assert
    expect(result).toEqual(numbers);
  });
});

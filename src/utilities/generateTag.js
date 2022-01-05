const random = require('random');

exports.generateTag = () => {
  // 36 ^ 8 = 2.8 trillion possible combinations
  const idLength = 8;
  const characters = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
    .concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));

  let id = '';
  for (let i = 0; i < idLength; ++i) {
    const index = random.int(0, 35);
    id += characters[ index ];
  }

  return id;
};

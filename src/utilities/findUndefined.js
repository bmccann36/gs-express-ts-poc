exports.findUndefined = function findUndefined(value, path = []) {
  if (value === undefined) {
    console.warn(`${ path.join('.') } is undefined`);
  } else if (value instanceof Array) {
    value.forEach((item, i) => findUndefined(item, [ ...path, i ]));
  } else if (value instanceof Object) {
    // eslint-disable-next-line guard-for-in
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        findUndefined(value[ key ], [ ...path, key ]);
      }
    }
  }
};

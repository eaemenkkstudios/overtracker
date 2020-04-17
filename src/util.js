/* eslint-disable no-await-in-loop */

module.exports = {
  // Objects
  fVal: (obj) => (obj !== undefined ? obj[Object.keys(obj)[0]] : undefined),
  fKey: (obj) => (obj !== undefined ? Object.keys(obj)[0] : undefined),
  iVal: (obj, i) => (obj !== undefined ? obj[Object.keys(obj)[i]] : undefined),
  iKey: (obj, i) => (obj !== undefined ? Object.keys(obj)[i] : undefined),
  lVal: (obj) => (obj !== undefined
    ? obj[Object.keys(obj)[Object.keys(obj).length - 1]] : undefined),
  lKey: (obj) => (obj !== undefined ? Object.keys(obj)[Object.keys(obj).length - 1] : undefined),
  objectClone: (obj) => JSON.parse(JSON.stringify(obj)),
  objectLength: (obj) => Object.keys(obj).length,
  isObject: (obj) => (typeof obj === 'object' && obj !== undefined),
  isEmpty: (obj) => JSON.stringify(obj) === JSON.stringify({}),

  // Loops
  asyncForEach: async (arr, callback) => {
    for (let index = 0; index < arr.length; index += 1) {
      await callback(arr[index], index, arr);
    }
  },
  shuffle: (arr) => {
    let i = arr.length;
    let temp;
    let rand;
    while (i !== 0) {
      rand = Math.floor(Math.random() * i);
      i -= 1;
      temp = arr[i];
      arr[i] = arr[rand];
      arr[rand] = temp;
    }
    return arr;
  },
  lItem: (arr) => arr[arr.length - 1],
};

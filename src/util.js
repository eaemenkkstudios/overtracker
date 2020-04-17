
module.exports = {
  fkey: (obj) => (obj !== null ? obj[Object.keys(obj)[0]] : undefined),
  fval: (obj) => (obj !== null ? Object.keys(obj)[0] : undefined),
  isObject: (obj) => (typeof obj === 'object' && obj !== undefined),
  isEmpty: (obj) => JSON.stringify(obj) === JSON.stringify({}),
  cloneObject: (obj) => JSON.parse(JSON.stringify(obj)),
};

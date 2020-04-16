
module.exports = {
  fkey: (obj) => (obj !== null ? obj[Object.keys(obj)[0]] : undefined),
  fval: (obj) => (obj !== null ? Object.keys(obj)[0] : undefined),
  isObject: (obj) => (typeof obj === 'object' && obj !== undefined),
};


module.exports = {
  fkey: (obj) => (obj ? obj[Object.keys(obj)[0]] : undefined),
  fval: (obj) => (obj ? Object.keys(obj)[0] : undefined),
};

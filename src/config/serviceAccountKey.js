module.exports = process.env.NODE_ENV === 'production'
  ? require('./serviceAccountKey.prod')
  : require('./serviceAccountKey.dev');

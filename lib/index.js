const path = require('path')
const debug = require('debug')('blockm')
const litecoin   = require('node-litecoin');

function BlockM(){
  if (typeof config === 'undefined') {config = {}}
  this.__nodo = new litecoin.Client({
    host: process.env['LTC_HOST'] || 'localhost',
    port: process.env['LTC_PORT'] || 8332,
    user: process.env['LTC_USER'] || 'rpcuser',
    pass: process.env['LTC_PASS'] || 'rpcpass'
  });
  this.__models = require(path.join(__dirname, 'models'));
}

function sync(callback){
  this.__models.sequelize.sync({ logging:false }).then(function() {
    debug('Blockchain Accounts Database Sync DONE')
    callback(null)
  }).catch(function (e) {
      debug('ERROR', e);
      callback(e)
  });
}

function getBlockCount(callback) {
  this.__nodo.getBlockCount(callback)
}

function getConnectionCount(callback) {
  this.__nodo.getConnectionCount(callback)
}

function close(){
  this.__models.sequelize.close();
}

BlockM.prototype = {
  sync,
  close,
  getBlockCount,
  getConnectionCount
}

module.exports = new BlockM();
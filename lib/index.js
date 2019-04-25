const path = require('path')
const debug = require('debug')('blockm')
const litecoin   = require('node-litecoin');
const uuid = require('uuid/v4')

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

function createAccount(callback) {
  // Creamos un internal UserID para el money manager
  // Este UserID debe asociarse una cuenta interna (chain interno)
  // y asociarse una cuenta en el wallet del blockchain.
  // Retornamos o callback the ese UserID creado para asociarse en otro lado.
  // Este ID sera usado de intermedio para saber los IDs internos para 
  // el wallet del blockchain y para el chain interno.
  var uuids = {
    blockchainAccount: uuid(),
    internalChain: uuid()
  }

  this.__models.Account.create(uuids).then((x) => {
    if (x && x.id) {
      callback(null, x.id)
    } else {
      callback(new Error('No Account ID'))
    }
  }).catch((e) => {
    callback(e)
  })
}

BlockM.prototype = {
  sync,
  close,
  getBlockCount,
  getConnectionCount,
  createAccount
}

module.exports = new BlockM();
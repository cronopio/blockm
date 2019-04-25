const path = require('path')
const debug = require('debug')('blockm')

function BlockM(){
  //this.__nodo = new litecoin.Client(configNode);
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

function close(){
  this.__models.sequelize.close();
}

BlockM.prototype = {
  sync,
  close
}

module.exports = new BlockM();
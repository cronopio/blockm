const debug = require('debug')('blockm')

function BlockM(){
  //this.__nodo = new litecoin.Client(configNode);
  //this.__models = require(path.join(__dirname, 'models'));
}

function Sync(callback){
  this.__models.sequelize.sync({ logging:false }).then(function() {
    debug('Money Database Sync DONE')
    callback(null)
  }).catch(function (e) {
      debug('ERROR', e);
      callback(e)
  });
}

BlockM.prototype = {
  sync: Sync
}

module.exports = new BlockM();
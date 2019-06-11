const path = require('path');
const debug = require('debug')('blockm');
const litecoin = require('node-litecoin');
const uuid = require('uuid/v4');
const validator = require('validator');
const async = require('async');
const crypto = require('crypto');
const Web3 = require('web3');

// Main function that initialize main state.
function BlockM(){
  // Initialize Litecoin Node connection
  this.__nodo = new litecoin.Client({
    host: process.env['LTC_HOST'] || 'localhost',
    port: process.env['LTC_PORT'] || 19332,
    user: process.env['LTC_USER'] || 'rpcuser',
    pass: process.env['LTC_PASS'] || 'rpcpass'
  });
  // Initialize Ethereum Node connection (Ganache)
  // docker run -d -p 8545:8545 trufflesuite/ganache-cli:latest
  this.__web3 = new Web3(process.env['ETH_URL'] || 'http://localhost:8545');

  // Initialize Sequelize Models.
  this.__models = require(path.join(__dirname, 'models'));
}

function sync(callback){
  this.__models.sequelize.sync({ logging:false }).then(function() {
    debug('Blockchain Accounts Database Sync DONE')
    callback(null)
  }).catch((e) => {
      debug('ERROR', e);
      callback(e)
  });
}

function getBlockCount(callback) {
  var self = this;
  async.parallel({
    ltc: function ltc(cb) {
      return self.__nodo.getBlockCount(cb)
    },
    eth: function eth(cb) {
      return self.__web3.eth.getBlockNumber(cb)
    }
  }, callback)
}

function getConnectionCount(callback) {
  var self = this;
  async.parallel({
    ltc: cb => self.__nodo.getConnectionCount(cb),
    eth: cb => self.__web3.eth.net.getPeerCount(cb)
  }, callback)
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

// Need to create an account before, so you get AccountId
// With that AccountId you can request a deposit address
// It will call the callback with (error, address)
function getAddresses(AccountId, filter, callback) {
  var self = this;

  if (typeof filter === 'function') {
    callback = filter;
  }

  if (!validator.isUUID(AccountId)) {
    return callback(new Error('Invalid Account ID'))
  }

  this.__models.Account.findByPk(AccountId).then(account => {
    async.parallel({
      ltc: cb => self.__nodo.getAccountAddress(account.blockchainAccount, cb),
      eth: cb => self.__web3.eth.personal.newAccount(account.blockchainAccount, cb)
    }, (err, results) => {
      if (err) return callback(err);
      if (filter && typeof filter === 'string') {
        callback(err, results[filter.toLowerCase()])
      } else {
        callback(err, results);
      }
    })
  }).catch((e) => {
      debug('ERROR', e);
      callback(e)
  });
}

// This function explore litecoin chain and internal chain for
// transactions and calculate the balance of an account.
// Receive an AccountId and callback
// when is ready callback is called witth (err, balance)
// and balance should be type Number
function getBalance(AccountId, callback) {
  // Busco los IDS asociados en los CHAINS
  // El Chain interno deberia darno es el balance real que necesitamos.
  // "category": "receive"
  // "confirmations": 50347,
  const self = this;
  const Op = this.__models.Sequelize.Op;

  function syncBlockChain(account, cb) {
    function findTxInternal(tx, cb) {
      self.__models.Transaction.findAll({ where: { associatedTX: tx.txid }}).then(interna => {
        if ((interna.length === 0 && tx.confirmations >= 5) || (interna.length === 0 && tx.category === 'send')) {

          var kind, realAmount, from, to;
          if (tx.category === 'receive') {
            kind = 'IN'
            realAmount = tx.amount * 1e8
            from = 'blockchain:address:'+tx.address
            to = 'internal:account:'+AccountId
          }
          if (tx.category === 'send') {
            kind = 'OUT'
            realAmount = ((tx.amount*-1) + (tx.fee*-1)) * 1e8
            to = 'blockchain:address:'+tx.address
            from = 'internal:account:'+AccountId
          }
          var txToHash = {
            amount: realAmount,
            from: from,
            to: to,
            kind: kind,
            AccountId: AccountId,
            confirm: true,
            timestampConfirm: new Date().getTime(),
            associatedTX: tx.txid
          }
          debug('No existe, creando TX interna', txToHash)
          __getPreviousHash(AccountId, self.__models, (err, latestHash) => {
            if (err) return cb(err)
            txToHash.previousHash = latestHash;
            self.__models.Transaction.create(txToHash).then(internalTX => {
              self.__models.Transaction.update(__HashObj(internalTX.dataValues), { where: { id: internalTX.id }}).then(_ => {
                if (internalTX.previousHash === 'GENESIS') return cb(null, internalTX);
                debug('Actualizo el nextHash de la transaccion anterior')
                self.__models.Transaction.update(
                  { nextHash:internalTX.hash }, { where: { hash: internalTX.previousHash }})
                .then(() => {
                  cb(null, internalTX) }).catch(e => { cb(e) })
              }).catch(e => { cb(e) })
            })
          })
        }

        if (interna.length === 1) {
          cb(null, interna[0])
        }

        // Ignoro alguna TX con menos de 5 confirmaciones
        if (tx.confirmations < 5 && tx.category === 'receive') {
          cb(null)
        }
      }).catch((e) => { cb(e) })
    }
    self.__nodo.listTransactions(account.blockchainAccount, 999999, 0, function (err, list) {
      if (err) return cb(err)
      async.mapSeries(
        list.filter(
          l => (l.category === "receive" || l.category === "send")),
        findTxInternal, cb)
    })
  }

  function iterateChain(account, cb) {
    function affectBalance(initial, tx) {
      if (tx.kind === 'IN' || tx.kind === 'INCOME') {
        return Number(initial) + Number(tx.amount)
      } else if (tx.kind === 'INVEST' || tx.kind === 'OUT') {
        return Number(initial) - Number(tx.amount)
      } else {
        debug('Kind of Tx DONT KNOW:',tx.kind)
        return Number(initial)
      }
    }

    function untilLastTx(balance, next, callb) {
      var previous;
      async.whilst(
        // Repeatedly call iteratee function, while test function returns true.
        // Calls own callback when stopped, or an error occurs.
        // Function test
        function() {
          balance = affectBalance(balance, next)
          return next.nextHash && next.confirm;
        },
        // Function iteratee
        function(n) {
          self.__models.Transaction.findOne({ where: {
            AccountId: AccountId,
            hash: next.nextHash
          }}).then(newNext => {
            // Update variables to allow iteration.
            previous = next;
            next = newNext;
            n(null)
          }).catch(e => { n(e) })
        },
        // Callback function
        function (err) {
          debug('Aqui el balance es', balance)
          if (err) return callb(err)
          account.update({ hash: next.hash, balance: balance }).then(_ => {
            return callb(null, Number(account.balance))
          })
        }
      );
    }

    if (account.hash) {
      self.__models.Transaction.findOne({ where: { hash: account.hash }}).then(lastTx => {
        if (lastTx && lastTx.nextHash) {
          // Necesito recorrer las nuevas TX para tener el balance
          debug('Recorro usando untilLastTx')
          self.__models.Transaction.findOne({ where: { hash: lastTx.nextHash }}).then(newLastTx => {
            untilLastTx(account.balance, newLastTx, cb)
          })
        } else {
          // Aqui quiere decir que es el ultimo TX
          // Deberiamos poder entregar el balance desde aqui sin problemas
          debug('Se va por aqui', account.balance)
          cb(null, Number(account.balance))
        }
      })
    } else {
      self.__models.Transaction.findOne({ where: {
        AccountId: AccountId,
        previousHash: 'GENESIS'
      }}).then(genesis => {
        if (genesis && genesis.nextHash) {
          // Por aqui quiere decir que hay 2 o mas transacciones.
          // Hay que seguir iterando hasta encontrar el final
          untilLastTx(account.balance, genesis, cb)
        } else if (genesis) {
          // Y por aqui quiere decir que solo hay UNA transaccion, esta.
          account.update({
            hash: genesis.hash,
            balance: affectBalance(account.balance, genesis) })
          .then(_ => {
            return cb(null, Number(account.balance))
          })
        } else {
          // por aqui quiere decir que no tiene TXs en el Chain
          return cb(null, Number(account.balance))
        }
      })
    }
  }

  this.__models.Account.findByPk(AccountId).then(account => {
    if (account) {
      debug('Buscando el Balance')
      syncBlockChain(account, (err, txInternalEquivalent) => {
        if (err) return callback(err)
        iterateChain(account, callback)
      })

         // Ahora traemos del chain interno la TX GENESIS
         // Checkeamos el Hash
         // Is es kind IN entonces sumamos al 0 inicial
         // TRaemos la TX con el siguiente hash
         // Opcionalmente podriamos checkear el hash
         // Aqui lo que nos interesa es si suma o resta al balance
         // el KIND nos dira si IN para sumar o OUT para restar ademas de otros estados que hay
         // Vamos trallendo las demas TX por orden de siguiente hash y vamos incrementando
         // Al final de recorrer todas las TX y llegar a la ultima TX

         // OJO Cual sera la ultima?? la no confirmed, la no siguiente hash,
    } else {
      callback(new Error('Invalid Account'))
    }
  })
}

function __getPreviousHash(AccountId, models, cb) {
  models.Transaction.findAll({ where: { confirm: true, nextHash: null, AccountId: AccountId }}).then(latest => {
    if (latest.length === 0) {
      cb(null, 'GENESIS')
    }
    if (latest.length === 1) {
      cb(null, latest[0].hash)
    }
    if (latest.length > 1) {
      cb(new Error('No se que esta pasando'))
    }
  }).catch(e => { cb(e) })
}

// Hash a transaction
// This function is used to produce a Hash
// over a transaction object.
// return same object with hash and salt properties.
function __HashObj(obj) {
  // generate random salt
  var salt = crypto.randomBytes(32).toString('hex');
  var hmac = crypto.createHmac('sha512', salt);
  var copied = Object.assign({}, obj);

  // Wee need a previousHash to chain with
  if (!copied.previousHash) return new Error('Invalid Object to Hash')
  if (!copied.id) return new Error('Invalid Object to Hash NO ID')
  if (!copied.amount) return new Error('Invalid Object to Hash')
  if (!copied.from) return new Error('Invalid Object to Hash')
  if (!copied.to) return new Error('Invalid Object to Hash')
  if (!copied.kind) return new Error('Invalid Object to Hash')
  if (!copied.AccountId) return new Error('Invalid Object to Hash')
  if (!copied.confirm) return new Error('Invalid Object to Hash')
  if (!copied.timestampConfirm) return new Error('Invalid Object to Hash')

  var strToHash = [copied.previousHash, copied.id, copied.amount,
    copied.from, copied.to, copied.kind, copied.AccountId, copied.confirm, copied.timestampConfirm].join(';')
  hmac.update(strToHash)
  obj.hash = hmac.digest('hex')
  obj.salt = salt
  return obj
}

// Initializate withdrawal we'll need some confirmations
// from the user to be able to allow broadcasting of the transaction
// to the network.
function initWithdrawal(AccountId, amount, cryptoAddress, callback) {
  var self = this;
  this.__nodo.validateAddress(cryptoAddress, function (err, valid) {
    if (err) return callback(err);

    if (!valid.isvalid) {
      return callback(new Error('Invalid Litecoin Address'))
    }

    if (!Number(amount)) {
      return callback(new Error('Invalid Amount'))
    }

    self.__models.Account.findByPk(AccountId).then(account => {
      if (!account) return callback(new Error('Invalid Account'))
      if (Number(amount) > Number(account.balance)) {
        return callback(new Error('Insufficient funds'))
      }

      self.__models.Transaction.create({
        amount: amount,
        from: 'internal:account:'+AccountId,
        to: 'blockchain:address:'+cryptoAddress,
        kind: 'WAITING',
        AccountId: AccountId
      }).then(tx => {
        callback(null, tx.id)
      }).catch(e => { callback(e) })
    })
  })
}

// Using any means to make sure that user trigger withdrawal and
// make a confirmation, call this function to confirm it.
function confirm(AccountId, txId, callback){
  this.__models.Transaction.findById(txId).then(TX => {
    if (!TX) callback(new Error('Invalid Transaction'))
    if (TX.AccountId !== AccountId) callback(new Error('Invalid Transaction'))
    // POr ahora lo unico que puede hacer el confirm es cambiar el kind
    TX.update({ kind: 'OUT'}).then(_ => { callback(null, _) }).catch(e => { callback(e) })
  })
}

// Use this function to broadcast the transaction to the blockchain
// network, this is the last step on the withdrawal process.
//
function finishWithdraw(AccountId, txId, callback){
  var self = this

  function hashAndUpdate(TX, txChainId, cb) {
    self.__nodo.getTransaction(txChainId, function (err, finalTx) {
      if (err) cb(err)
      debug('TRANSACT EN DETAILS', finalTx)
      debug('Compare el amount', TX.amount)
      var realAmount = (finalTx.amount + finalTx.fee) * 1e8
      TX.update({
        associatedTX: txChainId, 
        amount: realAmount*-1
      }).then(_ => {
        self.__confirmTx(TX.id, cb);
      }).catch(e => { cb(e) })
    })
  }

  this.__models.Transaction.findById(txId).then(TX => {
    if (!TX) return callback(new Error('Invalid Transaction'))
    if (TX.AccountId !== AccountId) return callback(new Error('Invalid Transaction'))
    if (TX.kind !== 'OUT') return callback(new Error('Invalid Transaction'))
    self.__models.Account.findById(AccountId).then(account => {
      if (!account) return callback(new Error('Invalid Transaction'))
      var destination = TX.to.split(':')[2]
    debug('Iniciando Envio a ', destination, TX.amount)
    debug('Cuenta', account.blockchainAccount)
      self.__nodo.sendFrom(
        account.blockchainAccount,
        destination,
        TX.amount/1e8,
        50, TX.id,
      function (err, txChainId) {
          if (err) return callback(err)
          if (txChainId) {
            hashAndUpdate(TX, txChainId, callback)
          } else {
            callback(new Error('Failed to broadcast transaction '+txChainId))
          }
      })
    }).catch(e => { callback(e) })
  })
}

// Esta funcion se utiliza para actualizar el registro interno usando
// el ID de la transaccion que reporto el blockchain al momento de 
// hacer su difusion. Agregando este ID al modelo de transaccion y 
// tambien hasheando toda la transaccion y relacionandola con la
// transaccion anterior.
function __confirmTx(TxId, callback) {
  // Busco la TX en el chain interno
  // Miro el previous_hash que tenga
  // llamo a __getPreviousHash() y busco el ultimo hash del chain
  // comparo si es el mismo hash, si no actualizo
  // Hasheo la TX y termino
  var self = this
  this.__models.Transaction.findById(TxId).then(Tx => {
    if (!Tx) {
      return callback(new Error('Can not find the Transaction'))
    }

    self.__getPreviousHash(Tx.AccountId, (err, latestHash) => {
      if (err) return callback(err)
      if (Tx.previousHash !== latestHash) {
        Tx.previousHash = latestHash
      }
      Tx.timestampConfirm = new Date().getTime()
      Tx.confirm = true
      const hasheado = self.__HashObj(Tx.dataValues);
      self.__models.Transaction.update({
        hash: hasheado.hash,
        salt: hasheado.salt,
        previousHash: Tx.previousHash,
        timestampConfirm: Tx.timestampConfirm,
        confirm: Tx.confirm
      }, { where: { id: TxId }}).then(updatePreviousTx).catch(e => { callback(e) })
    })
  }).catch(e => { callback(e) })

  function updatePreviousTx() {
    return self.__models.Transaction.findById(TxId).then(actual => {
      if (actual.previousHash !== 'GENESIS') {
        self.__models.Transaction.update(
          { nextHash: actual.hash }, { where: { hash: actual.previousHash }})
        .then((_) => { 
          return getTx(TxId)
        }).catch(e => { callback(e) })
      } else {
        return getTx(TxId)
      }
    }).catch(e => { callback(e) })
  }

  function getTx(id) {
    return self.__models.Transaction.findById(id).then(actual => {
      callback(null, actual)
    }).catch(e => { callback(e) })
  }
};

BlockM.prototype = {
  sync,
  close,
  getBlockCount,
  getConnectionCount,
  createAccount,
  getAddresses,
  getBalance,
  initWithdrawal
}

module.exports = new BlockM();
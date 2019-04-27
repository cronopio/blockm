const path = require('path');
const debug = require('debug')('blockm');
const litecoin = require('node-litecoin');
const uuid = require('uuid/v4');
const validator = require('validator');
const async = require('async');
const crypto = require('crypto');

// Main function that initialize main state.
function BlockM(){
  // Initialize Litecoin Node connection
  this.__nodo = new litecoin.Client({
    host: process.env['LTC_HOST'] || 'localhost',
    port: process.env['LTC_PORT'] || 8332,
    user: process.env['LTC_USER'] || 'rpcuser',
    pass: process.env['LTC_PASS'] || 'rpcpass'
  });
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

// Need to create an account before, so you get AccountId
// With that AccountId you can request a deposit address
// It will call the callback with (error, address)
function deposit(AccountId, callback) {
  if (!validator.isUUID(AccountId)) {
    return callback(new Error('Invalid Account ID'))
  }

  this.__models.Account.findByPk(AccountId).then(account => {
    this.__nodo.getAccountAddress(account.blockchainAccount, callback)
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
        function() {
          balance = affectBalance(balance, next)
          return next.nextHash && next.confirm;
        },
        function(n) {
          self.__models.Transaction.findOne({ where: {
            AccountId: AccountId,
            hash: next.nextHash
          }}).then(newNext => {
            previous = next;
            next = newNext;
            n(null)
          }).catch(e => { n(e) })
        },
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

BlockM.prototype = {
  sync,
  close,
  getBlockCount,
  getConnectionCount,
  createAccount,
  deposit,
  getBalance
}

module.exports = new BlockM();
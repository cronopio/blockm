const blockm = require('../lib');
const validator = require('validator');

jest.setTimeout(10000);

const cryptoAddress = 'mxyqptVoCQyYSS7zvdjXgRpD9CX9RAGw8f';
const cuentaConSaldo = 'a0ff8720-6c38-11e9-a3b5-b90fbfcd6fa9';
const amountTx = 0.001*1e8

describe('Testing Funds Withdrawal', () => {
  test('Should call initWithdrawal() and give Insufficient funds error', done => {
    blockm.sync(err => {
      expect(err).toBeFalsy();
      blockm.createAccount((err, accountID) => {
        expect(err).toBeFalsy();
        blockm.initWithdrawal(accountID, amountTx, cryptoAddress, (err, txid) => {
          expect(txid).toBeFalsy()
          expect(err.toString()).toEqual('Error: Insufficient funds');
          done();
        })
      })
    })
  })
  test('Should call initWithdrawal() and give no error', done => {
    blockm.sync(err => {
      expect(err).toBeFalsy();
      blockm.createAccount((err, accountID) => {
        expect(err).toBeFalsy();
        blockm.__models.Account.update({
          blockchainAccount: cuentaConSaldo
        }, { where: { id: accountID } }).then(() => {
          blockm.getBalance(accountID, (err, balance) => {
            expect(err).toBeFalsy();
            expect(balance).toBeGreaterThan(amountTx);
            blockm.initWithdrawal(accountID, amountTx, cryptoAddress, (err, txid) => {
              expect(err).toBeFalsy();
              expect(txid).toBeTruthy()
              expect(validator.isUUID(txid)).toBe(true)
              blockm.__models.Transaction.findByPk(txid).then(Tx => {
                expect(Tx).toBeTruthy()
                expect(validator.isUUID(Tx.id)).toBe(true)
                expect(Tx.amount).toEqual(amountTx.toString())
                expect(Tx.to).toEqual('blockchain:address:'+cryptoAddress);
                expect(Tx.kind).toEqual('WAITING');
                expect(Tx.confirm).toBeFalsy();
                done();
              })
            })
          })
        }).catch(e => { done(e); })
      })
    })
  })
  test('Should close', () => {
    expect(blockm.close()).toBeUndefined();
  })
})
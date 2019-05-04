const blockm = require('../lib');
const validator = require('validator');
const WAValidator = require('wallet-address-validator');
const os = require('os');

jest.setTimeout(10000);

describe('Testing getBalance', () => {
  test('Should call getBalance() with no tx before so it give 0', done => {
    blockm.sync(err => {
      expect(err).toBeFalsy();
      blockm.createAccount((err, accountID) => {
        expect(err).toBeFalsy();
        expect(accountID).toBeTruthy()
        expect(validator.isUUID(accountID)).toBe(true)
        blockm.getBalance(accountID, (err, balance) => {
          expect(err).toBeFalsy();
          expect(balance).toBe(0);
          done();
        })
      })
    })
  })
  test('Should call getBalance() with one tx before so it give fixed amout', done => {
    if (os.hostname() !== 'dreamfactory') {
      return done();
    }
    blockm.createAccount((err, accountID) => {
      expect(err).toBeFalsy();
      expect(accountID).toBeTruthy()
      expect(validator.isUUID(accountID)).toBe(true)
      blockm.getAddresses(accountID, 'ltc', (err, address) => {
        expect(err).toBeFalsy();
        expect(address).toBeTruthy()
        expect(WAValidator.validate(address, 'LTC', 'testnet')).toBe(true)
        blockm.__models.Account.findByPk(accountID).then(account => {
          // Set the account to some account with funds so balance will be
          // greater than zero
          account.update({
            blockchainAccount: "f1e15510-a925-11e7-9662-5b5dc1aa44b3"
          }).then(_ => {
            blockm.getBalance(accountID, (err, balance) => {
              expect(err).toBeFalsy();
              console.log('Balance', balance)
              expect(balance).toBeGreaterThan(2000);
              done();
            })
          });
        })
      })
    })
  })
  test('Should close', () => {
    expect(blockm.close()).toBeUndefined();
  })
})
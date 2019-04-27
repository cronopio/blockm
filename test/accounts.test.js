const blockm = require('../lib');
const validator = require('validator');
const WAValidator = require('wallet-address-validator');

jest.setTimeout(10000);

describe('Testing Account Creation', () => {
  test('Should call createAccount() and get an Account ID', done => {
    blockm.sync(err => {
      expect(err).toBeFalsy();
      blockm.createAccount((err, accountID) => {
        expect(err).toBeFalsy();
        expect(accountID).toBeTruthy()
        expect(validator.isUUID(accountID)).toBe(true)
        done();
      })
    })
  })
  test('Should call deposit() and get a valid Litecoin Adress', done => {
    blockm.createAccount((err, accountID) => {
      expect(err).toBeFalsy();
      expect(accountID).toBeTruthy()
      expect(validator.isUUID(accountID)).toBe(true)
      blockm.deposit(accountID, (err, address) => {
        expect(err).toBeFalsy();
        expect(address).toBeTruthy()
        expect(WAValidator.validate(address, 'LTC', 'testnet')).toBe(true)
        done();
      })
    })
  })
  test('Should close', () => {
    expect(blockm.close()).toBeUndefined();
  })
})
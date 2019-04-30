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
  test('Should call getAddresses() and get a valid Litecoin Address', done => {
    blockm.createAccount((err, accountID) => {
      expect(err).toBeFalsy();
      expect(accountID).toBeTruthy()
      expect(validator.isUUID(accountID)).toBe(true)
      blockm.getAddresses(accountID, (err, address) => {
        expect(err).toBeFalsy();
        expect(address.ltc).toBeTruthy()
        expect(WAValidator.validate(address.ltc, 'LTC', 'testnet')).toBe(true)
        done();
      })
    })
  })
  test('Should call getAddresses() and get a valid Ethereum Address', done => {
    blockm.createAccount((err, accountID) => {
      expect(err).toBeFalsy();
      expect(accountID).toBeTruthy()
      expect(validator.isUUID(accountID)).toBe(true)
      blockm.getAddresses(accountID, (err, address) => {
        expect(err).toBeFalsy();
        expect(address.eth).toBeTruthy()
        done();
      })
    })
  })
  test('Should call getAddresses() and get a valid Litecoin Address and Ethereum Address', done => {
    blockm.createAccount((err, accountID) => {
      expect(err).toBeFalsy();
      expect(accountID).toBeTruthy()
      expect(validator.isUUID(accountID)).toBe(true)
      blockm.getAddresses(accountID, (err, address) => {
        expect(err).toBeFalsy();
        expect(address.ltc).toBeTruthy()
        expect(WAValidator.validate(address.ltc, 'LTC', 'testnet')).toBe(true)
        expect(address.eth).toBeTruthy()
        done();
      })
    })
  })
  test('Should call getAddresses() WITH FILTER and get a valid Litecoin Address', done => {
    blockm.createAccount((err, accountID) => {
      expect(err).toBeFalsy();
      expect(accountID).toBeTruthy()
      expect(validator.isUUID(accountID)).toBe(true)
      blockm.getAddresses(accountID, 'ltc', (err, address) => {
        expect(err).toBeFalsy();
        expect(address).toBeTruthy()
        expect(WAValidator.validate(address, 'LTC', 'testnet')).toBe(true)
        done();
      })
    })
  })
  test('Should call getAddresses() WITH FILTER and get a valid Ethereum Address', done => {
    blockm.createAccount((err, accountID) => {
      expect(err).toBeFalsy();
      expect(accountID).toBeTruthy()
      expect(validator.isUUID(accountID)).toBe(true)
      blockm.getAddresses(accountID, 'ETH', (err, address) => {
        expect(err).toBeFalsy();
        expect(address).toBeTruthy()
        done();
      })
    })
  })
  test('Should close', () => {
    expect(blockm.close()).toBeUndefined();
  })
})
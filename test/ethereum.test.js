const blockm = require('../lib');
const validator = require('validator');
const WAValidator = require('wallet-address-validator');

jest.setTimeout(10000);

describe('Testing Ethereum Blockchain Connection', () => {
  test('Should get response from getBlockCount()', done => {
    blockm.sync((err) => {
      expect(err).toBeFalsy();
      blockm.getBlockCount((err, count) => {
        expect(err).toBeFalsy();
        expect(count.eth).toBe(0)
        console.log('Block ETH Count:', count);
        done();
      })
    })
  })
  test('Should get response from getConnectionCount()', done => {
    blockm.getConnectionCount((err, count) => {
      expect(err).toBeFalsy();
      expect(count.eth).toBe(0)
      console.log('Peers Connection', count);
      done();
    })
  })
  test('Should call getAddresses in Geth node and return a valid eth address', done => {
    blockm.createAccount((err, accountID) => {
      expect(err).toBeFalsy();
      expect(accountID).toBeTruthy()
      expect(validator.isUUID(accountID)).toBe(true)
      blockm.getAddresses(accountID, 'eth', (err, address) => {
        expect(err).toBeFalsy();
        expect(address).toBeTruthy()
        expect(WAValidator.validate(address, 'ETH')).toBe(true)
        console.log('New Eth Address: ', address);
        done();
      })
    })
  })
  test('Should close', () => {
    expect(blockm.close()).toBeUndefined();
  })
})
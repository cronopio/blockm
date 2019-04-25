const blockm = require('../lib');
const validator = require('validator')

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
  test('Should close', () => {
    expect(blockm.close()).toBeUndefined();
  })
})
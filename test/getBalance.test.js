const blockm = require('../lib');
const validator = require('validator');

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
})
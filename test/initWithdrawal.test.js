const blockm = require('../lib');

jest.setTimeout(10000);

describe('Testing Funds Withdrawal', () => {
  test('Should call initWithdrawal() and give no error', done => {
  	blockm.sync(err => {
      expect(err).toBeFalsy();
      blockm.initWithdrawal((err, accountID) => {
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
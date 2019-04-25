const blockm = require('../lib');

describe('Should Connect to Database and Close', () => {
  test('Should Sync', (done) => {
    blockm.sync((err) => {
      expect(err).toBeFalsy();
      done();
    })
  })
  test('Should close', () => {
    expect(blockm.close()).toBeUndefined();
  })
})

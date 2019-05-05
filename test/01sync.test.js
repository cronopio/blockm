// File renamed so the Test Suite start with this one always
// This ensure that the basic DB structure is created.

const blockm = require('../lib');

jest.setTimeout(10000);

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

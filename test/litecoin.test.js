const blockm = require('../lib');

describe('Testing Litecoin Blockchain Connection', () => {
  test('Should get response from getBlockCount()', done => {
    blockm.sync((err) => {
      expect(err).toBeFalsy();
      blockm.getBlockCount((err, count) => {
        expect(err).toBeFalsy();
        expect(count).toBeGreaterThan(10)
        console.log('Miralo', count, typeof count);
        done();
      })
    })
  })
  test('Should get response from getConnectionCount()', done => {
    blockm.getConnectionCount((err, count) => {
      expect(err).toBeFalsy();
      expect(count).toBeGreaterThan(1)
      console.log('Miralo CX', count, typeof count);
      done();
    })
  })
  test('Should close', () => {
    expect(blockm.close()).toBeUndefined();
  })
})
const blockm = require('../lib');

jest.setTimeout(10000);

describe('Testing Litecoin Blockchain Connection', () => {
  test('Should get response from getBlockCount()', done => {
    blockm.sync((err) => {
      expect(err).toBeFalsy();
      blockm.getBlockCount((err, count) => {
        expect(err).toBeFalsy();
        expect(count).toBeGreaterThan(10)
        console.log('Block Count', count, typeof count);
        done();
      })
    })
  })
  test('Should get response from getConnectionCount()', done => {
    blockm.getConnectionCount((err, count) => {
      expect(err).toBeFalsy();
      expect(count).toBeGreaterThan(1)
      console.log('Peers Connection', count, typeof count);
      done();
    })
  })
  test('Should close', () => {
    expect(blockm.close()).toBeUndefined();
  })
})
const blockm = require('../lib');

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
  test('Should close', () => {
    expect(blockm.close()).toBeUndefined();
  })
})
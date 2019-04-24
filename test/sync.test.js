const blockm = require('../lib');

test('Should Sync', (done) => {
  blockm.sync((err) => {
    expect(err).toBeFalsy();
    done();
  })
})
const assert = require('assert');

const redis = require('redis');

const client = redis.createClient();

client.on('error', (err) => {
  console.log(`Error: ${err}`);
});

const PhoneDB = require('../phonedb');

describe('PhoneDB', () => {
  const phoneDB = new PhoneDB();

  beforeEach(() => {
    client.flushdb();
  });

  after(() => {
    client.flushdb();
  });

  describe('#register()', () => {
    it('should register a valid phone number', (done) => {
      phoneDB.register('+18475557777').then(() => {
        client.scard('users:phone', (err, res) => {
          assert.equal(1, res);
          done();
        });
      });
    });

    it('should not register an invalid phone number', (done) => {
      phoneDB.register('+1847555777').then(() => {
        assert(false);
        done();
      }).catch(() => {
        done();
      });
    });

    it('should not register another invalid phone number', (done) => {
      phoneDB.register('FAKE NEWS! SAD!').then(() => {
        assert(false);
      }).catch((err) => {
        assert(err);
        done();
      });
    });
  });

  describe('#addContacts()', () => {
    it('should add a list of valid contacts', (done) => {
      const contacts = ['+18475557777', '+14157775555'];
      phoneDB.addContacts('user1', contacts).then(() => {
        client.scard('user:user1:contacts', (_, res) => {
          assert.equal(2, res);
          done();
        });
      });
    });

    it('should throw error if contact is not a number', (done) => {
      const contacts = ['FAKE NEWS! SAD!', '+14157775555'];
      phoneDB.addContacts('user1', contacts).then(() => {
        client.scard('user:user1:contacts', () => {
          assert(false);
        });
      }).catch((err) => {
        assert(err);
        done();
      });
    });

    it('should add one valid contact out of a total of 2', (done) => {
      const contacts = ['+1847555777', '+14157775555'];
      phoneDB.addContacts('user1', contacts).then(() => {
        client.scard('user:user1:contacts', (_, res) => {
          assert.equal(1, res);
          done();
        });
      });
    });
  });

  describe('#findUsers()', () => {
    it('should find 2 contacts on app', (done) => {
      phoneDB.register('+18475557777');
      phoneDB.register('+14157775555');
      phoneDB.addContacts('user1', ['+18475557777', '+14157775555', '+14157775556']);
      phoneDB.findUsers('user1').then((users) => {
        assert.equal(2, users.length);
        done();
      });
    });
  });
});

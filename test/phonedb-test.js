const assert = require('assert');

const redis = require('redis');

const client = redis.createClient();

client.on('error', (err) => {
  console.log(`Error: ${err}`);
});

const PhoneDB = require('../phonedb');

describe('PhoneDB', () => {
  beforeEach(() => {
    client.flushdb();
  });

  after(() => {
    client.flushdb();
  });

  describe('#add()', () => {
    it('should add a valid phone number', (done) => {
      PhoneDB.add('+18475557777').then(() => {
        client.scard('users:phone', (err, res) => {
          assert.equal(1, res);
          done();
        });
      });
    });

    it('should not add an invalid phone number', (done) => {
      PhoneDB.add('+1847555777').then(() => {
        assert(false);
        done();
      }).catch(() => {
        done();
      });
    });

    it('should not add another invalid phone number', (done) => {
      PhoneDB.add('FAKE NEWS! SAD!').then(() => {
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
      PhoneDB.addContacts('user1', contacts).then(() => {
        client.scard('user:user1:contacts', (_, res) => {
          assert.equal(2, res);
          done();
        });
      });
    });

    it('should throw error if contact is not a number', (done) => {
      const contacts = ['FAKE NEWS! SAD!', '+14157775555'];
      PhoneDB.addContacts('user1', contacts).then(() => {
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
      PhoneDB.addContacts('user1', contacts).then(() => {
        client.scard('user:user1:contacts', (_, res) => {
          assert.equal(1, res);
          done();
        });
      });
    });
  });

  describe('#findUsers()', () => {
    it('should find 2 contacts on app', (done) => {
      PhoneDB.add('+18475557777');
      PhoneDB.add('+14157775555');
      PhoneDB.addContacts('user1', ['+18475557777', '+14157775555', '+14157775556']);
      PhoneDB.findUsers('user1').then((users) => {
        assert.equal(2, users.length);
        done();
      });
    });
  });
});

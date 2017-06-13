const assert = require('assert');
const redis = require('redis');

const client = redis.createClient();

client.on('error', (err) => {
  console.log(err);
});

const PhoneDB = require('../phonedb');

describe('PhoneDB', () => {
  const phoneDB = new PhoneDB(client);

  beforeEach(() => {
    client.flushdb();
  });

  after(() => {
    client.flushdb();
  });

  describe('.register()', () => {
    it('should register a valid phone number', (done) => {
      phoneDB.register('+18475557777').then(() => {
        client.scard('phonedb:registered', (err, res) => {
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

  describe('.addContacts()', () => {
    it('should add a list of valid contacts', (done) => {
      const contacts = ['+18475557777', '+14157775555'];
      phoneDB.addContacts('user1', contacts).then((res) => {
        assert.equal(2, res);
        done();
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

  describe('.getMutualContacts()', () => {
    it('should find mutual contacts between two users', (done) => {
      phoneDB.addContacts('user1', ['+18475557777', '+14157775555', '+14157775556']);
      phoneDB.addContacts('user2', ['+18475557777', '+14157775555', '+14157775556']);
      phoneDB.getMutualContacts('user1', 'user2').then((contacts) => {
        assert.equal(3, contacts.length);
        done();
      });
    });

    it('should find mutual registered contacts between two users', (done) => {
      phoneDB.register('+18475557777');
      phoneDB.addContacts('user1', ['+18475557777', '+14157775555', '+14157775556']);
      phoneDB.addContacts('user2', ['+18475557777', '+14157775555', '+14157775556']);
      phoneDB.getMutualContacts('user1', 'user2', true).then((contacts) => {
        assert.equal(1, contacts.length);
        done();
      });
    });
  });

  describe('.getContacts()', () => {
    it('should find 3 contacts for a user', (done) => {
      phoneDB.addContacts('user1', ['+18475557777', '+14157775555', '+14157775556']);
      phoneDB.getContacts('user1', false).then((users) => {
        assert.equal(3, users.length);
        done();
      });
    });

    it('should find 2 registered contacts for a user', (done) => {
      phoneDB.register('+18475557777');
      phoneDB.register('+14157775555');
      phoneDB.addContacts('user1', ['+18475557777', '+14157775555', '+14157775556']);
      phoneDB.getContacts('user1', true).then((users) => {
        assert.equal(2, users.length);
        done();
      });
    });
  });
});

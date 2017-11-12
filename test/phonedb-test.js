const assert = require('assert');
const redis = require('redis');
const { promisify } = require('util');

const client = redis.createClient();
const scard = promisify(client.scard).bind(client);

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
    // workaround for `nyc mocha` hanging
    process.exit(0);
  });

  describe('.register()', () => {
    it('should register a valid phone number', async () => {
      await phoneDB.register('+18475557777');
      const result = await scard('phonedb:registered');
      assert.equal(1, result);
    });

    it('should not register an invalid phone number', async () => {
      try {
        await phoneDB.register('+1847555777');
      } catch (err) {
        assert(err);
      }
    });

    it('should not register another invalid phone number', async () => {
      try {
        await phoneDB.register('FAKE NEWS! SAD!');
      } catch (err) {
        assert(err);
      }
    });
  });

  describe('.addContacts()', () => {
    it('should add a list of valid contacts', async () => {
      const contacts = ['+18475557777', '+14157775555'];
      const result = await phoneDB.addContacts('user1', contacts);
      assert.equal(2, result);
    });

    it('should throw error if contact is not a number', async () => {
      const contacts = ['FAKE NEWS! SAD!', '+14157775555'];
      try {
        await phoneDB.addContacts('user1', contacts);
      } catch (err) {
        const result = scard('user:user1:contacts');
        assert(result);
      }
    });

    it('should add one valid contact out of a total of 2', async () => {
      const contacts = ['+1847555777', '+14157775555'];
      await phoneDB.addContacts('user1', contacts);
      const result = client.scard('user:user1:contacts');
      assert.equal(1, result);
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
    it('should find 3 contacts for a user', async () => {
      await phoneDB.addContacts('user1', ['+18475557777', '+14157775555', '+14157775556']);
      const result = await phoneDB.getContacts('user1');
      assert.equal(3, result.length);
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

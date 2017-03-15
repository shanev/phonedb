/**
 * PhoneStore stores phone numbers in Redis. It stores all the phone numbers for all the users in
 * the app in one set, and a set of contacts for each individual user. It uses set intersection
 * to find a user's contacts who are also on the app.
 */
const debug = require('debug')('app');

const redis = require('redis');

const client = redis.createClient(process.env.REDIS_URL);

client.on('error', (err) => {
  debug(`Error: ${err}`);
});

const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const APP_PHONE_SET_KEY = 'users:phone';

class PhoneStore {
  // add() adds a phone number to the app phone number set
  static add(phone) {
    return new Promise((resolve, reject) => {
      if (phoneUtil.isValidNumber(phoneUtil.parse(phone)) === false) {
        throw new Error(`Invalid phone number: ${phone}`);
      }
      client.sadd(APP_PHONE_SET_KEY, phone, (err) => {
        if (err) { reject(err); }
        debug(`[PhoneStore] Added ${phone} to ${APP_PHONE_SET_KEY}`);
        resolve();
      });
    });
  }

  // addContacts() stores a user's contact list
  static addContacts(userId, contacts) {
    return new Promise((resolve, reject) => {
      if (userId == null) {
        reject(new Error('A userId is required.'));
      }
      try {
        // filter out invalid numbers
        const numbers = contacts.filter(
          contact => phoneUtil.isValidNumber(phoneUtil.parse(contact)));

        // create key for user
        const key = `user:${userId}:contacts`;

        // add filtered numbers to Redis
        client.sadd(key, numbers, (err, res) => {
          if (err) { reject(err); }
          debug(`[PhoneStore] Added ${res} contacts to ${key}`);
          resolve();
        });
      } catch (err) {
        debug(`[PhoneStore] Caught ${err}. Rejecting Promise.`);
        reject(err);
      }
    });
  }

  static mutualContacts(userId = null, otherUserId = null) {
    return new Promise((resolve, reject) => {
      if ((userId == null) || (otherUserId == null)) {
        throw new Error('A userId and otherUserId are required.');
      }
      const userKey = `user:${userId}:contacts`;
      const otherUserKey = `user:${otherUserId}:contacts`;
      client.sinter(userKey, otherUserKey, (err, res) => {
        if (err) { reject(err); }
        debug(`[PhoneDB] Found ${res.length} mutual contacts between ${userId} and ${otherUserId}`);
        resolve(res);
      });
    });
  }

  /**
   * getContacts() returns a user's contacts.
   * If mutual = true, returns a user's contacts who are already registered with PhoneDB.
   */
  static getContacts(userId = null, mutuals = false) {

  }

  // find() finds a user's contacts who are also on the app
  static findUsers(userId) {
    return new Promise((resolve, reject) => {
      const userContactsKey = `user:${userId}:contacts`;
      client.sinter(userContactsKey, APP_PHONE_SET_KEY, (err, res) => {
        if (err) { reject(err); }
        debug(`[PhoneStore] Found ${res.length} of ${userId}'s contacts on app`);
        resolve(res);
      });
    });
  }
}

module.exports = PhoneStore;

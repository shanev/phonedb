/**
 * PhoneDB stores phone numbers in Redis. It stores all the phone numbers for all the users in
 * the app in one set, and a set of contacts for each individual user. It uses set intersection
 * to find mutual contacts, and contacts who are registered with PhoneDB.
 */
const debug = require('debug')('phonedb');

const redis = require('redis');

const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const APP_PHONE_SET_KEY = 'users:phone';

class PhoneDB {
  /**
   * Initializes a new PhoneDB object.
   * Optionally takes in a Redis config (https://github.com/NodeRedis/node_redis#rediscreateclient).
   */
  constructor(config = null) {
    this.client = (config != null) ? redis.createClient(config) : redis.createClient();
  }

  // register() adds a phone number to the app phone number set
  register(phone) {
    return new Promise((resolve, reject) => {
      if (phoneUtil.isValidNumber(phoneUtil.parse(phone)) === false) {
        throw new Error(`Invalid phone number: ${phone}`);
      }
      this.client.sadd(APP_PHONE_SET_KEY, phone, (err) => {
        if (err) { reject(err); }
        debug(`[PhoneDB] Added ${phone} to ${APP_PHONE_SET_KEY}`);
        resolve();
      });
    });
  }

  // addContacts() stores a user's contact list
  addContacts(userId, contacts) {
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
        this.client.sadd(key, numbers, (err, res) => {
          if (err) { reject(err); }
          debug(`[PhoneDB] Added ${res} contacts to ${key}`);
          resolve();
        });
      } catch (err) {
        debug(`[PhoneDB] Caught ${err}. Rejecting Promise.`);
        reject(err);
      }
    });
  }

  mutualContacts(userId = null, otherUserId = null) {
    return new Promise((resolve, reject) => {
      if ((userId == null) || (otherUserId == null)) {
        throw new Error('A userId and otherUserId are required.');
      }
      const userKey = `user:${userId}:contacts`;
      const otherUserKey = `user:${otherUserId}:contacts`;
      this.client.sinter(userKey, otherUserKey, (err, res) => {
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
  getContacts(userId = null, mutuals = false) {

  }

  // find() finds a user's contacts who are also on the app
  findUsers(userId) {
    return new Promise((resolve, reject) => {
      const userContactsKey = `user:${userId}:contacts`;
      this.client.sinter(userContactsKey, APP_PHONE_SET_KEY, (err, res) => {
        if (err) { reject(err); }
        debug(`[PhoneDB] Found ${res.length} of ${userId}'s contacts on app`);
        resolve(res);
      });
    });
  }
}

module.exports = PhoneDB;

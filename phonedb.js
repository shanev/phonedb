/**
 * PhoneDB stores phone numbers in Redis. It stores all the phone numbers for all the users in
 * the app in one set, and a set of contacts for each individual user. It uses set intersection
 * to find mutual contacts, and contacts who are registered with PhoneDB.
 */
const debug = require('debug')('phonedb');

const redis = require('redis');

const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const REGISTERED_KEY = 'phonedb:registered';

class PhoneDB {
  /**
   * Initializes a new PhoneDB object.
   * Optionally takes in a Redis config (https://github.com/NodeRedis/node_redis#rediscreateclient).
   */
  constructor(config = null) {
    this.client = (config != null) ? redis.createClient(config) : redis.createClient();
  }

  /**
   * register() adds a phone number to the app phone number set
   * Returns an empty Promise.
   */
  register(phone) {
    return new Promise((resolve, reject) => {
      if (phoneUtil.isValidNumber(phoneUtil.parse(phone)) === false) {
        throw new Error(`Invalid phone number: ${phone}`);
      }
      this.client.sadd(REGISTERED_KEY, phone, (err) => {
        if (err) { reject(err); }
        debug(`[PhoneDB] Added ${phone} to ${REGISTERED_KEY}`);
        resolve();
      });
    });
  }

  /**
   * addContacts() stores a user's contact list
   * Returns a Promise with the number of contacts added.
   */
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
          resolve(res);
        });
      } catch (err) {
        debug(`[PhoneDB] Caught ${err}. Rejecting Promise.`);
        reject(err);
      }
    });
  }

  /**
   * mutualContacts() returns contacts `userId` and `otherUserId` have in common.
   * If registered = true limits contacts to those already registered with PhoneDB.
   */
  getMutualContacts(userId = null, otherUserId = null, registered = false) {
    if ((userId == null) || (otherUserId == null)) {
      throw new Error('A userId and otherUserId are required.');
    }
    const userKey = `user:${userId}:contacts`;
    const otherUserKey = `user:${otherUserId}:contacts`;

    if (registered === false) {
      return new Promise((resolve, reject) => {
        this.client.sinter(userKey, otherUserKey, (err, res) => {
          if (err) { reject(err); }
          debug(`[PhoneDB] Found ${res.length} mutual contacts between ${userId} and ${otherUserId}`);
          resolve(res);
        });
      });
    }

    return new Promise((resolve, reject) => {
      this.client.sinter(userKey, otherUserKey, REGISTERED_KEY, (err, res) => {
        if (err) { reject(err); }
        debug(`[PhoneDB] Found ${res.length} mutual registered contacts between ${userId} and ${otherUserId}`);
        resolve(res);
      });
    });
  }

  /**
   * getContacts() returns a user's contacts.
   * If registered = true limits contacts to those already registered with PhoneDB.
   */
  getContacts(userId = null, registered = false) {
    const userContactsKey = `user:${userId}:contacts`;

    if (registered === false) {
      return new Promise((resolve, reject) => {
        this.client.smembers(userContactsKey, (err, res) => {
          if (err) { reject(err); }
          debug(`[PhoneDB] Found ${res.length} contacts for ${userId}`);
          resolve(res);
        });
      });
    }

    return new Promise((resolve, reject) => {
      this.client.sinter(userContactsKey, REGISTERED_KEY, (err, res) => {
        if (err) { reject(err); }
        debug(`[PhoneDB] Found ${res.length} of ${userId}'s contacts on app`);
        resolve(res);
      });
    });
  }
}

module.exports = PhoneDB;

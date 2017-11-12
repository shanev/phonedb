/**
 * PhoneDB stores phone numbers in Redis. It stores all the phone numbers for all the users in
 * the app in one set, and a set of contacts for each individual user. It uses set intersection
 * to find mutual contacts, and contacts who are registered with PhoneDB.
 */
const debug = require('debug')('phonedb');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const { promisify } = require('util');

const REGISTERED_KEY = 'phonedb:registered';

class PhoneDB {
  /**
   * Initializes a new PhoneDB object with a Redis client (https://github.com/NodeRedis/node_redis).
   */
  constructor(redis) {
    this.client = redis;
    this.sadd = promisify(redis.sadd).bind(redis);
    this.sinter = promisify(redis.sinter).bind(redis);
    this.smembers = promisify(redis.smembers).bind(redis);
  }

  /**
   * register() adds a phone number to the app phone number set.
   * Throws an error for an invalid number.
   * Returns an empty Promise.
   */
  register(phone) {
    if (phoneUtil.isValidNumber(phoneUtil.parse(phone)) === false) {
      throw new Error(`Invalid phone number: ${phone}`);
    }

    return this.sadd(REGISTERED_KEY, phone);
  }

  /**
   * addContacts() stores a user's contact list.
   * Throws an error for an invalid number.
   * Returns a Promise with the number of contacts added.
   */
  addContacts(userId, contacts) {
    if (userId == null) {
      throw new Error('A userId is required.');
    }
    // filter out invalid numbers
    const numbers = contacts.filter(contact => phoneUtil.isValidNumber(phoneUtil.parse(contact)));

    // add filtered numbers to Redis
    return this.sadd(`user:${userId}:contacts`, numbers);
  }

  /**
   * mutualContacts() returns contacts `userId` and `otherUserId` have in common.
   * If registered = true limits contacts to those already registered with PhoneDB.
   */
  async getMutualContacts(userId = null, otherUserId = null, registered = false) {
    if ((userId == null) || (otherUserId == null)) {
      throw new Error('A userId and otherUserId are required.');
    }
    const userKey = `user:${userId}:contacts`;
    const otherUserKey = `user:${otherUserId}:contacts`;

    if (registered === false) {
      const result = await this.sinter(userKey, otherUserKey);
      debug(`[PhoneDB] Found ${result.length} mutual contacts between ${userId} and ${otherUserId}`);
      return result;
    }

    const result = this.sinter(userKey, otherUserKey, REGISTERED_KEY);
    debug(`[PhoneDB] Found ${result.length} mutual registered contacts between ${userId} and ${otherUserId}`);
    return result;
  }

  /**
   * getContacts() returns a user's contacts.
   * If registered = true limits contacts to those already registered with PhoneDB.
   */
  async getContacts(userId = null, registered = false) {
    const userContactsKey = `user:${userId}:contacts`;

    if (registered === false) {
      const result = await this.smembers(userContactsKey);
      debug(`[PhoneDB] Found ${result.length} contacts for ${userId}`);
      return result;
    }

    const result = await this.sinter(userContactsKey, REGISTERED_KEY);
    debug(`[PhoneDB] Found ${result.length} of ${userId}'s contacts on app`);
    return result;
  }
}

module.exports = PhoneDB;

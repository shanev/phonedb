# PhoneDB

[![npm version](https://badge.fury.io/js/phonedb.svg)](https://badge.fury.io/js/phonedb)
[![Build Status](https://travis-ci.org/shanev/phonedb.svg?branch=master)](https://travis-ci.org/shanev/phonedb)
[![codecov](https://codecov.io/gh/shanev/phonedb/branch/master/graph/badge.svg)](https://codecov.io/gh/shanev/phonedb)
[![codebeat badge](https://codebeat.co/badges/00b7379b-9daf-43a3-80c2-7887b88ed66d)](https://codebeat.co/projects/github-com-shanev-phonedb-master)
[![Dependencies](https://david-dm.org/shanev/phonedb.svg)](https://david-dm.org/shanev/phonedb)

PhoneDB is a database backed by Redis to store user contact lists. It allows you to easily find which of a user's contacts are also registered with your app. PhoneDB validates phone numbers before they are added.

## Installation

If you are using yarn:

```sh
yarn add phonedb
```

or npm:

```sh
npm install phonedb --save
```

Run Redis server:
```sh
redis-server
```
Check out [Redis quickstart](https://redis.io/topics/quickstart) to install.

## Usage

Require PhoneDB:
```js
const PhoneDB = require('phonedb');
```

Initialize PhoneDB, connecting to a [Redis client](https://github.com/NodeRedis):
```js
const phoneDB = new PhoneDB(redisClient);
```

Register a user's phone number with PhoneDB:
```js
phoneDB.register('+14157775555');
```

Add a user's contacts:
```js
const result = await phoneDB.addContacts(userId, ['+18473335555', '+12127775555']);
// 2
```

Get a user's contacts:
```js
const contacts = await phoneDB.getContacts(userId);
```

Get a user's contacts who are also registered with PhoneDB (set `registered = true`):
```js
const registeredContacts = await phoneDB.getContacts(userId, true);
```

Get mutual contacts between two users:
```js
const mutualContacts = await phoneDB.getMutualContacts(userId, otherUserId);
```

Get mutual contacts between two users who are registered:
```js
const mutualRegisteredContacts = await phoneDB.getMutualContacts(userId, otherUserId, true);
```

## Debugging

Add `DEBUG=phonedb` to the node start script in `package.json` to see debug output. i.e:

```sh
DEBUG=phonedb node server.js
```

## Tests

```sh
yarn install # or npm install
npm test
```

## Author

Shane Vitarana :: [http://shanev.me](http://shanev.me) :: [@shanev](https://twitter.com/shanev)

/*
  BVT = Build Verification Test
  A BVT ensures the units under test can build, successfully runs all classes
  of tests, and verifies that production servers are operating as expected.

  BVT tests the products in this order:
  - liveness
  - bch-api
  - bch-js

  BVT runs tests in this order:
  - unit
  - integration
  - e2e
*/

"use strict";

const PERIOD = 60000 * 60 * 2; // 2 hrs
//const PERIOD = 60000 * 60

const GARBAGE_PERIOD = 60000 * 60 * 24; // 1 day
//const GARBAGE_PERIOD = 60000 * 60 * 4 // 4 hours

const utils = require("./lib/util");

const Liveness = require("./lib/liveness");
const liveness = new Liveness();

const AbcLogAnalysis = require('./lib/abc-log-analysis')
const abcLogAnalysis = new AbcLogAnalysis()

const BchnLogAnalysis = require('./lib/bchn-log-analysis')
const bchnLogAnalysis = new BchnLogAnalysis()

const Testnet3LogAnalysis = require('./lib/testnet3-log-analysis')
const testnet3LogAnalysis = new Testnet3LogAnalysis()



// Instantiate the JWT handling library for FullStack.cash.
const JwtLib = require('jwt-bch-lib')
const jwtLib = new JwtLib({
  // Overwrite default values with the values in the config file.
  server: 'https://auth.fullstack.cash',
  login: process.env.FULLSTACKLOGIN,
  password: process.env.FULLSTACKPASS
})

const BCHAPI = require("./lib/bch-api");
const bchapi = new BCHAPI();

const BCHJS = require("./lib/bch-js");
const bchjs = new BCHJS();

// Used for debugging and iterrogating JS objects.
const util = require("util");
util.inspect.defaultOptions = { depth: 1 };

// Have the BVT run all tests.
async function runTests() {
  try {
    // Cleanup old data and prepare for a new run of tests.
    utils.clearUutDir();
    utils.clearLogs();
    utils.log(`Prepared BVT for new run.`);

    // Get the JWT token needed to interact with the FullStack.cash API.
    await getJwt()

    // Initialize the logs.
    const startTime = new Date();
    await utils.logAll(`BVT tests started...`);

    // Run all liveness tests first.
    await liveness.runTests();

    // Run the suite of BITBOX tests.
    await bchjs.runTests();

    // Run the suite of rest tests.
    await bchapi.runTests();

    utils.log(`\nStart log analysis.\n`);

    // Download and analyze the logs from the ABC server.
    await abcLogAnalysis.runTests()

    // Download and analyze the logs from the BCHN server.
    await bchnLogAnalysis.runTests()

    // Download and analyze the logs from the free-tier server.
    await testnet3LogAnalysis.runTests()

    // Signal the tests have completed.
    const endTime = new Date();
    await utils.logAll(`...BVT tests completed.`);
    await utils.logAll(`Results can be viewed at https://metrics.fullstack.cash/`)

    // Signal when the next run will be
    const nextRun = new Date(startTime.getTime() + PERIOD);
    await utils.logAll(
      `Next BVT run will be at ${nextRun.toLocaleString("en-US", {
        timeZone: "America/Los_Angeles"
      })}.`
    );
  } catch (err) {
    console.error(`Error in runTests(): `, err);
    utils.log(`Error running BVT: ${err.message}`);
  }
}

// Periodically run the BVT
setInterval(function() {
  runTests();
}, PERIOD);

// Also run the tests immediately
runTests();

// Run garbage collection once per day, to delete any old logs.
setInterval(function() {
  utils.collectGarbage();
}, GARBAGE_PERIOD);

// Get's a JWT token from FullStack.cash.
// This code based on the jwt-bch-demo:
// https://github.com/Permissionless-Software-Foundation/jwt-bch-demo
async function getJwt() {
  try {
    // Log into the auth server.
    await jwtLib.register()

    let apiToken = jwtLib.userData.apiToken

    // Ensure the JWT token is valid to use.
    const isValid = await jwtLib.validateApiToken()

    // Get a new token with the same API level, if the existing token is not
    // valid (probably expired).
    if (!isValid.isValid) {
      apiToken = await jwtLib.getApiToken(jwtLib.userData.apiLevel)
      await utils.logAll(`The JWT token was not valid. Retrieved new JWT token.\n`)
    } else {
      await utils.logAll('JWT token is valid.\n')
    }

    // Set the environment variable.
    process.env.BCHJSTOKEN = apiToken
  } catch(err) {
    console.error(`Error in bvt.js/getJwt(): `, err)
    throw err
  }
}

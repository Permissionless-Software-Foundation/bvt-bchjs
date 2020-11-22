/*
  Functions used to run tests on the BITBOX repo.
*/

"use strict";

const shell = require("shelljs");
const telegram = require("./telegram");
const utils = require("./util");
const config = require("../config");

class Tests {
  constructor() {}

  // Parent function called by the BVT.
  async runTests() {
    this.installBchjs();
    utils.log(`bch-js dependencies installed.`);

    await this.runUnitTests();

    await this.runBchnIntegrationTests();

    await this.runAbcIntegrationTests();

    // Wait a couple minutes to let the rate limiter settle down.
    // await this.sleep(60000 * 2)

    await this.runTestnetIntegrationTests();

    utils.log(`bch-js tests complete.`)
    utils.log(` `)
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Install the bch-js repository.
  installBchjs() {
    try {
      utils.clearUutDir();

      shell.cd(`${__dirname}`); // Ensure the function is on a known directory path

      shell.cd(`${__dirname}/../uut`);
      shell.exec(`git clone https://github.com/Permissionless-Software-Foundation/bch-js`);

      shell.cd(`bch-js`);
      shell.exec(`npm install > ${__dirname}/../html/logs/bch-js/install.txt`);
    } catch (err) {
      console.log(`Error in installBchjs(): `, err);
    }
  }

  // Unit Tests
  runUnitTests() {
    return new Promise((resolve, reject) => {
      try {
        shell.cd(`${__dirname}`); // Ensure the function is on a known directory path
        shell.cd(`${__dirname}/../uut/bch-js`);

        const execStr = `npm run test > ${__dirname}/../html/logs/bch-js/unit-test.txt`;
        shell.exec(execStr, async function(code, stdout, stderr) {
          // A unit test failed.
          if (code !== 0) {
            utils.log(`bch-js unit tests: FAILED`);

            await telegram.send(
              `bch-js unit test failed. Details here: ${
                config.bvtServer
              }/bitbox/unit-tests.html`
            );
            // All unit tests succeeded.
          } else {
            utils.log(`bch-js unit tests: OK`);
          }

          resolve();
        });
      } catch (err) {
        console.log(`Error in bch-js.js/runUnitTests(): `, err);
        reject(err);
      }
    });
  }

  // Integration Tests
  async runBchnIntegrationTests() {
    return new Promise((resolve, reject) => {
      try {
        shell.cd(`${__dirname}`); // Ensure the function is on a known directory path
        shell.cd(`${__dirname}/../uut/bch-js`);

        // const execStr = `BCHJSTOKEN=${config.apiToken} npm run test:integration > ${__dirname}/../html/logs/bitbox/integration-test.txt`;
        const execStr = `npm run test:integration:bchn > ${__dirname}/../html/logs/bch-js/bchn-integration-test.txt`;

        shell.exec(execStr, async function(code, stdout, stderr) {
          if (code !== 0) {
            utils.log(`bch-js BCHN integration tests: FAILED`);

            await telegram.send(
              `bch-js BCHN integration test failed. Details here: ${
                config.bvtServer
              }/bch-js/bchn-integration-tests.html`
            );

            // All integration tests succeeded.
          } else {
            utils.log(`bch-js BCHN integration tests: OK`);
          }

          resolve();
        });
      } catch (err) {
        console.log(`Error in bch-js.js/runBchnIntegrationTests(): `, err);
        reject(err);
      }
    });
  }

  // Integration Tests
  async runAbcIntegrationTests() {
    return new Promise((resolve, reject) => {
      try {
        shell.cd(`${__dirname}`); // Ensure the function is on a known directory path
        shell.cd(`${__dirname}/../uut/bch-js`);

        // const execStr = `BCHJSTOKEN=${config.apiToken} npm run test:integration > ${__dirname}/../html/logs/bitbox/integration-test.txt`;
        const execStr = `npm run test:integration:abc > ${__dirname}/../html/logs/bch-js/abc-integration-test.txt`;

        shell.exec(execStr, async function(code, stdout, stderr) {
          if (code !== 0) {
            utils.log(`bch-js ABC integration tests: FAILED`);

            await telegram.send(
              `bch-js ABC tests failed. Details here: ${
                config.bvtServer
              }/bch-js/abc-integration-tests.html`
            );

            // All integration tests succeeded.
          } else {
            utils.log(`bch-js ABC integration tests: OK`);
          }

          resolve();
        });
      } catch (err) {
        console.log(`Error in bch-js.js/runAbcIntegrationTests(): `, err);
        reject(err);
      }
    });
  }

  // Integration Tests
  async runTestnetIntegrationTests() {
    return new Promise((resolve, reject) => {
      try {
        shell.cd(`${__dirname}`); // Ensure the function is on a known directory path
        shell.cd(`${__dirname}/../uut/bch-js`);

        // console.log(`BCHJSTOKEN: ${process.env.BCHJSTOKEN}`)

        const execStr = `BCHJSTOKEN=${process.env.BCHJSTOKEN} RESTURL=https://testnet3.fullstack.cash/v3/ npm run test:integration:testnet > ${__dirname}/../html/logs/bch-js/testnet3-integration-test.txt`;

        shell.exec(execStr, async function(code, stdout, stderr) {
          if (code !== 0) {
            utils.log(`bch-js testnet tests: FAILED`);

            await telegram.send(
              `bch-js testnet tests failed. Details here: ${
                config.bvtServer
              }/bch-js/testnet3-integration-tests.html`
            );

            // All testnet tests succeeded.
          } else {
            utils.log(`bch-js testnet tests: OK`);
          }

          resolve();
        });
      } catch (err) {
        console.log(`Error in bch-js.js/runTestnetIntegrationTests(): `, err);
        reject(err);
      }
    });
  }
}

module.exports = Tests;

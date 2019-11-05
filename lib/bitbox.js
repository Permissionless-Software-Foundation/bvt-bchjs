/*
  Functions used to run tests on the BITBOX repo.
*/

"use strict";

const shell = require("shelljs");
const slack = require("./slack");
const utils = require("./util");
const config = require("../config");

class RestTests {
  constructor() {}

  // Parent function called by the BVT.
  async runTests() {
    this.installBitbox();
    utils.log(`BITBOX dependencies installed.`);

    await this.runUnitTests();

    await this.runIntegrationTests();

    utils.log(`BITBOX tests complete.`)
    utils.log(` `)
  }

  // Install the BITBOX repository.
  installBitbox() {
    try {
      utils.clearUutDir();

      shell.cd(`${__dirname}`); // Ensure the function is on a known directory path

      shell.cd(`${__dirname}/../uut`);
      shell.exec(`git clone https://github.com/Bitcoin-com/bitbox-sdk`);

      shell.cd(`bitbox-sdk`);
      shell.exec(`yarn install > ${__dirname}/../html/logs/bitbox/install.txt`);
    } catch (err) {
      console.log(`Error in installBitbox(): `, err);
    }
  }

  // Unit Tests
  runUnitTests() {
    return new Promise((resolve, reject) => {
      try {
        shell.cd(`${__dirname}`); // Ensure the function is on a known directory path
        shell.cd(`${__dirname}/../uut/bitbox-sdk`);

        const execStr = `npm run test > ${__dirname}/../html/logs/bitbox/unit-test.txt`;
        shell.exec(execStr, async function(code, stdout, stderr) {
          // A unit test failed.
          if (code !== 0) {
            utils.log(`BITBOX unit tests FAILED.`);

            await slack.send(
              `BITBOX unit test failed. Details here: ${
                config.bvtServer
              }/bitbox/unit-tests.html`
            );
            // All unit tests succeeded.
          } else {
            utils.log(`BITBOX unit tests completed successfully.`);
          }

          resolve();
        });
      } catch (err) {
        console.log(`Error in bitbox.js/runUnitTests(): `, err);
        reject(err);
      }
    });
  }

  // Integration Tests
  async runIntegrationTests() {
    return new Promise((resolve, reject) => {
      try {
        shell.cd(`${__dirname}`); // Ensure the function is on a known directory path
        shell.cd(`${__dirname}/../uut/bitbox-sdk`);

        const execStr = `npm run test:integration > ${__dirname}/../html/logs/bitbox/integration-test.txt`;

        shell.exec(execStr, async function(code, stdout, stderr) {
          if (code !== 0) {
            utils.log(`BITBOX integration tests FAILED.`);

            await slack.send(
              `BITBOX integration test failed. Details here: ${
                config.bvtServer
              }/bitbox/integration-tests.html`
            );

            // All integration tests succeeded.
          } else {
            utils.log(`BITBOX integration tests completed successfully.`);
          }

          resolve();
        });
      } catch (err) {
        console.log(`Error in bitbox.js/runIntegrationTests(): `, err);
        reject(err);
      }
    });
  }
}

module.exports = RestTests;

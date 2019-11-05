/*
  Functions used to run tests on the SLP-SDK repo.
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
    this.installSlpSdk();
    utils.log(`SLP-SDK dependencies installed.`);

    await this.runUnitTests();

    await this.runIntegrationTests();

    await this.runE2ETests();

    utils.log(`slp-sdk tests complete.`)
    utils.log(` `)
  }

  // Install the SLP-SDK repository.
  installSlpSdk() {
    try {
      utils.clearUutDir();

      shell.cd(`${__dirname}`); // Ensure the function is on a known directory path

      shell.cd(`${__dirname}/../uut`);
      shell.exec(`git clone https://github.com/Bitcoin-com/slp-sdk`);

      shell.cd(`slp-sdk`);
      shell.exec(`git checkout ct-e2e`)

      shell.exec(`yarn install > ${__dirname}/../html/logs/slp-sdk/install.txt`);
    } catch (err) {
      console.log(`Error in installSlpSdk(): `, err);
    }
  }

  // Unit Tests
  runUnitTests() {
    return new Promise((resolve, reject) => {
      try {
        shell.cd(`${__dirname}`); // Ensure the function is on a known directory path
        shell.cd(`${__dirname}/../uut/slp-sdk`);

        const execStr = `npm run test > ${__dirname}/../html/logs/slp-sdk/unit-test.txt`;
        shell.exec(execStr, async function(code, stdout, stderr) {
          // A unit test failed.
          if (code !== 0) {
            utils.log(`SLP-SDK unit tests FAILED.`);

            await slack.send(
              `SLP-SDK unit test failed. Details here: ${
                config.bvtServer
              }/slp-sdk/unit-tests.html`
            );
            // All unit tests succeeded.
          } else {
            utils.log(`SLP-SDK unit tests completed successfully.`);
          }

          resolve();
        });
      } catch (err) {
        console.log(`Error in slp-sdk.js/runUnitTests(): `, err);
        reject(err);
      }
    });
  }

  // Integration Tests
  async runIntegrationTests() {
    return new Promise((resolve, reject) => {
      try {
        shell.cd(`${__dirname}`); // Ensure the function is on a known directory path
        shell.cd(`${__dirname}/../uut/slp-sdk`);

        const execStr = `npm run test:integration > ${__dirname}/../html/logs/slp-sdk/integration-test.txt`;

        shell.exec(execStr, async function(code, stdout, stderr) {
          if (code !== 0) {
            utils.log(`SLP-SDK integration tests FAILED.`);

            await slack.send(
              `SLP-SDK integration test failed. Details here: ${
                config.bvtServer
              }/slp-sdk/integration-tests.html`
            );

            // All integration tests succeeded.
          } else {
            utils.log(`SLP-SDK integration tests completed successfully.`);
          }

          resolve();
        });
      } catch (err) {
        console.log(`Error in slp-sdk.js/runIntegrationTests(): `, err);
        reject(err);
      }
    });
  }

  // End-to-End Tests
  async runE2ETests() {
    return new Promise((resolve, reject) => {
      try {
        shell.cd(`${__dirname}`); // Ensure the function is on a known directory path
        shell.cd(`${__dirname}/../uut/slp-sdk`);

        // Copy the wallet files needed to run the e2e tests.
        shell.cp(`${__dirname}/../private/wallet*.json`, `${__dirname}/../uut/slp-sdk/test/e2e/`)

        const execStr = `npm run test:e2e > ${__dirname}/../html/logs/slp-sdk/e2e-test.txt`;

        shell.exec(execStr, async function(code, stdout, stderr) {
          if (code !== 0) {
            utils.log(`SLP-SDK e2e tests FAILED.`);

            await slack.send(
              `SLP-SDK e2e test failed. Details here: ${
                config.bvtServer
              }/slp-sdk/e2e-tests.html`
            );

            // All integration tests succeeded.
          } else {
            utils.log(`SLP-SDK e2e tests completed successfully.`);
          }

          resolve();
        });
      } catch (err) {
        console.log(`Error in slp-sdk.js/runE2ETests(): `, err);
        reject(err);
      }
    });
  }
}

module.exports = RestTests;

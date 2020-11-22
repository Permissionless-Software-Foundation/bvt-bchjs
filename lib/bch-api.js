/*
  Functions used to run tests on rest.bitcoin.com repo.
*/

"use strict";

const shell = require("shelljs");
const telegram = require('./telegram')
const utils = require("./util");
const config = require("../config");

class RestTests {
  constructor() {

  }

  // Parent function called by the BVT.
  async runTests() {
    this.installBchApi();
    utils.log(`bch-api dependencies installed.`)

    await this.runUnitTests();

    await this.runAbcIntegrationTests();

    await this.runBchnIntegrationTests();

    utils.log(`bch-api tests complete.`)
    utils.log(` `)
  }

  // Install the rest.bitcoin.com repository.
  installBchApi() {
    shell.cd(`${__dirname}/../uut`);
    shell.exec(`git clone https://github.com/Permissionless-Software-Foundation/bch-api`);
    shell.cd(`bch-api`);
    shell.exec(`npm install > ${__dirname}/../html/logs/bch-api/install.txt`);
  }

  // Unit Tests
  runUnitTests() {
    return new Promise((resolve, reject) => {
      shell.cd(`${__dirname}/../uut/bch-api`);

      const execStr = `npm run test > ${__dirname}/../html/logs/bch-api/unit-test.txt`;
      shell.exec(execStr, async function(code, stdout, stderr) {
        // A unit test failed.
        if (code !== 0) {
          utils.log(`bch-api unit tests: FAILED`);

          await telegram.send(
            `bch-api unit test failed. Details here: ${
              config.bvtServer
            }/bch-api/unit-tests.html`
          );
          // All unit tests succeeded.
        } else {
          utils.log(`bch-api unit tests: OK`);
        }

        resolve();
      });
    });
  }

  // ABC Integration Tests
  async runAbcIntegrationTests() {
    return new Promise((resolve, reject) => {
      shell.cd(`${__dirname}/../uut/bch-api`);
      shell.cp(`${__dirname}/../private/test-abc-infra.sh`, `.`);

      const execStr = `./test-abc-infra.sh > ${__dirname}/../html/logs/bch-api/abc-integration-test.txt`;

      shell.exec(execStr, async function(code, stdout, stderr) {
        if (code !== 0) {
          utils.log(`bch-api ABC integration tests: FAILED`);

          await telegram.send(
            `bch-api ABC integration test failed. Details here: ${
              config.bvtServer
            }/bch-api/abc-integration-tests.html`
          );

          // All integration tests succeeded.
        } else {
          utils.log(`bch-api ABC integration tests: OK`);
        }

        resolve();
      });
    });
  }

  // BCHN Integration Tests
  async runBchnIntegrationTests() {
    return new Promise((resolve, reject) => {
      shell.cd(`${__dirname}/../uut/bch-api`);
      shell.cp(`${__dirname}/../private/test-bchn-infra.sh`, `.`);

      const execStr = `./test-bchn-infra.sh > ${__dirname}/../html/logs/bch-api/bchn-integration-test.txt`;

      shell.exec(execStr, async function(code, stdout, stderr) {
        if (code !== 0) {
          utils.log(`bch-api Bchn integration tests: FAILED`);

          await telegram.send(
            `bch-api BCHN integration test failed. Details here: ${
              config.bvtServer
            }/bch-api/bchn-integration-tests.html`
          );

          // All integration tests succeeded.
        } else {
          utils.log(`bch-api BCHN integration tests: OK`);
        }

        resolve();
      });
    });
  }

}

module.exports = RestTests

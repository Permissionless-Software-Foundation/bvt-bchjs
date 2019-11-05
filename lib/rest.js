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
    this.installRest();
    utils.log(`bch-api dependencies installed.`)

    await this.runUnitTests();

    await this.runIntegrationTests();

    utils.log(`bch-api tests complete.`)
    utils.log(` `)
  }

  // Install the rest.bitcoin.com repository.
  installRest() {
    shell.cd(`${__dirname}/../uut`);
    shell.exec(`git clone https://github.com/christroutner/bch-api`);
    shell.cd(`bch-api`);
    shell.exec(`npm install > ${__dirname}/../html/logs/rest/install.txt`);
  }

  // Unit Tests
  runUnitTests() {
    return new Promise((resolve, reject) => {
      shell.cd(`${__dirname}/../uut/bch-api`);

      const execStr = `npm run test > ${__dirname}/../html/logs/rest/unit-test.txt`;
      shell.exec(execStr, async function(code, stdout, stderr) {
        // A unit test failed.
        if (code !== 0) {
          utils.log(`bch-api unit tests FAILED.`);

          await telegram.send(
            `bch-api unit test failed. Details here: ${
              config.bvtServer
            }/rest/rest-unit-tests.html`
          );
          // All unit tests succeeded.
        } else {
          utils.log(`bch-api unit tests completed successfully.`);
        }

        resolve();
      });
    });
  }

  // Integration Tests
  async runIntegrationTests() {
    return new Promise((resolve, reject) => {
      shell.cd(`${__dirname}/../uut/bch-api`);
      shell.cp(`${__dirname}/../private/test-remote-server.sh`, `.`);

      const execStr = `./test-remote-server.sh > ${__dirname}/../html/logs/rest/integration-test.txt`;

      shell.exec(execStr, async function(code, stdout, stderr) {
        if (code !== 0) {
          utils.log(`bch-api integration tests FAILED.`);

          await telegram.send(
            `bch-api integration test failed. Details here: ${
              config.bvtServer
            }/rest/rest-integration-tests.html`
          );

          // All integration tests succeeded.
        } else {
          utils.log(`bch-api integration tests completed successfully.`);
        }

        resolve();
      });
    });
  }

}

module.exports = RestTests

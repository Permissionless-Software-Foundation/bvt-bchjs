/*
  Tests that check our live production infrastructure for liveness.
*/

"use strict";

const utils = require("./util");
const config = require("../config");
const shell = require("shelljs");

const BCHJS = require("@psf/bch-js");

let _this;

class LivenessTests {
  constructor() {
    this.bchjs = new BCHJS({
      restURL: config.restURL,
      apiToken: config.apiToken
    });

    _this = this;
  }

  async runTests() {
    try {
      await utils.log(` `);
      await utils.log(`Starting liveness tests...`);

      this.bchjs = new BCHJS({
        restURL: config.restURL,
        apiToken: config.apiToken
      });

      // Execute the different livenes tests.

      await this.mainnetFullNode();
      utils.log(`...mainnet full node is OK`)

      await this.mainnetBlockbook();
      utils.log(`...mainnet Blockbook API is OK`)

      await this.mainnetElectrumx();
      utils.log(`...mainnet Electrumx API is OK`)

      await this.mainnetSLPDB()
      utils.log(`...mainnet SLPDB API is OK`)

      // Switch to testnet
      this.bchjs = new BCHJS({
        restURL: config.testnetUrl,
        apiToken: config.apiToken
      });

      await this.testnetFullNode()
      utils.log(`...testnet full node is OK`)

      await this.testnetBlockbook();
      utils.log(`...testnet Blockbook API is OK`)

      await this.testnetElectrumx();
      utils.log(`...testnet Electrumx API is OK`)

      await this.testnetSLPDB()
      utils.log(`...testnet SLPDB API is OK`)

      await utils.log(`Liveness tests complete.`);
      await utils.log(` `);
    } catch (err) {
      await utils.logAll(`Liveness tests FAILED`);
    }
  }

  // Log lines to the liveness log.
  log(str) {
    try {
      shell.cd(`${__dirname}`);
      shell.exec(`echo "${str}" >> ${__dirname}/../html/logs/liveness.txt`);
    } catch (err) {
      console.log(`Error in liveness.js/log(): `, err);
    }
  }

  // Test that mainnet full node is up and running.
  async mainnetFullNode() {
    try {
      const nodeInfo = await this.bchjs.Control.getNetworkInfo();
      this.log(`Mainnet Full Node is OK.`);
    } catch (err) {
      this.log(`Mainnet Full Node is DOWN.`);
      utils.logAll(`Mainnet Full Node is DOWN`);
      console.log(`Error in liveness.js/mainnetFullNode(): `, err);
    }
  }

  // Test that mainnet Blockbook API is up and running.
  async mainnetBlockbook() {
    try {

      const details = await this.bchjs.Blockbook.balance('bitcoincash:qzt4wy4lkjzwxammh6aq93ucwx023nhkyual03gamw')
      //console.log(`details: ${JSON.stringify(details,null,2)}`)
      this.log(`Mainnet Blockbook API is OK.`)

    } catch(err) {
      this.log(`Mainnet Blockbook API is DOWN.`)
      utils.logAll(`Mainnet Blockbook API is DOWN`)
      console.log(`Error in liveness.js/mainnetBlockbook(): `, err)
    }
  }

  // Test that mainnet Electrumx API is up and running.
  async mainnetElectrumx() {
    try {

      const details = await this.bchjs.Electrumx.balance('bitcoincash:qzt4wy4lkjzwxammh6aq93ucwx023nhkyual03gamw')
      //console.log(`details: ${JSON.stringify(details,null,2)}`)
      this.log(`Mainnet Electrumx API is OK.`)

    } catch(err) {
      this.log(`Mainnet Electrumx API is DOWN.`)
      utils.logAll(`Mainnet Electrumx API is DOWN`)
      console.log(`Error in liveness.js/mainnetElectrumx(): `, err)
    }
  }

  // Test that mainnet Electrumx API is up and running.
  async mainnetSLPDB() {
    try {
      const addr = 'simpleledger:qz9tzs6d5097ejpg279rg0rnlhz546q4fsnck9wh5m'

      const details = await this.bchjs.SLP.Utils.balancesForAddress(addr)
      // console.log(`details: ${JSON.stringify(details,null,2)}`)
      this.log(`Mainnet SLPDB API is OK.`)

    } catch(err) {
      this.log(`Mainnet SLPDB API is DOWN.`)
      await utils.logAll(`Mainnet SLPDB API is DOWN`)
      console.log(`Error in liveness.js/mainnetSLPDB(): `, err)
    }
  }

  // Test that mainnet full node is up and running.
  async testnetFullNode() {
    try {
      const nodeInfo = await this.bchjs.Control.getNetworkInfo();
      // console.log(`nodeInfo: ${JSON.stringify(nodeInfo,null,2)}`)
      this.log(`Testnet Full Node is OK.`)

    } catch(err) {
      this.log(`Testnet Full Node is DOWN.`)
      utils.logAll(`Testnet Full Node is DOWN`)
      console.log(`Error in liveness.js/testnetFullNode(): `, err)
    }
  }

  // Test that mainnet Blockbook API is up and running.
  async testnetBlockbook() {
    try {

      const addr = 'bchtest:qqnjfxwqt2a4sfmmlg5xlnp5ywaz3ke3ku9e0kd9fy'

      const details = await this.bchjs.Blockbook.balance(addr)
      // console.log(`details: ${JSON.stringify(details,null,2)}`)
      this.log(`Testnet Blockbook API is OK.`)

    } catch(err) {
      this.log(`Testnet Blockbook API is DOWN.`)
      utils.logAll(`Testnet Blockbook API is DOWN`)
      console.log(`Error in liveness.js/TestnetBlockbook(): `, err)
    }
  }

  // Test that testnet Electrumx API is up and running.
  async testnetElectrumx() {
    try {

      const addr = 'bchtest:qqnjfxwqt2a4sfmmlg5xlnp5ywaz3ke3ku9e0kd9fy'

      const details = await this.bchjs.Electrumx.balance(addr)
      //console.log(`details: ${JSON.stringify(details,null,2)}`)
      this.log(`Testnet Electrumx API is OK.`)

    } catch(err) {
      this.log(`Testnet Electrumx API is DOWN.`)
      utils.logAll(`Testnet Electrumx API is DOWN`)
      console.log(`Error in liveness.js/testnetElectrumx(): `, err)
    }
  }

  // Test that mainnet Electrumx API is up and running.
  async testnetSLPDB() {
    try {
      const addr = 'slptest:qz35h5mfa8w2pqma2jq06lp7dnv5fxkp2shlcycvd5'

      const details = await this.bchjs.SLP.Utils.balancesForAddress(addr)
      // console.log(`details: ${JSON.stringify(details,null,2)}`)
      this.log(`Testnet SLPDB API is OK.`)

    } catch(err) {
      this.log(`Testnet SLPDB API is DOWN.`)
      utils.logAll(`Testnet SLPDB API is DOWN`)
      console.log(`Error in liveness.js/testnetSLPDB(): `, err)
    }
  }

}

module.exports = LivenessTests;

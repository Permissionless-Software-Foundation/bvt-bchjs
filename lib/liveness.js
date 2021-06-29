/*
  Tests that check our live production infrastructure for liveness.
*/

"use strict";

const utils = require("./util");
const config = require("../config");
const shell = require("shelljs");

const BCHJS = require("@psf/bch-js");

let _this;

const SERVERS = [
  { serverUrl: "https://abc.fullstack.cash/v5/", testnet: false },
  { serverUrl: "https://bchn.fullstack.cash/v5/", testnet: false },
  { serverUrl: "https://testnet3.fullstack.cash/v5/", testnet: true }
];

class LivenessTests {
  constructor() {
    // this.bchjs = new BCHJS({
    //   restURL: config.restURL,
    //   apiToken: config.apiToken
    // });

    _this = this;
  }

  async runTests() {
    try {
      await utils.log(` `);
      await utils.log(`Starting liveness tests...`);

      for (let i = 0; i < SERVERS.length; i++) {
        const server = SERVERS[i].serverUrl;
        const isTestnet = SERVERS[i].testnet;

        const bchjs = new BCHJS({
          restURL: server,
          apiToken: config.apiToken
        });

        // Full Node
        await this.livenessFullNode(bchjs);

        // Select address for testing indexers.
        let addr = "bitcoincash:qzt4wy4lkjzwxammh6aq93ucwx023nhkyual03gamw";
        if (isTestnet)
          addr = "bchtest:qqnjfxwqt2a4sfmmlg5xlnp5ywaz3ke3ku9e0kd9fy";

        // Electrumx / Fulcrum
        await this.livenessElectrumx(bchjs, addr);

        // Select address for testing indexers.
        addr = "simpleledger:qz9tzs6d5097ejpg279rg0rnlhz546q4fsnck9wh5m";
        if (isTestnet)
          addr = "slptest:qz35h5mfa8w2pqma2jq06lp7dnv5fxkp2shlcycvd5";

        await this.livenessSlpdb(bchjs, addr);

        // Check SLPDB health status
        await this.slpdbHealth(bchjs);

        utils.log(" ");
      }

      await utils.log(`Liveness tests complete.`);
      await utils.log(` `);
    } catch (err) {
      await utils.logAll(`Liveness tests FAILED`);
    }
  }

  // Log lines to the liveness log.
  // Note: The tests in this file mostly use the utils.log() function, not this one.
  log(str) {
    try {
      shell.cd(`${__dirname}`);
      shell.exec(`echo "${str}" >> ${__dirname}/../html/logs/liveness.txt`);
      console.log(str);
    } catch (err) {
      console.log(`Error in liveness.js/log(): `, err);
    }
  }

  // Test that mainnet full node is up and running.
  async livenessFullNode(bchjs) {
    try {
      const nodeInfo = await bchjs.Control.getNetworkInfo();

      utils.log(`Full Node connected to ${bchjs.restURL} is OK.`);
    } catch (err) {
      // this.log(`Full Node connected to ${bchjs.restURL} is DOWN.`);
      utils.logAll(`Full Node connected to ${bchjs.restURL} is DOWN`);

      console.log(`Error in liveness.js/livenessFullNode(): `, err);
    }
  }

  // Test that mainnet Electrumx API is up and running.
  async livenessElectrumx(bchjs, addr) {
    try {
      const details = await bchjs.Electrumx.balance(addr);

      utils.log(`Fulcrum server connected to ${bchjs.restURL} is OK.`);
    } catch (err) {
      // this.log(`Fulcrum server connected to ${bchjs.restURL} is DOWN.`);
      utils.logAll(`Fulcrum server connected to ${bchjs.restURL}is DOWN`);
      console.error(`Error in liveness.js/livenessElectrumx(): `, err);
    }
  }

  // Test that mainnet Electrumx API is up and running.
  async livenessSlpdb(bchjs, addr) {
    try {
      const details = await bchjs.SLP.Utils.balancesForAddress(addr);
      // console.log(`details: ${JSON.stringify(details,null,2)}`)

      utils.log(`SLPDB server connected to ${bchjs.restURL} is OK.`);
    } catch (err) {
      utils.logAll(`SLPDB server connected to ${bchjs.restURL}is DOWN`);

      console.error(`Error in liveness.js/livenessSlpdb(): `, err);
    }
  }

  async slpdbHealth(bchjs) {
    try {
      const blockHeight = await bchjs.Blockchain.getBlockCount();
      // console.log(`blockHeight: ${JSON.stringify(blockHeight, null, 2)}`);

      const slpdbStatus = await bchjs.SLP.Utils.getStatus();
      // console.log(`slpdbStatus: ${JSON.stringify(slpdbStatus, null, 2)}`);

      const slpdbBchBlockHeight = slpdbStatus.bchBlockHeight;
      const slpdbProcessedBlockHeight = slpdbStatus.slpProcessedBlockHeight;

      if (slpdbBchBlockHeight !== blockHeight) {
        utils.logAll(
          `Warning: SLPDB may have fallen behind. Current block height: ${blockHeight}, SLPDB block height: ${slpdbBchBlockHeight}`
        );
        return;
      }

      if (
        slpdbProcessedBlockHeight !== null &&
        slpdbProcessedBlockHeight !== blockHeight
      ) {
        utils.logAll(
          `Warning: SLPDB may have fallen behind. Current block height: ${blockHeight}, SLPDB *processed* block height: ${slpdbProcessedBlockHeight}`
        );
        return;
      }

      utils.log(
        `SLPDB connected to ${bchjs.restURL} is synced to the current block height of ${blockHeight}`
      );
    } catch (err) {
      console.error(`Error in liveness.js/slpdbHealth(): `, err);
    }
  }

  // Test that mainnet Blockbook API is up and running.
  async livenessBlockbook(bchjs, addr) {
    try {
      const details = await this.bchjs.Blockbook.balance(
        "bitcoincash:qzt4wy4lkjzwxammh6aq93ucwx023nhkyual03gamw"
      );
      //console.log(`details: ${JSON.stringify(details,null,2)}`)
      this.log(`Mainnet Blockbook API is OK.`);
    } catch (err) {
      this.log(`Mainnet Blockbook API is DOWN.`);
      utils.logAll(`Mainnet Blockbook API is DOWN`);
      console.log(`Error in liveness.js/mainnetBlockbook(): `, err);
    }
  }
}

module.exports = LivenessTests;

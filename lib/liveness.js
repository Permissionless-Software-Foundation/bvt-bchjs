/*
  Tests that check our live production infrastructure for liveness.
*/

"use strict";

const utils = require("./util");
const config = require("../config");
const shell = require("shelljs");

const BCHJS = require("@chris.troutner/bch-js");

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

      // Execute the different livenes tests.

      await this.mainnetFullNode();
      utils.log(`...mainnet full node is OK`)

      await this.mainnetBlockbook();
      utils.log(`...mainnet Blockbook API is OK`)

      // await this.testnetInsight()
      // await this.testnetFullNode()

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

  // Test that mainnet Insight API is up and running.
  // async mainnetInsight() {
  //   try {
  //     const bitbox = new BITBOX()
  //
  //     const details = await bitbox.Address.details('bitcoincash:qzt4wy4lkjzwxammh6aq93ucwx023nhkyual03gamw')
  //     //console.log(`details: ${JSON.stringify(details,null,2)}`)
  //     this.log(`Mainnet Insight API is OK.`)
  //
  //   } catch(err) {
  //     this.log(`Mainnet Inight API is DOWN.`)
  //     utils.logAll(`Mainnet Insight API is DOWN`)
  //     console.log(`Error in liveness.js/mainnetInsight(): `, err)
  //   }
  // }

  // Test that mainnet Insight API is up and running.
  // async testnetInsight() {
  //   try {
  //     const bitbox = new BITBOX({restURL: 'https://trest.bitcoin.com/v2/'})
  //
  //     const details = await bitbox.Address.details('bchtest:qqmd9unmhkpx4pkmr6fkrr8rm6y77vckjvqe8aey35')
  //     //console.log(`details: ${JSON.stringify(details,null,2)}`)
  //     this.log(`Testnet Insight API is OK.`)
  //
  //   } catch(err) {
  //     this.log(`Testnet Inight API is DOWN.`)
  //     utils.logAll(`Testnet Insight API is DOWN`)
  //     console.log(`Error in liveness.js/testnetInsight(): `, err)
  //   }
  // }

  // Test that mainnet full node is up and running.
  // async testnetFullNode() {
  //   try {
  //     const bitbox = new BITBOX({restURL: 'https://trest.bitcoin.com/v2/'})
  //
  //     const blockhash = await bitbox.Blockchain.getBestBlockHash()
  //     //console.log(`blockhash: ${JSON.stringify(blockhash,null,2)}`)
  //     this.log(`Testnet Full Node is OK.`)
  //
  //   } catch(err) {
  //     this.log(`Testnet Full Node is DOWN.`)
  //     utils.logAll(`Testnet Full Node is DOWN`)
  //     console.log(`Error in liveness.js/testnetFullNode(): `, err)
  //   }
  // }
}

module.exports = LivenessTests;

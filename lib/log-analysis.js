/*
  Functions used to download and analyize logs.

  This library assumes that the fullstack-logs repository is installed and setup
  in the same directory as the bvt-bchjs repository.
*/

const shell = require("shelljs");
const fs = require("fs");

const config = require("../config");
const utils = require("./util");

class AnalyizeLogs {
  constructor() {}

  // Parent function called by the BVT.
  async runTests() {
    utils.log(`Start log analysis`);

    const success = await this.downloadLogs();
    if (!success) {
      console.log(`Issue with download logs. Exiting`);
      return;
    }

    await this.usageReport();

    await this.endpointReport();

    await this.errorReport();

    utils.log(`log analysis complete.`);
    utils.log(` `);
  }

  async downloadLogs() {
    shell.cd(`${__dirname}`); // Ensure the function is on a known directory path

    // Change to the fullstack-logs dir.
    shell.cd(`${__dirname}/../../fullstack-logs/`);

    // Exit if the fullstack-logs dir is not available.
    try {
      const info = shell.exec(`pwd`);
      // console.log(`info: ${info}`)
      if (info.indexOf(`fullstack-logs`) === -1)
        throw new Error(`fullstack-logs directory is not available.`);
    } catch (err) {
      return false;
    }

    shell.exec(`./process-logs.sh`)

    return true;
  }

  // Computes high-level analytics about the usage of the API.
  async usageReport() {
    // shell.exec(`pwd`)

    shell.exec(
      `echo "High Level Summary" > ${__dirname}/../html/logs/fullstack-analytics/fullstack-analytics.txt`
    );
    shell.exec(
      `./bin/run usage-report >> ${__dirname}/../html/logs/fullstack-analytics/fullstack-analytics.txt`
    );

    // Post the high-level summary to Slack.
    const data = await this.readFile(
      `${__dirname}/../html/logs/fullstack-analytics/fullstack-analytics.txt`
    );
    await utils.logAll(data);
  }

  // Promise based read-file
  readFile(path, opts = "utf8") {
    return new Promise((resolve, reject) => {
      fs.readFile(path, opts, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  // Generates a summary of the most popular endpoints.
  async endpointReport() {
    // console.log(`Entering endpointReprot()`)

    // Change to the fullstack-logs dir.
    shell.cd(`${__dirname}/../../fullstack-logs/`);

    // shell.exec(`pwd`)

    shell.exec(
      `echo " " >> ${__dirname}/../html/logs/fullstack-analytics/fullstack-analytics.txt`
    );
    shell.exec(
      `echo "Endpoint Report:" >> ${__dirname}/../html/logs/fullstack-analytics/fullstack-analytics.txt`
    );
    shell.exec(
      `./bin/run endpoint-report >> ${__dirname}/../html/logs/fullstack-analytics/fullstack-analytics.txt`
    );

    // console.log(`Exiting endpointReprot()`)
  }

  // Generates a summary of the most popular errors.
  async errorReport() {
    shell.exec(
      `echo " " >> ${__dirname}/../html/logs/fullstack-analytics/fullstack-analytics.txt`
    );
    shell.exec(
      `./bin/run error-report >> ${__dirname}/../html/logs/fullstack-analytics/fullstack-analytics.txt`
    );
  }
}

module.exports = AnalyizeLogs

/*
  Functions used to download and analyize logs.

  This library assumes that the fullstack-logs repository is installed and setup
  in the same directory as the bvt-bchjs repository.
*/

const shell = require('shelljs')
const fs = require('fs')

// const config = require('../config')
const utils = require('./util')

class AnalyizeLogs {
  // Parent function called by the BVT.
  async runTests () {
    const success = await this.downloadLogs()
    if (!success) {
      console.log('Issue with download logs. Exiting')
      return
    }

    await this.usageReport()

    await this.endpointReport()

    await this.errorReport()

    // utils.log(`log analysis complete.`);
    utils.log(' ')
  }

  async downloadLogs () {
    shell.cd(`${__dirname.toString()}`) // Ensure the function is on a known directory path

    // Change to the fullstack-logs dir.
    shell.cd(`${__dirname.toString()}/../../abc-logs/`)

    // Exit if the fullstack-logs dir is not available.
    try {
      const info = shell.exec('pwd')
      // console.log(`info: ${info}`)
      if (info.indexOf('abc-logs') === -1) { throw new Error('abc-logs directory is not available.') }
    } catch (err) {
      return false
    }

    shell.exec('./process-logs.sh')

    return true
  }

  // Computes high-level analytics about the usage of the API.
  async usageReport () {
    // shell.exec(`pwd`)

    shell.exec(
      `echo "High Level Summary" > ${__dirname.toString()}/../html/logs/fullstack-analytics/abc-analytics.txt`
    )
    shell.exec(
      `./bin/run usage-report >> ${__dirname.toString()}/../html/logs/fullstack-analytics/abc-analytics.txt`
    )

    // Post the high-level summary to Slack.
    const data = await this.readFile(
      `${__dirname.toString()}/../html/logs/fullstack-analytics/abc-analytics.txt`
    )
    await utils.logAll('abc.fullstack.cash Analytics:')
    await utils.logAll(data)
  }

  // Promise based read-file
  readFile (path, opts = 'utf8') {
    return new Promise((resolve, reject) => {
      fs.readFile(path, opts, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
  }

  // Generates a summary of the most popular endpoints.
  async endpointReport () {
    // console.log(`Entering endpointReprot()`)

    // Change to the fullstack-logs dir.
    shell.cd(`${__dirname.toString()}/../../abc-logs/`)

    // shell.exec(`pwd`)

    shell.exec(
      `echo " " >> ${__dirname.toString()}/../html/logs/fullstack-analytics/abc-analytics.txt`
    )
    shell.exec(
      `echo "Endpoint Report:" >> ${__dirname.toString()}/../html/logs/fullstack-analytics/abc-analytics.txt`
    )
    shell.exec(
      `./bin/run endpoint-report >> ${__dirname.toString()}/../html/logs/fullstack-analytics/abc-analytics.txt`
    )

    // console.log(`Exiting endpointReprot()`)
  }

  // Generates a summary of the most popular errors.
  async errorReport () {
    shell.exec(
      `echo " " >> ${__dirname.toString()}/../html/logs/fullstack-analytics/abc-analytics.txt`
    )
    shell.exec(
      `./bin/run error-report >> ${__dirname.toString()}/../html/logs/fullstack-analytics/abc-analytics.txt`
    )
  }
}

module.exports = AnalyizeLogs

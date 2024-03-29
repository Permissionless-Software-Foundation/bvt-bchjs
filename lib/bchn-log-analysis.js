/*
  Free bchn log analysis
*/

const shell = require('shelljs')
const fs = require('fs')

// const config = require('../config')
const utils = require('./util')

class AnalyizeLogs {
  // constructor () {}

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

    await this.responseReport()

    await this.jwtReport()

    await this.rateLimitReport()

    // utils.log(`log analysis complete.`);
    utils.log(' ')
  }

  async downloadLogs () {
    console.log('Entering downloadLogs()')

    console.log(`__dirname.toString(): ${__dirname.toString()}`)
    shell.cd(`${__dirname.toString()}`) // Ensure the function is on a known directory path

    // Change to the free-bchn-logs dir.
    shell.cd(`${__dirname.toString()}/../../bchn-logs/`)
    // shell.cd(`${__dirname.toString()}/../../../../personal/free-bchn-logs/`)

    // Exit if the free-bchn-logss dir is not available.
    try {
      const info = shell.exec('pwd')
      // console.log(`info: ${info}`)
      if (info.indexOf('bchn-logs') === -1) { throw new Error('bchn-logs directory is not available.') }
    } catch (err) {
      return false
    }

    shell.exec('./process-logs.sh')

    return true
  }

  // Computes high-level analytics about the usage of the API.
  async usageReport () {
    console.log('\nEntering usageReport()')
    // shell.exec(`pwd`)

    shell.exec(
      `echo "High Level Summary" > ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
    shell.exec(
      `./bin/run usage-report >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )

    // Post the high-level summary to Slack.
    const data = await this.readFile(
      `${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )

    await utils.logAll('bchn.fullstack.cash Analytics:')
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
    console.log('Entering endpointReport()')

    // Change to the free-bchn-logs dir.
    shell.cd(`${__dirname.toString()}/../../bchn-logs/`)
    // shell.cd(`${__dirname.toString()}/../../../../personal/free-bchn-logs/`)

    // shell.exec(`pwd`)

    shell.exec(
      `echo " " >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
    shell.exec(
      `echo "Endpoint Report:" >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
    shell.exec(
      `./bin/run endpoint-report >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )

    // console.log(`Exiting endpointReprot()`)
  }

  // Generates a summary of the HTTP responses
  async responseReport () {
    console.log('\nEntering responseReport()')

    // Change to the free-bchn-logs dir.
    shell.cd(`${__dirname.toString()}/../../bchn-logs/`)
    // shell.cd(`${__dirname.toString()}/../../../../personal/free-bchn-logs/`)

    // shell.exec(`pwd`)

    shell.exec(
      `echo " " >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
    shell.exec(
      `echo "Response Report:" >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
    shell.exec(
      `./bin/run response-report >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
  }

  // Generates a summary of the requests that pass a JWT token.
  async jwtReport () {
    console.log('\nEntering jwtReport()')

    // Change to the free-bchn-logs dir.
    shell.cd(`${__dirname.toString()}/../../bchn-logs/`)
    // shell.cd(`${__dirname.toString()}/../../../../personal/free-bchn-logs/`)

    // shell.exec(`pwd`)

    shell.exec(
      `echo " " >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
    shell.exec(
      `echo "JWT Report:" >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
    shell.exec(
      `./bin/run jwt-report >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
  }

  // Generates a summary of rate limits applied to IP addresses
  async rateLimitReport () {
    console.log('\nEntering rateLimitReport()')

    // Change to the free-bchn-logs dir.
    shell.cd(`${__dirname.toString()}/../../bchn-logs/`)
    // shell.cd(`${__dirname.toString()}/../../../../personal/free-bchn-logs/`)

    // shell.exec(`pwd`)

    shell.exec(
      `echo " " >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
    shell.exec(
      `echo "Rate-Limit Report:" >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
    shell.exec(
      `./bin/run rate-limit-report | tail --lines=30 >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
  }

  // Generates a summary of the most popular errors.
  async errorReport () {
    console.log('\nEntering errorReport()')

    // Change to the free-bchn-logs dir.
    shell.cd(`${__dirname.toString()}/../../bchn-logs/`)
    // shell.cd(`${__dirname.toString()}/../../../../personal/free-bchn-logs/`)

    shell.exec(
      `echo " " >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
    shell.exec(
      `./bin/run error-report >> ${__dirname.toString()}/../html/logs/fullstack-analytics/bchn-analytics.txt`
    )
  }
}

module.exports = AnalyizeLogs

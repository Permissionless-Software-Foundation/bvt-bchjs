/*
  BVT = Build Verification Test
  A BVT ensures the units under test can build, successfully runs all classes
  of tests, and verifies that production servers are operating as expected.

  BVT tests the products in this order:
  - liveness
  - bch-api
  - bch-js

  BVT runs tests in this order:
  - unit
  - integration
  - e2e
*/

// Global libraries
import { inspect } from 'node:util'
import fs from 'node:fs'

// CONSTANTS
const LOG_FILE = './bvt.log'
const PERIOD = 60000 * 60 * 2 // 2 hrs
const GARBAGE_PERIOD = 60000 * 60 * 24 // 1 day

// Simple logger that writes to file and console
function bvtLog (...args) {
  const timestamp = new Date().toISOString()
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ')
  const line = `[${timestamp}] ${message}\n`
  // Write to file
  fs.appendFileSync(LOG_FILE, line)
  // Also log to console
  console.log(...args)
}

// Local libraries - import utils first
import utils from './lib/util.js'

// Patch utils.log BEFORE importing classes that use it
const originalUtilsLog = utils.log
utils.log = function (str) {
  // Write to bvt.log file
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${str}\n`
  fs.appendFileSync(LOG_FILE, line)
  // Call original
  originalUtilsLog(str)
}

// Now import classes that use utils.log
import Liveness from './lib/liveness.js'
import BchnLogAnalysis from './lib/bchn-log-analysis.js'
import BCHAPI from './lib/bch-api.js'
import BCHJS from './lib/bch-js.js'

// INSTANTIATE LOCAL LIBRARIES
const liveness = new Liveness()
const bchnLogAnalysis = new BchnLogAnalysis()
const bchapi = new BCHAPI()
const bchjs = new BCHJS()

// Used for debugging and interrogating JS objects.
inspect.defaultOptions = { depth: 1 }

// Have the BVT run all tests.
async function runTests () {
  try {
    // Clear log file at start of each run
    fs.writeFileSync(LOG_FILE, '')
    bvtLog('BVT run started')

    // Cleanup old data and prepare for a new run of tests.
    utils.clearUutDir()
    utils.clearLogs()
    bvtLog('Prepared BVT for new run.')

    // Initialize the logs.
    const startTime = new Date()
    bvtLog('BVT tests started...')

    // Run all liveness tests first.
    await liveness.runTests()

    // Run the suite of bch-js tests.
    // await bchjs.runTests()

    // Run the suite of rest tests.
    // await bchapi.runTests()

    bvtLog('\nStart log analysis.\n')

    // Download and analyze the logs from the BCHN server.
    await bchnLogAnalysis.runTests()

    // Signal the tests have completed.
    bvtLog('...BVT tests completed.')
    bvtLog('Results can be viewed at https://metrics.fullstack.cash/')

    // Signal when the next run will be
    const nextRun = new Date(startTime.getTime() + PERIOD)
    const nextRunStr = nextRun.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles'
    })
    bvtLog(`Next BVT run will be at ${nextRunStr}.`)
  } catch (err) {
    bvtLog('Error in runTests(): ', err)
  }
}

// Run the tests immediately, then schedule periodic runs
runTests()

// Periodically run the BVT every 2 hours
setInterval(function () {
  runTests()
}, PERIOD)

// Run garbage collection once per day, to delete any old logs.
setInterval(function () {
  utils.collectGarbage()
}, GARBAGE_PERIOD)

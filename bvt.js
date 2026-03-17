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

// Local libraries
import utils from './lib/util.js'
import Liveness from './lib/liveness.js'
import BchnLogAnalysis from './lib/bchn-log-analysis.js'
import BCHAPI from './lib/bch-api.js'
import BCHJS from './lib/bch-js.js'


// CONSTANTS
const PERIOD = 60000 * 60 * 2 // 2 hrs
// const PERIOD = 60000 * 60

const GARBAGE_PERIOD = 60000 * 60 * 24 // 1 day
// const GARBAGE_PERIOD = 60000 * 60 * 4 // 4 hours


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
    // Cleanup old data and prepare for a new run of tests.
    utils.clearUutDir()
    utils.clearLogs()
    utils.log('Prepared BVT for new run.')

    // Initialize the logs.
    const startTime = new Date()
    await utils.logAll('BVT tests started...')

    // Run all liveness tests first.
    await liveness.runTests()

    // Run the suite of bch-js tests.
    // await bchjs.runTests()

    // Run the suite of rest tests.
    // await bchapi.runTests()

    utils.log('\nStart log analysis.\n')

    // Download and analyze the logs from the BCHN server.
    await bchnLogAnalysis.runTests()

    // Signal the tests have completed.
    await utils.logAll('...BVT tests completed.')
    await utils.logAll(
      'Results can be viewed at https://metrics.fullstack.cash/'
    )

    // Signal when the next run will be
    const nextRun = new Date(startTime.getTime() + PERIOD)
    await utils.logAll(
      `Next BVT run will be at ${nextRun.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles'
      })}.`
    )
  } catch (err) {
    console.error('Error in runTests(): ', err)
    utils.log(`Error running BVT: ${err.message}`)
  }
}

// Periodically run the BVT
setInterval(function () {
  runTests()
}, PERIOD)

// Also run the tests immediately
runTests()

// Run garbage collection once per day, to delete any old logs.
setInterval(function () {
  utils.collectGarbage()
}, GARBAGE_PERIOD)


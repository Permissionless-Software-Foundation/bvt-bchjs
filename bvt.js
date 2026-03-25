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
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Local libraries - import utils first
import utils from './lib/util.js'

// Now import classes that use utils.log
import Liveness from './lib/liveness.js'
import BchnLogAnalysis from './lib/bchn-log-analysis.js'
import PsfToken from './lib/psf-token.js'
import Psffpp from './lib/psffpp.js'
// import BCHAPI from './lib/bch-api.js'
// import BCHJS from './lib/bch-js.js'

// CONSTANTS
const LOG_FILE = './bvt.log'
const PERIOD = 60000 * 60 * 2 // 2 hrs
const GARBAGE_PERIOD = 60000 * 60 * 24 // 1 day

// Same location as lib/bchn-log-analysis.js (sibling of this repo).
const PSF_BCH_API_LOGS_DIR = path.resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'psf-bch-api-logs'
)

// Assert that the psf-bch-api-logs directory exists.
function assertPsfBchApiLogsDirExists () {
  let st
  try {
    st = fs.statSync(PSF_BCH_API_LOGS_DIR)
  } catch {
    throw new Error(
      'BVT requires the psf-bch-api-logs directory. It was not found at:\n' +
        `  ${PSF_BCH_API_LOGS_DIR}\n\n` +
        'Create that directory as a sibling of this repository (same parent folder as ' +
        'the bvt-bchjs checkout), and add the log download scripts expected by BCHN ' +
        'analytics (e.g. download-noauth-logs.sh, download-x402-logs.sh).'
    )
  }
  if (!st.isDirectory()) {
    throw new Error(
      'BVT requires psf-bch-api-logs to be a directory. Path exists but is not a directory:\n' +
        `  ${PSF_BCH_API_LOGS_DIR}`
    )
  }
}

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

// INSTANTIATE LOCAL LIBRARIES
const liveness = new Liveness()
const bchnLogAnalysis = new BchnLogAnalysis()
const psfToken = new PsfToken()
const psffpp = new Psffpp()
// const bchapi = new BCHAPI()
// const bchjs = new BCHJS()

// Used for debugging and interrogating JS objects.
inspect.defaultOptions = { depth: 1 }

assertPsfBchApiLogsDirExists()

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
    // await liveness.runTests()

    // Run the suite of bch-js tests.
    // await bchjs.runTests()

    // Run the suite of rest tests.
    // await bchapi.runTests()

    bvtLog('\nStart log analysis.\n')

    // Download and analyze noauth logs from the BCHN server.
    bvtLog('Start BCHN analytics pass [noauth].')
    await bchnLogAnalysis.runTests({
      variant: 'noauth',
      downloadScript: 'download-noauth-logs.sh',
      outputSuffix: 'noauth'
    })

    // Download and analyze x402 logs from the BCHN server.
    bvtLog('Start BCHN analytics pass [x402].')
    await bchnLogAnalysis.runTests({
      variant: 'x402',
      downloadScript: 'download-x402-logs.sh',
      outputSuffix: 'x402'
    })

    // PSF token metrics.
    await psfToken.runTests()

    // PSFFPP metrics.
    await psffpp.runTests()

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

/*
  Get metrics about the PSF File Pinning Protocol (PSFFPP)
*/

/* global fetch */

import { mkdir } from 'node:fs/promises'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Level } from 'level'

import utils from './util.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PIN_DB_DIR = path.join(__dirname, '..', 'private', 'psffpp-pins')

const GET_PIN_INFO_URL = 'https://free-bch.fullstack.cash/ipfs/pins/1'

const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000
const SNAPSHOT_RETENTION_MS = 14 * 24 * 60 * 60 * 1000

function snapshotKey (ts) {
  return `snap:${String(ts).padStart(20, '0')}`
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function openWithRetry (db, { retries = 12, baseDelayMs = 250 } = {}) {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    try {
      await db.open()
      return
    } catch (err) {
      lastErr = err
      if (i === retries) break
      await sleep(baseDelayMs * 2 ** i)
    }
  }
  throw lastErr
}

class Psffpp {
  constructor () {
    this._db = null

    // Bind 'this' object to all methods.
    this.runTests = this.runTests.bind(this)
    this.fetchPinInfo = this.fetchPinInfo.bind(this)
    this.getPinInfo = this.getPinInfo.bind(this)
    this.getPinsAddedLast24Hours = this.getPinsAddedLast24Hours.bind(this)
  }

  async initPinDb () {
    if (this._db) return this._db
    await mkdir(PIN_DB_DIR, { recursive: true })
    this._db = new Level(PIN_DB_DIR, { valueEncoding: 'json' })
    // Avoid races/lock contention when immediately creating iterators.
    await openWithRetry(this._db)
    return this._db
  }

  async fetchPinInfo () {
    const res = await fetch(GET_PIN_INFO_URL, {
      method: 'GET'
    })

    if (!res.ok) {
      throw new Error(`getPinInfo HTTP ${res.status}`)
    }

    const data = await res.json()
    const total = data?.pins?.pagination?.totalItems
    if (typeof total !== 'number' || !Number.isFinite(total)) {
      throw new Error('getPinInfo: unexpected response shape (pins.pagination.totalItems)')
    }

    return data
  }

  async runTests () {
    // Always release file locks at end of a run.
    try {
      utils.log('\n\nStarting PSFFPP metrics...')

      const data = await this.getPinInfo()
      const pins = await this.getPinsAddedLast24Hours(data)

      if (pins.reason === 'no_snapshot_before_cutoff') {
        utils.log(
          'New pins in last 24h: n/a (no snapshot at or before window start yet; will report after history accumulates)'
        )
      } else {
        utils.log(`New pins in last 24h: ${pins.newPins}`)
      }

      utils.log('\n\n')
    } catch (err) {
      utils.log('PSFFPP metrics FAILED')
      utils.log(String(err?.stack ?? err))
    } finally {
      try {
        if (this._db) await this._db.close()
      } catch {}
      this._db = null
    }
  }

  async getPinInfo () {
    try {
      const data = await this.fetchPinInfo()

      const totalPins = data.pins.pagination.totalItems
      utils.log(`Total pins: ${totalPins}`)

      return data
    } catch (err) {
      utils.log('Error in psffpp.js/getPinInfo()')
      throw err
    }
  }

  /**
   * Compares cumulative total pin count to the newest stored snapshot at or before
   * (now - 24h). Cold start: no baseline => reason set, newPins null.
   * @param {object} [preloadedData] - Optional result of fetchPinInfo to skip a second fetch.
   */
  async getPinsAddedLast24Hours (preloadedData) {
    const data = preloadedData ?? (await this.fetchPinInfo())
    const db = await this.initPinDb()

    const currentPins = data.pins.pagination.totalItems
    const cutoff = Date.now() - TWENTY_FOUR_H_MS
    const cutoffKey = snapshotKey(cutoff)

    let baseline = null
    for await (const [, value] of db.iterator({
      lte: cutoffKey,
      reverse: true,
      limit: 1
    })) {
      baseline = value
    }

    let newPins = 0
    /** @type {string|null} */
    let reason = null
    if (!baseline) {
      reason = 'no_snapshot_before_cutoff'
    } else {
      const baselinePins = baseline.totalPins
      newPins = currentPins - baselinePins
      if (newPins < 0) {
        utils.log(
          'Warning in psffpp.js/getPinsAddedLast24Hours(): total pins decreased vs baseline; clamping 24h delta to 0'
        )
        newPins = 0
      }
    }

    const now = Date.now()
    await db.put(snapshotKey(now), {
      ts: now,
      totalPins: currentPins
    })

    const minKeepTs = now - SNAPSHOT_RETENTION_MS
    const deleteBeforeKey = snapshotKey(minKeepTs)
    // Don't mutate the DB while consuming an iterator from it.
    const keysToDelete = []
    for await (const [key] of db.iterator({ lt: deleteBeforeKey })) {
      keysToDelete.push(key)
    }
    for (const key of keysToDelete) {
      await db.del(key)
    }

    return {
      newPins: reason === null ? newPins : null,
      reason,
      windowStart: cutoff,
      baselineTs: baseline?.ts ?? null,
      currentTs: now,
      currentTotalPins: currentPins
    }
  }
}

export default Psffpp

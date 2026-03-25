/*
  This library is used to retrieve metrics about the PSF tokens and measure the
  token burn trend.
*/

/* global fetch */

import { mkdir } from 'node:fs/promises'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Level } from 'level'

import utils from './util.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BURN_DB_DIR = path.join(__dirname, '..', 'private', 'psf-token-burn')

const GET_TOKEN_DATA_URL = 'https://free-bch.fullstack.cash/bch/getTokenData'
const PSF_TOKEN_ID =
  '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0'

const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000
const SNAPSHOT_RETENTION_MS = 14 * 24 * 60 * 60 * 1000

function floor2 (n) {
  return Math.floor(Number(n) * 100) / 100
}

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

class PsfToken {
  constructor () {
    this._db = null

    // Bind 'this' object to all methods.
    this.runTests = this.runTests.bind(this)
    this.fetchTokenData = this.fetchTokenData.bind(this)
    this.getSlpIndexerData = this.getSlpIndexerData.bind(this)
    this.getBurnedLast24Hours = this.getBurnedLast24Hours.bind(this)
  }

  async initBurnDb () {
    if (this._db) return this._db
    await mkdir(BURN_DB_DIR, { recursive: true })
    this._db = new Level(BURN_DB_DIR, { valueEncoding: 'json' })
    // Avoid races/lock contention when immediately creating iterators.
    await openWithRetry(this._db)
    return this._db
  }

  async fetchTokenData () {
    const res = await fetch(GET_TOKEN_DATA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenId: PSF_TOKEN_ID,
        withTxHistory: false
      })
    })

    if (!res.ok) {
      throw new Error(`getTokenData HTTP ${res.status}`)
    }

    const data = await res.json()
    if (!data?.tokenData?.genesisData) {
      throw new Error('getTokenData: unexpected response shape')
    }

    return data
  }

  async runTests () {
    // Always release file locks at end of a run.
    try {
      utils.log('\n\nStarting PSF token metrics...')

      const data = await this.getSlpIndexerData()
      const burn = await this.getBurnedLast24Hours(data)

      if (burn.reason === 'no_snapshot_before_cutoff') {
        utils.log(
          'PSF burned in last 24h: n/a (no snapshot at or before window start yet; will report after history accumulates)'
        )
      } else {
        utils.log(`PSF burned in last 24h: ${burn.burnedTokensFloor2}`)
      }

      utils.log('\n\n')
    } catch (err) {
      utils.log('PSF token metrics FAILED')
      utils.log(String(err?.stack ?? err))
    } finally {
      try {
        if (this._db) await this._db.close()
      } catch {}
      this._db = null
    }
  }

  async getSlpIndexerData () {
    try {
      const data = await this.fetchTokenData()

      let maxTokensInCirculation = parseInt(
        data.tokenData.genesisData.tokensInCirculationStr,
        10
      )
      maxTokensInCirculation = maxTokensInCirculation / 10 ** 8
      utils.log(`All PSF tokens ever minted: ${floor2(maxTokensInCirculation)}`)

      let totalBurned = parseInt(data.tokenData.genesisData.totalBurned, 10)
      totalBurned = totalBurned / 10 ** 8
      utils.log(`Total burned: ${floor2(totalBurned)}`)

      const tokensInCirculation = maxTokensInCirculation - totalBurned
      utils.log(`Tokens in circulation: ${floor2(tokensInCirculation)}`)

      return data
    } catch (err) {
      utils.log('Error in psf-token.js/getSlpIndexerData()')
      throw err
    }
  }

  /**
   * Compares cumulative totalBurned from the API to the newest stored snapshot
   * at or before (now - 24h). Cold start: no baseline => reason set, burned null.
   * @param {object} [preloadedData] - Optional result of getTokenData to skip a second fetch.
   */
  async getBurnedLast24Hours (preloadedData) {
    const data = preloadedData ?? (await this.fetchTokenData())
    const db = await this.initBurnDb()

    const currentBurned = BigInt(data.tokenData.genesisData.totalBurned)
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

    let burnedBaseUnits = 0n
    /** @type {string|null} */
    let reason = null
    if (!baseline) {
      // No snapshot old enough to bound the 24h window.
      reason = 'no_snapshot_before_cutoff'
    } else {
      const baselineBurned = BigInt(baseline.totalBurned)
      burnedBaseUnits = currentBurned - baselineBurned
      if (burnedBaseUnits < 0n) {
        utils.log(
          'Warning in psf-token.js/getBurnedLast24Hours(): totalBurned decreased vs baseline; clamping 24h burn to 0'
        )
        burnedBaseUnits = 0n
      }
    }

    const now = Date.now()
    await db.put(snapshotKey(now), {
      ts: now,
      totalBurned: currentBurned.toString()
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

    const burnedHuman =
      reason === null ? Number(burnedBaseUnits) / 1e8 : null

    return {
      burnedTokens: burnedHuman,
      burnedTokensFloor2:
        reason === null ? floor2(Number(burnedBaseUnits) / 1e8) : null,
      reason,
      windowStart: cutoff,
      baselineTs: baseline?.ts ?? null,
      currentTs: now,
      currentTotalBurnedBase: currentBurned.toString()
    }
  }
}

export default PsfToken

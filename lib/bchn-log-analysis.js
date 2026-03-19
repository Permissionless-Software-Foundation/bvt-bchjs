/*
  Free bchn log analysis
*/

import fs from 'node:fs/promises'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import shell from 'shelljs'

import config from '../config/index.js'
import utils from './util.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOWNLOAD_ROOT = `${__dirname.toString()}/../../psf-bch-api-logs`
const ANALYTICS_OUTPUT_DIR = `${__dirname.toString()}/../html/logs/fullstack-analytics`
const ANALYTICS_OUTPUT_BASENAME = 'bchn-analytics'
const LOG_FILE_REGEX = /^rest2nostr-.*\.log(\.\d+)?$/
const REQUEST_REGEX = /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(\S+)$/
const DEFAULT_DOWNLOAD_SCRIPT = 'download-logs.sh'

class AnalyizeLogs {
  constructor () {
    this.ignoredClientIpPatterns = Array.isArray(config.ignoredClientIpPatterns)
      ? config.ignoredClientIpPatterns
      : []
  }

  // Parent function called by the BVT.
  async runTests (options = {}) {
    const runOptions = this.normalizeRunOptions(options)
    const prefix = this.getVariantPrefix(runOptions.variant)

    const success = await this.downloadLogs(runOptions.downloadScript)
    if (!success) {
      console.log('Issue with download logs. Exiting')
      await utils.logAll(`${prefix}Issue with download logs. Exiting`)
      return false
    }

    const loaded = await this.loadLogEntries()
    if (!loaded || !loaded.entries || loaded.entries.length === 0) {
      await this.writeInsightsReport(
        'No log entries found in downloaded files.',
        {
          generatedAt: new Date().toISOString(),
          metadata: loaded?.metadata || {}
        },
        runOptions.outputSuffix
      )
      await utils.logAll(this.getSummaryTitle(runOptions.variant))
      await utils.logAll(`${prefix}No valid log entries found after downloading logs.`)
      return true
    }

    const classified = this.classifyEntries(loaded.entries)
    const insights = this.computeInsights(classified, loaded.metadata)
    const textReport = this.renderTextReport(insights)

    await this.writeInsightsReport(textReport, insights, runOptions.outputSuffix)
    await this.publishInsightsSummary(insights, runOptions.variant)
    utils.log(' ')
    return true
  }

  normalizeRunOptions (options = {}) {
    const variant = this.normalizeVariant(options.variant)
    const outputSuffix = this.normalizeOutputSuffix(options.outputSuffix, variant)
    const downloadScript = this.normalizeDownloadScript(options.downloadScript)

    return {
      variant,
      outputSuffix,
      downloadScript
    }
  }

  normalizeVariant (variant) {
    if (typeof variant !== 'string') return ''
    return variant.trim().toLowerCase()
  }

  normalizeOutputSuffix (outputSuffix, variant = '') {
    if (typeof outputSuffix === 'string' && outputSuffix.trim()) {
      return outputSuffix.trim().toLowerCase()
    }

    if (variant) return variant
    return ''
  }

  normalizeDownloadScript (downloadScript) {
    if (typeof downloadScript !== 'string') return DEFAULT_DOWNLOAD_SCRIPT

    const trimmed = downloadScript.trim()
    if (!trimmed) return DEFAULT_DOWNLOAD_SCRIPT

    return path.basename(trimmed)
  }

  getVariantPrefix (variant = '') {
    if (!variant) return ''
    return `[${variant}] `
  }

  getSummaryTitle (variant = '') {
    if (!variant) return 'bchn.fullstack.cash Analytics:'
    if (variant === 'x402') return 'x402-bch.fullstack.cash Analytics [x402]:'
    return `bchn.fullstack.cash Analytics [${variant}]:`
  }

  async downloadLogs (downloadScript = DEFAULT_DOWNLOAD_SCRIPT) {
    console.log('Entering downloadLogs()')

    console.log(`__dirname.toString(): ${__dirname.toString()}`)
    shell.cd(`${__dirname.toString()}`) // Ensure the function is on a known directory path

    // Change to the free-psf-bch-api-logs dir.
    shell.cd(`${__dirname.toString()}/../../psf-bch-api-logs/`)
    // shell.cd(`${__dirname.toString()}/../../../../personal/free-psf-bch-api-logs/`)

    // Exit if the free-psf-bch-api-logss dir is not available.
    try {
      const info = shell.exec('pwd')
      console.log(`info: ${info}`)
      if (info.indexOf('psf-bch-api-logs') === -1) { throw new Error('psf-bch-api-logs directory is not available.') }
    } catch (err) {
      return false
    }

    const downloadResult = shell.exec(`./${downloadScript}`)
    if (downloadResult.code !== 0) return false

    return true
  }

  async loadLogEntries () {
    const defaultRoots = [
      `${DOWNLOAD_ROOT}/api-logs`,
      `${DOWNLOAD_ROOT}/logs`,
      DOWNLOAD_ROOT,
      `${__dirname.toString()}/../../api-dev/api-logs`
    ]

    let files = []
    let selectedRoot = ''
    for (const root of defaultRoots) {
      // eslint-disable-next-line no-await-in-loop
      const found = await this.discoverLogFiles(root)
      if (found.length > 0) {
        files = found
        selectedRoot = root
        break
      }
    }

    if (files.length === 0) {
      return {
        entries: [],
        metadata: {
          selectedRoot: null,
          files: [],
          totalLines: 0,
          malformedLines: 0,
          validEntries: 0,
          ignoredEntries: 0
        }
      }
    }

    const entries = []
    let malformedLines = 0
    let totalLines = 0
    let ignoredEntries = 0

    for (const filePath of files) {
      // eslint-disable-next-line no-await-in-loop
      const parsed = await this.parseLogFile(filePath)
      entries.push(...parsed.entries)
      malformedLines += parsed.malformedLines
      totalLines += parsed.totalLines
      ignoredEntries += parsed.ignoredEntries
    }

    entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

    return {
      entries,
      metadata: {
        selectedRoot,
        files,
        totalLines,
        malformedLines,
        validEntries: entries.length,
        ignoredEntries
      }
    }
  }

  async discoverLogFiles (rootDir) {
    let dirEntries = []
    try {
      dirEntries = await fs.readdir(rootDir, { withFileTypes: true })
    } catch (err) {
      return []
    }

    const filePaths = []
    for (const entry of dirEntries) {
      const fullPath = path.join(rootDir, entry.name)
      if (entry.isDirectory()) {
        // eslint-disable-next-line no-await-in-loop
        const nestedFiles = await this.discoverLogFiles(fullPath)
        filePaths.push(...nestedFiles)
      } else if (LOG_FILE_REGEX.test(entry.name)) {
        filePaths.push(fullPath)
      }
    }

    filePaths.sort()
    return filePaths
  }

  async parseLogFile (filePath) {
    const raw = await fs.readFile(filePath, 'utf8')
    const lines = raw.split('\n')
    const entries = []
    let malformedLines = 0
    let ignoredEntries = 0

    for (const line of lines) {
      if (!line || !line.trim()) continue
      try {
        const parsed = JSON.parse(line)
        if (!parsed || typeof parsed !== 'object') {
          malformedLines++
          continue
        }

        if (this.shouldIgnoreByClientIp(parsed)) {
          ignoredEntries++
          continue
        }

        entries.push({
          ...parsed,
          __sourceFile: filePath
        })
      } catch (err) {
        malformedLines++
      }
    }

    return {
      entries,
      malformedLines,
      ignoredEntries,
      totalLines: lines.filter(x => x && x.trim()).length
    }
  }

  shouldIgnoreByClientIp (entry = {}) {
    const patterns = this.ignoredClientIpPatterns
    if (!Array.isArray(patterns) || patterns.length === 0) return false

    const candidateIps = [entry.client_ip, entry.remote_address]
      .map(ip => this.normalizeIpAddress(ip))
      .filter(Boolean)

    if (!candidateIps.length) return false

    for (const ip of candidateIps) {
      if (this.matchesIpPatterns(ip, patterns)) return true
    }

    return false
  }

  normalizeIpAddress (rawIp = '') {
    if (typeof rawIp !== 'string') return ''
    let ip = rawIp.trim().toLowerCase()
    if (!ip) return ''

    if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '')

    return ip
  }

  matchesIpPatterns (ip = '', patterns = []) {
    for (const pattern of patterns) {
      if (this.matchesIpPattern(ip, pattern)) return true
    }
    return false
  }

  matchesIpPattern (ip = '', pattern = '') {
    if (!ip || typeof pattern !== 'string') return false

    const normalizedPattern = this.normalizeIpAddress(pattern)
    if (!normalizedPattern) return false

    // Handle IPv4 wildcards such as 192.168.0.* or 172.10.*.*
    const ipParts = ip.split('.')
    const patternParts = normalizedPattern.split('.')
    if (ipParts.length === 4 && patternParts.length === 4) {
      for (let i = 0; i < 4; i++) {
        if (patternParts[i] === '*') continue
        if (patternParts[i] !== ipParts[i]) return false
      }
      return true
    }

    return ip === normalizedPattern
  }

  classifyEntries (entries) {
    const requestEvents = []
    const lifecycleEvents = []
    const errorEvents = []

    for (const entry of entries) {
      const message = entry?.message || ''

      if (this.isRequestEvent(message)) {
        const requestInfo = this.extractRequestInfo(message)
        requestEvents.push({
          ...entry,
          ...requestInfo
        })
        continue
      }

      if (this.isLifecycleEvent(message)) {
        lifecycleEvents.push(entry)
      }

      if (this.isErrorEvent(entry)) {
        errorEvents.push({
          ...entry,
          component: this.extractErrorComponent(message),
          errorSignature: this.extractErrorSignature(message),
          downstreamService: this.extractDownstreamService(entry),
          hasSensitiveAuth: this.hasSensitiveAuth(entry)
        })
      }
    }

    return {
      allEntries: entries,
      requestEvents,
      lifecycleEvents,
      errorEvents
    }
  }

  isRequestEvent (message = '') {
    return REQUEST_REGEX.test(message)
  }

  isLifecycleEvent (message = '') {
    return (
      message.includes('Server started on port') ||
      message.includes('Rotating log files') ||
      message.includes('Running server in environment')
    )
  }

  isErrorEvent (entry = {}) {
    return entry.level === 'error'
  }

  extractRequestInfo (message = '') {
    const matches = message.match(REQUEST_REGEX)
    if (!matches) {
      return {
        method: 'unknown',
        path: 'unknown',
        endpointFamily: 'unknown'
      }
    }

    const method = matches[1]
    const reqPath = matches[2]
    const endpointFamily = this.extractEndpointFamily(reqPath)

    return {
      method,
      path: reqPath,
      endpointFamily
    }
  }

  extractEndpointFamily (reqPath = '') {
    if (!reqPath || reqPath[0] !== '/') return 'unknown'
    const parts = reqPath.split('/').filter(Boolean)
    if (parts.length < 2) return 'unknown'
    if (parts[0] !== 'v6') return parts[0]
    return parts[1] || 'unknown'
  }

  extractErrorComponent (message = '') {
    const match = message.match(/^Error in ([^:]+):/)
    if (!match || !match[1]) return 'unknown'
    return match[1].trim()
  }

  extractErrorSignature (message = '') {
    if (!message) return 'unknown'
    const match = message.match(/^Error in [^:]+:\s*(.*)$/)
    if (!match || !match[1]) return message
    return match[1].trim()
  }

  extractDownstreamService (entry = {}) {
    const baseURL = entry?.originalError?.config?.baseURL || ''
    if (!baseURL) return 'unknown'

    if (baseURL.includes(':8332')) return 'full-node'
    if (baseURL.includes(':3001')) return 'fulcrum'
    if (baseURL.includes(':5020')) return 'slp-indexer'
    if (baseURL.includes('full-node')) return 'full-node'
    if (baseURL.includes('fulcrum')) return 'fulcrum'
    if (baseURL.includes('slp')) return 'slp-indexer'

    return 'unknown'
  }

  hasSensitiveAuth (entry = {}) {
    const auth = entry?.originalError?.config?.auth
    if (!auth) return false
    return Boolean(auth.password || auth.username)
  }

  computeInsights (classified, metadata) {
    const availability = this.computeAvailabilityInsights(classified)
    const traffic = this.computeTrafficInsights(classified)
    const reliability = this.computeReliabilityInsights(classified)
    const dependency = this.computeDependencyInsights(classified)
    const quality = this.computeQualityInsights(classified, metadata)

    return {
      generatedAt: new Date().toISOString(),
      metadata,
      availability,
      traffic,
      reliability,
      dependency,
      quality
    }
  }

  computeAvailabilityInsights (classified) {
    const lifecycleEvents = classified.lifecycleEvents || []
    const startEvents = lifecycleEvents.filter(x => (x.message || '').includes('Server started on port'))
    const rotationEvents = lifecycleEvents.filter(x => (x.message || '').includes('Rotating log files'))

    const allEntries = classified.allEntries || []
    const firstTimestamp = allEntries[0]?.timestamp || null
    const lastTimestamp = allEntries[allEntries.length - 1]?.timestamp || null

    return {
      startCount: startEvents.length,
      rotationCount: rotationEvents.length,
      firstTimestamp,
      lastTimestamp
    }
  }

  computeTrafficInsights (classified) {
    const requestEvents = classified.requestEvents || []

    const methodCounts = {}
    const endpointCounts = {}
    const familyCounts = {}
    const hourlyCounts = {}
    const ipCounts = {}

    for (const event of requestEvents) {
      this.incrementCounter(methodCounts, event.method || 'unknown')
      this.incrementCounter(endpointCounts, event.path || 'unknown')
      this.incrementCounter(familyCounts, event.endpointFamily || 'unknown')

      const bucket = this.getHourlyBucket(event.timestamp)
      this.incrementCounter(hourlyCounts, bucket)

      const clientIp = this.getClientIpAddress(event)
      if (clientIp) this.incrementCounter(ipCounts, clientIp)
    }

    return {
      totalRequests: requestEvents.length,
      methods: this.sortCounterMap(methodCounts),
      topEndpoints: this.sortCounterMap(endpointCounts, 20),
      endpointFamilies: this.sortCounterMap(familyCounts),
      hourlyBuckets: this.sortCounterMap(hourlyCounts, 1000),
      topClientIps: this.sortCounterMap(ipCounts, 20)
    }
  }

  getClientIpAddress (entry = {}) {
    const candidateIps = [entry.client_ip, entry.remote_address]
      .map(ip => this.normalizeIpAddress(ip))
      .filter(Boolean)

    if (!candidateIps.length) return ''
    return candidateIps[0]
  }

  computeReliabilityInsights (classified) {
    const errorEvents = classified.errorEvents || []
    const requestCount = (classified.requestEvents || []).length
    const totalEventCount = (classified.allEntries || []).length

    const signatureCounts = {}
    const componentCounts = {}

    for (const event of errorEvents) {
      this.incrementCounter(signatureCounts, event.errorSignature || 'unknown')
      this.incrementCounter(componentCounts, event.component || 'unknown')
    }

    const errorRateByRequests = requestCount > 0
      ? Number((errorEvents.length / requestCount).toFixed(4))
      : 0
    const errorRateByTotalEvents = totalEventCount > 0
      ? Number((errorEvents.length / totalEventCount).toFixed(4))
      : 0

    return {
      totalErrors: errorEvents.length,
      errorRateByRequests,
      errorRateByTotalEvents,
      topErrorSignatures: this.sortCounterMap(signatureCounts, 20),
      errorsByComponent: this.sortCounterMap(componentCounts)
    }
  }

  computeDependencyInsights (classified) {
    const errorEvents = classified.errorEvents || []
    const serviceCounts = {}
    const serviceFamilyCounts = {}

    for (const event of errorEvents) {
      const service = event.downstreamService || 'unknown'
      const family = event.endpointFamily || this.extractEndpointFamilyFromError(event) || 'unknown'

      this.incrementCounter(serviceCounts, service)
      this.incrementCounter(serviceFamilyCounts, `${service} :: ${family}`)
    }

    return {
      errorsByDownstreamService: this.sortCounterMap(serviceCounts),
      errorsByServiceAndFamily: this.sortCounterMap(serviceFamilyCounts, 50)
    }
  }

  extractEndpointFamilyFromError (event = {}) {
    const stack = event?.originalError?.stack || event?.stack || ''
    if (stack.includes('Fulcrum')) return 'fulcrum'
    if (stack.includes('Slp')) return 'slp'
    if (stack.includes('Blockchain')) return 'full-node'
    return 'unknown'
  }

  computeQualityInsights (classified, metadata) {
    const errorEvents = classified.errorEvents || []
    const sensitiveExposureCount = errorEvents.filter(x => x.hasSensitiveAuth).length
    const duplicateErrorCount = this.computeDuplicateErrors(errorEvents)

    const parseFailureRate = metadata.totalLines > 0
      ? Number((metadata.malformedLines / metadata.totalLines).toFixed(4))
      : 0

    return {
      malformedLines: metadata.malformedLines || 0,
      parseFailureRate,
      duplicateErrorCount,
      sensitiveExposureCount
    }
  }

  computeDuplicateErrors (errorEvents) {
    const sorted = [...errorEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    let duplicateErrorCount = 0
    const seen = {}

    for (const event of sorted) {
      const signature = event.errorSignature || 'unknown'
      const timestamp = new Date(event.timestamp).getTime()
      const prev = seen[signature]

      if (prev && (timestamp - prev <= 5000)) duplicateErrorCount++
      seen[signature] = timestamp
    }

    return duplicateErrorCount
  }

  incrementCounter (map, key) {
    if (!map[key]) map[key] = 0
    map[key]++
  }

  sortCounterMap (counterMap, limit = 10) {
    const rows = Object.keys(counterMap).map(key => ({ key, count: counterMap[key] }))
    rows.sort((a, b) => b.count - a.count)
    return rows.slice(0, limit)
  }

  getHourlyBucket (timestamp) {
    const parsed = new Date(timestamp)
    if (isNaN(parsed.getTime())) return 'unknown'
    return `${parsed.toISOString().slice(0, 13)}:00Z`
  }

  renderTextReport (insights) {
    const lines = []

    lines.push('High Level Summary')
    lines.push(`Generated At: ${insights.generatedAt}`)
    lines.push(`Source Root: ${insights.metadata.selectedRoot || 'unknown'}`)
    lines.push(`Files Parsed: ${insights.metadata.files.length}`)
    lines.push(`Total Lines: ${insights.metadata.totalLines}`)
    lines.push(`Valid Entries: ${insights.metadata.validEntries}`)
    lines.push(`Ignored Entries (Client IP): ${insights.metadata.ignoredEntries || 0}`)
    lines.push(`Malformed Lines: ${insights.metadata.malformedLines}`)

    lines.push('')
    lines.push('Availability Report:')
    lines.push(`Server Starts: ${insights.availability.startCount}`)
    lines.push(`Log Rotations: ${insights.availability.rotationCount}`)
    lines.push(`First Timestamp: ${insights.availability.firstTimestamp || 'n/a'}`)
    lines.push(`Last Timestamp: ${insights.availability.lastTimestamp || 'n/a'}`)

    lines.push('')
    lines.push('Traffic Report:')
    lines.push(`Total Requests: ${insights.traffic.totalRequests}`)
    lines.push(`Methods: ${this.renderCountRows(insights.traffic.methods)}`)
    lines.push(`Endpoint Families: ${this.renderCountRows(insights.traffic.endpointFamilies)}`)
    lines.push(`Top Endpoints: ${this.renderCountRows(insights.traffic.topEndpoints)}`)
    lines.push(`Top Client IPs: ${this.renderCountRows(insights.traffic.topClientIps)}`)

    lines.push('')
    lines.push('Reliability Report:')
    lines.push(`Total Errors: ${insights.reliability.totalErrors}`)
    lines.push(`Error Rate (Errors/Requests): ${insights.reliability.errorRateByRequests}`)
    lines.push(`Error Rate (Errors/Events): ${insights.reliability.errorRateByTotalEvents}`)
    lines.push(`Top Error Signatures: ${this.renderCountRows(insights.reliability.topErrorSignatures)}`)
    lines.push(`Errors By Component: ${this.renderCountRows(insights.reliability.errorsByComponent)}`)

    lines.push('')
    lines.push('Dependency Health Report:')
    lines.push(`Errors By Downstream Service: ${this.renderCountRows(insights.dependency.errorsByDownstreamService)}`)
    lines.push(`Errors By Service/Family: ${this.renderCountRows(insights.dependency.errorsByServiceAndFamily)}`)

    lines.push('')
    lines.push('Data Quality & Security Report:')
    lines.push(`Duplicate Error Count (<=5s): ${insights.quality.duplicateErrorCount}`)
    lines.push(`Sensitive Auth Exposure Count: ${insights.quality.sensitiveExposureCount}`)
    lines.push(`Parse Failure Rate: ${insights.quality.parseFailureRate}`)

    return `${lines.join('\n')}\n`
  }

  renderCountRows (rows = []) {
    if (!rows.length) return 'none'
    return rows.map(x => `${x.key}: ${x.count}`).join(', ')
  }

  getInsightsFilePaths (outputSuffix = '') {
    const normalizedSuffix = typeof outputSuffix === 'string'
      ? outputSuffix.trim().toLowerCase()
      : ''
    const suffixSegment = normalizedSuffix ? `-${normalizedSuffix}` : ''
    const txtPath = `${ANALYTICS_OUTPUT_DIR}/${ANALYTICS_OUTPUT_BASENAME}${suffixSegment}.txt`
    const jsonPath = `${ANALYTICS_OUTPUT_DIR}/${ANALYTICS_OUTPUT_BASENAME}${suffixSegment}.json`
    const canonicalTxtPath = `${ANALYTICS_OUTPUT_DIR}/${ANALYTICS_OUTPUT_BASENAME}.txt`
    const canonicalJsonPath = `${ANALYTICS_OUTPUT_DIR}/${ANALYTICS_OUTPUT_BASENAME}.json`

    return {
      txtPath,
      jsonPath,
      canonicalTxtPath,
      canonicalJsonPath,
      hasSuffix: Boolean(suffixSegment)
    }
  }

  async writeInsightsReport (textReport, jsonReport, outputSuffix = '') {
    const outputPaths = this.getInsightsFilePaths(outputSuffix)
    const outputDir = path.dirname(outputPaths.txtPath)
    await fs.mkdir(outputDir, { recursive: true })
    const jsonReportText = `${JSON.stringify(jsonReport, null, 2)}\n`

    await fs.writeFile(outputPaths.txtPath, textReport, 'utf8')
    await fs.writeFile(outputPaths.jsonPath, jsonReportText, 'utf8')

    // Keep canonical artifact paths for backwards compatibility.
    if (outputPaths.hasSuffix) {
      await fs.writeFile(outputPaths.canonicalTxtPath, textReport, 'utf8')
      await fs.writeFile(outputPaths.canonicalJsonPath, jsonReportText, 'utf8')
    }
  }

  async publishInsightsSummary (insights, variant = '') {
    const top5Endpoints = (insights.traffic.topEndpoints || [])
      .slice(0, 5)
      .map(x => `${x.key} (${x.count})`)
    const top5Ips = (insights.traffic.topClientIps || [])
      .slice(0, 5)
      .map(x => `${x.key} (${x.count})`)
    const top5Errors = (insights.reliability.topErrorSignatures || [])
      .slice(0, 5)
      .map(x => `${x.key} (${x.count})`)

    const endpointLines = top5Endpoints.length
      ? top5Endpoints.map(x => ` - ${x}`).join('\n')
      : ' - n/a'
    const ipLines = top5Ips.length
      ? top5Ips.map(x => ` - ${x}`).join('\n')
      : ' - n/a'
    const errorLines = top5Errors.length
      ? top5Errors.map(x => ` - ${x}`).join('\n')
      : ' - n/a'

    const summaryLines = [
      this.getSummaryTitle(variant),
      `Requests=${insights.traffic.totalRequests}, Errors=${insights.reliability.totalErrors}, ErrorRate=${insights.reliability.errorRateByRequests}`,
      `Starts=${insights.availability.startCount}, Rotations=${insights.availability.rotationCount}`,
      'Top5Endpoints:',
      endpointLines,
      'Top5ClientIps:',
      ipLines,
      'Top5Errors:',
      errorLines
    ]

    await utils.logAll(summaryLines.join('\n'))
  }
}

export default AnalyizeLogs

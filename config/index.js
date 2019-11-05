/*
  This library exports a config object that contains all non-secure config
  settings.
*/

'use strict'

const common = require('./env/common')

module.exports = Object.assign({}, common)

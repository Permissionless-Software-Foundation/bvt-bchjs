/*
  Contains configuration settings common to all environments.
*/

'use strict'

module.exports = {
  bvtServer: 'https://metrics.fullstack.cash',
  telegramToken: process.env.TELEGRAMTOKEN ? process.env.TELEGRAMTOKEN : '',
  chatId: process.env.CHATID ? process.env.CHATID : '@bchjs_bvt',
  restURL: process.env.RESTURL ? process.env.RESTURL : 'https://api.fullstack.cash/v4/',
  apiToken: process.env.BCHJSTOKEN ? process.env.BCHJSTOKEN : '',
  testnetUrl: 'https://testnet.fullstack.cash/v4/'
}

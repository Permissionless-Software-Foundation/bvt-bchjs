/*
  Contains configuration settings common to all environments.
*/

'use strict'

module.exports = {
  bvtServer: "https://metrics.bchjs.cash",
  telegramToken: process.env.TELEGRAMTOKEN ? process.env.TELEGRAMTOKEN : "",
  chatId: process.env.CHATID ? process.env.CHATID : "@bchjs_bvt",
  restURL: process.env.RESTURL ? process.env.RESTURL : "https://api.bchjs.cash/v3/",
  apiToken: process.env.BCHJSTOKEN ? process.env.BCHJSTOKEN : ""
}

/*
  Contains configuration settings common to all environments.
*/

export default {
  bvtServer: 'https://metrics.fullstack.cash',
  telegramToken: process.env.TELEGRAMTOKEN ? process.env.TELEGRAMTOKEN : '',
  chatId: process.env.CHATID ? process.env.CHATID : '@bchjs_bvt',
  restURL: process.env.RESTURL ? process.env.RESTURL : 'https://api.fullstack.cash/v5/',
  apiToken: process.env.BCHJSTOKEN ? process.env.BCHJSTOKEN : '',
  ignoredClientIpPatterns: process.env.IGNORED_CLIENT_IP_PATTERNS
    ? process.env.IGNORED_CLIENT_IP_PATTERNS.split(',').map(x => x.trim()).filter(Boolean)
    : [
        '192.168.0.*',
        '172.10.*.*'
      ]
}

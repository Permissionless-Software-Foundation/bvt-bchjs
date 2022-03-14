/*
  Utility functions for working with Slack
*/

'use strict'

const config = require('../config')
const token = config.telegramToken
const chatId = config.chatId

const TelegramBot = require('node-telegram-bot-api')

// Created instance of TelegramBot
const bot = new TelegramBot(token, {
  polling: false
})

// Send a string to the bchjs-bvt channel.
async function send (str) {
  // try {
  const now = new Date()
  const dateStr = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })

  await bot.sendMessage(
    chatId,
      `${dateStr}: ${str}`
  )
  // console.log(`msg: `, msg)
  // } catch (err) {
  //   throw err
  // }
}

module.exports = {
  send
}

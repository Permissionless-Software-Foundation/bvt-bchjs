/*
  Utility functions for working with Slack
*/

import TelegramBot from 'node-telegram-bot-api'
import config from '../config/index.js'
const token = config.telegramToken
const chatId = config.chatId

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

export default {
  send
}

/*
  Common utility functions.
*/

'use strict'

const shell = require('shelljs')

const telegram = require('./telegram')

function clearUutDir () {
  try {
    // shell.cd(`${__dirname.toString()}/../uut`)
    // shell.exec(`pwd`)
    shell.cd(`${__dirname.toString()}`)
    shell.rm('-rf', `${__dirname.toString()}/../uut/*`)
  } catch (err) {
    console.log('Error in clearUutDir(): ', err)
  }
}

function clearLogs () {
  try {
    shell.cd(`${__dirname.toString()}`)

    const now = new Date()
    const datestamp = `${now.getMonth() +
      1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`

    shell.mv(`${__dirname.toString()}/../html/logs`, `${__dirname.toString()}/../bkup/${datestamp}`)

    shell.mkdir(`${__dirname.toString()}/../html/logs`)
    shell.mkdir(`${__dirname.toString()}/../html/logs/bch-api`)
    shell.mkdir(`${__dirname.toString()}/../html/logs/bch-js`)
    shell.mkdir(`${__dirname.toString()}/../html/logs/fullstack-analytics`)
    shell.touch(`${__dirname.toString()}/../html/logs/bvt.txt`)
    shell.touch(`${__dirname.toString()}/../html/logs/liveness.txt`)
  } catch (err) {
    console.log('Error in clearLogs(): ', err)
  }
}

// Log lines to the high-level BVT log.
function log (str) {
  try {
    shell.cd(`${__dirname.toString()}`)
    shell.exec(`echo "${str}" >> ${__dirname.toString()}/../html/logs/bvt.txt`)
    console.log(str)
  } catch (err) {
    console.log('Error in utils.log(): ', err)
    console.log(
      `Trying to access this file: ${__dirname.toString()}/../html/logs/bvt.txt`
    )
  }
}

async function logAll (str) {
  try {
    log(str)
    await telegram.send(str)
    // console.log(str);
  } catch (err) {
    console.log('Error in utils.logAll(): ', err)
  }
}

// Cleans up old log files.
async function collectGarbage () {
  try {
    shell.cd(`${__dirname.toString()}`)

    // dirList is an array of strings, of items in the bkup directory.
    let dirList = shell.ls(`${__dirname.toString()}/../bkup`)

    // Remove the README.md entry from the file list if it exists.
    dirList = dirList.filter(x => x.indexOf('README') === -1)

    // console.log(`dirList: ${JSON.stringify(dirList)}`)

    // Convert each directory name into an Object with different representations.
    const dirObjs = dirList.map(dirName => {
      try {
        const nums = dirName.split('-')
        const dateStr = `2019-${nums[0]}-${nums[1]}-${nums[2]}:${nums[3]}`
        const date = new Date(dateStr)

        return {
          filename: dirName,
          dateStr: date.toISOString(),
          dateNum: date.getTime()
        }
      } catch (err) {
        return {}
      }
    })

    // console.log(`dirObjs: ${JSON.stringify(dirObjs,null,2)}`)

    // Sort the list by date
    const sortedDirs = dirObjs.sort(function (a, b) {
      return b.dateNum - a.dateNum
    })

    // console.log(`sortedDirs: ${JSON.stringify(sortedDirs,null,2)}`)

    // Save the 30 newest directories. Delete the others.
    const dirsToDelete = sortedDirs.slice(30)

    // console.log(`dirsToDelete: ${JSON.stringify(dirsToDelete,null,2)}`)

    // Delete the older directories
    for (let i = 0; i < dirsToDelete.length; i++) {
      const thisDir = dirsToDelete[i].filename
      shell.rm('-rf', `${__dirname.toString()}/../bkup/${thisDir}`)
    }
  } catch (err) {
    console.log('Error in util.js/collectGarbage(): ', err)
  }
}

module.exports = {
  clearUutDir,
  clearLogs,
  log,
  logAll,
  collectGarbage
}

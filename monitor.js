const env = require('node-env-file')
env(__dirname + '/.env')
const axios = require('axios')
const fs = require('fs')

let ready = false // ready state for socket listener
const signal = require('./signald-interface')
const signalEvents = require('./signald-interface/events.js')
const pwSkills = require('./application/pwSkills.js')
require('./application/events.js')

const { dateutils } = require('./utils/')
const { timeFmtDb, dateNowBKK } = dateutils

  ; (async () => {
    try {

      const v = process.version.slice(1, 3)
      if (Number(v) < 19) {
        console.log('This script was written in Node 19.3.0')
        process.exit(1)
      }

      // dont run if another process is currently running (protects the db file from unscrupulous double writes)
      const procDir = '/proc'
      const procStore = __dirname + '/data/proc'
      if (fs.existsSync(procStore)) {
        const proc = await fs.readFileSync(procStore)
        if (fs.existsSync(procDir + '/' + proc)) {
          const procInfo = await fs.readFileSync(procDir + '/' + proc + '/status', 'utf8')
          const guts = procInfo.split('\n')
          if (guts[0].includes('node')) {
            console.log(timeFmtDb(dateNowBKK()) + ' Error: Only one process may run at a time! Pid: ' + proc + ' is still running. Exiting...')
            process.exit(1)
          }
        }
      }
      await fs.writeFileSync(procStore, String(process.pid))

      // dont run if the password file is not initialized
      if (! await pwSkills.dataStoreExists()) {
        console.log(timeFmtDb(dateNowBKK()) + ' Could not find a data store. Interactive mode enabled\n\n')
        require('./cli/index.js')
        return
      }
      
      console.log(timeFmtDb(dateNowBKK()) + ' Snowpass is starting and will sleep for ' + process.env.PRERUN_PAUSE + ' seconds to allow system config')
      // 10 second delay to allow signald + java to get started (should be 10 * 1000)
      const sleep = (m) => { return new Promise(r => setTimeout(r, m)) }
      await sleep(Number(process.env.PRERUN_PAUSE) * 1000 || 10000)

      // handle backups
      const backup = async () => {
        setTimeout(backup, process.env.BACKUP_CRON * 60 * 60 * 1000)
        await pwSkills.manualBackup()
      }
      backup()
      const cleanupBackups = async () => {
        setTimeout(backup, 24 * 60 * 60 * 1000) // every day clean unnecessary backup files.
        await pwSkills._backupSchedule()
      }
      cleanupBackups()

      // Setup for remote monitoring. You need some service/other host to receive these 
      // requests to detect server down condition
      const checkIn = async () => {
        if (typeof process.env.CHECK_IN_URL !== 'undefined') {
          setTimeout(backup, process.env.CHECK_IN_MIN * 60 * 1000)
          await axios.get(process.env.CHECK_IN_URL)
            .catch((error) => {
              if (error.response) console.log(error.response.data)
              else if (error.request) console.log(error.request)
              else console.log('Error', error.message)
            })
        }
      }
      checkIn()

      // start the connection with the signald interface
      const initializeSocket = async () => {
        if (!ready) {
          signal.socket.abortConnection()
          const success = await signal.socket.initSocket()
          if (success) {
            signal.socket.subscribe()
            ready = true
          }
        }
      }
      const watchSocket = () => {
        console.log(timeFmtDb(dateNowBKK()) + ' NOTICE: Watching for socket initalization')
        if (!ready) {
          setTimeout(() => { watchSocket() }, 5000)
          initializeSocket()
        }
      }
      signalEvents.emitter.on('socket_connected', async () => {
        console.log(timeFmtDb(dateNowBKK()) + " NOTICE: the socket is connected. pid: " + process.pid)
        ready = true

        // TODO add runonce code here to change bot profile pic 
        const exists = await fs.existsSync(__dirname + '/data/avatar')
        if (!exists) {
          console.log('Addding avatar Image to profile...')
          await signal.skills.updateBotAvatar(__dirname + '/resources/snowpass.png', 'Snow Pass')
          await fs.writeFileSync(__dirname + '/data/avatar', 'added')
        }

        console.log(timeFmtDb(dateNowBKK()) + ' message: Notice: SnowPass was restarted')
        await signal.skills.sendMessage(process.env.LINKED_ACCOUNT, 'Notice: SnowPass was restarted.')
        if (process.env.USE_ENCRYPTION_PREFIX === 'true') {
          console.log(timeFmtDb(dateNowBKK()) + ' message: Notice: to continue you must set the encryption prefix by issuing the command: /enc <prefix>')
          await signal.skills.sendMessage(process.env.LINKED_ACCOUNT, 'Notice: to continue you must set the encryption prefix by issuing the command: /enc <prefix>')
        }
      })
      signalEvents.emitter.on('socket_disconnected', async () => {
        console.log(timeFmtDb(dateNowBKK()) + " NOTICE: the socket is disconnected")
        ready = false
        setTimeout(() => { watchSocket() }, 5000)
      })
      initializeSocket()
    } catch (error) {
      console.log(error)
      process.exit(1)
    }
  })()

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
      // dont run if another process is currently running (protects the db file from unscrupulous double writes)
      const procDir = '/proc'
      const procStore = __dirname + '/data/proc'
      if (fs.existsSync(procStore)) {
        const proc = await fs.readFileSync(procStore)
        if (fs.existsSync(procDir + '/' + proc)) {
          console.log(timeFmtDb(dateNowBKK()) + ' Error: Only one process may run at a time! Pid: ' + proc + ' is still running. Exiting...')
          process.exit(1)
        }
      }
      await fs.writeFileSync(procStore, String(process.pid))

      // dont run if the password file is not initialized
      if (! await pwSkills.dataStoreExists()) {
        console.log(timeFmtDb(dateNowBKK()) + ' Could not find a data store. Please run the command \"node cli\" from the application directory to continue')
        process.exit(1)
      }

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
        console.log(timeFmtDb(dateNowBKK()) + 'message: Notice: SnowPass was restarted')
        await signal.skills.sendMessage(process.env.LINKED_ACCOUNT, 'Notice: SnowPass was restarted.')
        if (process.env.USE_ENCRYPTION_PREFIX === 'true') {
          console.log(timeFmtDb(dateNowBKK()) + 'message: Notice: to continue you muse set the encryption prefix by issuing the command: /enc <prefix>')
          await signal.skills.sendMessage(process.env.LINKED_ACCOUNT, 'Notice: to continue you muse set the encryption prefix by issuing the command: /enc <prefix>')
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

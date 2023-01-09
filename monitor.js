const env = require('node-env-file')
env(__dirname + '/.env')
const axios = require('axios')

let ready = false // ready state for socket listener
const signal = require('./signald-interface')
const pwSkills = require('./application/pwSkills.js')
require('./application/events.js')

;( async () => {

  // dont run if the password file is not initialized
  if (! await pwSkills.dataStoreExists()) {
    console.log('Could not find a data store. Please run the command \"node cli\" from the application directory to continue')
    process.exit(1)
  }

  const sleep = (m) => { return new Promise(r => setTimeout(r, m)) }
  await sleep(1000) // allow systemd to get caught up (should be 10 * 1000)

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

  // Setup for remote monitoring. You need some service/other host to receive these requests to detect server down condition
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

  const initializeSocket = async () => {
    if (!ready) {
      signal.socket.abortConnection()
      const success = await signal.socket.initSocket()
      if (success) {
        signal.socket.subscribe()
        ready = true;
      }
    }
  }
  
  const watchSocket = () => {
    console.log('NOTICE: Watching for socket initalization')
    if (!ready) {
      setTimeout(() => { watchSocket() }, 5000)
      initializeSocket()
    }
  }

  signal.signalEvents.emitter.on('socket_connected', async () => {
    console.log("NOTICE: the socket is connected")
    ready = true
    await signal.skills.sendMessage(process.env.LINKED_ACCOUNT, 'Notice: SnowPass was restarted.')
  })
  
  signal.signalEvents.emitter.on('socket_disconnected', async () => {
    console.log("NOTICE: the socket is disconnected")
    ready = false
    setTimeout(() => { watchSocket() }, 5000)
  })

  initializeSocket()
})()
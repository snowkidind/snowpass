const env = require('node-env-file')
env(__dirname + '/.env')

let ready = false // ready state for socket listener
const signal = require('./signald-interface')
const signalEvents = require('./signald-interface/events.js')
require('./application/events.js')

;( async () => {
  
  const sleep = (m) => { return new Promise(r => setTimeout(r, m)) }
  await sleep(1000) // allow systemd to get caught up (should be 10 * 1000)

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

  signalEvents.emitter.on('socket_connected', async () => {
    console.log("NOTICE: the socket is connected")
    ready = true
    await signal.skills.sendMessage(process.env.LINKED_ACCOUNT, 'Notice: SnowPass was restarted.')
  })
  
  signalEvents.emitter.on('socket_disconnected', async () => {
    console.log("NOTICE: the socket is disconnected")
    ready = false
    setTimeout(() => { watchSocket() }, 5000)
  })

  initializeSocket()
})()
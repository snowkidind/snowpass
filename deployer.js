// To deploy a password, the deployer interacts with the 
// signal protocol and delivers "view once and delete" message 
// containing account information through the signal application, 
// using its built in double ratchet encryption algorithm.
// That is, a user requests a password, the deployer decrypts 
// the password file hosted on it, looks up matches based on 
// the query and returns matches found via signal.Since the 
// device is programmed to only respond to a single user handle, 
// it will ignore requests from all other parties.The encryption 
// key will be optionally stored on a hardware module via the 
// usb interface.The deployer is intended to be installed on 
// a small device like raspberry pi, odroid, jetson or similar.

let ready = false // ready state for socket listener
const signal = require('./signald-interface')
const signalEvents = require('./signald-interface/events.js')

;( async () => {
  
  await utils.sleep(10000) // allow systemd to get caught up

  const initializeSocket = async () => {

    if (!ready) {
      signal.socket.abortConnection()
      const success = await signal.socket.initSocket()
      console.log(success)
      if (success) {
        console.log('subscribe')
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
  })

  signalEvents.emitter.on('socket_disconnected', async () => {
    console.log("NOTICE: the socket is disconnected")
    ready = false
    setTimeout(() => { watchSocket() }, 5000)
  })

  initializeSocket()
})()
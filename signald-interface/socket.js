const net = require("net")
const process = require("process")
const events = require('./events.js')

let socket
let resolver

module.exports = {

  /*
   * Create a socket connection with the unix socket. This is our JS interface with signald
   */
  initSocket: () => {
    return new Promise((resolve) => {
      resolver = resolve
      try {
        socket = net.createConnection({ path: process.env.UNIX_SOCKET }, () => {
          resolver(true)
        })
      } catch (error) {
        console.log(error)
      }
      socket.on('error', function (error) {
        events.emitMessage('socket_error', error)
      })
      socket.on('data', (data) => {
        const resp = data.toString().split('\n')
        resp.forEach((item) => {
          if (item.length > 0) {
            // bulk data handler. this points to receive.js
            events.emitMessage('data', item.toString())
          }
        })
      })
      socket.on('connect', () => {
        events.emitMessage('socket_connected', true)
      })
      socket.on('end', () => {
        events.emitMessage('socket_disconnected', false)
      })
    })
  },

  abortConnection: () => {
    if (socket) {
      socket.end()
    }
    if (resolver) {
      socket = null
      resolver(false)
    }
  },

  /*
    Turns on incoming socket reads. Messages received before subscribing are queued and delivered upon subscribe
  */
  subscribe: () => {
    return new Promise(async (resolve, reject) => {
      await socket.write(JSON.stringify({ "type": "subscribe", "username": process.env.BOT_ACCOUNT }) + "\n", "utf8")
      // console.log("The socket is listening " + process.env.BOT_ACCOUNT)
      resolve()
    })
  },

  unsubscribe: () => {
    return new Promise(async (resolve, reject) => {
      await socket.write(JSON.stringify({ "type": "unsubscribe", "username": process.env.BOT_ACCOUNT }) + "\n", "utf8")
      resolve()
    })
  },

  /*
     This is where the bulk of the outgoing signal commands go, except for the ones above. Mostly called from skills.js
   */
  writeSocket: (command) => {
    try {
      socket.write(JSON.stringify(command) + "\n", "utf8")
    } catch (error) {
      console.log(error)
      console.log("Could not write to the socket, it is possible that signalD is not running or was restarted.")
      process.exit(-1)
    }
  }
}

const net = require("net")
const process = require("process")
const events = require('./events.js')

let socket
let resolver

module.exports = {

  /*
   * This is where all incoming socket writes come from
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
   * Turns on incoming socket reads. Otherwise, the incoming messages and
   * responses will be queued for the next "receive" (e.g. subscribe) action
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
   * This is where all the outgoing signal commands go, except for the ones above.
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

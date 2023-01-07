/*
  Opens up a connection with the signal socket, and then closes it
*/

const signal = require('../signald-interface')
const signalEvents = require('../signald-interface/events.js')

let ready = false // ready state for socket listener

module.exports = {
  spinUp: async () => {
    return new Promise ((resolve, reject) => {
      const initializeSocket = async () => {
        if (!ready) {
          signal.socket.abortConnection()
          const success = await signal.socket.initSocket()
          if (success) {
            signal.socket.subscribe()
            ready = true
            resolve()
          }
        }
        reject('Already Ready')
      }
      signalEvents.emitter.once('socket_connected', async () => {
        // console.log("NOTICE: the socket is connected")
        ready = true
      })
      signalEvents.emitter.once('socket_disconnected', async () => {
        // console.log("NOTICE: the socket is disconnected")
        ready = false
      })
      initializeSocket()
    })
    
  },
  
  spinDown: async () => {
    try {
      await signal.socket.abortConnection()
      ready = false
    } catch (error) {
      console.log(error)
    }
  },

  sendMessage: async (message) => {
    try {
      const receipt = await signal.skills.sendMessage(process.env.LINKED_ACCOUNT, message)
      return { status: "ok", receipt: receipt }
    } catch (error) {
      console.log(error)
      return { status: "error", error: 'Couldnt send message' }
    }
  }
}

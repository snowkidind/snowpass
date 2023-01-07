const net = require("net");
const process = require("process");
const events = require('./events.js');

let socket;
let resolver

let simulate = false;
if (process.env.SIMULATE_SIGNAL === 'true') {
  simulate = true;
}

module.exports = {

  /*
   * This is where all incoming socket writes come from
   */
  initSocket: () => {
    return new Promise((resolve, reject) => {
      if (!simulate) {
        resolver = resolve;
        // if java isnt turned on this dies no matter what.
        try {
          socket = net.createConnection({ path: process.env.UNIX_SOCKET }, () => {
            // this is only called on successful connection
            console.log('created a connection')
            resolver(true);
          })
        } catch (error) {
          console.log(error)
        }

        socket.on('error', function (error) {
          events.emitMessage('socket_error', error);
        });

        socket.on('data', (data) => {

          // this can occasionally contain more than one json object...
          const resp = data.toString().split('\n');
          resp.forEach((item) => {
            if (item.length > 0) {
              console.log(item.toString())
              // Send the event to the receiver
              events.emitMessage('data', item.toString());
            }
          });
        });

        socket.on('connect', () => {
          events.emitMessage('socket_connected', true);
        });

        socket.on('end', () => {
          events.emitMessage('socket_disconnected', false);
        });

      } else {
        console.log("simulating sokkit");
      }
    })
  },

  abortConnection: () => {
    if (resolver) {
      socket = null;
      resolver(false)
    }
  },

  /*
   * Turns on incoming socket reads. Otherwise, the incoming messages and
   * responses will be queued for the next "receive" (e.g. subscribe) action
   */
  subscribe: () => {
    return new Promise(async (resolve, reject) => {
      await socket.write(JSON.stringify({ "type": "subscribe", "username": process.env.BOT_ACCOUNT }) + "\n", "utf8");
      console.log("The socket is listening " + process.env.BOT_ACCOUNT);
      resolve()
    });
  },

  unsubscribe: () => {
    return new Promise(async (resolve, reject) => {
      await socket.write(JSON.stringify({ "type": "unsubscribe", "username": process.env.BOT_ACCOUNT }) + "\n", "utf8");
      resolve()
    });
  },

  /*
   * This is where all the outgoing signal commands go, except for the ones above.
   */
  writeSocket: (command) => {
    console.log(command)
    if (!simulate)
      try {
        socket.write(JSON.stringify(command) + "\n", "utf8");
      } catch (error) {
        // TODO: log a complaint in the database on failure and/or provide some failure return value.
        //  in this case it's probably a configuration or a server issue
        console.log(error)
        console.log("Could not write to the socket, it is possible that signalD is not running or was restarted.")
        process.exit(-1);
      }
  }
}

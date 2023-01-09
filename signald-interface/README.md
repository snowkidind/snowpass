## Javascript adapter for signald socket (WIP)
author: keny ruyter

This library is intended to provide a connection to the signald socket. 

The Files:

socket.js
- Initializes and subscribes to the socket. 

skills.js
- To send requests, interact with the signal protocol by calling the methods here

receive.js
- Receive acts as a router for incoming communications. There are two methods to receive comms:
1. Trigger an event
2. Callback

events.js
- handle incoming events by broadcasting them

idRouter.js
- routes incoming responses to associated requests

A method to initialize a connection to the socket:
```

const signal = require('./signald-interface')

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
})

signal.signalEvents.emitter.on('socket_disconnected', async () => {
  console.log("NOTICE: the socket is disconnected")
  ready = false
  setTimeout(() => { watchSocket() }, 5000)
})
initializeSocket()

```

To receive non-callback events from signal like messages

```
const signald = require('../signald-interface')
const { events, skills } = signald
events.emitter.on('message', async (message) => {
  console.log(message)
}
```

To send an outgoing message

```
const signald = require('../signald-interface')
const { skills } = signald
await skills.sendMessage(e164phoneNumber, 'Hello Signal')
```

Configuration

In your .env file make sure the following two config values are set:
UNIX_SOCKET=/var/run/signald/signald.sock
BOT_ACCOUNT=+12345678945
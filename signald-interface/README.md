## Javascript adapter for signald socket (WIP)
author: keny ruyter

`const signald = require('./signald');`

### Initialize by creating the socket. This also subscribes to socket updates:
`const resp = await signald.skills.newSocket();`

### In order to subscribe to an incoming event, watch the emitter for the event

```signald.events.emitter.on('subscribed', function (status) {
  if (status){
    console.log('Subscribe event: subscribed');
  } else {
    console.log('Subscribe event: unsubscribed')
  }
});
```

### Message received event
```
signald.events.emitter.on('message', function (message) {
  console.log("Message Received event:");
  console.log(message);
});
```

### Send a message

```
if (resp){
    const receipt = await signald.skills.sendMessageToGroup('ICzvJI3BQ9fDwRiIxzEVxQ3csBgEDa6srrKKt2oWfuU=', 'Albatross'); 
    console.log("Receipt for message sent:");
    console.log(receipt)
  }
```





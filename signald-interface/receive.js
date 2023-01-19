const events = require('./events.js')
const idRouter = require('./idRouter.js')

/*
  Receive and parse signald comms
*/

events.emitter.on('data', function (data) {

  if (typeof (data) === 'undefined') {
    return
  }

  let payload

  try {
    payload = JSON.parse(data)
  } catch (error) {
    console.log(error)
    return
  }

  if (payload.type === 'undefined') {
    return
  }

  if (payload.type === 'version') {
    events.emitMessage('version', payload.data.version)
  }

  else if (payload.type === 'subscribed') {
    events.emitMessage('subscribed', true)
  }

  else if (payload.type === 'unsubscribed') {
    events.emitMessage('subscribed', false)
  }

  else if (payload.type === 'get_profile') {
    events.emitMessage('get_profile', payload.data)
  }

  else if (payload.type === 'get_group') {
    events.emitMessage('get_group', payload.data)
  }

  else if (payload.type === 'list_groups') {
    payload.data.groups.forEach((group) => {
      console.log(group)
    })
  }

  else if (payload.type === 'set_profile') {
    // events.emitMessage('set_profile', payload.data)
    receipt(payload)
  }

  else if (payload.type === 'get_linked_devices') {
    // events.emitMessage('get_linked_devices', payload.data)
    receipt(payload)
  }

  else if (payload.type === 'identities') {
    events.emitMessage('identities', payload.data)
  }

  else if (payload.type === 'message') {

    // A message was received
    if (payload.data.dataMessage) {
      events.emitMessage('message', payload.data)
    }

    // user STARTED or STOPPED typing
    if (payload.data.typing) {
      events.emitMessage('user_interaction', payload.data.typing)
    }

    // this is a receipt for the message you send. Handled by id callback system
    if (payload.data.type === 'RECEIPT') {
      events.emitMessage('send_receipt', payload.data)
    }

    // this is a received receipt for when a user views your sent message
    if (payload.data.type === 'CIPHERTEXT') {
      if (typeof (payload.data.receipt) !== 'undefined' && payload.data.receipt.type === "READ") {
        events.emitMessage('read_receipt', payload.data.receipt)
      }
    }
  }

  else if (payload.type === 'unreadable_message') {
    console.log("Bot received an unreadable message. This might mean the encryption ratchet is out of sync with a user.")
  }

  else if (
    payload.type === 'trusted_safety_number' ||
    payload.type === 'trust_failed' ||
    payload.type === 'send' ||
    payload.type === 'create_group' ||
    payload.type === 'leave_group' ||
    payload.type === 'update_group'
  ) {
    receipt(payload)
  }

  else {
    // console.log(payload)
  }

})

function receipt(payload) {
  if (typeof (payload.id) !== 'undefined') {
    const ids = idRouter.queue()
    let found = false
    ids.forEach((item) => {
      if (payload.id === item.id) {
        item.cb(payload)
        found = true
      }
    })
    if (found) {
      idRouter.expire(payload.id)
    }
  }
}

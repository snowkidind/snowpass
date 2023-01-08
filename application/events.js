const signald = require('../signald-interface')
const signalEvents = require('../signald-interface/events.js')
const speakeasy = require('speakeasy')
const crypto = require('./crypto.js')
const commands = require('./commands.js')
const { dateutils } = require('../utils/')
const { timeFmtDb, dateNowBKK } = dateutils

const sendMessage = async (msg) => {
  await signald.skills.sendMessage(process.env.LINKED_ACCOUNT, msg)
}

signalEvents.emitter.on('message', async (message) => {
  try {
    if (message.source.number !== process.env.LINKED_ACCOUNT) {
      console.log('An unknown number called: ' + message.source.number)
      return
    }

    // TODO Check devices that are connected and warn if strange devices exist
    // TODO Check that dissappearing messages are turned on and warn if they arent

    if (typeof message.dataMessage.body === 'undefined') return
    const query = message.dataMessage.body.split(' ')
    const q = query[0]
    if (q.startsWith('/')) {
      await commands.command(query)
    } else {
      // the strategy of totp here is to basically slow down a brute force message blast
      if (process.env.USE_2FA === 'true') {
        if (query.length < 2) {
          await sendMessage('format: <company> <totp>')
          return
        }
        // under normal operation the totp is expected as the second argument.
        // otherwise 2fa may be required in some position other than the second
        const verified = checkTotp(query[1])
        if (!verified) {
          await sendMessage('NOTICE: totp failed')
          return
        }
      }
      const item = await crypto.searchItem(q.toLowerCase())
      if (item.status !== 'ok') {
        console.log(item.error)
      } else {
        if (item.data.length === 1 || item.data[0].name === q) {
          const message1 = item.data[0].name + '\n' + item.data[0].user + '\n' + item.data[0].note
          const message2 = item.data[0].password
          await sendMessage(message1)
          await sendMessage(message2)
          console.log(timeFmtDb(dateNowBKK()) + ' A password was served: ' + item.data[0].name + ' ' + message.source.number)
        }
        else {
          let message1 = 'More than one result was found:\n'
          for (let i = 0; i < item.data.length; i++) {
            message1 += item.data[i].name + '\n'
          }
          if (item.data.length > 1) {
            await sendMessage(message1)
          } else {
            await sendMessage('There were no matches for search: ' + q)
          }
        }
      }
    }

  } catch (error) {
    console.log(error)
    console.log('An error occurred receiving a message')
  }
})

const checkTotp = (totp) => {
  // TODO: Stop similar 2fa code from being used for 120 seconds
  // TODO: Strategy to encrypt the two factor key
  const token6 = String(totp).padStart(6, '0')
  const verified = speakeasy.totp.verify({
    secret: process.env.TOTP_KEY,
    encoding: 'base32',
    token: token6
  })
  return verified
}



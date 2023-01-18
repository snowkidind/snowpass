const signald = require('../signald-interface')
const { events, skills } = signald
const pwSkills = require('./pwSkills.js')
const commands = require('./commands.js')
const { dateutils } = require('../utils/')
const { timeFmtDb, dateNowBKK } = dateutils

/* 
  Receives messages from the signal protocol by listening to 
  events broadcasted by signald-interface
  - By default all messages are considered to be requests for a password, 
  - unless it has a preceeding / which means its a command.
*/

events.emitter.on('message', async (message) => {
  try {
    const deviceInfo = await skills.getLinkedDevices()
    if (deviceInfo.data.devices.length > 2) {
      console.log('ERROR: There are too many devices connected to this account.')
      await sendMessage('ERROR: There are too many devices connected to this account.')
      process.exit()
    }
    if (message.source.number !== process.env.LINKED_ACCOUNT) {
      console.log('An unknown number called: ' + message.source.number)
      return
    }
    // TODO Check that dissappearing messages are turned on and warn if they arent
    if (typeof message.dataMessage.body === 'undefined') return
    const query = message.dataMessage.body.split(' ')
    const q = query[0]
    if (process.env.USE_ENCRYPTION_PREFIX === 'true' && 
       typeof process.env.ENC_PREFIX === 'undefined' &&
       q !== '/enc') {
      await sendMessage('ERROR: Notice: to continue you must set the encryption prefix by issuing the command: /enc <prefix>')
      return
    }
    if (q.startsWith('/')) {
      await commands.command(query)
      return
    }
    const item = await pwSkills.searchItem(q.toLowerCase())
    if (item.status !== 'ok') {
      console.log(item.error)
      return
    } 
    if (item.data.length === 0) {
      await sendMessage('There were no matches for search: ' + q)
      return
    }
    if (item.data.length === 1 || item.data[0].name === q) {
      const message1 = item.data[0].name + '\n' + item.data[0].user + '\n' + item.data[0].note
      const message2 = item.data[0].password
      await sendMessage(message1)
      await sendMessage(message2)
      console.log(timeFmtDb(dateNowBKK()) + ' A password was served: ' + item.data[0].name + ' ' + message.source.number)
      return
    }
    let message1 = 'More than one result was found:\n'
    for (let i = 0; i < item.data.length; i++) {
      message1 += item.data[i].name + '\n'
    }
    await sendMessage(message1)
  } catch (error) {
    console.log(error)
    await sendMessage('An Application error occurred receiving a message')
  }
})

const sendMessage = async (msg) => {
  await skills.sendMessage(process.env.LINKED_ACCOUNT, msg)
}

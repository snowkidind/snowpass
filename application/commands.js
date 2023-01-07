const signald = require('../signald-interface')
const signalEvents = require('../signald-interface/events.js')
const crypto = require('./crypto.js')
const { dateutils } = require('../utils/')
const { timeFmtDb, dateNowBKK } = dateutils
const sendMessage = async (msg) => {
  await signald.skills.sendMessage(process.env.LINKED_ACCOUNT, msg)
}

// /note <company> <note>
const note = async (args) => { 
  await sendMessage('Retun name and new notes')
}

// /noteclear <company>
const noteClear = async (args) => { 
  await sendMessage('return name and removed notes')
}

// /new <company> <userid> <note>
const newEntry = async (args) => { 
  await sendMessage('return new entry information')
  await sendMessage('return newly assigned password')
}

// /change <company> <newPassword> <totp>
const changePw = async (args) => { 
  await sendMessage('Changed <old> to <new> for <company>')
}

// Update a company with a new auto assigned password
const updatePw = async (args) => { 
  await sendMessage('Updated <old> to <new> for <company>')
}

// Remove a company from password tracking entirely
const remove = async (args) => { 
  await sendMessage('Entry was removed for: <all fields>')
}

const menu = () => {
  let acc = 'Command Menu\n\n'
  acc += 'Append note information for specified company\n'
  acc += '/note <company> <note>\n'
  acc += '\n'
  acc += 'Clear note information for specified company\n'
  acc += '/noteclear <company> \n'
  acc += '\n'
  acc += 'Create a new entry, with an auto assigned password\n'
  acc += '/new <company> <userid> <note>\n'
  acc += '\n'
  acc += 'Change item to user defined password\n'
  acc += '/change <company> <newPassword> <totp>\n'
  acc += '\n'
  acc += 'Update a company with a new auto assigned password \n'
  acc += '/update <company> <totp>\n'
  acc += '\n'
  acc += 'Remove a company from password tracking entirely\n'
  acc += '/rm <company> <totp>\n'
  return acc
}

module.exports = {
  command: async (cmdArgs) => {
    const cmd = cmdArgs[0].toLowerCase()
    if (cmd === '/note') await note(cmdArgs)
    else if (cmd === '/noteclear') await noteClear(cmdArgs)
    else if (cmd === '/new') await newEntry(cmdArgs)
    else if (cmd === '/change') await changePw(cmdArgs)
    else if (cmd === '/update') await updatePw(cmdArgs)
    else if (cmd === '/rm') await remove(cmdArgs)
    else await sendMessage(menu())
    console.log(timeFmtDb(dateNowBKK()) + ' A command was issued: ' + cmdArgs.join(' '))
  }
}



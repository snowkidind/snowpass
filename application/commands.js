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
  const search = (await crypto.searchItem(args[1])).data
  if (search.length > 1) {
    let names = ''
    search.forEach((entry) => { names += entry.name + '\n' })
    await sendMessage('Note was not added, more than one result was found for ' + args[1] + ':\n' + names)
    return
  } else if (search.length === 0) {
    await sendMessage('Note was not added, could not find matching entry for ' + args[1])
    return
  }
  let note = ''
  args.forEach((a, index) => {
    if (index > 1) {
      note += a + ' '
    }
  })
  if (await crypto.appendNote(note, search[0].name, search[0].password)) {
    await sendMessage('Note was added')
  } else {
    await sendMessage('Note not added, application error')
  }
}

// /noteclear <company>
const noteClear = async (args) => { 
  const search = (await crypto.searchItem(args[1])).data
  if (search.length > 1) {
    let names = ''
    search.forEach((entry) => { names += entry.name + '\n' })
    await sendMessage('Note was not edited, more than one result was found for ' + args[1] + ':\n' + names)
    return
  } else if (search.length === 0) {
    await sendMessage('Note was not edited, could not find matching entry for ' + args[1])
    return
  }
  if (await crypto.clearNote(search[0].name, search[0].password)) {
    await sendMessage('Notes for ' + search[0].name  + ' were cleared')
  } else {
    await sendMessage('Note was not cleared')
  }
}

// Password will be auto assigned and returned via signal
// /new <company> <userid> <note>
const newEntry = async (args) => {
  const search = (await crypto.searchItem(args[1])).data
  if (search.length > 0) {
    // this will need a fix
    await sendMessage('Entry found for company with named: ' + search[0].name)
  }
  let note = ''
  args.forEach((a, index) => {
    if (index > 2) {
      note += a + ' '
    }
  })
  if (note !== '') note += '\n'
  const json = await crypto.addRecord({name: args[1], user: args[2], note: note})
  await sendMessage('New record added\nSite: ' + json.name + '\n  User: ' +  json.user + '\n  Note: ' +  json.note)
  await sendMessage(json.password)
}

// /change <company> <newPassword> <totp>
const changePw = async (args) => { 
  const search = (await crypto.searchItem(args[1])).data
  if (search.length > 1) {
    let names = ''
    search.forEach((entry) => { names += entry.name + '\n' })
    await sendMessage('Password was not changed, more than one result was found for ' + args[1] + ':\n' + names)
    return
  } else if (search.length === 0) {
    await sendMessage('Password was not changed, could not find matching entry for ' + args[1])
    return
  }
  if (await crypto.updateUserPassword(args[1], search[0].password, args[2])) {
    await sendMessage('Changed ' + search[0].password + ' to ' + args[2] + ' for ' + args[1])
  } else {
    await sendMessage('Could not change password, could not find: ' + args[1])
  }
}

// Update a company with a new auto assigned password
// /update <company> <totp>
const updatePw = async (args) => { 
  const search = (await crypto.searchItem(args[1])).data
  if (search.length > 1) {
    let names = ''
    search.forEach((entry) => { names += entry.name + '\n' })
    await sendMessage('Password was not changed, more than one result was found for ' + args[1] + ':\n' + names)
    return
  } else if (search.length === 0) {
    await sendMessage('Password was not changed, could not find matching entry for ' + args[1])
    return
  }
  const result = await crypto.changePassword(args[1], search[0].password)
  if (result === false) {
    await sendMessage('Could not change password, couldnt find: ' + args[1])
  } else {
    await sendMessage('Changed ' + search[0].password + ' to ' + result + ' for ' + args[1])
  }
}

// /rm <company> <password> Remove a company from password tracking entirely
const remove = async (args) => { 
  const rm = await crypto.deleteRecord(args[1], args[2])
  if (!rm) {
    await sendMessage('Entry was not found: ' + args[1] + ' with password: ' + args[2])
  } else {
    const info = rm.name + ' ' + rm.user + ' ' + rm.password
    await sendMessage('Entry was removed for ' + info)
  }
}

// /backup
const backup = async () => {
  // this is a failsafe for the backup cronjob, in order to allow forcing of the backup.
  if (await crypto.manualBackup()) {
    await sendMessage('Archive was backed up')
  } else {
    await sendMessage('Warning: Could not back up archive')
  }
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
  acc += '\n'
  acc += 'Create a Argon2 encrypted backup copy of the password data\n'
  acc += '/backup <company>\n'
  return acc
}

module.exports = {
  command: async (cmdArgs) => {
    if (crypto.isPaused()) {
      await sendMessage('Busy backing up data, please try again after a few seconds.')
      return
    }
    const cmd = cmdArgs[0].toLowerCase()
    if (cmd === '/note') await note(cmdArgs)
    else if (cmd === '/noteclear') await noteClear(cmdArgs)
    else if (cmd === '/new') await newEntry(cmdArgs)
    else if (cmd === '/change') await changePw(cmdArgs)
    else if (cmd === '/update') await updatePw(cmdArgs)
    else if (cmd === '/rm') await remove(cmdArgs)
    else if (cmd === '/backup') await backup()
    else await sendMessage(menu())
    console.log(timeFmtDb(dateNowBKK()) + ' A command was issued: ' + cmdArgs.join(' '))
  }
}



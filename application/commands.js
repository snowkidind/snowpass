const signald = require('../signald-interface')
const { skills } = signald
const pwSkills = require('./pwSkills.js')
const { dateutils } = require('../utils/')
const { timeFmtDb, dateNowBKK } = dateutils

/* 
  Handle commands issued by the user
  - Parses signal inputs into proper args for pwSkills
*/

// /note <company> <note>
const note = async (args) => {
  if (args.length < 2) {
    await sendMessage('/note <company> <note>')
    return
  }
  const search = (await pwSkills.searchItem(args[1])).data
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
  if (await pwSkills.appendNote(note, search[0].name, search[0].password)) {
    await sendMessage('Note was added')
  } else {
    await sendMessage('Note not added, application error')
  }
}

// /noteclear <company>
const noteClear = async (args) => { 
  if (args.length < 2) {
    await sendMessage('/noteclear <company>')
    return
  }
  const search = (await pwSkills.searchItem(args[1])).data
  if (search.length > 1) {
    let names = ''
    search.forEach((entry) => { names += entry.name + '\n' })
    await sendMessage('Note was not edited, more than one result was found for ' + args[1] + ':\n' + names)
    return
  } else if (search.length === 0) {
    await sendMessage('Note was not edited, could not find matching entry for ' + args[1])
    return
  }
  if (await pwSkills.clearNote(search[0].name, search[0].password)) {
    await sendMessage('Notes for ' + search[0].name  + ' were cleared')
  } else {
    await sendMessage('Note was not cleared')
  }
}

// Password will be auto assigned and returned via signal
// /new <company> <userid> <note>
const newEntry = async (args) => {
  if (args.length < 3) {
    await sendMessage('/new <company> <userid> <note>')
    return
  }
  const search = (await pwSkills.searchItemExact(args[1])).data
  if (search.length > 0) {
    await sendMessage('Entry found for company with named: ' + search[0].name)
    return
  }
  let note = ''
  args.forEach((a, index) => {
    if (index > 2) {
      note += a + ' '
    }
  })
  if (note !== '') note += '\n'
  const json = await pwSkills.addRecord({name: args[1], user: args[2], note: note})
  await sendMessage('New record added\nSite: ' + json.name + '\n  User: ' +  json.user + '\n  Note: ' +  json.note)
  await sendMessage(json.password)
}

const ls = async () => {
  const search = (await pwSkills.itemList()).data
  if (search.length > 0) {
    let names = ''
    search.forEach((entry) => { names += entry + '\n' })
    await sendMessage('List of all names registered:\n' + names)
  } else {
    await sendMessage('No Items found')
  }
}

// /change <company> <newPassword> 
const changePw = async (args) => { 
  if (args.length < 3) {
    await sendMessage('/change <company> <newPassword> ')
    return
  }
  const search = (await pwSkills.searchItemExact(args[1])).data
  if (search.length > 1) {
    let names = ''
    search.forEach((entry) => { names += entry.name + '\n' })
    await sendMessage('Password was not changed, more than one result was found for ' + args[1] + ':\n' + names)
    return
  } else if (search.length === 0) {
    await sendMessage('Password was not changed, could not find matching entry for ' + args[1])
    return
  }
  if (await pwSkills.updateUserPassword(args[1], search[0].password, args[2])) {
    await sendMessage('Changed ' + search[0].password + ' to ' + args[2] + ' for ' + args[1])
  } else {
    await sendMessage('Could not change password, could not find: ' + args[1])
  }
}

// Update a company with a new auto assigned password
// /update <company>
const updatePw = async (args) => { 
  if (args.length < 2) {
    await sendMessage('/update <company>')
    return
  }
  const search = (await pwSkills.searchItemExact(args[1])).data
  if (search.length > 1) {
    let names = ''
    search.forEach((entry) => { names += entry.name + '\n' })
    await sendMessage('Password was not changed, more than one result was found for ' + args[1] + ':\n' + names)
    return
  } else if (search.length === 0) {
    await sendMessage('Password was not changed, could not find matching entry for ' + args[1])
    return
  }
  const result = await pwSkills.changePassword(args[1], search[0].password)
  if (result === false) {
    await sendMessage('Could not change password, couldnt find: ' + args[1])
  } else {
    await sendMessage('Changed ' + search[0].password + ' to ' + result + ' for ' + args[1])
  }
}

// /rm <company> <password> Remove a company from password tracking entirely
const remove = async (args) => { 
  if (args.length < 3) {
    await sendMessage('/rm <company> <password>')
    return
  }
  const rm = await pwSkills.deleteRecord(args[1], args[2])
  if (!rm) {
    await sendMessage('Entry was not found: ' + args[1] + ' with password: ' + args[2])
  } else {
    const info = rm.name + ' ' + rm.user + ' ' + rm.password
    await sendMessage('Entry was removed for ' + info)
  }
}

// /enc <prefix> Set the in memory prefix for encryption
const enc = async (args) => {
  if (args.length < 2) {
    await sendMessage('/enc <prefix>')
    return
  }
  if (process.env.USE_ENCRYPTION_PREFIX === 'true') {
    process.env.ENC_PREFIX = args[1]
    let works = false
    const search = await pwSkills.itemList()
    if (search.status === 'ok') works = true
    if (works) await sendMessage('Encryption key prefix was set')
    else await sendMessage('Unable to decrypt with encryption key prefix provided')
  } else {
    await sendMessage('The application is not configured to use an encryption key prefix')
  }
}

// /backup
const backup = async () => {
  // this is a failsafe for the backup cronjob, in order to allow forcing of the backup.
  if (await pwSkills.manualBackup()) {
    await sendMessage('Archive was backed up')
  } else {
    await sendMessage('Warning: Could not back up archive')
  }
}

const menu = () => {
  let acc = 'Command Menu\n\n'
  acc += 'Create a new entry, with an auto assigned password\n'
  acc += '/new <company> <userid> <note>\n'
  acc += '\n'
  acc += 'List entries\n'
  acc += '/ls\n'
  acc += '\n'
  acc += 'Append note information for specified company\n'
  acc += '/note <company> <note>\n'
  acc += '\n'
  acc += 'Clear note information for specified company\n'
  acc += '/noteclear <company> \n'
  acc += '\n'
  acc += 'Change item to user defined password\n'
  acc += '/change <company> <newPassword>\n'
  acc += '\n'
  acc += 'Update a company with a new auto assigned password \n'
  acc += '/update <company>\n'
  acc += '\n'
  acc += 'Remove a company from password tracking entirely\n'
  acc += '/rm <company> <password>\n'  
  acc += '\n'
  acc += 'Create a Argon2 encrypted backup copy of the password data\n'
  acc += '/backup\n'
  acc += '\n'
  acc += 'Set the encryption key prefix\n'
  acc += '/enc <key>\n'
  return acc
}

module.exports = {
  command: async (cmdArgs) => {
    if (pwSkills.isPaused()) {
      await sendMessage('Busy backing up data, please try again after a few seconds.')
      return
    }
    const cmd = cmdArgs[0].toLowerCase()
    if (cmd === '/note') await note(cmdArgs)
    else if (cmd === '/noteclear') await noteClear(cmdArgs)
    else if (cmd === '/new') await newEntry(cmdArgs)
    else if (cmd === '/ls') await ls()
    else if (cmd === '/change') await changePw(cmdArgs)
    else if (cmd === '/update') await updatePw(cmdArgs)
    else if (cmd === '/rm') await remove(cmdArgs)
    else if (cmd === '/backup') await backup()
    else if (cmd === '/enc') await enc(cmdArgs)
    else await sendMessage(menu())
    if (cmd === '/enc' || cmd === '/change' || cmd === '/rm' || cmd === '/update') {
      console.log(timeFmtDb(dateNowBKK()) + ' A command was issued: ' + cmd + ' *****')
    } else {
      console.log(timeFmtDb(dateNowBKK()) + ' A command was issued: ' + cmdArgs.join(' '))
    }
  }
}

const sendMessage = async (msg) => {
  await skills.sendMessage(process.env.LINKED_ACCOUNT, msg)
}

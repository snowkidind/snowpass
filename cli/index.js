const env = require('node-env-file')
env(__dirname + '/../.env')
const readline = require('node:readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})
const fs = require('fs')
const events = require('events')
const emitter = new events.EventEmitter()

const setup = require('./setup.js')

const { getAnswer, execute } = require('./common.js')
const pwSkills = require('../application/pwSkills.js')
const { encrypt } = require('../utils')
const { passwordSafe } = encrypt

const mainMenu = async () => {

  let menu = "  ####### Main Menu: #######\n\n"

  menu += "  enc         Set the encryption key prefix (required for menu commands)\n"
  menu += "  r           Retrieve a password\n"
  menu += "  new         Create a new entry, with an auto assigned password\n"
  menu += "  ls          List entries\n"
  menu += "  note        Append note information for specified company\n"
  menu += "  noteclear   Clear note information for specified company\n"
  menu += "  change      Change item to user defined password\n"
  menu += "  update      Update a company with a new auto assigned password\n"
  menu += "  rm          Remove a company from password tracking entirely\n"
  menu += "  backup      Create a Argon2 encrypted backup copy of the password data\n"
  menu += "  s           Setup tools\n"


  const answer = await getAnswer(rl, menu, mainMenu)
  const args = answer.split(' ')
  const query = args[0]

  if (process.env.USE_ENCRYPTION_PREFIX === 'true' &&
    typeof process.env.ENC_PREFIX === 'undefined' &&
    query !== 'enc' && query !== 's') {
    console.log('Must set encryption key to continue...')
    mainMenu()
    return
  }

  if (query === 'enc') {
    if (process.env.USE_ENCRYPTION_PREFIX === 'true') {
      const prefix = await getAnswer(rl, "Set the local encryption key prefix:", mainMenu)
      process.env.ENC_PREFIX = prefix
      let works = false
      const search = await pwSkills.itemList()
      if (search.status === 'ok') works = true
      if (works) console.log('Encryption key prefix was set')
      else console.log('Unable to decrypt with encryption key prefix provided')
    } else {
      console.log('The application is not configured to use an encryption key prefix')
    }
  }
  
  else if (query === 'r') {
    const q = await getAnswer(rl, "Search for an account:", mainMenu)
    const item = await pwSkills.searchItem(q.toLowerCase())
    if (item.status !== 'ok') {
      console.log(item.error)
      mainMenu()
      return
    }
    if (item.data.length === 0) {
      console.log('There were no matches for search: ' + q)
      mainMenu()
      return
    }
    if (item.data.length === 1 || item.data[0].name === q) {
      const message1 = item.data[0].name + ' ' + item.data[0].user + ' ' + item.data[0].note
      const message2 = item.data[0].password
      console.log(message1)
      console.log(message2)
      mainMenu()
      return
    }
    for (let i = 0; i < item.data.length; i++) {
      message1 = item.data[i].name + ' ' + item.data[i].user + ' ' + item.data[i].note
      console.log(message1)
      message2 = item.data[i].password
      console.log(message2)
    }
  }
    
  else if (query === 'new') {
    const company = await getAnswer(rl, "name of the company:", mainMenu)
    const userid = await getAnswer(rl, "account: <email or username>", mainMenu)
    const note = await getAnswer(rl, "note to associate", mainMenu)
    const search = (await pwSkills.searchItemExact(company)).data
    if (search.length > 0) {
      console.log('Entry found for company with named: ' + search[0].name)
      mainMenu()
      return
    }
    const json = await pwSkills.addRecord({ name: company, user: userid, note: note })
    console.log('New record added\nSite: ' + json.name + '\n  User: ' + json.user + '\n  Note: ' + json.note)
    console.log(json.password)
  }
    
  else if (query === 'ls') {
    const search = (await pwSkills.itemList()).data
    if (search.length > 0) {
      let names = ''
      search.forEach((entry) => { names += entry + '\n' })
      console.log(names)
    }
  }
    
  else if (query === 'note') {

  }
  else if (query === 'noteclear') {

  }
  else if (query === 'change') {
    const company = await getAnswer(rl, "name of the company:", mainMenu)
    const newPassword = await getAnswer(rl, "newPassword:", mainMenu)
    const search = (await pwSkills.searchItemExact(company)).data
    if (search.length > 1) {
      let names = ''
      search.forEach((entry) => { names += entry.name + '\n' })
      console.log('Password was not changed, more than one result was found for ' + company + ':\n' + names)
      mainMenu()
      return
    } else if (search.length === 0) {
      console.log('Password was not changed, could not find matching entry for ' + company)
      mainMenu()
      return
    }
    if (await pwSkills.updateUserPassword(company, search[0].password, newPassword)) {
      console.log('Changed ' + search[0].password + ' to ' + newPassword + ' for ' + company)
    } else {
      console.log('Could not change password, could not find: ' + company)
    }
  }
    
  else if (query === 'update') {

  }
  else if (query === 'rm') {

  }
  else if (query === 'backup') {

  }
  else if (query === 's') {
    await setup.setupMenu(rl, emitter)
  }
  else if (query === 'q') {
    console.log("Exit.")
    rl.close()
    process.exit()
  }

  mainMenu()

}

emitter.on('ready', function () {
  mainMenu()
})

  ; (async () => {
    const v = process.version.slice(1, 3)
    if (Number(v) < 19) {
      console.log('This script was written in Node 19.3.0')
      process.exit(1)
    }
    try {
      await mainMenu()
    } catch (error) {
      console.log(error)
      process.exit(1)
    }
  })()

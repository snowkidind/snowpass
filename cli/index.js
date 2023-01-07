const env = require('node-env-file')
env(__dirname + '/../.env')
const speakeasy = require('speakeasy')
const readline = require('node:readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const events = require('events')
const emitter = new events.EventEmitter()

const { file } = require('../utils')
const { getAnswer, execute } = require('./common.js')
const crypto = require('../application/crypto.js')
const instaSignal = require('../application/instaSignal.js')

const mainMenu = async () => {

  let menu = "  ####### Main Menu: #######\n"
  menu += "  s    Search\n"
  menu += "  r    Retrieve by index\n"
  menu += "  i    Import Passwords\n"
  menu += "  2    Generate / Replace 2fa Key\n"
  menu += "  q     Exit\n\n"
  menu += "  Enter a command:\n "

  const answer = await getAnswer(rl, menu, mainMenu)
  const args = answer.split(' ')
  const query = args[0]

  if (query === "i") {
    console.log('Import Passwords')
    const pwFile = await getAnswer(rl, "Enter full path to your password JSON file", mainMenu)
    const exists = await crypto.dataStoreExists()
    if (exists) {
      await execute(rl, "This will overwrite existing password store.", mainMenu)
    }
    const result = await crypto.importPasswords(pwFile)
    if (result.status !== 'ok') {
      console.log('Couldn\'t import passwords: ' + result.error)
    } else {
      console.log(result.message)
    }  
  }

  else if (query === "r") {
    await listItems()
    const retrieve = await getAnswer(rl, "Enter the item id to retrieve:", mainMenu)
    const item = await crypto.retrieveItem(retrieve)
    if (item.status !== 'ok') {
      console.log(item.error)
    } else {
      console.log(item.data)
    }
  }

  else if (query === "s") {
    const retrieve = await getAnswer(rl, "Enter the item to search for:", mainMenu)
    const item = await crypto.searchItem(retrieve)
    if (item.status !== 'ok') {
      console.log(item.error)
    } else {
      console.log(item.data)
    }
  } 
  
  else if (query === "2") {

    await execute(rl, "This will overwrite existing 2FA codes.", mainMenu)

    const temp_secret = speakeasy.generateSecret()
    await instaSignal.spinUp()
    await instaSignal.sendMessage(temp_secret.base32)
    await instaSignal.spinDown()
    const contractEnv = __dirname + '/../.env'
    const envFile = (await file.readFile(contractEnv)).split('\n')
    let newFile = ''
    for (let i = 0; i < envFile.length; i++) {
      if (envFile[i].includes('TOTP_KEY')) {
        newFile += 'TOTP_KEY=' + temp_secret.base32 + '\n'
      } else {
        newFile += envFile[i] + '\n'
      }
    }

    await file.writeFile(contractEnv, newFile)
    console.log('Env file was modified.')
    console.log('The 2fa secret has been sent to signal, be sure to add it to authenticator and then delete the message.')
    console.log('Be sure to restart the monitor application for the changes to take effect')
    await getAnswer(rl, "Push enter for menu.", mainMenu)

  }

  else if (query === "q") {
    console.log("Exit.")
    rl.close()
    process.exit()
  } 
  mainMenu()
}

const listItems = async () => {
  const items = await crypto.itemList()
  if (items.status !== 'ok') {
    console.log(items.error)
  } else {
    for (let i = 0; i < items.data.length; i++) {
      const index = i + 1
      console.log(index + ': ' + items.data[i])
    }
  }
}

// An emitter is used to call the main menu because submenus tend to 
// lose the readline handle because of its callback interface in node 14, 
// which I am using because web3 tech is stuck on it
emitter.on('ready', function () {
  mainMenu()
})

const sendMessage = async (msg) => {
  await signald.skills.sendMessage(process.env.LINKED_ACCOUNT, msg)
}

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



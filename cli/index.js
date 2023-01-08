const env = require('node-env-file')
env(__dirname + '/../.env')
const readline = require('node:readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const events = require('events')
const emitter = new events.EventEmitter()

const { getAnswer, execute } = require('./common.js')
const skills = require('../application/pwSkills.js')

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
    const exists = await skills.dataStoreExists()
    if (exists) {
      await execute(rl, "This will overwrite existing password store.", mainMenu)
    }
    const result = await skills.importPasswords(pwFile)
    if (result.status !== 'ok') {
      console.log('Couldn\'t import passwords: ' + result.error)
    } else {
      console.log(result.message)
    }  
  }

  else if (query === "r") {
    await listItems()
    const retrieve = await getAnswer(rl, "Enter the item id to retrieve:", mainMenu)
    const item = await skills.retrieveItem(retrieve)
    if (item.status !== 'ok') {
      console.log(item.error)
    } else {
      console.log(item.data)
    }
  }

  else if (query === "s") {
    const retrieve = await getAnswer(rl, "Enter the item to search for:", mainMenu)
    const item = await skills.searchItem(retrieve)
    if (item.status !== 'ok') {
      console.log(item.error)
    } else {
      console.log(item.data)
    }
  } 

  else if (query === "q") {
    console.log("Exit.")
    rl.close()
    process.exit()
  } 
  mainMenu()
}

const listItems = async () => {
  const items = await skills.itemList()
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



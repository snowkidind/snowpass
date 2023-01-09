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
  menu += "  i    Import Passwords\n"
  menu += "  e    Initialize with no passwords\n"
  menu += "  q     Exit\n\n"
  menu += "  Enter a command:\n "

  const answer = await getAnswer(rl, menu, mainMenu)
  const args = answer.split(' ')
  const query = args[0]

  if (query === "i") {
    console.log('Import Passwords')
    console.log(__dirname + '/../data/examplepasswords.json')
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

  if (query === "e") {
    console.log('Initialize with no passwords')
    const exists = await skills.dataStoreExists()
    if (exists) {
      await execute(rl, "This will overwrite existing password store.", mainMenu)
    }
    const result = await skills.emptySet()
    if (result.status !== 'ok') {
      console.log('Couldn\'t import passwords: ' + result.error)
    } else {
      console.log(result.message)
    }
  }

  else if (query === "q") {
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

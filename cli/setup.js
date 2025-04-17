const { getAnswer, execute } = require('./common.js')
const skills = require('../application/pwSkills.js')
const { encrypt } = require('../utils')
const { passwordSafe } = encrypt

let rl, emitter, setupMenu

module.exports = {

  setupMenu: async (_rl, _emitter) => {

    setupMenu = module.exports.setupMenu

    if (typeof _rl !== 'undefined') {
      rl = _rl
      emitter = _emitter
    }

    const keySet = () => {
      if (typeof process.env.ENCRYPTION_KEY === 'undefined' || process.env.ENCRYPTION_KEY === '') {
        return false
      }
      return true
    }
    const usePrefix = () => {
      if (process.env.USE_ENCRYPTION_PREFIX !== 'true') {
        return false
      }
      return true
    }
    const prefixSet = () => {
      if (typeof process.env.ENC_PREFIX === 'undefined' || process.env.ENC_PREFIX === '') {
        return false
      }
      return true
    }

    let menu = "  ####### Setup Menu: #######\n\n"
    menu += "  g    Generate local encryption key and install\n"
    menu += "       In order to keep encrypted backups, it is necessary to have an encryption key. \n"
    menu += "       The system uses a split encryption key, half stored on the device, the other\n"
    menu += "       injected into ram via the signal interface. This command will automatically\n"
    menu += "       generate the backside key and insert it into the .env file\n"
    menu += "       To use an existing key, modify the .env file with the key.\n\n"

    menu += "  k    Set remote encryption key\n"
    menu += "       This allows you use the \"import passwords\" command below using the split key method.\n"
    menu += "       This command will inject the remote key into the current process without writing\n"
    menu += "       it to disk. To create the password file's encryption key, these keys will be concatenated.\n\n"

    menu += "  ir   Import raw passwords\n"
    menu += "       This allows you to bring passwords in using the split key method. This command will\n"
    menu += "       read a JSON file and convert the data into a encrypted file. You should remove the JSON file\n"
    menu += "       after performing this operation.\n\n"

    menu += "  ie   Import encrypted data store\n"
    menu += "       This allows you to import passwords from a previous installation. You will need both\n"
    menu += "       local and remote encryption keys to continue (and work) in order to complete this command.\n\n"

    menu += "  e    Initialize with no passwords\n"
    menu += "       This creates a new encrypted data store with no entries.\n\n"

    menu += "  q    Exit\n\n"
    menu += "  Enter a command:\n "

    const answer = await getAnswer(rl, menu, setupMenu)

    const args = answer.split(' ')
    let query = args[0]


    if (query === "g") {
      console.log("Generate local encryption key. this will overwrite any encryption key currently set in .env")
      const length = await getAnswer(rl, "Set the local encryption key length: (Recommended: 32)", mainMenu)
      const key = passwordSafe(length)
      const dotEnv = __dirname + '/../.env'
      const envFile = (await fs.readFileSync(dotEnv, 'utf8')).split('\n')
      let newFile = ''
      let found = false
      for (let i = 0; i < envFile.length; i++) {
        if (envFile[i].includes('ENCRYPTION_KEY')) {
          found = true
        } else {
          newFile += envFile[i] + '\n'
        }
      }
      if (!found) {
        newFile += 'ENCRYPTION_KEY=' + key + '\n'
      } else {
        const execute = await getAnswer(rl, "Overwrite existing encryption key?", mainMenu)
        if (execute === 'y') {
          newFile += 'ENCRYPTION_KEY=' + key + '\n'
        } else {
          mainMenu()
          return
        }
      }
      await fs.writeFileSync(dotEnv, newFile)
      console.log('Env file was modified.')
    }
    if (query === "k") {
      console.log('Set remote encryption key')
      if (!keySet()) {
        console.log('Cannot Proceed. Local encryption key is not set')
        await getAnswer(rl, "OK. (any)", mainMenu)
        mainMenu()
        return
      } else if (!usePrefix()) {
        console.log('Cannot Proceed. App is not configured to use a remote key')
        await getAnswer(rl, "OK. (any)", mainMenu)
        mainMenu()
        return
      } else {
        const remoteKey = await getAnswer(rl, "Set or generate the remote encryption key: (<remotekey>, g)", mainMenu)
        if (remoteKey === 'g') {
          const length = await getAnswer(rl, "Set the remote encryption key length: (Recommended: 32)", mainMenu)
          const key = passwordSafe(length)
          process.env.ENC_PREFIX = key
          console.log('The key ' + key + ' was generated. Please write it down:\n\n')
          const fours = key.match(/.{1,4}/g) ?? [];
          let all = ''
          fours.forEach((f) => { all += f + ' ' })
          console.log(all + '\n\n')
          await getAnswer(rl, "OK. (any)", mainMenu)
        } else {
          process.env.ENC_PREFIX = remoteKey
        }
        console.log('remote encryption key was set. This will stay in memory until the program closes. To render permanent initialize a data store.')
      }
    }

    if (query === "ir") {
      if (!keySet()) {
        console.log('Cannot Proceed. Local encryption key is not set')
        await getAnswer(rl, "OK. (any)", mainMenu)
        mainMenu()
        return
      }
      if (usePrefix() && !prefixSet()) {
        console.log('Cannot Proceed. Remote encryption key is not set')
        await getAnswer(rl, "OK. (any)", mainMenu)
        mainMenu()
        return
      }
      console.log('Import Passwords, The format must be as shown in:')
      console.log(__dirname + '/../data/examplepasswords.json')
      const pwFile = await getAnswer(rl, "Enter full path to your password JSON file", mainMenu)
      const exists = await skills.dataStoreExists()
      // check for local and remote keys in memory
      if (exists) {
        await execute(rl, "WARNING: This will overwrite existing password store.", mainMenu)
      }
      const result = await skills.importPasswords(pwFile)
      if (result.status !== 'ok') {
        console.log('Couldn\'t import passwords: ' + result.error)
      } else {
        console.log(result.message)
      }
    }

    if (query === "ie") {
      console.log('In order to install an existing data.enc file, first place the file in the data dir within the project dir.')
      const exists = await fs.existsSync(__dirname + '/../data/data.enc')
      if (!exists) {
        console.log('The file is not found. Please install the file at: ' + __dirname + '/../data/data.enc')
        mainMenu()
        return
      } else {
        console.log('The enc file was found.')
      }
      if (!keySet()) {
        console.log('Cannot Proceed. Local encryption key is not set.')
        await getAnswer(rl, "OK. (any)", mainMenu)
        mainMenu()
        return
      }
      if (usePrefix() && !prefixSet()) {
        console.log('Cannot Proceed. Remote encryption key is not set.')
        await getAnswer(rl, "OK. (any)", mainMenu)
        mainMenu()
        return
      }
      const items = await skills.itemList()
      if (items.status === 'ok') {
        console.log('Success! Found ' + items.data.length + ' entries in this password file.')
        console.log('All set!')
      } else {
        if (items.status !== 'ok') {
          console.log('Couldnt decode the file. Perhaps the key isnt correct.')
          console.log(items.error)
        }
      }
      await getAnswer(rl, "OK. (any)", mainMenu)
    }

    if (query === "e") {
      console.log('Initialize with no passwords')
      if (!keySet()) {
        console.log('Cannot Proceed. Local encryption key is not set')
        await getAnswer(rl, "OK. (any)", mainMenu)
        mainMenu()
        return
      }
      if (usePrefix() && !prefixSet()) {
        console.log('Cannot Proceed. Remote encryption key is not set')
        await getAnswer(rl, "OK. (any)", mainMenu)
        mainMenu()
        return
      }

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

    else if (query === 'm') {
      emitter.emit('ready')
      return
    } else if (query === 'q') {
      console.log("Exit.")
      rl.close()
      process.exit()
    }
    setupMenu()
  }
}
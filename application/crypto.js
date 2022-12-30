const fs = require('fs')
const { encrypt } = require('../utils')

const pbkdf2iterations = Number(process.env.PBKDF2_ITERATIONS)
const encryptionKey = process.env.ENCRYPTION_KEY
const dataStore = __dirname + '/../data/data.enc'

module.exports = {

  dataStoreExists: async () => {
    return fs.existsSync(dataStore)
  },

  importPasswords: async (path) => {
    if (fs.existsSync(path)) {
      const json = await fs.readFileSync(path)
      const plaintextbytes = new TextEncoder("utf-8").encode(json)
      const cypherdata = await encrypt.encrypt(encryptionKey, plaintextbytes, pbkdf2iterations)
      await fs.writeFileSync(dataStore, cypherdata)
      return { status: 'ok', message: 'Passwords imported successfully' }
    } else {
      return {status: 'error', error: 'Application Error'}
    }
  },

  itemList: async () => {
    try {
      const store = await getDataStore()
      return { status: "ok", data: Object.keys(store) }
    } catch (error) {
      return { status: error, error: "Application Error"}
    }
  },

  // Retrieves an item by index.
  retrieveItem: async (retrieve) => {
    try {
      const store = await getDataStore()
      let found
      let i = 1
      for (item in store) {
        if (i === Number(retrieve)) {
          found = store[item]
          found['name'] = item
          break
        }
        i += 1
      }
      return { status: "ok", data: found }
    } catch (error) {
      return { status: error, error: "Application Error" }
    }
  },

  searchItem: async (item) => {
    try {
      const store = await getDataStore()
      let i = 1
      let found = []
      for (const key in store) {
        if (key.toLowerCase().includes(item.toLowerCase())) {
          let thisFind = store[key]
          thisFind['name'] = key
          found.push(thisFind)
        }
        i += 1
      }
      return { status: "ok", data: found }
    } catch (error) {
      console.log(error)
      return { status: error, error: "Application Error" }
    }
  }
}

const getDataStore = async () => {
  const rawEnc = await fs.readFileSync(dataStore)
  const decrypted = await encrypt.decrypt(encryptionKey, rawEnc, pbkdf2iterations)
  return JSON.parse(decrypted)
}
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
    // should test for proper format (e.g, file is a JSON array)
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
      const names = []
      for (let i = 0; i < store.length; i++) {
        names.push(store[i].name)
      }
      return { status: "ok", data: names }
    } catch (error) {
      return { status: error, error: "Application Error"}
    }
  },

  // Retrieves an item by index.
  retrieveItem: async (retrieve) => {
    try {
      const store = await getDataStore()
      for (let i = 0; i < store.length; i++) {
        const index = i + 1
        if (index === Number(retrieve)) {
          return { status: "ok", data: store[i] }
        }
      }
      return { status: "ok", data: {} }
    } catch (error) {
      return { status: error, error: "Application Error" }
    }
  },

  searchItem: async (item) => {
    try {
      const store = await getDataStore()
      let found = []
      for (let i = 0; i < store.length; i++) {
        if (store[i].name.toLowerCase().includes(item.toLowerCase())) {
          found.push(store[i])
        }
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
const fs = require('fs')
const { dateutils, encrypt } = require('../utils')
const { passwordSafe } = encrypt
const { dateNowBKK, timeFmtDb, _timeFmtDb, _toEpoch } = dateutils

const dataStoreDir = __dirname + '/../data/'
const dataStore = __dirname + '/../data/data.enc'
const encryptionKey = process.env.ENCRYPTION_KEY
let pause = false

/* 
  Handle tasks involving accessing the password file. 
*/

module.exports = {

  isPaused: () => {
    return pause
  },

  dataStoreExists: async () => {
    return fs.existsSync(dataStore)
  },

  emptySet: async () => {
    pause = true
    const plaintextbytes = new TextEncoder("utf-8").encode('[]')
    const cypherdata = await encrypt.encrypt(encryptionKey, plaintextbytes)
    await fs.writeFileSync(dataStore, cypherdata)
    pause = false
    return { status: 'ok', message: 'Empty Set' }
  },

  importPasswords: async (path) => {
    try {
      // should test for proper format (e.g, file is a JSON array)
      pause = true
      if (fs.existsSync(path)) {
        const json = await fs.readFileSync(path)
        const plaintextbytes = new TextEncoder("utf-8").encode(json)
        const cypherdata = await encrypt.encrypt(encryptionKey, plaintextbytes)
        await fs.writeFileSync(dataStore, cypherdata)
        pause = false
        return { status: 'ok', message: 'Passwords imported successfully' }
      } else {
        pause = false
        return { status: 'error', error: 'Application Error' }
      }
    } catch (error) {
      console.log(error)
      pause = false
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
  },

  searchItemExact: async (item) => {
    try {
      const store = await getDataStore()
      let found = []
      for (let i = 0; i < store.length; i++) {
        if (store[i].name.toLowerCase() === item.toLowerCase()) {
          found.push(store[i])
        }
      }
      return { status: "ok", data: found }
    } catch (error) {
      console.log(error)
      return { status: error, error: "Application Error" }
    }
  },

  addRecord: async (record) => {
    const newPassword = await passwordSafe(process.env.PASSWORD_LENGTH)
    let json = await getDataStore()
    record['password'] = newPassword
    json.push(record)
    await writeDataStore(json)
    return record
  },

  deleteRecord: async (name, password) => {
    const dataStore = await getDataStore()
    const index = dataStore.findIndex(record => record.name.toLowerCase() === name.toLowerCase() && record.password === password)
    if (index === -1) {
      return false
    } else {
      const deleted = dataStore[index]
      dataStore.splice(index, 1)
      await writeDataStore(dataStore)
      return deleted
    }
  },

  appendNote: async (note, name, password) => {
    const dataStore = await getDataStore()
    const index = dataStore.findIndex(record => record.name.toLowerCase() === name.toLowerCase() && record.password === password)
    if (index === -1) {
      return false
    } else {
      dataStore[index].note += note + '\n'
      await writeDataStore(dataStore)
      return true
    }
  },

  clearNote: async (name, password) => {
    const dataStore = await getDataStore()
    const index = dataStore.findIndex(record => record.name.toLowerCase() === name.toLowerCase() && record.password === password)
    if (index === -1) {
      return false
    } else {
      dataStore[index].note = ''
      await writeDataStore(dataStore)
      return true
    }
  },

  changePassword: async (name, oldPassword) => {
    const newPassword = await passwordSafe(process.env.PASSWORD_LENGTH)
    return await updatePassword(name, oldPassword, newPassword)
  },

  updateUserPassword: async (name, oldPassword, newPassword) => {
    return await updatePassword(name, oldPassword, newPassword)
  },

  manualBackup: async () => {
    return await forceBackup()
  },

  _backupSchedule: async () => {
    await backupSchedule()
  }
}

const updatePassword = async (name, oldPassword, newPassword) => {
  const dataStore = await getDataStore()
  const index = dataStore.findIndex(record => record.name === name && record.password === oldPassword)
  if (index === -1) {
    return false
  } else {
    dataStore[index].password = newPassword
    await writeDataStore(dataStore)
    return newPassword
  }
}

const writeDataStore = async (json) => {
  try {
    await backupDataStore()
    pause = true
    const plaintextbytes = new TextEncoder("utf-8").encode(JSON.stringify(json, null, 4))
    const cypherdata = await encrypt.encrypt(encryptionKey, plaintextbytes)
    await fs.writeFileSync(dataStore, cypherdata)
    pause = false
  } catch (error) {
    console.log(error)
    pause = false
  }
}

const backupDataStore = async () => {
  if (!fs.existsSync(dataStore)) {
    console.log('dataStore does not exist!')
  }
  const dir = await fs.readdirSync(dataStoreDir)
  let recentFound = false
  for (let i = 0; i < dir.length; i++) {
    const time = dateNowBKK()
    if (dir[i].includes('.enc.bak')) {
      const backup = dir[i].replace('.enc.bak', '')
      const thisTime = _toEpoch(backup)
      const diff = Math.floor((time - thisTime) / 1000 / 60) // integer of minutes since last backup
      if (diff < Number(process.env.BACKUP_EVERY)) {
        recentFound = true
      }
    }
  }
  if (!recentFound) {
    await forceBackup()
  }
}

const forceBackup = async () => {
  try {
    pause = true
    console.log(timeFmtDb(dateNowBKK()) + ' Forcing Datafile Backup')
    const time = _timeFmtDb(dateNowBKK())
    const rawEnc = await fs.readFileSync(dataStore)
    await fs.writeFileSync(dataStoreDir + '/' + time + '.enc.bak', rawEnc)
    pause = false
    return true
  } catch (error) {
    console.log(error)
    pause = false
    return false
  }
}

// for previous months there should be only one backup per month
// for the current day, allow all backups, cleaning up previous
// for the past 30 days there should be one backup per day
const backupSchedule = async () => {
  const twentyFourH = 24 * 60 * 60 * 1000
  const thirtyD = twentyFourH * 30
  const plus30d = []
  const plus24h = []
  const today = []
  const now = dateNowBKK()
  const dir = await fs.readdirSync(dataStoreDir)
  for (let i = 0; i < dir.length; i++) {
    if (dir[i].includes('.enc.bak')) {
      const thisDate = _toEpoch(dir[i].replace('.enc.bak', ''))
      const diff = now - thisDate
      if (diff < twentyFourH) {
        today.push(dir[i])
      } else if (diff < thirtyD) {
        plus24h.push(dir[i])
      } else {
        plus30d.push(dir[i])
      }
    }
  }
  let days = []
  let months = []
  for (let i = 0; i < 30; i++) {
    days.push([])
    months.push([])
  }
  // Remove redundant daily backups
  for (let i = 0; i < plus24h.length; i++) {
    const thisDate = timeFmtDb(_toEpoch(plus24h[i].replace('.enc.bak', '')))
    const day = Number(thisDate.substr(8, 2))
    days[day].push(plus24h[i])
  }
  for (let i = 0; i < days.length; i++) {
    if (days[i].length > 1) {
      const cleanup = days[i]
      for (let j = 1; j < cleanup.length; j++) {
        await fs.rmSync(__dirname + '/../data/' + cleanup[j])
        console.log(timeFmtDb(dateNowBKK()) + ' Removed redundant backup file: ' + __dirname + '/../data/' + cleanup[j])
      }
    }
  }
  // remove redundant monthly backups
  for (let i = 0; i < plus30d.length; i++) {
    const thisDate = timeFmtDb(_toEpoch(plus30d[i].replace('.enc.bak', '')))
    const month = Number(thisDate.substr(5, 2))
    months[month].push(plus30d[i])
  }
  for (let i = 0; i < months.length; i++) {
    if (months[i].length > 1) {
      const cleanup = months[i]
      for (let j = 1; j < cleanup.length; j++) {
        await fs.rmSync(__dirname + '/../data/' + cleanup[j])
        console.log(timeFmtDb(dateNowBKK()) + ' Removed redundant backup file: ' + __dirname + '/../data/' + cleanup[j])
      }
    }
  }
}

const getDataStore = async () => {
  const rawEnc = await fs.readFileSync(dataStore)
  const decrypted = await encrypt.decrypt(encryptionKey, rawEnc)
  return JSON.parse(decrypted)
}

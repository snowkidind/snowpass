
const crypto = require('crypto')
const argon2 = require('argon2')


const env = require('node-env-file')
env(__dirname + '/../.env')
const fs = require('fs')
const dataStore = __dirname + '/../data/data.enc'


module.exports = {

  passwordSafe: (length) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789123456789!@#$%^&*!@#$%^&*!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      const index = crypto.randomBytes(1)[0] % charset.length
      password += charset.charAt(index)
    }
    return password
  },

  encrypt: async (encryptionKey, plaintextbytes) => {
    const saltSeed = crypto.getRandomValues(new Uint8Array(8)).buffer
    const passphrasekeybytes = await argon2.hash(encryptionKey, { hashLength: 48, saltLength: 8 })
    const [_, id, version, settings, salt, hash] = passphrasekeybytes.split('$')
    const argon2bytes = Buffer.from(hash, 'base64')
    const keybytes = argon2bytes.slice(0, 32)    
    const ivbytes = argon2bytes.slice(32)
    const key = await crypto.subtle.importKey('raw', keybytes, { name: 'AES-CBC', length: 256 }, false, ['encrypt'])
    let cipherbytes = await crypto.subtle.encrypt({ name: "AES-CBC", iv: ivbytes }, key, plaintextbytes)
    cipherbytes = new Uint8Array(cipherbytes)
    const resultbytes = new Uint8Array(cipherbytes.length + 16)
    resultbytes.set(new TextEncoder("utf-8").encode('Salted__'))
    resultbytes.set(Buffer.from(salt, 'base64'), 8)
    resultbytes.set(cipherbytes, 16)
    return resultbytes
  },

  decrypt: async (encryptionKey, ciphertextbytes) => {
    const argon2salt = ciphertextbytes.slice(8, 16)
    const passphrasekeybytes = await argon2.hash(encryptionKey, { hashLength: 48, salt:argon2salt })
    const [_, id, version, settings, salt2, hash] = passphrasekeybytes.split('$')
    const argon2bytes = Buffer.from(hash, 'base64')
    const keybytes = argon2bytes.slice(0, 32)
    const ivbytes = argon2bytes.slice(32, 48)
    const iv = new Uint8Array(ivbytes)
    const key = await crypto.subtle.importKey('raw', keybytes, { name: 'AES-CBC', length: 256 }, false, ['decrypt'])
    const plaintextbytes = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, ciphertextbytes.slice(16))
    return new TextDecoder("utf-8").decode(plaintextbytes)
  },

  encryptPBKDF2: async (encryptionKey, plaintextbytes, pbkdf2iterations) => { 
    const passphrasebytes = new TextEncoder("utf-8").encode(encryptionKey)
    const pbkdf2salt = crypto.getRandomValues(new Uint8Array(8))
    const passphrasekey = await crypto.subtle.importKey('raw', passphrasebytes, { name: 'PBKDF2' }, false, ['deriveBits'])
    let pbkdf2bytes = await crypto.subtle.deriveBits(
      { "name": 'PBKDF2', "salt": pbkdf2salt, "iterations": pbkdf2iterations, "hash": 'SHA-256' }, passphrasekey, 384)
    pbkdf2bytes = new Uint8Array(pbkdf2bytes)
    const keybytes = pbkdf2bytes.slice(0, 32)
    const ivbytes = pbkdf2bytes.slice(32)
    const key = await crypto.subtle.importKey('raw', keybytes, { name: 'AES-CBC', length: 256 }, false, ['encrypt'])
    let cipherbytes = await crypto.subtle.encrypt({ name: "AES-CBC", iv: ivbytes }, key, plaintextbytes)
    cipherbytes = new Uint8Array(cipherbytes)
    const resultbytes = new Uint8Array(cipherbytes.length + 16)
    resultbytes.set(new TextEncoder("utf-8").encode('Salted__'))
    resultbytes.set(pbkdf2salt, 8)
    resultbytes.set(cipherbytes, 16)
    return resultbytes
  },

  decryptPBKDF2: async (encryptionKey, cipherbytes, pbkdf2iterations)  => { 
    const passphrasebytes = new TextEncoder("utf-8").encode(encryptionKey)
    const pbkdf2salt = cipherbytes.slice(8, 16)
    const passphrasekey = await crypto.subtle.importKey('raw', passphrasebytes, { name: 'PBKDF2' }, false, ['deriveBits'])
    let pbkdf2bytes = await crypto.subtle.deriveBits(
      { "name": 'PBKDF2', "salt": pbkdf2salt, "iterations": pbkdf2iterations, "hash": 'SHA-256' }, passphrasekey, 384)
    pbkdf2bytes = new Uint8Array(pbkdf2bytes)
    let keybytes = pbkdf2bytes.slice(0, 32)
    let ivbytes = pbkdf2bytes.slice(32)
    cipherbytes = cipherbytes.slice(16)
    const key = await crypto.subtle.importKey('raw', keybytes, { name: 'AES-CBC', length: 256 }, false, ['decrypt'])
    let plaintextbytes = await crypto.subtle.decrypt({ name: "AES-CBC", iv: ivbytes }, key, cipherbytes)
    plaintextbytes = new Uint8Array(plaintextbytes)
    return new Buffer.from(plaintextbytes).toString('ascii')
  }
}

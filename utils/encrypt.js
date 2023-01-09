
const crypto = require('crypto')
const argon2 = require('argon2')

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

  encryptWORK: async (encryptionKey, plaintextbytes) => {
    const passphrasebytes = new TextEncoder("utf-8").encode(encryptionKey)
    const salt = crypto.getRandomValues(new Uint8Array(8))
    const passphrasekey = argon2.hash({ pass: passphrasebytes, salt: salt, argon2d: true })
    const keybytes = passphrasekey
    const ivbytes = crypto.getRandomValues(new Uint8Array(16))
    const key = await crypto.subtle.importKey('raw', keybytes, { name: 'AES-CBC', length: 256 }, false, ['encrypt'])
    let cipherbytes = await crypto.subtle.encrypt({ name: "AES-CBC", iv: ivbytes }, key, plaintextbytes)
    cipherbytes = new Uint8Array(cipherbytes)
    const resultbytes = new Uint8Array(cipherbytes.length + 16)
    resultbytes.set(new TextEncoder("utf-8").encode('Salted__'))
    resultbytes.set(salt, 8)
    resultbytes.set(cipherbytes, 16)
    return resultbytes
  },

  decryptWORK: async (encryptionKey, cipherbytes) => {
    const passphrasebytes = new TextEncoder("utf-8").encode(encryptionKey)
    const salt = cipherbytes.slice(8, 16)
    const passphrasekey = argon2.hash({ pass: passphrasebytes, salt: salt, argon2d: true })
    const keybytes = passphrasekey
    let ivbytes = crypto.getRandomValues(new Uint8Array(16))
    cipherbytes = cipherbytes.slice(16)
    const key = await crypto.subtle.importKey('raw', keybytes, { name: 'AES-CBC', length: 256 }, false, ['decrypt'])
    let plaintextbytes = await crypto.subtle.decrypt({ name: "AES-CBC", iv: ivbytes }, key, cipherbytes)
    plaintextbytes = new Uint8Array(plaintextbytes)
    return new Buffer.from(plaintextbytes).toString('ascii')
  },

  encrypt: async (encryptionKey, plaintextbytes, pbkdf2iterations) => { 
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

  decrypt: async (encryptionKey, cipherbytes, pbkdf2iterations)  => { 
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

// Access for the v2 functions
'use strict'

const socketJs = require('./socket.js')
const utils = require('./utils.js')
const idRouter = require('./idRouter.js')

module.exports = {

  /**
   * List Groups known to signald account
   */
  listGroups: () => {
    return new Promise(async (resolve, reject) => {
      const address = numbersToFormat([process.env.BOT_ACCOUNT])
      writeSocket({
        "account": process.env.BOT_ACCOUNT,
        "address": address,
        "type": "list_groups",
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('listGroups', receipt)
        resolve(receipt)
      })
    })
  },

  getIdentities: (phone) => {
    return new Promise(async (resolve, reject) => {
      writeSocket({
        "type": "get_identities",
        "username": process.env.BOT_ACCOUNT,
        "recipientAddress": phone
      }, async function (receipt) {
        await saveReceipt('getIdentities', receipt)
        resolve(receipt)
      })
    })
  },

  /**
   * a user is trusted
   */
  trustUser: (e164, safetyNumber) => {
    return new Promise(async (resolve, reject) => {
      const phone = numberToFormat(e164)
      writeSocket({
        "username": process.env.BOT_ACCOUNT,
        "type": "trust",
        "trustLevel": "TRUSTED_VERIFIED",
        "recipientAddress": phone,
        "fingerprint": safetyNumber
      }, async function (receipt) {
        await saveReceipt('trustUser', receipt)
        resolve(receipt)
      })
    })
  },

  /**
   * revoke trusted status
   */
  untrustUser: (e164, safetyNumber) => {
    return new Promise(async (resolve, reject) => {
      const phone = numberToFormat(e164)
      writeSocket({
        "username": process.env.BOT_ACCOUNT,
        "type": "trust",
        "trustLevel": "TRUSTED_UNVERIFIED",
        "recipientAddress": phone,
        "fingerprint": safetyNumber
      }, async function (receipt) {
        await saveReceipt('untrustUser', receipt)
        resolve(receipt)
      })
    })
  },

  /**
   * Create a group. Members will be given Admin privilege
   * Do not inclue the bot number, as it will be auto added
   * @param    {String} groupTitle Name of the group "Parkdale Run Club"
   * @param   {Array} numbers ['+123456789', '+654987321']
   */
  createGroup: (groupTitle, numbers) => {
    return new Promise(async (resolve) => {
      const members = numbersToFormat(numbers)
      writeSocket({
        "type": "create_group",
        "account": process.env.BOT_ACCOUNT,
        "member_role": "ADMINISTRATOR",
        "members": members,
        "title": groupTitle,
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('createGroup', receipt)
        if (receipt.error) {
          resolve({ status: "error", error: receipt.error.message })
        } else {
          resolve({ status: "ok", receipt: receipt })
        }
      })
    })
  },

  /**
   * Update a group title
   * @param    {String} newName new Name of the group "Parkdale Run Club"
   * @param   {String} groupId "RBjf7dcZxY33/p5FY3lHSZafNrdNSYjyPURGl1RvydQ="
   */
  updateGroupName: (newName, groupId) => {
    console.log("Skills.js: Please Deprecate Me.")
    return new Promise(async (resolve, reject) => {
      writeSocket({
        "type": "update_group",
        "account": process.env.BOT_ACCOUNT,
        "groupID": groupId,
        "title": newName,
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('updateGroupName', receipt)
        resolve(receipt)
      })
    })
  },

  /**
   * Update the bot avatar
   * @param    {String} path path to avatar file
   */
  updateBotAvatar: (filePath, botName) => {
    return new Promise(async (resolve, reject) => {
      writeSocket({
        "type": "set_profile",
        "account": process.env.BOT_ACCOUNT,
        "avatarFile": filePath,
        "name": botName,
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('updateBotAvatar', receipt)
        resolve(receipt)
      })
    })
  },

  /**
   * Update a group avatar
   * @param    {String} path path to avatar file
   */
  updateGroupAvatar: (filePath, groupId) => {
    return new Promise(async (resolve, reject) => {
      writeSocket({
        "type": "update_group",
        "account": process.env.BOT_ACCOUNT,
        "avatar": filePath,
        "groupID": groupId,
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('updateGroupAvatar', receipt)
        resolve(receipt)
      })
    })
  },


  getGroup: (groupId) => {
    return new Promise(async (resolve, reject) => {
      writeSocket({
        "type": "get_group",
        "account": process.env.BOT_ACCOUNT,
        "groupID": groupId,
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('getGroup', receipt)
        resolve(receipt)
      })
    })
  },

  /**
   * DEPRECATED Return a direct connection to the unix socket in order to receive messages
   * initializes the socket and then calls subscribe for updates
   */
  newSocket: () => {
    return new Promise(async (resolve, reject) => {
      socketJs.initSocket()
        .then(async (result) => {
          if (result) {
            await socketJs.subscribe()
            resolve(true)
          }
        })
    })
  },

  /**
   * Get a user profile
   */
  getUserProfile: (userNumber) => {
    const number = numberToFormat(userNumber)
    return new Promise(async (resolve, reject) => {
      writeSocket({
        "type": "get_profile",
        "address": number,
        "account": process.env.BOT_ACCOUNT,
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('getUserProfile', receipt)
        resolve(receipt)
      })
    })
  },

  /**
   * Send a message to a user
   */
  sendMessage: (recipient, message) => {
    return new Promise(async (resolve, reject) => {
      writeSocket({
        "type": "send",
        "messageBody": message,
        "recipientAddress": recipient,
        "username": process.env.BOT_ACCOUNT,
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('sendMessage', receipt)
        resolve(receipt)
      })
    })
  },

  /**
   * Send a message to a group
   */
  sendMessageToGroup: (groupId, message) => {
    const msg = decodeURI(message)
    return new Promise(async (resolve, reject) => {
      writeSocket({
        "type": "send",
        "messageBody": msg,
        "recipientGroupId": groupId,
        "username": process.env.BOT_ACCOUNT,
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('sendMessageToGroup', receipt)
        resolve(receipt)
      })
    })
  },

/**
 * Send a message to a group with image attachment
 */
  sendMessageToGroupWithImage: (groupId, message, filename) => {
    return new Promise(async (resolve) => {
      writeSocket({
        "type": "send",
        "attachments": [{ filename:filename }],
        "messageBody": message,
        "recipientGroupId": groupId,
        "username": process.env.BOT_ACCOUNT,
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('sendMessageToGroup', receipt)
        resolve(receipt)
      })
    })
  },

  /**
   * Add a user to a group
   */
  addMemberToGroup: (members, groupId) => {
    const users = numbersToFormat([members])
    return new Promise(async (resolve) => {
      writeSocket({
        "type": "update_group",
        "groupID": groupId,
        "addMembers": users,
        "member_role": "DEFAULT",
        "account": process.env.BOT_ACCOUNT,
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('addMemberToGroup', receipt)
        resolve(receipt)
      })
    })
  },

  /**
   * Remove a user from a group
   */
  removeUsersFromGroup: (members, groupId) => {
    const users = numbersToFormat(members)
    return new Promise(async (resolve) => {
      writeSocket({
        "type": "update_group",
        "groupID": groupId,
        "removeMembers": users,
        "account": process.env.BOT_ACCOUNT,
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('removeUsersFromGroup', receipt)
        resolve(receipt)
      })
    })
  },

  leaveGroup: async (groupId) => {
    console.log("Signal - remove group: " + groupId)
    return new Promise(async (resolve) => {
      writeSocket({
        "account": process.env.BOT_ACCOUNT,
        "groupID": groupId,
        "type": "leave_group",
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('leaveGroup', receipt)
        resolve(receipt)
      })
    })
  },

  disableGroupLink: async (groupId) => {
    return new Promise(async (resolve) => {
      writeSocket({
        "account": process.env.BOT_ACCOUNT,
        "groupID": groupId,
        "type": "update_group",
        "updateAccessControl": { "link": "UNSATISFIABLE" },
        "version": "v1"
      }, async function (receipt) {
        await saveReceipt('disableGroupLink', receipt)
        resolve(receipt)
      })
    })
  },

  startUpdates: async () => {
    await socketJs.subscribe()
  },

  stopUpdates: async () => {
    await socketJs.unsubscribe()
  },

  directToSocket: (command) => {
    writeSocket(command, async function (receipt) {
      await saveReceipt('directToSocket', receipt)
      // console.log(receipt)
    })
  }
}

function writeSocket(command, cb) {
  // console.log(command)
  const id = utils.generateRandomID()
  idRouter.add(id, cb)
  command.id = id
  socketJs.writeSocket(command)
}

function numbersToFormat(numbers) {
  let format = []
  numbers.forEach((number) => {
    format.push({ number: number })
  })
  return format
}

function numberToFormat(number) {
  return { number: number }
}

async function saveReceipt(caller, receipt) {
  try {
    const content = {
      caller: caller,
      receipt: receipt
    }
    // await file.appendFile(receiptLog, JSON.stringify(content) + '\n');
  } catch (error) {
    console.log(error)
    console.log("couldn't log receipt to file.")
  }
}

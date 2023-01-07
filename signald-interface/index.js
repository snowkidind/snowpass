const events = require('./events.js');
const idRouter = require('./idRouter.js');
const receive = require('./receive.js');
const skills = require('./skills.js');
const socket = require('./socket.js');
const utils = require('./utils.js');

module.exports = {
  events: events,
  idRouter: idRouter,
  receive: receive,
  skills: skills,
  socket: socket,
  utils: utils
}

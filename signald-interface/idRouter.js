// Memory store for outgoing message id's and their callbacks

const ids = [];

module.exports = {

  add: (id, callback) => {
    ids.push({ id: id, cb: callback });
  },

  queue: () => {
    return ids;
  },

  expire: (id) => {
    const index = ids.indexOf(id);
    if (index > -1) {
      ids.splice(index, 1);
    }
  }
}

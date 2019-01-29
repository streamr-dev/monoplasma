const ipc = require("node-ipc")

const serverId = "join-part-channel"

/**
 * @typedef {string} State
 * @enum {string}
 */
const State = {
    NOT_STARTED: "",
    SERVER: "server",
    CLIENT: "client",
}

/**
 * @typedef {Object} Channel
 * @property {State} mode
 * @property {function} publish
 * @property {function} on
 * @property {function} startServer
 * @property {function} listen
 */
/**
 * @type {Channel} channel
 */
const channel = {
    mode: State.NOT_STARTED,

    startServer: () => new Promise(done => {
        if (channel.mode) { throw new Error(`Already started as ${channel.mode}`)}

        ipc.config.id = serverId
        ipc.config.retry = 1000

        ipc.serve(() => {
            channel.mode = "server"
            channel.publish = ipc.server.emit.bind(ipc.server)
            done(channel)
        })
    }),

    listen: clientId => new Promise(done => {
        if (channel.mode) { throw new Error(`Already started as ${channel.mode}`)}

        ipc.config.id = clientId
        ipc.config.retry = 1000

        ipc.connectTo(serverId, () => {
            channel.mode = "client"
            channel.on = ipc.of[serverId].on.bind(ipc.of[serverId])
            done(channel)
        })
    })
}

module.exports = channel

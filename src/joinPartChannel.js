const zmq = require("zeromq")

const joinPartChannelUrl = "tcp://127.0.0.1:4567"

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

    startServer: () => {
        if (channel.mode) { throw new Error(`Already started as ${channel.mode}`)}

        channel.sock = zmq.socket("pub")
        channel.sock.bindSync(joinPartChannelUrl)
        channel.publish = (topic, addresses) => {
            channel.sock.send([topic, JSON.stringify(addresses)])
        }
        channel.mode = State.SERVER
    },

    listen: () => {
        if (channel.mode) { throw new Error(`Already started as ${channel.mode}`)}

        channel.sock = zmq.socket("sub")
        channel.sock.connect(joinPartChannelUrl)
        channel.sock.subscribe("join")
        channel.sock.subscribe("part")
        channel.on = (topic, cb) => {
            channel.sock.on("message", (topicBuffer, messageBuffer) => {
                if (topicBuffer.toString() === topic) {
                    const message = JSON.parse(messageBuffer)
                    cb(message)
                }
            })
        }
        channel.mode = State.CLIENT
    },

    close: () => {
        if (!channel.mode) { throw new Error("Can't close, not started")}

        channel.sock.close()
        channel.mode = State.NOT_STARTED
    }
}

module.exports = channel

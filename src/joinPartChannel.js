const zmq = require("zeromq")

/**
 * @typedef {string} State
 * @enum {string}
 */
const State = {
    CLOSED: "",
    SERVER: "server",
    CLIENT: "client",
}

function reset(channel) {
    channel.mode = State.CLOSED
    channel.publish = () => { throw new Error("Channel is closed" )}
    channel.on = () => { throw new Error("Channel is closed" )}
}

/**
 * @typedef {Object} Channel
 * @property {State} mode
 * @property {function} publish
 * @property {function} on
 */
class Channel {
    constructor(joinPartChannelPort) {
        this.channelUrl = "tcp://127.0.0.1:" + (joinPartChannelPort || 4568)
        reset(this)
    }

    /** After this, call .publish(topic, data) to send */
    startServer() {
        if (this.mode) { throw new Error(`Already started as ${this.mode}`)}

        this.sock = zmq.socket("pub")
        this.sock.bindSync(this.channelUrl)
        this.publish = (topic, addresses) => {
            this.sock.send([topic, JSON.stringify(addresses)])
        }
        this.mode = State.SERVER
    }

    /** After this, add a listener for specific topic: .on(topic, msg => { handler } ) */
    listen() {
        if (this.mode) { throw new Error(`Already started as ${this.mode}`)}

        this.sock = zmq.socket("sub")
        this.sock.connect(this.channelUrl)
        this.sock.subscribe("join")
        this.sock.subscribe("part")
        this.on = (topic, cb) => {
            this.sock.on("message", (topicBuffer, messageBuffer) => {
                if (topicBuffer.toString() === topic) {
                    const message = JSON.parse(messageBuffer)
                    cb(message)
                }
            })
        }
        this.mode = State.CLIENT
    }

    /** Close the channel */
    close() {
        if (!this.mode) { throw new Error("Can't close, already closed")}
        this.sock.close()
        reset(this)
    }
}

module.exports = Channel

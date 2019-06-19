module.exports = class MockChannel {
    constructor() {
        this.mode = ""
        this.listeners = {
            join: [],
            part: [],
            message: [],
            error: [],
            close: [],
        }
    }
    startServer() { this.mode = "server" }
    listen() { this.mode = "client" }
    close() { this.mode = "" }
    publish(topic, ...args) {
        for (const func of this.listeners[topic]) {
            func(...args)
        }
    }
    on(topic, cb) {
        this.listeners[topic].push(cb)
    }
}
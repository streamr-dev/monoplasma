module.exports = class MockChannel {
    constructor() {
        this.listeners = {
            join: [],
            part: [],
        }
    }
    startServer() {}
    listen() {}
    close() {}
    publish(topic, ...args) {
        for (const func of this.listeners[topic]) {
            func(...args)
        }
    }
    on(topic, cb) {
        this.listeners[topic].push(cb)
    }
}
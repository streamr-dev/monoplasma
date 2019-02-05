const sleep = require("./sleep-promise")

/**
 * @callback UntilCondition
 * @returns {boolean} signifying if it should stop waiting and continue execution
 */
/**
 * Wait until a condition is true
 * @param {UntilCondition} condition wait until this callback function returns true
 * @param {number} [timeOutMs=10000] stop waiting after that many milliseconds
 * @param {number} [pollingIntervalMs=100] check condition between so many milliseconds
 */
async function until(condition, timeOutMs, pollingIntervalMs) {
    let timeout = false
    setTimeout(() => { timeout = true }, timeOutMs || 10000)
    while (!condition() && !timeout) {
        await sleep(pollingIntervalMs || 100)
    }
    return condition()
}

/**
 * Resolves the promise once stream contains the target string
 * @param {Readable} stream to subscribe to
 * @param {string} target string to search
 */
async function untilStreamContains(stream, target) {
    return new Promise(done => {
        function handler(data) {
            if (data.indexOf(target) > -1) {
                stream.off("data", handler)
                done(data.toString())
            }
        }
        stream.on("data", handler)
    })
}

module.exports = {
    until,
    untilStreamContains
}

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
module.exports = async function until(condition, timeOutMs, pollingIntervalMs) {
    let timeout = false
    setTimeout(() => { timeout = true }, timeOutMs || 10000)
    while (!condition() && !timeout) {
        await sleep(pollingIntervalMs || 100)
    }
    return condition()
}

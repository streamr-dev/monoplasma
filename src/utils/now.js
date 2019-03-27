/** Timestamp is seconds, just like Ethereum block.timestamp */
module.exports = function now() {
    return Math.round(new Date() / 1000)
}

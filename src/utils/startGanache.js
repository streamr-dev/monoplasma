const { spawn } = require("child_process")

// private keys corresponding to "testrpc" mnemonic
const privateKeys = [
    "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0",
    "0xe5af7834455b7239881b85be89d905d6881dcb4751063897f12be1b0dd546bdb",
    "0x4059de411f15511a85ce332e7a428f36492ab4e87c7830099dadbf130f1896ae",
    "0x633a182fb8975f22aaad41e9008cb49a432e9fdfef37f151e9e7c54e96258ef9",
    "0x957a8212980a9a39bf7c03dcbeea3c722d66f2b359c669feceb0e3ba8209a297",
    "0xfe1d528b7e204a5bdfb7668a1ed3adfee45b4b96960a175c9ef0ad16dd58d728",
    "0xd7609ae3a29375768fac8bc0f8c2f6ac81c5f2ffca2b981e6cf15460f01efe14",
    "0xb1abdb742d3924a45b0a54f780f0f21b9d9283b231a0a0b35ce5e455fa5375e7",
    "0x2cd9855d17e01ce041953829398af7e48b24ece04ff9d0e183414de54dc52285",
    "0x2c326a4c139eced39709b235fffa1fde7c252f3f7b505103f7b251586c35d543",
]

/**
 * @typedef {Object} GanacheInfo
 * @property {String} url websocket URL for Ganache RPC
 * @property {String} httpUrl HTTP URL for Ganache RPC
 * @property {Array<String>} privateKeys inside the Ganache chain that have initial 100 ETH
 * @property {ChildProcess} process
 * @property {Function} shutdown call this to kill the Ganache process
 */

/**
 * Start Ganache Ethereum simulator through CLI
 * @param {Number} port
 * @param {Function<String>} log
 * @param {Function<Error} error
 * @param {Number} blockDelaySeconds 0 for immediate blocks after each tx; otherwise publish a new block every so many seconds
 * @param {Number} timeoutMs when promise fails with
 * @returns {Promise<GanacheInfo>}
 */
module.exports = async function startGanache(port, log, error, blockDelaySeconds, timeoutMs) {
    error = error || log || console.error
    log = log || console.log
    port = port || 8545
    const delay = blockDelaySeconds || 0
    const ganache = spawn(process.execPath, [
        "./node_modules/.bin/ganache-cli",
        "-m", "testrpc",
        "-p", port,
        "-b", `${delay}`
    ])
    function onClose(code) { error(new Error("Ganache ethereum simulator exited with code " + code)) }
    ganache.on("close", onClose)
    function shutdown() {
        if (ganache.off) {
            ganache.off("close", onClose)
        }
        ganache.kill()
    }
    ganache.stderr.on("data", line => {
        log(" ERROR > " + line)
    })

    // Ganache is ready to use when it says "Listening on 127.0.0.1:8545"
    return new Promise((done, fail) => {
        const timeoutHandle = setTimeout(() => fail(new Error("timeout")), timeoutMs || 20000)
        let launching = true
        ganache.stdout.on("data", data => {
            const str = data.toString()
            str.split("\n").forEach(log)
            if (launching) {
                const match = str.match(/Listening on ([0-9.:]*)/)
                if (match) {
                    launching = false
                    clearTimeout(timeoutHandle)
                    const url = "ws://" + match[1]        // "127.0.0.1:8545"
                    const httpUrl = "http://" + match[1]
                    done({ url, httpUrl, privateKeys, process: ganache, shutdown })
                }
            }
        })
    })
}

const { spawn } = require("child_process")

/**
 * Start Ganache Ethereum simulator through CLI
 * @returns Promise<string> HTTP endpoint that the simulator is listening
 */
module.exports = (log, error, timeoutMs) => {
    return async function startGanache() {
        const ganacheServer = spawn("./node_modules/.bin/ganache-cli", ["-m", "testrpc"])
        ganacheServer.on("close", code => {
            (error || log)(new Error("Ganache ethereum simulator exited with code " + code))
        })
        ganacheServer.stderr.on("data", line => {
            log(" ERROR > " + line)
        })

        // Ganache is ready to use when it says "Listening on 127.0.0.1:8545"
        return new Promise((done, fail) => {
            const timeoutHandle = setTimeout(fail, timeoutMs || 10000)
            let launching = true
            ganacheServer.stdout.on("data", data => {
                const str = data.toString()
                str.split("\n").forEach(log)
                if (launching) {
                    const match = str.match(/Listening on ([0-9.:]*)/)
                    if (match) {
                        launching = false
                        clearTimeout(timeoutHandle)
                        const url = "http://" + match[1]        // "127.0.0.1:8545"
                        done(url)
                    }
                }
            })
        })
    }
}
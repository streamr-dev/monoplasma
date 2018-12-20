const BN = require("bn.js")

/**
 * Format a fixed-point decimal number
 * e.g. formatDecimals("10000", 3) === "10"
 *      formatDecimals("15200", 3) === "15.2"
 *      formatDecimals("10000", 6) === "0.01"
 * @param {Number|String} x is the number to format
 * @param {Number} n is the number of decimals
 */
module.exports = function formatDecimals(x, n) {
    const base = new BN(10).pow(new BN(n))
    const { div, mod } = new BN(x).divmod(base)
    const ret = div.toString() + (mod.isZero() ? "" : "." + mod.toString(10, n).replace(/0*$/, ""))
    //const ret = (div.toString() + "." + mod.toString(10, n)).replace(/\.?0*$/, "")
    return ret
}

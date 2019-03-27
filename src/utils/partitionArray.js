// yes, I could npm i lodash.partition, but holy cow: https://github.com/lodash/lodash/blob/4.6.0-npm-packages/lodash.partition/index.js
module.exports = function partition(array, filter) {
    const res = [[], []]
    array.forEach(x => {
        res[filter(x) ? 0 : 1].push(x)
    })
    return res
}

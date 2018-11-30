/** "empty", for the purposes of event lists */
function empty(x) {
    return !Array.isArray(x) || x.length < 1
}

function mergeEventLists(events1, events2) {
    if (empty(events1)) { return empty(events2) ? [] : events2 }
    if (empty(events2)) { return empty(events1) ? [] : events1 }
    const ret = []
    let i1 = 0
    let i2 = 0
    let block1 = events1[0].blockNumber
    let block2 = events2[0].blockNumber
    let txi1 = events1[0].transactionIndex
    let txi2 = events2[0].transactionIndex
    let li1 = events1[0].logIndex
    let li2 = events2[0].logIndex
    while (true) {
        if (block1 < block2 || block1 === block2 && (txi1 < txi2 || txi1 === txi2 && li1 < li2)) {
            ret.push(events1[i1++])
            if (i1 >= events1.length) {
                return ret.concat(events2.slice(i2))
            }
            block1 = events1[i1].blockNumber
            txi1 = events1[i1].transactionIndex
            li1 = events1[i1].logIndex
        } else {
            ret.push(events2[i2++])
            if (i2 >= events2.length) {
                return ret.concat(events1.slice(i1))
            }
            block2 = events2[i2].blockNumber
            txi2 = events2[i2].transactionIndex
            li2 = events2[i2].logIndex
        }
    }
}

module.exports = {
    mergeEventLists
}
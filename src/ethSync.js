const {
    QUIET,
} = process.env

const log = QUIET ? () => {} : console.log

async function replayEvent(plasma, event) {
    switch (event.event) {
        // event Transfer(address indexed from, address indexed to, uint256 value);
        case "Transfer": {
            const { value } = event.returnValues
            log(`${value} tokens received @ block ${event.blockNumber}`)
            plasma.addRevenue(value)
        } break
        // event BlockCreated(uint blockNumber, bytes32 rootHash, string ipfsHash);
        case "BlockCreated": {
            const { blockNumber } = event.returnValues
            log(`Storing block ${blockNumber}`)
            await plasma.storeBlock(blockNumber)
        } break
        case "Join": {
            const { addressList } = event
            plasma.addMembers(addressList)
        } break
        case "Part": {
            const { addressList } = event
            plasma.removeMembers(addressList)
        } break
        default: {
            log(`WARNING: Unexpected event: ${JSON.stringify(event)}`)
        }
    }
}

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
    for (;;) {
        if (block1 < block2 || block1 === block2 && (txi1 < txi2 || txi1 === txi2 && li1 <= li2)) {
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

const now = () => Math.floor(+new Date() / 1000)

// network ids: 1 = mainnet, 2 = morden, 3 = ropsten, 4 = rinkeby (current testnet)
const defaultServers = {
    "1": "wss://mainnet.infura.io/ws",
    "3": "wss://ropsten.infura.io/ws",
    "4": "wss://rinkeby.infura.io/ws",
}

/** Validate contract addresses from user input */
async function throwIfSetButNotContract(web3, address, context) {
    if (!address) { return }
    return throwIfNotContract(web3, address, context)
}

/** Validate contract addresses from user input */
async function throwIfNotContract(web3, address, context) {
    if (!web3.utils.isAddress(address)) {
        throw new Error(`${context || "Error"}: Bad Ethereum address ${address}`)
    }
    if (await web3.eth.getCode(address) === "0x") {
        throw new Error(`${context || "Error"}: No contract at ${address}`)
    }
}

module.exports = {
    mergeEventLists,
    replayEvent,
    now,
    defaultServers,
    throwIfNotContract,
    throwIfSetButNotContract,
}

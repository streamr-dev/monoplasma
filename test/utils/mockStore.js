module.exports = function getMockStore(mockState, mockBlock, logFunc) {
    const log = logFunc || (() => {})
    const store = {
        events: [],
    }
    store.saveState = async state => {
        log(`Saving state: ${JSON.stringify(state)}`)
        store.lastSavedState = state
    }
    store.saveBlock = async (data) => {
        log(`Saving block ${data.blockNumber}: ${JSON.stringify(data)}`)
        store.lastSavedBlock = data
    }
    store.loadState = async () => Object.assign({}, mockState)
    store.loadBlock = async () => Object.assign({}, mockBlock)
    store.blockExists = async () => true
    store.loadEvents = async () => store.events
    store.saveEvents = async (bnum, event) => {
        store.events.push(event)
    }
    return store
}

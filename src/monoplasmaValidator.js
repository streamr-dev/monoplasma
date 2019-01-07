const MonoplasmaWatcher = require("./monoplasmaWatcher")

module.exports = class MonoplasmaOperator extends MonoplasmaWatcher {
    async start() {
        super.start()

        this.filters.blockFilter = this.contract.events.BlockCreated({})
            .on("data", event => { replayEvent(this.plasma, event) })
            .on("changed", event => { this.error("Event removed in re-org!", event) })
            .on("error", this.error)
    }
}

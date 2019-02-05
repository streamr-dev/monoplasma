// @flow

import React, { Component } from 'react'
import ta from 'time-ago'

type Props = {
    value: number,
}

type State = {
    fromValue: ?string,
}

class Timestamp extends Component<Props, State> {
    interval: ?IntervalID = null

    state = {
        fromValue: null,
    }

    componentDidMount() {
        this.tick()
        this.interval = setInterval(this.tick, 1000)
    }

    componentWillUnmount() {
        clearInterval(this.interval)
    }

    tick = () => {
        const { value } = this.props

        this.setState({
            fromValue: ta.ago(value),
        })
    }

    render() {
        const { fromValue } = this.state
        return (
            <span>{fromValue}</span>
        )
    }
}

export default Timestamp

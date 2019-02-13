// @flow

import { useState, type Node, useEffect } from 'react'

type Props = {
    children: (number) => Node,
}

const Clock = ({ children }: Props) => {
    const [timestamp, setTimestamp] = useState(new Date().getTime())

    useEffect(() => {
        const interval: IntervalID = setInterval(() => {
            setTimestamp(new Date().getTime())
        }, 1000)

        return () => {
            clearInterval(interval)
        }
    })

    return children(timestamp)
}

export default Clock

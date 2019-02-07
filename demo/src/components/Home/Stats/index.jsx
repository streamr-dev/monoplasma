// @flow

import React from 'react'
import Stat from './Stat'

import styles from './stats.module.css'

type Props = {
    items: Array<Object>,
}

const Stats = ({ items }: Props) => (
    <div className={styles.root}>
        {items.map((item, index) => {
            if (!item) {
                /* eslint-disable-next-line react/no-array-index-key */
                return <div key={index} />
            }
            const [caption, value] = item
            return <Stat key={caption} caption={caption} value={value} />
        })}
    </div>
)

export default Stats

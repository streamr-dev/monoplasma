// @flow

import React from 'react'
import cx from 'classnames'
import BN from 'bn.js'
import Timestamp from '../../Timestamp'
import formatNumber from '../../../utils/formatNumber'

import styles from './blocks.module.css'

export type Block = {
    id: number,
    timestamp: number,
    members: number,
    earnings: BN,
}

type Props = {
    className?: string,
    items: Array<Block | number>,
}

const Blocks = ({ items, className }: Props) => (
    <div className={cx(styles.root, className)}>
        <div className={cx(styles.row, styles.columnNames)}>
            <div>Block #</div>
            <div>Timestamp</div>
            <div>Members</div>
            <div>Earnings</div>
        </div>
        <div>
            {items.map((block) => {
                if (typeof block === 'number') {
                    return (
                        /* eslint-disable-next-line react/no-array-index-key */
                        <div key={block} className={styles.row}>
                            <div>&zwnj;</div>
                            <div>&zwnj;</div>
                            <div>&zwnj;</div>
                            <div>&zwnj;</div>
                        </div>
                    )
                }
                return (
                    <div key={block.id} className={styles.row}>
                        <div>{block.id}</div>
                        <div><Timestamp value={block.timestamp} /></div>
                        <div>{formatNumber(block.members)}</div>
                        <div>{formatNumber(block.earnings)}</div>
                    </div>
                )
            })}
        </div>
    </div>
)

export default Blocks

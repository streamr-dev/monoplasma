// @flow

import React from 'react'
import cx from 'classnames'
import BN from 'bn.js'
import Timestamp from '../../Timestamp'
import formatFixedDecimal from '../../../utils/formatFixedDecimal'

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
                // initial empty blocks are marked with numbers
                if (typeof block === 'number') {
                    return (
                        <div key={block} className={styles.row}>
                            <div>&zwnj;</div>
                            <div>&zwnj;</div>
                            <div>&zwnj;</div>
                            <div>&zwnj;</div>
                        </div>
                    )
                }
                return (
                    <div key={block.blockNumber} className={styles.row}>
                        <div>{block.blockNumber}</div>
                        <div><Timestamp value={block.timestamp * 1000} /></div>
                        <div>{block.memberCount}</div>
                        <div>{formatFixedDecimal(block.totalEarnings)}</div>
                    </div>
                )
            })}
        </div>
    </div>
)

export default Blocks

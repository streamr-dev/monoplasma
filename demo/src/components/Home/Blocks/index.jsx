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
    frozen?: boolean,
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
                        <div key={`dummy${block}`} className={styles.row}>
                            <div>&zwnj;</div>
                            <div>&zwnj;</div>
                            <div>&zwnj;</div>
                            <div>&zwnj;</div>
                        </div>
                    )
                }
                return (
                    <div
                        key={block.blockNumber}
                        className={cx(styles.row, {
                            [styles.frozen]: !!block.frozen,
                        })}
                    >
                        <div>
                            {!!block.frozen && (
                                <svg className={styles.flake} viewBox="0 0 14 16" xmlns="http://www.w3.org/2000/svg">
                                    <g fill="none" fillRule="evenodd">
                                        <path
                                            d="M-1 0h16v16H-1z"
                                        />
                                        <path
                                            /* eslint-disable-next-line max-len */
                                            d="M5.768 6.711l-.5.289v.577l-2.199-1.27L.517 7.426.116 6.51l1.878-.822-1.765-1.02.5-.866 1.74 1.004L2.22 2.86l.992-.126.343 2.7 2.212 1.277zM6.5 6.29V3.725L4.3 2.106l.594-.805L6.5 2.483V.471h1v2.05l1.606-1.222.605.796L7.5 3.777v2.512L7 6l-.5.289zm1.732.422l2.186-1.261.307-2.759.993.11-.225 2.028 1.778-1.027.5.866-1.764 1.018 1.82.763-.388.922-2.52-1.056-2.187 1.262V7l-.5-.289zm.5 1.712l2.22 1.281L13.43 8.62l.401.916-1.804.79 1.744 1.007-.5.866-1.803-1.04.258 2.026-.992.126-.354-2.781-2.148-1.24.5-.289v-.577zM7.5 9.71v2.562l2.203 1.622-.593.805-1.61-1.185v2.014h-1v-2.046L4.898 14.7l-.605-.796L6.5 12.227V9.711L7 10l.5-.289zm-1.732-.42l-2.246 1.296-.3 2.692-.994-.111.219-1.96-1.718.992-.5-.866 1.774-1.024-1.882-.79.387-.921L3.09 9.68l2.177-1.257V9l.5.289z"
                                            fill="#525252"
                                            fillRule="nonzero"
                                        />
                                    </g>
                                </svg>
                            )}
                            {block.blockNumber}
                        </div>
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

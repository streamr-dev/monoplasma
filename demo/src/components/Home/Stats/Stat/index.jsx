// @flow

import React from 'react'
import { type BN } from 'bn.js'
import cx from 'classnames'
import formatNumber from '../../../../utils/formatNumber'

import styles from './stat.module.css'

type Props = {
    value: BN,
    caption: string,
    className?: string,
}

const Stat = ({ value, caption, className }: Props) => (
    <div className={cx(styles.root, className)}>
        <h1>{formatNumber(value.toString())}</h1>
        <p>{caption}</p>
    </div>
)

export default Stat

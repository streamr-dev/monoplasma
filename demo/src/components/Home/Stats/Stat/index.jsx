// @flow

import React from 'react'
import { type BN } from 'bn.js'
import cx from 'classnames'

import styles from './stat.module.css'

type Props = {
    value: BN,
    caption: string,
    className?: string,
}

const formatNumber = (value: BN): string => {
    const [int, fraction] = value.toString().split('.')
    /* eslint-disable-next-line newline-per-chained-call */
    const commaized = int.split('').reverse().join('').replace(/\d{3}/g, '$&,').split('').reverse().join('').replace(/^,/, '')
    return [commaized, fraction].filter(Boolean).join('.') || '0'
}

const Stat = ({ value, caption, className }: Props) => (
    <div className={cx(styles.root, className)}>
        <h1>{formatNumber(value.toString())}</h1>
        <p>{caption}</p>
    </div>
)

export default Stat

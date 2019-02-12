// @flow

import React from 'react'
import cx from 'classnames'

import styles from './tooltip.module.css'

type Props = {
    className?: string,
}

const Tooltip = ({ className, ...props }: Props) => (
    <div {...props} className={cx(styles.root, className)} />
)

export default Tooltip

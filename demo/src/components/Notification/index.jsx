// @flow

import React from 'react'
import cx from 'classnames'

import styles from './notification.module.css'

type Props = {
    className?: string,
}

const Notification = ({ className, ...props }: Props) => (
    <div {...props} className={cx(styles.root, className)} />
)

export default Notification

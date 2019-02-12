// @flow

import React from 'react'
import cx from 'classnames'
import Container from '../Container'

import styles from './notification.module.css'

type Props = {
    className?: string,
}

const Notification = ({ className, ...props }: Props) => (
    <Container>
        <div {...props} className={cx(styles.root, className)} />
    </Container>
)

export default Notification

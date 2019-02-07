// @flow

import React, { type Node } from 'react'
import cx from 'classnames'

import styles from './container.module.css'

type Props = {
    children: Node,
    className?: string,
}

const Container = ({ children, className }: Props) => (
    <div className={cx(styles.root, className)}>
        {children}
    </div>
)

export default Container

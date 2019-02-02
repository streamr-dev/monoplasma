// @flow

import React, { type Node } from 'react'

import styles from './container.module.css'

type Props = {
    children: Node,
}

const Container = ({ children }: Props) => (
    <div className={styles.root}>
        {children}
    </div>
)

export default Container

// @flow

import React, { type Node } from 'react'

import styles from './headline.module.css'

type Props = {
    children: Node,
}

const Headline = ({ children }: Props) => (
    <h1 className={styles.root}>
        {children}
    </h1>
)

export default Headline

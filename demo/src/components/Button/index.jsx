// @flow

import React, { type Node } from 'react'
import cx from 'classnames'

import styles from './button.module.css'

type Props = {
    children: Node,
    className?: string,
    theme?: 'default' | 'edge' | 'red-edge',
}

const Button = ({ children, className, theme, ...props }: Props) => (
    <button
        type="button"
        {...props}
        className={cx(styles.root, className, styles.default, {
            [styles.edge]: theme === 'edge',
            [styles.redEdge]: theme === 'red-edge',
        })}
    >
        {children}
    </button>
)

export default Button

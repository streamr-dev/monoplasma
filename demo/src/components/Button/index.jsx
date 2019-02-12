// @flow

import React, { type Node } from 'react'
import cx from 'classnames'
import Tooltip from '../Tooltip'

import styles from './button.module.css'

type Props = {
    children: Node,
    className?: string,
    theme?: 'default' | 'edge' | 'red-edge',
    tooltip?: string,
}

const Button = ({
    children,
    className,
    theme,
    tooltip,
    ...props
}: Props) => (
    <div className={cx(styles.root, className)}>
        <button
            type="button"
            {...props}
            className={cx(styles.inner, styles.default, {
                [styles.edge]: theme === 'edge',
                [styles.redEdge]: theme === 'red-edge',
            })}
        >
            {children}
        </button>
        {tooltip && (
            <Tooltip className={styles.tooltip}>
                {tooltip}
            </Tooltip>
        )}
    </div>
)

export default Button

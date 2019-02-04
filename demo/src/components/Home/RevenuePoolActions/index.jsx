// @flow

import React from 'react'
import Button from '../../Button'

import styles from './revenuePoolActions.module.css'

type Props = {
    onAddRevenueClick: () => void,
    onForcePublishClick: () => void,
}

const RevenuePoolActions = ({ onAddRevenueClick, onForcePublishClick }: Props) => (
    <div className={styles.root}>
        <div />
        <Button onClick={onAddRevenueClick}>Add revenue</Button>
        <Button onClick={onForcePublishClick} theme="edge">Force publish</Button>
    </div>
)

export default RevenuePoolActions

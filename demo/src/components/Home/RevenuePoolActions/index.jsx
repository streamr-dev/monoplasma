// @flow

import React from 'react'
import Button from '../../Button'

import styles from './revenuePoolActions.module.css'

type Props = {
    onAddRevenueClick: () => void,
}

const RevenuePoolActions = ({ onAddRevenueClick }: Props) => (
    <div className={styles.root}>
        <div />
        <Button onClick={onAddRevenueClick}>Add revenue</Button>
    </div>
)

export default RevenuePoolActions

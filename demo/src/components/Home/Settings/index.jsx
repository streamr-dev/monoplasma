// @flow

import React from 'react'
import About from '../About'
import Section from '../Section'

import styles from './settings.module.css'

export type Setting = {
    blockFreezePeriod: number,
    monoplasmaContractAddress: string,
    tokenAddress: string,
    ethereumNode: string,
    operatorAddress: string,
}

type Props = {
    value: ?Setting,
}

const withPlaceholder = (value: any) => (
    value || (
        <div className={styles.placeholder} />
    )
)

const Settings = ({ value }: Props) => {
    const {
        blockFreezePeriod,
        monoplasmaContractAddress,
        tokenAddress,
        ethereumNode,
        operatorAddress,
    } = value || {}

    return (
        <Section title="Settings" className={About.styles.root}>
            <ul>
                <li>
                    <strong>Block freeze period: </strong>
                    {withPlaceholder(blockFreezePeriod)}
                </li>
                <li>
                    <strong>Monoplasma contract address: </strong>
                    {withPlaceholder(monoplasmaContractAddress)}
                </li>
                <li>
                    <strong>Token address: </strong>
                    {withPlaceholder(tokenAddress)}
                </li>
                <li>
                    <strong>Ethereum node: </strong>
                    {withPlaceholder(ethereumNode)}
                </li>
                <li>
                    <strong>Operator address: </strong>
                    {withPlaceholder(operatorAddress)}
                </li>
            </ul>
        </Section>
    )
}

export default Settings

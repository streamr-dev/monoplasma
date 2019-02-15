// @flow

import React from 'react'
import About from '../About'
import Section from '../Section'
import { type Config } from '../../../contexts/Home'

import styles from './settings.module.css'

type Props = {
    value: ?Config,
}

const withPlaceholder = (value: any) => (
    value || (
        <div className={styles.placeholder} />
    )
)

const Settings = ({ value }: Props) => {
    const {
        blockFreezeSeconds,
        contractAddress,
        ethereumServer,
        operatorAddress,
        tokenAddress,
    } = value || {}

    return (
        <Section title="Settings" className={About.styles.root}>
            <ul>
                <li>
                    <strong>Block freeze period: </strong>
                    {withPlaceholder(`${blockFreezeSeconds} seconds`)}
                </li>
                <li>
                    <strong>Monoplasma contract address: </strong>
                    {withPlaceholder(contractAddress)}
                </li>
                <li>
                    <strong>Token address: </strong>
                    {withPlaceholder(tokenAddress)}
                </li>
                <li>
                    <strong>Ethereum node: </strong>
                    {withPlaceholder(ethereumServer ? ethereumServer.replace('ws://', 'http://') : ethereumServer)}
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

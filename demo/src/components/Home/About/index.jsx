// @flow

import React from 'react'
import Section from '../Section'

import styles from './about.module.css'

const About = () => (
    <Section title="About" className={styles.root}>
        <p>
            This is a demonstration of how Monoplasma contracts can be used to implement basic ERC-20 token revenue
            sharing. There are three main roles in the system:
        </p>
        <ul>
            <li>
                <strong>Administrator </strong>
                who owns the root chain contract, selects operator and members
            </li>
            <li>
                <strong>Operator </strong>
                who commits the off-chain balances to root chain
            </li>
            <li>
                <strong>Validator </strong>
                who also runs the off-chain calculations and checks the commits
            </li>
            <li>
                <strong>Member </strong>
                of the revenue sharing community who has the primary interest in ensuring operator honesty
            </li>
        </ul>
        <p>
            <strong>The Operator</strong>
            <br />
            Normally the operator publishes commits when the first revenue transaction arrives after
            a cooldown period. This cooldown period plus the freeze period is the time it takes for
            a member to be able to withdraw tokens after the token transaction where they earned them. The point
            of the cooldown period is to not unnecessarily pay for commit transaction if revenue arrives rapidly.
        </p>
        <p>
            All tokens earned during this period are in the hands of the operator (similar to tokens on an
            exchange). The member can lose only those tokens in case of total breakdown of the operator.
            By pressing the Force Publish button you can ask the operator to send a commit transaction even during
            the cooldown period or if no revenue has been added.
        </p>
    </Section>
)

About.styles = styles

export default About

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
                <strong>Operator </strong>
                who owns the root chain contract and publishes sidechain blocks
            </li>
            <li>
                <strong>Validator </strong>
                who also runs a sidechain and checks the published blocks
            </li>
            <li>
                <strong>Member </strong>
                of the revenue sharing community who has the primary interest in ensuring operator honesty
            </li>
        </ul>
        <p>
            <strong>The Operator</strong>
            <br />
            Normally the operator publishes side chain blocks when the first revenue transaction arrives after
            a cooldown period. This cooldown period plus the block freeze period is the time it takes for
            a member to be able to withdraw tokens after the token transaction where they earned them. The point
            of the cooldown period is to not unnecessarily pay for block publishing if revenue arrives rapidly.
        </p>
        <p>
            All tokens earned during this period are in the hands of the operator (similar to tokens on an
            exchange). The member can lose only those tokens in case of total breakdown of the operator.
            By pressing the Force Publish button you can ask the operator to publish a block even during
            the cooldown period or if no revenue has been added.
        </p>
    </Section>
)

About.styles = styles

export default About

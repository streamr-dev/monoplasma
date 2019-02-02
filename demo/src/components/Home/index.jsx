// @flow

import React from 'react'
import BN from 'bn.js'

import Container from '../Container'
import Layout from '../Layout'
import Button from '../Button'
import Hero from './Hero'
import Section from './Section'
import Stat from './Stat'

import styles from './home.module.css'

const Home = () => (
    <Layout>
        <Hero />
        <Container className={styles.root}>
            <Section title="User account" className={styles.userAccount}>
                <div className={styles.stats}>
                    <Stat caption="Total earnings" value={new BN(0, 2)} />
                    <Stat caption="Earnings frozen" value={new BN(0, 2)} />
                    <Stat caption="Total withdrawn" value={new BN(0, 2)} />
                    <Stat caption="Total earnings recorded" value={new BN(0, 2)} />
                    <Stat caption="Earnings accessible" value={new BN(0, 2)} />
                </div>
                <div className={styles.actions}>
                    <input type="text" defaultValue="" placeholder="Enter Ethereum address…" />
                    <Button>View</Button>
                    <Button theme="red-edge">Kick</Button>
                </div>
            </Section>
            <Section title="Revenue pool" className={styles.revenuePool}>
                <div className={styles.stats}>
                    <Stat caption="Members" value={new BN(0, 2)} />
                    <Stat caption="Total earnings" value={new BN(0, 2)} />
                    <Stat caption="Earnings frozen" value={new BN(0, 2)} />
                    <Stat caption="Contract balance" value={new BN(0, 2)} />
                    <Stat caption="Total earnings recorded" value={new BN(0, 2)} />
                    <Stat caption="Earnings available" value={new BN(0, 2)} />
                    <div />
                    <Stat caption="Total withdrawn" value={new BN(0, 2)} />
                </div>
                <div className={styles.actions}>
                    <div />
                    <Button>Withdraw tokens</Button>
                    <Button theme="edge">Add revenue</Button>
                </div>
            </Section>
            <Section title="Management">
                <div className={styles.management}>
                    <div className={styles.users}>
                        <textarea placeholder="Enter Ethereum addresses, one per line…" />
                        <div className={styles.buttons}>
                            <Button className={styles.addUsers}>Add users</Button>
                        </div>
                    </div>
                    <div className={styles.tokens}>
                        <div>
                            <Button theme="edge">Mint tokens</Button>
                            <div className={styles.hint}>
                                Mints new tokens and deposits them to the currently selected account in Metamask.
                            </div>
                        </div>
                        <Button theme="red-edge">Steal all tokens</Button>
                    </div>
                </div>
            </Section>
            <Section title="About" className={styles.about}>
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
        </Container>
    </Layout>
)

export default Home

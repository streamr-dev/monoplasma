// @flow

import React from 'react'
import BN from 'bn.js'

import Container from '../Container'
import Layout from '../Layout'
import Button from '../Button'
import Hero from './Hero'
import Section from './Section'
import Stats from './Stats'
import About from './About'

import styles from './home.module.css'

const Home = () => (
    <Layout>
        <Hero />
        <Container className={styles.root}>
            <Section title="User account" className={styles.userAccount}>
                <Stats
                    items={[
                        ['Total earnings', new BN(0, 2)],
                        ['Earnings frozen', new BN(0, 2)],
                        ['Total withdrawn', new BN(0, 2)],
                        ['Total earnings recorded', new BN(0, 2)],
                        ['Earnings accessible', new BN(0, 2)],
                    ]}
                />
                <div className={styles.actions}>
                    <input type="text" defaultValue="" placeholder="Enter Ethereum address…" />
                    <Button>View</Button>
                    <Button theme="red-edge">Kick</Button>
                </div>
            </Section>
            <Section title="Revenue pool" className={styles.revenuePool}>
                <Stats
                    items={[
                        ['Members', new BN(0, 2)],
                        ['Total earnings', new BN(0, 2)],
                        ['Earnings frozen', new BN(0, 2)],
                        ['Contract balance', new BN(0, 2)],
                        ['Total earnings recorded', new BN(0, 2)],
                        ['Earnings available', new BN(0, 2)],
                        null,
                        ['Total withdrawn', new BN(0, 2)],
                    ]}
                />
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
            <About />
        </Container>
    </Layout>
)

export default Home

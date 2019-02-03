// @flow

import React from 'react'

import Context, { Props as ContextProps } from '../../contexts/Home'
import Container from '../Container'
import Layout from '../Layout'
import Button from '../Button'
import Hero from './Hero'
import Section from './Section'
import Stats from './Stats'
import About from './About'
import UserActions from './UserActions'
import RevenuePoolActions from './RevenuePoolActions'

import styles from './home.module.css'

type Props = ContextProps & {
}

const Home = ({
    account,
    revenuePool,
    onViewClick,
    onKickClick,
    onWithdrawClick,
    onAddRevenueClick,
}: Props) => (
    <Layout>
        <Hero />
        <Container
            className={styles.root}
        >
            <Section
                title="User account"
            >
                <Stats
                    items={account}
                />
                <UserActions
                    onViewClick={onViewClick}
                    onKickClick={onKickClick}
                    onWithdrawClick={onWithdrawClick}
                    defaultAddress=""
                />
            </Section>
            <Section
                title="Revenue pool"
                className={styles.revenuePool}
            >
                <Stats
                    items={revenuePool}
                />
                <RevenuePoolActions
                    onAddRevenueClick={onAddRevenueClick}
                />
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

export default (props) => (
    <Context.Consumer>
        {(context: ContextProps) => (
            <Home {...context} {...props} />
        )}
    </Context.Consumer>
)

// @flow

import React from 'react'

import Context, { type Props as ContextProps } from '../../contexts/Home'
import Container from '../Container'
import Layout from '../Layout'
import Hero from './Hero'
import Section from './Section'
import Stats from './Stats'
import About from './About'
import UserActions from './UserActions'
import RevenuePoolActions from './RevenuePoolActions'
import Management from './Management'

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
    onAddUsersClick,
    onMintClick,
    onStealClick,
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
            <Management
                onAddUsersClick={onAddUsersClick}
                onMintClick={onMintClick}
                onStealClick={onStealClick}
            />
            <About />
        </Container>
    </Layout>
)

export default (props: {}) => (
    <Context.Consumer>
        {(context: ContextProps) => (
            <Home {...context} {...props} />
        )}
    </Context.Consumer>
)

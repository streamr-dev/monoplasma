// @flow

import React, { type Node } from 'react'

import Context, { type Props as ContextProps } from '../../contexts/Home'
import Container from '../Container'
import Layout from '../Layout'
import Notification from '../Notification'
import Hero from './Hero'
import Section from './Section'
import Stats from './Stats'
import About from './About'
import UserActions from './UserActions'
import RevenuePoolActions from './RevenuePoolActions'
import Management from './Management'
import Blocks from './Blocks'

import styles from './home.module.css'

type OwnProps = {
    notification: Node,
}

type Props = ContextProps & OwnProps

const Home = ({
    account,
    revenuePool,
    blocks,
    onViewClick,
    onKickClick,
    onWithdrawClick,
    onAddRevenueClick,
    onForcePublishClick,
    onAddUsersClick,
    onMintClick,
    onStealClick,
    notification,
}: Props) => (
    <Layout>
        <Hero />
        <Container
            className={styles.root}
        >
            {notification && (
                <Notification className={styles.notification}>
                    {notification}
                </Notification>
            )}
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
                <Blocks
                    className={styles.blocks}
                    items={blocks}
                />
                <RevenuePoolActions
                    onAddRevenueClick={onAddRevenueClick}
                    onForcePublishClick={onForcePublishClick}
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

export default (props: OwnProps) => (
    <Context.Consumer>
        {(context: ContextProps) => (
            <Home {...context} {...props} />
        )}
    </Context.Consumer>
)

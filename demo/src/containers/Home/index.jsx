// @flow

/* eslint-disable react/no-unused-state */

import React, { Component, type Node, Fragment } from 'react'
import BN from 'bn.js'
import HomeComponent from '../../components/Home'
import Context, { type Props as ContextProps } from '../../contexts/Home'
import WalletContext, { type Props as WalletContextProps } from '../../contexts/Wallet'

type Props = WalletContextProps & {}

type State = ContextProps & {}

const tick = (): Promise<void> => (
    new Promise((resolve) => {
        setTimeout(resolve, Math.floor(Math.random() * 5000))
    })
)

class Home extends Component<Props, State> {
    static BLOCK_ID: number = 770129

    unmounted: boolean = false

    state = {
        account: [
            ['Total earnings', new BN(0)],
            ['Earnings frozen', new BN(0)],
            ['Total withdrawn', new BN(0)],
            ['Total earnings recorded', new BN(0)],
            ['Earnings accessible', new BN(0)],
        ],
        revenuePool: [
            ['Members', new BN(0)],
            ['Total earnings', new BN(0)],
            ['Earnings frozen', new BN(0)],
            ['Contract balance', new BN(0)],
            ['Total earnings recorded', new BN(0)],
            ['Earnings available', new BN(0)],
            null,
            ['Total withdrawn', new BN(0)],
        ],
        blocks: [1, 2, 3, 4, 5],
        config: {},
        onViewClick: this.onViewClick.bind(this),
        onKickClick: this.onKickClick.bind(this),
        onWithdrawClick: this.onWithdrawClick.bind(this),
        onAddRevenueClick: this.onAddRevenueClick.bind(this),
        onAddUsersClick: this.onAddUsersClick.bind(this),
        onMintClick: this.onMintClick.bind(this),
        onStealClick: this.onStealClick.bind(this),
        onForcePublishClick: this.onForcePublishClick.bind(this),
    }

    componentDidMount() {
        fetch('/data/operator.json')
            .then((resp) => resp.json())
            .then((config) => {
                this.setState({
                    config,
                })
            })

        this.poolBlocks()
    }

    componentWillUnmount() {
        this.unmounted = true
    }

    onViewClick(address: string) {
        fetch(`/api/members/${address}`).then(() => {
            this.setState({
                account: [
                    ['Total earnings', new BN(1)],
                    ['Earnings frozen', new BN(1)],
                    ['Total withdrawn', new BN(1)],
                    ['Total earnings recorded', new BN(2)],
                    ['Earnings accessible', new BN(3)],
                ],
            })
        }, (error) => {
            console.log(error)
        })
    }

    onKickClick(address: string) {
        console.log('Kick', address, this)
    }

    onWithdrawClick(address: string) {
        console.log('Withdraw', address, this)
    }

    onAddRevenueClick(amount: number) {
        console.log('Add revenue', amount, this)
    }

    onForcePublishClick(amount: number) {
        console.log('Force publish', amount, this)
    }

    onAddUsersClick(addresses: Array<string>) {
        console.log('Add users', addresses, this)
    }

    onMintClick() {
        console.log('Mint tokens', this)
    }

    onStealClick() {
        const { eth, accountAddress, web3 } = this.props
        console.log('Steal tokens', this)
        console.log(eth, accountAddress, web3)
    }

    addRandomBlock = () => {
        if (this.unmounted) {
            return
        }

        this.constructor.BLOCK_ID += 1

        this.setState(({ blocks }) => ({
            blocks: [
                {
                    id: this.constructor.BLOCK_ID,
                    timestamp: new Date().getTime(),
                    members: 1000 + Math.floor(Math.random() * 15000),
                    earnings: 1048576 + Math.floor(Math.random() * 1048576000000),
                },
                ...blocks,
            ].slice(0, 5),
        }))
    }

    poolBlocks = () => {
        if (this.unmounted) {
            return
        }

        tick().then(this.addRandomBlock).then(this.poolBlocks)
    }

    notification(): Node {
        const { eth, accountAddress } = this.props

        switch (true) {
            case !eth:
                return (
                    <Fragment>
                        <span>No wallet detected. please install </span>
                        <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">MetaMask</a>
                    </Fragment>
                )
            case !accountAddress:
                return 'Please unlock your wallet to continue'
            default:
        }

        return null
    }

    render() {
        return (
            <Context.Provider value={this.state}>
                <HomeComponent
                    notification={this.notification()}
                />
            </Context.Provider>
        )
    }
}

export default (props: {}) => (
    <WalletContext.Consumer>
        {(context) => (
            <Home {...context} {...props} />
        )}
    </WalletContext.Consumer>
)

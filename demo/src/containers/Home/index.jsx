// @flow

/* eslint-disable react/no-unused-state */

import React, { Component } from 'react'
import BN from 'bn.js'
import Eth from 'ethjs'
import HomeComponent from '../../components/Home'
import Context, { type Props as ContextProps } from '../../contexts/Home'

const { Web3, ethereum } = typeof window !== 'undefined' ? window : {}

type State = ContextProps & {
}

const tick = (): Promise<void> => (
    new Promise((resolve) => {
        setTimeout(resolve, Math.floor(Math.random() * 5000))
    })
)

class Home extends Component<{}, State> {
    static BLOCK_ID: number = 770129

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

    unmounted: boolean = false

    componentDidMount() {
        fetch('/data/operator.json')
            .then((resp) => resp.json())
            .then((config) => {
                this.setState({
                    config,
                })
            })

        // From https://medium.com/metamask/https-medium-com-metamask-breaking-change-injecting-web3-7722797916a8
        if (ethereum) {
            window.web3 = new Web3(ethereum)
            window.eth = new Eth(ethereum)

            ethereum.enable().then(() => {
                // metamaskAddress = ethereum.selectedAddress
                // document.getElementById("account-found").hidden = !metamaskAddress
                // document.getElementById("no-accounts").hidden = !!metamaskAddress
            })
        } else if (window.web3) {
            window.web3 = new Web3(window.web3.currentProvider)
            window.eth = new Eth(window.web3.currentProvider)
            window.eth.accounts().then((accounts) => {
                console.log(accounts)
                // metamaskAddress = accounts[0]
                // document.getElementById("account-found").hidden = !metamaskAddress
                // document.getElementById("no-accounts").hidden = !!metamaskAddress
            })
        }

        if (!window.eth) {
            console.log('No Ethereum support detected. Consider installing https://metamask.io/')
            // document.getElementById("no-metamask").hidden = false
        }

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
        console.log('Steal tokens', this)
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

    render() {
        return (
            <Context.Provider value={this.state}>
                <HomeComponent />
            </Context.Provider>
        )
    }
}

export default Home

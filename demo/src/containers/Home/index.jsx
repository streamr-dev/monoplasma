// @flow

/* eslint-disable react/no-unused-state */
/* eslint-disable new-cap */

import React, { Component, type Node, Fragment } from 'react'
import BN from 'bn.js'
import Eth from 'ethjs'

import HomeComponent from '../../components/Home'
import Context, { type Props as ContextProps } from '../../contexts/Home'
import WalletContext, { type Props as WalletContextProps } from '../../contexts/Wallet'

import tokenAbi from '../../utils/tokenAbi'
import monoplasmaAbi from '../../utils/monoplasmaAbi'

// TODO: move to where network is checked
const etherscanUrl = 'http://rinkeby.infura.io'

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
        member: null,
        config: null,
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
            }, () => {
                console.log(':boom:')
            })

        this.pollBlocks()
    }

    componentWillUnmount() {
        this.unmounted = true
    }

    onViewClick(address: string) {
        console.log('View ', address, this)
        this.updateUser(address)
    }

    onKickClick(address: string) {
        console.log('Kick', address, this)
    }

    onWithdrawClick(address: string) {
        console.log('Withdraw', address, this)
        const { config } = this.state
        const monoplasma = new Eth.contract(monoplasmaAbi).at(config.contractAddress)

        monoplasma.withdrawAll().then((txHash) => {
            console.log(`transfer transaction pending: ${etherscanUrl}/tx/${txHash}`)
            return window.eth.getTransactionSuccess(txHash)
        }).then((receipt) => {
            console.log(`add revenue / transfer transaction successful: ${JSON.stringify(receipt)}`)
            this.updateUser()
            this.updateCommunity()
        }).catch((error) => {
            window.alert(error.message)
        })
    }

    onAddRevenueClick(amount: number) {
        console.log('Add revenue', amount, this)
        const { config } = this.state
        const { eth } = this.props
        const amountWei = eth.toWei(amount, 'ether')

        const token = new Eth.contract(tokenAbi).at(config.tokenAddress)

        token.transfer(config.contractAddress, amountWei).then((txHash) => {
            console.log(`transfer transaction pending: ${etherscanUrl}/tx/${txHash}`)
            return window.eth.getTransactionSuccess(txHash)
        }).then((receipt) => {
            console.log(`add revenue / transfer transaction successful: ${JSON.stringify(receipt)}`)
            this.updateUser()
            this.updateCommunity()
        }).catch((error) => {
            window.alert(error.message)
        })
    }

    onForcePublishClick() {
        console.log('Force publish', this)
    }

    onAddUsersClick(addresses: Array<string>) {
        console.log('Add users', addresses, this)
        const userList = addresses.filter(window.Eth.isAddress)
        fetch('/admin/members', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userList),
        }).then((resp) => resp.json()).then((res) => {
            window.alert(res)
        })
    }

    onMintClick() {
        console.log('Mint tokens', this)
    }

    onStealClick() {
        const { eth, accountAddress, web3 } = this.props
        console.log('Steal tokens', this)
        console.log(eth, accountAddress, web3)
    }

    addBlockToList = (block) => {
        if (this.unmounted) { return }
        console.log(`Adding ${block} to list`)

        this.setState(({ blocks }) => ({
            blocks: [
                {
                    id: block.blockNumber,
                    timestamp: new Date(block.timestamp).getTime(),
                    members: block.memberCount,
                    earnings: block.totalEarnings,
                },
                ...blocks,
            ].slice(0, 5),
        }))
    }

    addRandomBlock = () => {
        if (this.unmounted) { return }

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

    pollBlocks = () => {
        if (this.unmounted) { return }

        fetch('/api/status').then((resp) => resp.json()).then((community) => {
            const { latestBlock } = community
            if (latestBlock.blockNumber !== 1) {
                this.addBlockToList(latestBlock)
            }
        })

        tick().then(this.addRandomBlock).then(this.pollBlocks)
    }

    updateUser(address: string) {
        if (!Eth.isAddress(address)) {
            console.error(`Bad address: ${address}`)
            return
        }
        fetch(`http://localhost:8080/api/members/${address}`).then((resp) => resp.json()).then((member) => {
            this.setState({
                member,
                account: [
                    ['Total earnings', new BN(member.earnings || 0)],
                    ['Earnings frozen', new BN(member.earningsFrozen || 0)],
                    ['Total withdrawn', new BN(member.withdrawn || 0)],
                    ['Total earnings recorded', new BN(member.recordedEarnings || 0)],
                    ['Earnings accessible', new BN(member.withdrawable)],
                ],
            })
        })
    }

    updateCommunity() {
        // TODO: move these into the state
        const { config } = this.state
        const monoplasma = new Eth.contract(monoplasmaAbi).at(config.contractAddress)
        const token = new Eth.contract(tokenAbi).at(config.tokenAddress)

        let contractBalance
        let totalWithdrawn
        token.balanceOf(config.contractAddress).then((res) => {
            contractBalance = new BN(res)
            return monoplasma.totalWithdrawn()
        }).then((res) => {
            totalWithdrawn = new BN(res)
            return fetch('/api/status').then((resp) => resp.json())
        }).then((community) => {
            const recorded = new BN(community.latestBlock.totalEarnings)
            const withdrawable = new BN(community.latestWithdrawableBlock.totalEarnings)
            this.setState({
                community,
                revenuePool: [
                    ['Members', community.memberCount.total],
                    ['Total earnings', community.totalEarnings],
                    ['Earnings frozen', recorded.sub(withdrawable)],
                    ['Contract balance', contractBalance],
                    ['Total earnings recorded', recorded],
                    ['Earnings available', withdrawable],
                    null,
                    ['Total withdrawn', totalWithdrawn],
                ],
            })
        })
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

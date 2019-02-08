// @flow

/* eslint-disable react/no-unused-state */
/* eslint-disable new-cap */
/* eslint-disable no-console */

import React, { Component, type Node, Fragment } from 'react'
import BN from 'bn.js'
import Eth from 'ethjs'

import HomeComponent from '../../components/Home'
import Context, { type Props as ContextProps } from '../../contexts/Home'
import WalletContext, { type Props as WalletContextProps } from '../../contexts/Wallet'

import tokenAbi from '../../utils/tokenAbi'
import monoplasmaAbi from '../../utils/monoplasmaAbi'

// TODO: move to where network is checked. This actually should depend on chosen network.
const etherscanUrl = 'http://rinkeby.infura.io'

const MINT_TOKEN_AMOUNT = Eth.toWei('10000', 'ether')

type Props = WalletContextProps & {}

type State = ContextProps & {}

const tick = (): Promise<void> => (
    new Promise((resolve) => {
        setTimeout(resolve, Math.floor(Math.random() * 5000))
    })
)

const toFixed18 = (num: number) => new BN(10).pow(new BN(18)).mul(new BN(num))

// TODO: disable alert for demo  (;
const handleError = (error) => {
    console.error(error)
    window.alert(error.message) // eslint-disable-line no-alert
}

class Home extends Component<Props, State> {
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
        latestBlockNumber: 0,
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
        fetch(`http://localhost:8080/admin/members/${address}`, {
            method: 'DELETE',
        }).then((resp) => resp.json()).then((res) => {
            console.log(`Kick user response: ${JSON.stringify(res)}`)
            return this.updateCommunity()
        }).catch(handleError)
    }

    onWithdrawClick(address: string) {
        console.log('Withdraw', address, this)
        const { config } = this.state
        const { eth } = this.props
        const monoplasma = new eth.contract(monoplasmaAbi).at(config.contractAddress)

        monoplasma.withdrawAll().then((txHash) => {
            console.log(`withdrawAll transaction pending: ${etherscanUrl}/tx/${txHash}`)
            return eth.getTransactionSuccess(txHash)
        }).then((receipt) => {
            console.log(`withdrawAll transaction successful: ${JSON.stringify(receipt)}`)
            this.updateUser(address)
            this.updateCommunity()
        }).catch(handleError)
    }

    onAddRevenueClick(amount: number) {
        console.log('Add revenue', amount, this)
        const { config, member } = this.state
        const { eth, accountAddress } = this.props
        const amountWei = Eth.toWei(amount, 'ether')
        const opts = {
            from: accountAddress,
        }

        const token = new eth.contract(tokenAbi).at(config.tokenAddress)

        token.transfer(config.contractAddress, amountWei, opts).then((txHash) => {
            console.log(`transfer transaction pending: ${etherscanUrl}/tx/${txHash}`)
            return eth.getTransactionSuccess(txHash)
        }).then((receipt) => {
            console.log(`add revenue / transfer transaction successful: ${JSON.stringify(receipt)}`)
            if (member) {
                this.updateUser(member.address)
            }
            this.updateCommunity()
        }).catch(handleError)
    }

    onForcePublishClick() {
        console.log('Force publish', this)
        fetch('http://localhost:8080/demo/publishBlock').then((resp) => resp.json()).then((receipt) => {
            console.log(`Block publish successful: ${JSON.stringify(receipt)}`)
        })
    }

    onAddUsersClick(addresses: Array<string>) {
        console.log('Add users', addresses, this)
        const userList = addresses.filter(Eth.isAddress)
        fetch('http://localhost:8080/admin/members', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userList),
        }).then((resp) => resp.json()).then((res) => {
            console.log(`Add users response: ${JSON.stringify(res)}`)
            return this.updateCommunity()
        }).catch(handleError)
    }

    onMintClick() {
        console.log('Mint tokens', this)
        const { config } = this.state
        const { eth, accountAddress } = this.props
        const opts = {
            from: accountAddress,
        }

        const token = new eth.contract(tokenAbi).at(config.tokenAddress)

        token.mint(accountAddress, MINT_TOKEN_AMOUNT, opts).then((txHash) => {
            console.log(`mint transaction pending: ${etherscanUrl}/tx/${txHash}`)
            return eth.getTransactionSuccess(txHash)
        }).then((receipt) => {
            console.log(`mint transaction successful: ${JSON.stringify(receipt)}`)
        }).catch(handleError)
    }

    onStealClick() {
        const { eth, accountAddress, web3 } = this.props
        console.log('Steal tokens', this)
        console.log(eth, accountAddress, web3)
    }

    addBlockToList = (block) => {
        if (this.unmounted) { return }
        if (!block || !block.blockNumber) { return }
        console.log(`Adding ${JSON.stringify(block)} to list`)

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

    pollBlocks = () => {
        if (this.unmounted) { return }

        tick().then(this.updateCommunity.bind(this)).then(this.pollBlocks)
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
        }).catch(handleError)
    }

    updateCommunity() {
        const { eth } = this.props
        const { config, latestBlockNumber } = this.state

        // TODO: move contract instances into the state
        const monoplasma = new eth.contract(monoplasmaAbi).at(config.contractAddress)
        const token = new eth.contract(tokenAbi).at(config.tokenAddress)

        let contractBalance
        let totalWithdrawn
        return token.balanceOf(config.contractAddress).then((res) => {
            contractBalance = res[0] // eslint-disable-line prefer-destructuring
            return monoplasma.totalWithdrawn()
        }).then((res) => {
            totalWithdrawn = res[0] // eslint-disable-line prefer-destructuring
            return fetch('http://localhost:8080/api/status').then((resp) => resp.json())
        }).then((community) => {
            if (!community.latestBlock) {
                console.error(`Community status: ${JSON.stringify(community)}`)
                return
            }
            const recorded = new BN(community.latestBlock.totalEarnings || 0)
            const withdrawable = new BN(community.latestWithdrawableBlock.totalEarnings || 0)
            this.setState({
                community,
                revenuePool: [
                    ['Members', toFixed18(community.memberCount.total)],
                    ['Total earnings', new BN(community.totalEarnings)],
                    ['Earnings frozen', new BN(recorded.sub(withdrawable))],
                    ['Contract balance', new BN(contractBalance)],
                    ['Total earnings recorded', new BN(recorded)],
                    ['Earnings available', new BN(withdrawable)],
                    null,
                    ['Total withdrawn', new BN(totalWithdrawn)],
                ],
            })
            const bnum = community.latestBlock.blockNumber
            if (bnum && bnum !== latestBlockNumber) {
                this.setState({
                    latestBlocknumber: bnum,
                })
                this.addBlockToList(community.latestBlock)
            }
        })
            .catch(handleError)
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

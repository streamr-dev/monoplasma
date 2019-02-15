// @flow

/* eslint-disable react/no-unused-state */
/* eslint-disable new-cap */
/* eslint-disable no-console */
/* eslint-disable newline-per-chained-call */

import React, { Component, type Node, Fragment } from 'react'
import BN from 'bn.js'
import Eth from 'ethjs'

import HomeComponent from '../../components/Home'
import Context, { type Props as ContextProps } from '../../contexts/Home'
import WalletContext, { type Props as WalletContextProps } from '../../contexts/Wallet'
import { type Block } from '../../components/Home/Blocks'

import tokenAbi from '../../utils/tokenAbi'
import monoplasmaAbi from '../../utils/monoplasmaAbi'

// TODO: move to where network is checked. This actually should depend on chosen network.
const etherscanUrl = 'http://rinkeby.infura.io'

const MINT_TOKEN_AMOUNT = Eth.toWei('1000000', 'ether')

type Props = WalletContextProps & {}

type State = ContextProps & {
    serverConnectionError: boolean,
    latestBlockNumber: number,
    community: any,
    member: any,
}

const toFixed18 = (num: number) => new BN(10).pow(new BN(18)).mul(new BN(num))

// TODO: disable alert for demo  (;
const handleError = (error) => {
    console.error(error)
    window.alert(error.message) // eslint-disable-line no-alert
}

function sleep(ms: number) {
    return new Promise((done) => {
        setTimeout(done, ms)
    })
}

class Home extends Component<Props, State> {
    unmounted: boolean = false

    state = {
        account: [
            ['Total earnings', new BN(0)],
            ['Earnings frozen', new BN(0)],
            ['Total withdrawn', new BN(0)],
            ['Total earnings recorded', new BN(0)],
            ['Earnings available', new BN(0)],
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
        serverConnectionError: false,
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
        community: null,
    }

    componentDidMount() {
        // TODO: retry on error (server not up yet?)
        fetch('/data/state.json')
            .then((resp) => resp.json())
            .then((config) => {
                this.setState({
                    config,
                })
            }, () => {
                console.log(':boom:')
            })

        fetch('http://localhost:8080/api/blocks?n=5')
            .then((resp) => resp.json())
            .then((blockList) => {
                let latestBlockNumber = 0
                blockList.forEach((block) => {
                    this.addBlockToList(block)
                    latestBlockNumber = block.blockNumber > latestBlockNumber ? block.blockNumber : latestBlockNumber
                })
                this.setState({
                    latestBlockNumber,
                })
            })

        const self = this
        function pollBlocks() {
            if (self.unmounted) { return }

            self.updateCommunity().then(() => {
                const { member } = self.state
                if (member) {
                    return self.updateUser(member.address)
                }
                return null
            }).then(() => {
                self.setState({
                    serverConnectionError: false,
                })
                setTimeout(pollBlocks, 1000)
            }).catch((error) => {
                console.error(error)
                self.setState({
                    serverConnectionError: true,
                })
                setTimeout(pollBlocks, 5000)
            })
        }
        setTimeout(pollBlocks, 1000)
    }

    componentWillUnmount() {
        this.unmounted = true
    }

    onViewClick(address: string) {
        console.log('View ', address, this)
        this.updateUser(address).catch(handleError)
    }

    onKickClick(address: string) {
        console.log('Kick', address, this)
        fetch(`http://localhost:8080/admin/members/${address}`, {
            method: 'DELETE',
        }).then((res) => {
            console.log(`Kick response status code: ${JSON.stringify(res.status)}`)
            return this.updateCommunity()
        }).catch(handleError)
    }

    onWithdrawClick(address: string) {
        console.log('Withdraw', address, this)
        const { config } = this.state
        const { eth, accountAddress } = this.props

        if (!config) {
            console.warn('Missing config. Has not loaded yet?')
            return
        }

        const opts = {
            from: accountAddress,
        }

        const monoplasma = new eth.contract(monoplasmaAbi).at(config.contractAddress)

        this.updateUser(address).then((member) => {
            const { withdrawableBlockNumber, withdrawableEarnings, proof } = member
            return monoplasma.withdrawAll(withdrawableBlockNumber, withdrawableEarnings, proof, opts)
        }).then((txHash) => {
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

        if (!config) {
            console.warn('Missing config. Has not loaded yet?')
            return
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
        }).catch(handleError)
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

        if (!config) {
            console.warn('Missing config. Has not loaded yet?')
            return
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
        const { eth, accountAddress } = this.props
        const { config } = this.state
        console.log('Steal tokens')

        const opts = {
            from: accountAddress,
        }

        if (!config) {
            console.warn('Missing config. Has not loaded yet?')
            return
        }

        if (!accountAddress) {
            console.warn('Missing account address.')
            return
        }

        const monoplasma = new eth.contract(monoplasmaAbi).at(config.contractAddress)

        let stealInstructions
        fetch(`http://localhost:8080/demo/stealAllTokens?targetAddress=${accountAddress}`).then((resp) => resp.json()).then((res) => {
            if (res.error) {
                throw new Error(`Stealing failed, reason: ${res.error}`)
            }
            stealInstructions = res
            console.log(`Steal request successful: ${JSON.stringify(stealInstructions)}. Waiting for block to unfreeze...`)
            return sleep(Number.parseInt(config.blockFreezeSeconds || '0', 10) * 1000)
        }).then(() => {
            const { blockNumber, tokens, proof } = stealInstructions
            return monoplasma.withdrawAll(blockNumber, tokens, proof, opts)
        }).then(() => {
            // eslint-disable-next-line no-alert
            window.alert('Successfully stole all tokens, check your balances  :)')
        }).catch(handleError)
    }

    addBlockToList = (block: ?Block) => {
        const { blocks } = this.state

        if (this.unmounted || !block || !block.blockNumber) { return }

        if (blocks.find((b) => typeof b !== 'number' && block && b.blockNumber === block.blockNumber)) {
            console.log(`Trying to re-add block #${block.blockNumber}`)
            return
        }
        console.log(`Adding ${JSON.stringify(block)} to list`)

        // add new block to front, take 5 newest
        const newBlocks = [block, ...blocks].slice(0, 5)
        this.setState({
            blocks: newBlocks,
        })
    }

    updateUser(address: string) {
        if (!Eth.isAddress(address)) {
            throw new Error(`Bad address: ${address}`)
        }
        const { eth } = this.props
        const { config } = this.state

        if (!config) {
            throw new Error('Config hasn\'t been loaded from server, try refreshing the page')
        }

        // TODO: move contract instances into the state
        const monoplasma = new eth.contract(monoplasmaAbi).at(config.contractAddress)

        let withdrawn
        return monoplasma.withdrawn(address).then((res) => {
            withdrawn = res[0] // eslint-disable-line prefer-destructuring
            return fetch(`http://localhost:8080/api/members/${address}`).then((resp) => resp.json())
        }).then((member) => {
            const withdrawnBN = new BN(withdrawn || 0)
            const recordedBN = new BN(member.withdrawableEarnings || 0)
            const withdrawableBN = recordedBN.sub(withdrawnBN)
            this.setState({
                member,
                account: [
                    ['Total earnings', new BN(member.earnings || 0)],
                    ['Earnings frozen', new BN(member.frozenEarnings || 0)],
                    ['Total withdrawn', withdrawnBN],
                    ['Total earnings recorded', recordedBN],
                    ['Earnings available', withdrawableBN],
                ],
            })
            return member
        })
    }

    async updateCommunity() {
        const { eth } = this.props
        const { config, latestBlockNumber } = this.state

        if (!config) {
            throw new Error('Config hasn\'t been loaded from server, try refreshing the page')
        }

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
                return community
            }
            const recorded = new BN(community.latestBlock.totalEarnings || 0)
            const totalEarningsInLatestWithdrawable = new BN(community.latestWithdrawableBlock.totalEarnings || 0)
            const earningsAvailable = totalEarningsInLatestWithdrawable.sub(new BN(totalWithdrawn))
            this.setState({
                community,
                revenuePool: [
                    ['Members', toFixed18(community.memberCount.active)],
                    ['Total earnings', new BN(community.totalEarnings)],
                    ['Earnings frozen', new BN(recorded.sub(totalEarningsInLatestWithdrawable))],
                    ['Contract balance', new BN(contractBalance)],
                    ['Total earnings recorded', new BN(recorded)],
                    ['Earnings available', earningsAvailable],
                    null,
                    ['Total withdrawn', new BN(totalWithdrawn)],
                ],
            })
            const bnum = community.latestBlock.blockNumber
            if (bnum && bnum !== latestBlockNumber) {
                this.setState({
                    latestBlockNumber: bnum,
                })
                this.addBlockToList(community.latestBlock)
            }
            return community
        })
    }

    notification(): Node {
        const { eth, accountAddress } = this.props
        const { serverConnectionError } = this.state

        if (!eth) {
            return (
                <Fragment>
                    <span>No wallet detected. please install </span>
                    <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">MetaMask</a>
                </Fragment>
            )
        }

        if (!accountAddress) {
            return 'Please unlock your wallet to continue'
        }

        if (serverConnectionError) {
            return 'Error connecting to server...'
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

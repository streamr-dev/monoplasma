// @flow

import React, { Component } from 'react'
import BN from 'bn.js'
import HomeComponent from '../../components/Home'
import Context, { type Props as ContextProps } from '../../contexts/Home'

type State = ContextProps & {
}

class Home extends Component<{}, State> {
    state = {
        /* eslint-disable react/no-unused-state */
        account: [
            ['Total earnings', new BN(0, 2)],
            ['Earnings frozen', new BN(0, 2)],
            ['Total withdrawn', new BN(0, 2)],
            ['Total earnings recorded', new BN(0, 2)],
            ['Earnings accessible', new BN(0, 2)],
        ],
        revenuePool: [
            ['Members', new BN(0, 2)],
            ['Total earnings', new BN(0, 2)],
            ['Earnings frozen', new BN(0, 2)],
            ['Contract balance', new BN(0, 2)],
            ['Total earnings recorded', new BN(0, 2)],
            ['Earnings available', new BN(0, 2)],
            null,
            ['Total withdrawn', new BN(0, 2)],
        ],
        onViewClick: this.onViewClick.bind(this),
        onKickClick: this.onKickClick.bind(this),
        onWithdrawClick: this.onWithdrawClick.bind(this),
        onAddRevenueClick: this.onAddRevenueClick.bind(this),
        onAddUsersClick: this.onAddUsersClick.bind(this),
        onMintClick: this.onMintClick.bind(this),
        onStealClick: this.onStealClick.bind(this),
        /* eslint-enable react/no-unused-state */
    }

    onViewClick(address: string) {
        console.log('View', address, this)
    }

    onKickClick(address: string) {
        console.log('Kick', address, this)
    }

    onWithdrawClick(address: string) {
        console.log('Withdraw', address, this)
    }

    onAddRevenueClick() {
        console.log('Add revenue', this)
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

    render() {
        return (
            <Context.Provider value={this.state}>
                <HomeComponent />
            </Context.Provider>
        )
    }
}

export default Home

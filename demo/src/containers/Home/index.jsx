// @flow

/* eslint-disable */

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
    }

    onViewClick(address: string) {
        console.log('View ', address, this)
        fetch(`/api/members/${address}`).then(resp => resp.json()).then(info => {
            this.setState({ account: [
                ['Total earnings', new BN(1, 2)],
                ['Earnings frozen', new BN(1, 2)],
                ['Total withdrawn', new BN(1, 2)],
                ['Total earnings recorded', new BN(2, 2)],
                ['Earnings accessible', new BN(3, 2)],
            ]})
        }).catch(e => {
            //alert(e)
            console.error(e)
            this.setState({ account: [
                ['Total earnings', new BN("1234.5671234567435456456", 10)],
                ['Earnings frozen', new BN(1, 2)],
                ['Total withdrawn', new BN(1, 2)],
                ['Total earnings recorded', new BN(2, 2)],
                ['Earnings accessible', new BN("23476238746278334534553454", 10)],
            ]})
        })
    }
    /* eslint-enable react/no-unused-state */

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

    componentDidMount() {
        fetch("/data/operator.json")
        .then(resp => resp.json())
        .then(json => {
            config = json
        }).catch(e => {
            console.error(e)
        })

        // From https://medium.com/metamask/https-medium-com-metamask-breaking-change-injecting-web3-7722797916a8
        if (window.ethereum) {
            window.web3 = new Web3(ethereum)
            //window.eth = new window.Eth(ethereum)
            ethereum.enable().then(function () {
                //metamaskAddress = ethereum.selectedAddress
                //document.getElementById("account-found").hidden = !metamaskAddress
                //document.getElementById("no-accounts").hidden = !!metamaskAddress
            })
        } else if (window.web3) {
            window.web3 = new Web3(web3.currentProvider);
            //window.eth = new Eth(web3.currentProvider)
            window.eth.accounts().then(function (accounts) {
                //metamaskAddress = accounts[0]
                //document.getElementById("account-found").hidden = !metamaskAddress
                //document.getElementById("no-accounts").hidden = !!metamaskAddress
            })
        }

        if (!window.eth) {
            console.log("No Ethereum support detected. Consider installing https://metamask.io/")
            //document.getElementById("no-metamask").hidden = false
        }
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

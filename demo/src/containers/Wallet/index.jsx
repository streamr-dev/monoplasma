// @flow

/* eslint-disable react/no-unused-state */

import React, { type Node, Component } from 'react'
import Eth from 'ethjs'
import Context, { type Props as ContextProps } from '../../contexts/Wallet'

const { Web3, ethereum, web3 } = typeof window !== 'undefined' ? window : {}
const provider = ethereum || (web3 && web3.currentProvider)

type Props = {
    children: Node,
}

type State = ContextProps & {}

class Wallet extends Component<Props, State> {
    constructor(props: Props) {
        super(props)

        if (provider) {
            this.web3 = new Web3(provider)
            this.eth = new Eth(provider)
        }

        this.state = {
            accountAddress: null,
            web3: this.web3,
            eth: this.eth,
        }
    }

    async componentDidMount() {
        this.getAccountAddress().then((accountAddress) => {
            if (!this.unmounted) {
                this.setState({
                    accountAddress,
                })
            }
        })

        if (ethereum) {
            ethereum.on('accountsChanged', this.onAccountChange)
        }
    }

    componentWillUnmount() {
        this.unmounted = true
        if (ethereum) {
            ethereum.off('accountsChanged', this.onAccountChange)
        }
    }

    onAccountChange = (accounts: Array<string>) => {
        if (!this.unmounted) {
            this.setState({
                accountAddress: accounts[0] || null,
            })
        }
    }

    async getAccountAddress(): Promise<?string> {
        if (ethereum) {
            try {
                await ethereum.enable()
                return ethereum.selectedAddress
            } catch (e) {
                /* catcher */
            }
        } else if (web3) {
            try {
                const accounts = await this.eth.accounts()
                return accounts[0] || null
            } catch (e) {
                /* catcher */
            }
        }

        return null
    }

    web3: any

    eth: any

    unmounted: boolean

    render() {
        const { children } = this.props

        return (
            <Context.Provider value={this.state}>
                {children}
            </Context.Provider>
        )
    }
}

export default Wallet

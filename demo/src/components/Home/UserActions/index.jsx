// @flow

import React, { Component } from 'react'
import Eth from 'ethjs'
import Button from '../../Button'
import Input from '../../Input'

import styles from './userActions.module.css'

type Props = {
    onViewClick: (string) => void,
    onKickClick: (string) => void,
    onWithdrawClick: (string) => void,
    defaultAddress: string,
}

type State = {
    address: string,
}

class UserActions extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        const { defaultAddress: address } = props

        this.state = {
            address,
        }
    }

    onAddressChange = ({ target: { value: address } }: SyntheticInputEvent<EventTarget>) => {
        this.setState({
            address,
        })
    }

    onViewClick = () => {
        const { onViewClick } = this.props
        const { address } = this.state

        onViewClick(address)
    }

    onKickClick = () => {
        const { onKickClick } = this.props
        const { address } = this.state

        onKickClick(address)
    }

    onWithdrawClick = () => {
        const { onWithdrawClick } = this.props
        const { address } = this.state

        onWithdrawClick(address)
    }

    render() {
        const { address } = this.state

        return (
            <div className={styles.root}>
                <input
                    type="text"
                    placeholder="Enter Ethereum address…"
                    value={address}
                    onChange={this.onAddressChange}
                    className={Input.styles.textField}
                />
                <Button
                    disabled={!Eth.isAddress(address)}
                    onClick={this.onViewClick}
                    tooltip="View the earnings and withdrawals of a given address."
                >
                  View
                </Button>
                <Button
                    disabled={!Eth.isAddress(address)}
                    onClick={this.onWithdrawClick}
                    theme="edge"
                    tooltip="Sends the latest unfrozen proof of earnings to the
                    Monoplasma smart contract, and asks it to send back the appropriate amount of tokens."
                >
                  Withdraw
                </Button>
                <Button
                    disabled={!Eth.isAddress(address)}
                    onClick={this.onKickClick}
                    theme="red-edge"
                    tooltip="Deactivates the selected user. That user will not
                    receive revenue share from income while deactivated."
                >
                  Kick
                </Button>
            </div>
        )
    }
}

export default UserActions

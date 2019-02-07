// @flow

import React, { Component } from 'react'
import Button from '../../Button'
import Input from '../../Input'
import Section from '../Section'

import styles from './management.module.css'

type Props = {
    onAddUsersClick: (Array<string>) => void,
    onMintClick: () => void,
    onStealClick: () => void,
}

type State = {
    addresses: string,
}

class Management extends Component<Props, State> {
    state = {
        addresses: '',
    }

    onAddressesChange = ({ target: { value: addresses } }: SyntheticInputEvent<EventTarget>) => {
        this.setState({
            addresses,
        })
    }

    onAddUsersClick = () => {
        const { onAddUsersClick } = this.props
        const { addresses } = this.state

        onAddUsersClick(addresses.split(/[\r\n]/m).filter(Boolean))
    }

    render() {
        const { addresses } = this.state
        const { onMintClick, onStealClick } = this.props

        return (
            <Section title="Management">
                <div className={styles.root}>
                    <div className={styles.users}>
                        <textarea
                            placeholder="Enter Ethereum addresses, one per line…"
                            className={Input.styles.textArea}
                            value={addresses}
                            onChange={this.onAddressesChange}
                        />
                        <div className={styles.buttons}>
                            <Button
                                className={styles.addUsers}
                                onClick={this.onAddUsersClick}
                            >
                                Add users
                            </Button>
                        </div>
                    </div>
                    <div className={styles.tokens}>
                        <Button
                            theme="edge"
                            onClick={onMintClick}
                        >
                            Mint tokens
                        </Button>
                        <Button
                            theme="red-edge"
                            onClick={onStealClick}
                        >
                            Steal all tokens
                        </Button>
                        {/* <div className={styles.hint}>
                            Operator can try to publish a block where all tokens have been allocated to them.
                        </div> */}
                    </div>
                </div>
            </Section>
        )
    }
}

export default Management

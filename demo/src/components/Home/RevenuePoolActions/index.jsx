// @flow

import React, { Component } from 'react'
import Button from '../../Button'
import Input from '../../Input'

import styles from './revenuePoolActions.module.css'

type Props = {
    onAddRevenueClick: (number) => void,
    onForcePublishClick: () => void,
    defaultAmount?: string,
}

type State = {
    amount: string,
}

class RevenuePoolActions extends Component<Props, State> {
    static defaultProps = {
        defaultAmount: '',
    }

    constructor(props: Props) {
        super(props)
        const { defaultAmount } = props

        this.state = {
            amount: defaultAmount || '',
        }
    }

    onAmountChange = ({ target: { value: amount } }: SyntheticInputEvent<EventTarget>) => {
        this.setState({
            amount,
        })
    }

    onAddRevenueClick = () => {
        const { onAddRevenueClick } = this.props
        onAddRevenueClick(this.amount())
    }

    amount(): number {
        const { amount } = this.state
        return Math.max(0, Number.parseFloat(amount) || 0)
    }

    render() {
        const { onForcePublishClick } = this.props
        const { amount } = this.state
        const disabled: boolean = !this.amount()

        return (
            <div className={styles.root}>
                <input
                    type="text"
                    placeholder="Enter amount…"
                    value={amount}
                    onChange={this.onAmountChange}
                    className={Input.styles.textField}
                />
                <Button disabled={disabled} onClick={this.onAddRevenueClick}>Add revenue</Button>
                <Button onClick={onForcePublishClick} theme="edge">Force publish</Button>
            </div>
        )
    }
}

export default RevenuePoolActions

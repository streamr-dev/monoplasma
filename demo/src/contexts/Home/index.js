// @flow

import { createContext } from 'react'

export type Props = {
    account: Array<any>,
    revenuePool: Array<any>,
    onViewClick: (string) => void,
    onKickClick: (string) => void,
    onWithdrawClick: (string) => void,
    onAddRevenueClick: () => void,
}

export default createContext({
    account: [],
    revenuePool: [],
    onViewClick: () => {},
    onKickClick: () => {},
    onWithdrawClick: () => {},
    onAddRevenueClick: () => {},
})

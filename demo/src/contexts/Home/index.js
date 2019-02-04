// @flow

import { createContext } from 'react'

export type Props = {
    account: Array<any>,
    revenuePool: Array<any>,
    onViewClick: (string) => void,
    onKickClick: (string) => void,
    onWithdrawClick: (string) => void,
    onAddRevenueClick: () => void,
    onForcePublishClick: () => void,
    onAddUsersClick: (Array<string>) => void,
    onMintClick: () => void,
    onStealClick: () => void,
}

export default createContext<Props>({
    account: [],
    revenuePool: [],
    onViewClick: () => {},
    onKickClick: () => {},
    onWithdrawClick: () => {},
    onAddRevenueClick: () => {},
    onForcePublishClick: () => {},
    onAddUsersClick: () => {},
    onMintClick: () => {},
    onStealClick: () => {},
})

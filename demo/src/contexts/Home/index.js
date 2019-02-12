// @flow

import { createContext } from 'react'
import { type Block } from '../../components/Home/Blocks'
import { type Setting } from '../../components/Home/Settings'

export type Props = {
    account: Array<any>,
    revenuePool: Array<any>,
    blocks: Array<Block | number>,
    onViewClick: (string) => void,
    onKickClick: (string) => void,
    onWithdrawClick: (string) => void,
    onAddRevenueClick: (number) => void,
    onForcePublishClick: () => void,
    onAddUsersClick: (Array<string>) => void,
    onMintClick: () => void,
    onStealClick: () => void,
    settings: ?Setting,
}

export default createContext<Props>({
    account: [],
    revenuePool: [],
    blocks: [],
    onViewClick: () => {},
    onKickClick: () => {},
    onWithdrawClick: () => {},
    onAddRevenueClick: () => {},
    onForcePublishClick: () => {},
    onAddUsersClick: () => {},
    onMintClick: () => {},
    onStealClick: () => {},
    settings: null,
})

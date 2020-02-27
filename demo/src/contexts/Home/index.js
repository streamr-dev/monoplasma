// @flow

import { createContext } from 'react'
import { type Block } from '../../components/Home/Blocks'

export type Config = {
    freezePeriodSeconds: string,
    contractAddress: string,
    ethereumServer: string,
    gasPrice: number,
    lastBlockNumber: number,
    lastPublishedBlock: number,
    operatorAddress: string,
    tokenAddress: string,
}

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
    config: ?Config,
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
    config: null,
})

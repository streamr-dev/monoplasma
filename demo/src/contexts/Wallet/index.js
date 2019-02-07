// @flow

import { createContext } from 'react'

export type Props = {
    accountAddress: ?string,
    web3: any,
    eth: any,
}

export default createContext<Props>({
    accountAddress: null,
    web3: null,
    eth: null,
})

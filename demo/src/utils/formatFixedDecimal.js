// @flow

// TODO: instead of fixed-point decimals, switch bn.js to bignumber.js that can handle decimals
//    OR include a "type" with the number: token amounts should come in as token-wei and be formatted accordingly as full tokens
import BN from 'bn.js'

/** @param {BN | number | string} value fixed-point decimal integer, with 18 decimals: "semantic 1" ~= "syntactic 10^18" */
export default (value: BN | number | string): string => {
    // const [int, fraction] = value.toString().split('.')
    const num = new BN(value).toString(10, 36)
    const int = num.slice(0, 18).replace(/^0*/, '')
        .split('')
        .reverse()
        .join('')
        .replace(/\d{3}/g, '$&,')
        .split('')
        .reverse()
        .join('')
        .replace(/^,/, '') || '0'
    const fraction = num.slice(18).replace(/0*$/, '')
        .replace(/\d{3}/g, '$&,')
        .replace(/,$/, '')

    return fraction ? `${int}.${fraction}` : `${int}`
}

// @flow

import BN from 'bn.js'

export default (value: BN): string => {
    const [int, fraction] = value.toString().split('.')
    /* eslint-disable-next-line newline-per-chained-call */
    const commaized = int.split('').reverse().join('').replace(/\d{3}/g, '$&,').split('').reverse().join('').replace(/^,/, '')
    return [commaized, fraction].filter(Boolean).join('.') || '0'
}

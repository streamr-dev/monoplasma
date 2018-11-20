# Monoplasma?

[![Build Status](https://travis-ci.com/streamr-dev/monoplasma.svg?token=9unddqKugX2cPcyhtVxp&branch=master)](https://travis-ci.com/streamr-dev/monoplasma)

Monoplasma is a unidirectional token distribution channel. It was created to enable the **Community Products** feature on the [Streamr Marketplace](https://github.com/streamr-dev/marketplace) (see also the [Contracts repo](https://github.com/streamr-dev/marketplace-contracts)).

Name was so chosen because we wanted a sidechain to handle the token distribution calculation, and chose Plasma as the inspiration. Of course Plasma is not a payment channel, and while it might have worked for our use-case, the overhead of the exit game was not desired (mainly the challenge period in the happy path case).

Monoplasma is a side-chain with monotonously increasing balances. Like in Plasma, side-chain state hash is committed to root chain. It is not a blockchain: blocks are not linked to earlier side-chain blocks, but rather to the root chain blocks. Unlike Plasma, unidirectionality meaning no transfers between (withdrawable) accounts means no double-spend problem. This simplifies the exit procedure remarkably. No challenge periods are needed, and exit proofs are non-interactive. User experience is thus instant withdrawal, minus the lag (waiting while the newest block are frozen, see threat scenario below).

Operator's job is to allocate tokens to community members, and publish "side-chain blocks" to root chain. In case the allocations can't deterministically be deduced from root chain events, the operator also must provide upon request the complete contents of the "block" corresponding to that hash, e.g. over HTTP or IPFS. In the MVP case, revenues are split equally, and a validator doesn't need to communicate with the operator in order to sync the side-chain state and verify the published blocks.

Main threat scenario: plasma side-chain operator creates a sock-puppet account, assigns it infinity tokens, publishes the hash, and drains the [root chain contract](contracts/SidechainCommunity.sol) by withdrawing. To combat this, there's a freeze period after the side chain block hash is published. In case of faulty or missing (withheld) side chain block contents, everyone can exit using old unfrozen root hashes.

There could be fraud proofs for this particular scenario: (interactive) proof that sum of balances is greater than amount of tokens held in the root chain contract; proof that a particular balance decreased; etc.

But in case the operator simply doesn't provide the fudged accounts book (operator availability failure), exits from old blocks could be used as proxy for suspicion of admin's behaviour. Freeze period could, for instance, be extended in case members use on old block to exit, giving other members more time to react. This must be balanced with DoS griefing, but should definitely increase the likelihood of everyone getting their tokens out in case of operator fails.

# Running side-chain operator

`node ./start_operator.js`

Options:
* `--port` (default 3000)

# Running side-chain validator

`node ./start_validator.js <rootchain> <watched_account1> <watched_account2> ...`

# Airdrop example

As a simple example application a simple "poor man's airdrop" is presented. It's a mix between a faucet (you have to explicitly ask for the tokens to actually get them on-chain) and airdrop (tokens are allocated to all).

`node ./start_airdrop.js`

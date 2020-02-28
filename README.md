# Monoplasma

[![Build Status](https://travis-ci.com/streamr-dev/monoplasma.svg?token=9unddqKugX2cPcyhtVxp&branch=master)](https://travis-ci.com/streamr-dev/monoplasma)
[![npm package](https://badge.fury.io/js/monoplasma.svg)](https://badge.fury.io/js/monoplasma)
![web3 1.2.4](https://img.shields.io/badge/web3-1.2.4-green.svg?longCache=true "web3 1.2.4")
![truffle 5.1.9](https://img.shields.io/badge/truffle-5.1.9-green.svg?longCache=true "truffle 5.1.9")
![solidity 5.0.16](https://img.shields.io/badge/solidity-5.0.16-green.svg?longCache=true "solidity 5.0.16")

## Summary

Monoplasma is a unidirectional [Ethereum token](https://en.wikipedia.org/wiki/Ethereum) distribution channel. It was originally created to enable [Data Unions](https://medium.com/streamrblog/tagged/data-unions) to sell crowdsourced data (for [DATA](https://medium.com/streamrblog/streamr-datacoin-and-where-it-can-be-obtained-988bd02b8d4b)) on the [Streamr Marketplace](https://streamr.network/marketplace/).

## Use cases

- Revenue sharing
- Dividends
- Frequent airdrops
- Staking rewards
- Community rewards
- Loyalty reward schemes
- Pension/benefit payments
- etc.

Basically wherever you repeatedly fan out value to a dynamic set of accounts, and want self-service withdrawals (to minimize number of Ethereum transactions).

## What is Monoplasma?

Monoplasma is a [layer-2 framework](https://github.com/Awesome-Layer-2/awesome-layer-2#intro) for scalable one-to-many payments of [ERC-20 tokens](https://eips.ethereum.org/EIPS/eip-20) on Ethereum.

It is an off-chain balance book with monotonously increasing balances. Like in Plasma, the off-chain state hash is committed to the root-chain. It is not a blockchain: states are not linked to earlier side-chain states, but rather to the root-chain blocks. Unlike Plasma, unidirectionality meaning no transfers between (withdrawable) accounts means no double-spend problem. This simplifies the exit procedure remarkably. No challenge periods are needed, and exit proofs are non-interactive. User experience is thus instant withdrawal, minus the lag (waiting while the newest commits are frozen, see threat scenario below).

Operator's job is to allocate tokens to community members, update the balances, and commit them to the root-chain. In case the allocations can't deterministically be deduced from root-chain events, the operator also must provide the complete contents of the balance book state corresponding to that hash, e.g. over HTTP or IPFS. In the MVP case, revenues are split equally, and a validator doesn't need to communicate with the operator in order to sync the state and verify the commits.

The name Monoplasma was so chosen because we wanted to handle the token distribution calculations off-chain, and chose to look first at Plasma for inspiration. Of course Plasma is not only a payment channel, and while it might have worked for our use-case, the overhead of the exit game was not desired (mainly the challenge period in the happy path case).

For more information, also check out [this blog post](https://medium.com/streamrblog/monoplasma-revenue-share-dapps-off-chain-6cb7ee8b42fa).

## What is Monoplasma not?

- It's not Plasma as specified in [Plasma white-paper](https://plasma.io/plasma.pdf).
- It's not a generic payment channel, where everyone can arbitrarily transact with each other.
- No, there's no ICO for it. :)

## Threat model

Main threat scenario: the trusted operator creates a sock-puppet account, assigns it all the tokens held in the root-chain, commits the state into root-chain contract, and drains it by withdrawing.

To combat this, in Monoplasma there's a freeze period after the state commit is published. In case of faulty or missing (withheld) state (balance book) contents, everyone can exit using old unfrozen root hashes.

Monoplasma uses block timestamps for determining the start and end of the block freeze period. Value at stake isn't sensitive to time, however. What a bad operator could accomplish by colluding with miners and faking a future timestamp is bypassing the freeze period. That should be impossible as long as the freeze period is longer than the 15 minutes that the [whitepaper allows blocktimes to be off](https://github.com/ethereum/wiki/wiki/White-Paper#blockchain-and-mining).

In practice, much less might suffice. While the yellow paper contains no strict specification of how much "within reasonable Unix time" is, as of 2020-02-13, [Geth allows the block times to be only 15 seconds off](https://github.com/ethereum/go-ethereum/blob/master/consensus/ethash/consensus.go#L45). One minute freeze period would then be enough to completely prevent the freeze period bypass in Ethereum mainnet without compromising the UX. For smaller or private networks, a longer freeze period can be in order, depending on how feasible the operator-miner collusion is.

### Ideas for future work to mitigate this attack

There could be fraud proofs for this particular scenario: (interactive) proof that sum of balances is greater than amount of tokens held in the root chain contract; proof that a particular balance decreased; etc.

But in case the operator simply doesn't provide the fudged accounts book (operator availability failure), exits from old blocks could be used as proxy for suspicion of admin's behaviour. Freeze period could, for instance, be extended in case members use on old block to exit, giving other members more time to react. This must be balanced with DoS griefing, but should definitely increase the likelihood of everyone getting their tokens out in case of operator fails.

## Revenue sharing demo

### Prerequisites:

- Browser with Metamask installed
- node.js (version 10 or newer, tested on v10.14.0)
- git

## Building

Build Monoplasma and the Revenue sharing demo:
```
git clone https://github.com/streamr-dev/monoplasma.git
cd monoplasma
npm install
npm run build
```

To build the demo as well:
```
cd demo
npm run build
```

## Start the operator

In Monoplasma repository directory:
```
npm start
```
The API will be run in http://localhost:8080/

To start the demo UI as well:
```
cd demo
npm start
```
The demo UI will be started at http://localhost:8000/

## Start a validator

In another terminal tab:
`./start_validator.js`

Or alternatively:
`WATCHED_ACCOUNTS=0x41ad2327e5910dcca156dc17d0908b690e2f1f7c,0x0e7a1cf7cf69299c20af39056af232fde05b5204 ./start_validator.js`
In `WATCHED_ACCOUNTS`, give a comma separated list of accounts you'd like the validator to exit if an operator fraud is detected.

## Setting up the browser and Metamask

- Point your browser to http://0.0.0.0:8000/
- Metamask might pop up, asking you to unlock and/or give permissions to the page use it. Accept.
- In your Metamask, select the "Localhost 8545" network if it's listed. If it isn't, add a custom network with RPC URL http://127.0.0.1:8545.
- You should see the control panel with everything empty and zero.

By default the demo runs on `ganache`, with a mnemonic that creates a certain set of accounts. We'll use two of them. Import to your Metamask the following private keys (do not use these accounts on real networks):

- Alice: `0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0`
- Bob: `0xe5af7834455b7239881b85be89d905d6881dcb4751063897f12be1b0dd546bdb`

The demo creates a demo unicorn token (🦄). Let's configure that to Metamask as well.

- In Metamask, select Alice's account.
- Under the Menu icon, where you see your balances, you should see some ETH as well as (scroll down) a link to "ADD TOKEN". Click that.
- Open the Custom Token tab and paste the token's address `0xbaa81a0179015be47ad439566374f2bae098686f`. The token name 🦄 and its settings should be filled automatically. Click Next, then Add Tokens.
- Repeat the previous step for Bob, if you don't see the token listed on Bob's account.

## Demo Walkthrough

To just see what it's supposed to look like, check out the [Youtube video of the EthDenver 2019 announcement presentation](https://www.youtube.com/watch?v=t7vOoLBFkUA).

**Let's add some accounts to the revenue sharing pool:**

- Copy paste Bob's address `0x4178baBE9E5148c6D5fd431cD72884B07Ad855a0` to the textbox under "Management", and click the "Add users" button.
- You should see the "Members" number under "Revenue pool" is now 1.

Now Bob is alone in the pool, and all revenue would be attributed to him. Let's add him some company! You can add whatever addresses you want, or just paste in [these 99,999 addresses](https://raw.githubusercontent.com/streamr-dev/monoplasma/master/99999_addresses.txt).

**Now you should have a bunch of people in the pool, with everything else zero. Let's add some revenue!**

- Select Alice's account on Metamask. You might notice that she has 1 million 🦄 on her account.
- Metamask should pop up and ask you to confirm the transaction.
- In the text field beside the "Add revenue" button, enter a number of tokens, for example 100000, and click the "Add revenue" button. This just transfers a number of 🦄 to the Monoplasma smart contract.

**You should see the revenue pool numbers increase by the amount of tokens, and a block published by the Operator become visible in the table.**

In the demo there's a 20 second freeze period for the funds, during which they can't be withdrawn. In real life this could be a few days, enough time for validators to exit people in case the Operator commits fraud.

- You can optionally do a few more transactions with Alice's account to add some more revenue.

**Now let's try to withdraw Bob's share from the side channel!**

On-chain, all the tokens are in the Monoplasma smart contract. But off-chain, Bob owns some of them. He can withdraw them from the Monoplasma smart contract by presenting a cryptographic proof of his earnings.

- Select Bob's account in your Metamask.
- In Metamask, you can also check Bob's balance of 🦄 tokens, which should be zero. But not for long!
- Copy-paste Bob's address `0x4178baBE9E5148c6D5fd431cD72884B07Ad855a0` to the input field in the "User account" section, and click the "View" button beside it.
- You should see the numbers change to show Bob's share of the earnings.
- Click the Withdraw button. Metamask should pop up and ask you to sign the transaction.
- You should see the "Total withdrawn" statistic for Bob increase from zero to the amount of his earnings.
- In Metamask, you should see the same number of 🦄 on his account.

**Whoa, you just sprayed tokens to 100,000 addresses as Alice with a few clicks, and withdrew some of them from the side channel to your on-chain wallet as Bob!**

**What's that "steal all tokens" button?**
That's the main threat scenario in a Monoplasma implementation: operator going rogue and trying to allocate all tokens in the contract to itself. You can try what happens; in this case, the operator should get away with stealing all tokens. Not good. That's why there are validators: if even one validator is live and watching, they'll get a chance to withdraw tokens before the operator does, and the operator's plot will fail.

To demonstrate this, restart the whole thing. If you're using Ganache, you'll need to change the network in Metamask to something else (like Mainnet) and back to your localhost. Metamask doesn't like the chain being swapped away from under its feet.

This time, before the stealing attempt, start a validator, let it sync, then try the stealing routine again. This time the operator is able to commit the corrupt block, but since the validator reacts in time, the withdraw transaction will fail.

## Troubleshooting

- If you stop the operator and your `ganache` was running implicitly within it, you can restart from scratch by doing a `npm run build && node start_operator.js`.
- If you wipe the blockchain state by doing the above, Metamask will get thrown off if it's currently connected to the localhost network, because the blockchain state just vanished. It will recover if you temporarily select another network (such as mainnet) and then re-select the local network.

## Development

To start the demo UI so that it's easier to debug e.g. in web developer tools:

Open in a terminal tab:
```
cd demo
npm start
```

The demo UI will be started at http://0.0.0.0:8000/

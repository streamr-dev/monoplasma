# Monoplasma

[![Build Status](https://travis-ci.com/streamr-dev/monoplasma.svg?token=9unddqKugX2cPcyhtVxp&branch=master)](https://travis-ci.com/streamr-dev/monoplasma)
![web3 1.0.0](https://img.shields.io/badge/web3-1.0.0-green.svg?longCache=true "web3 1.0.0")
![truffle 5.0.0](https://img.shields.io/badge/truffle-5.0.0-green.svg?longCache=true "truffle 5.0.0")

## Background

Monoplasma is a unidirectional token distribution channel. It was originally created to enable the **Community Products** feature on the [Streamr Marketplace](https://marketplace.streamr.com).

## Use cases

- Revenue sharing
- Dividends
- Frequent airdrops
- Staking rewards
- Community rewards
- Loyalty reward schemes
- Pension/benefit payments
- etc.

Basically wherever you repeatedly fan out value to a dynamic set of accounts, and want self-service withdrawals.

## What is Monoplasma?

Monoplasma is a framework for scalable one-to-many payments of ERC-20 tokens on Ethereum.

It is a side-chain with monotonously increasing balances. Like in Plasma, side-chain state hash is committed to root chain. It is not a blockchain: blocks are not linked to earlier side-chain blocks, but rather to the root chain blocks. Unlike Plasma, unidirectionality meaning no transfers between (withdrawable) accounts means no double-spend problem. This simplifies the exit procedure remarkably. No challenge periods are needed, and exit proofs are non-interactive. User experience is thus instant withdrawal, minus the lag (waiting while the newest block are frozen, see threat scenario below).

Operator's job is to allocate tokens to community members, and publish "side-chain blocks" to root chain. In case the allocations can't deterministically be deduced from root chain events, the operator also must provide upon request the complete contents of the "block" corresponding to that hash, e.g. over HTTP or IPFS. In the MVP case, revenues are split equally, and a validator doesn't need to communicate with the operator in order to sync the side-chain state and verify the published blocks.

The name was so chosen because we wanted a sidechain to handle the token distribution calculation, and chose Plasma as the inspiration. Of course Plasma is not a payment channel, and while it might have worked for our use-case, the overhead of the exit game was not desired (mainly the challenge period in the happy path case).

## Attacks

Main threat scenario: plasma side-chain operator creates a sock-puppet account, assigns it infinity tokens, publishes the hash, and drains the [root chain contract](contracts/SidechainCommunity.sol) by withdrawing. To combat this, there's a freeze period after the side chain block hash is published. In case of faulty or missing (withheld) side chain block contents, everyone can exit using old unfrozen root hashes.

There could be fraud proofs for this particular scenario: (interactive) proof that sum of balances is greater than amount of tokens held in the root chain contract; proof that a particular balance decreased; etc.

But in case the operator simply doesn't provide the fudged accounts book (operator availability failure), exits from old blocks could be used as proxy for suspicion of admin's behaviour. Freeze period could, for instance, be extended in case members use on old block to exit, giving other members more time to react. This must be balanced with DoS griefing, but should definitely increase the likelihood of everyone getting their tokens out in case of operator fails.

## What is Monoplasma not?

- It's not Plasma as specified in [Plasma white-paper](https://plasma.io/plasma.pdf).
- It's not a generic payment channel, where everyone can arbitrarily transact with each other.
- No, there's no ICO for it. :)

## Revenue sharing demo

### Prerequisites:

- Browser with Metamask installed
- node.js (tested on v10.14.0)
- git

## Building

Build Monoplasma and the Revenue sharing demo:
```
git clone git@github.com:streamr-dev/monoplasma.git
cd monoplasma
npm run build && npm run build-demo
```

## Start the operator

`node ./start_operator.js`

## Start the control panel UI

In another terminal tab:
```
cd demo
npm start
```

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
- Open the Custom Token tab and paste the token's address `0xbAA81A0179015bE47Ad439566374F2Bae098686F`. The token name 🦄 and its settings should be filled automatically. Click Next, then Add Tokens.
- Repeat the previous step for Bob, if you don't see the token listed on Bob's account.

## Demo Walkthrough

**Let's add some accounts to the revenue sharing pool:**

- Copy paste Bob's address `0x4178baBE9E5148c6D5fd431cD72884B07Ad855a0` to the textbox under "Management", and click the "Add users" button.
- You should see the "Members" number under "Revenue pool" is now 1.

Now Bob is alone in the pool, and all revenue would be attributed to him. Let's add him some company! You can add whatever addresses you want, or just paste in [these 99,999 addresses](https://github.com/streamr-dev/monoplasma/blob/master/99999_addresses.txt).

**Now you should have a bunch of people in the pool, with everything else zero. Let's add some revenue!**

- Select Alice's account on Metamask. You might notice that she has 1 million 🦄 on her account.
- Refresh the page just in case.
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

## Troubleshooting

- When you switch accounts in Metamask, refresh the page. Otherwise you might encounter weird problems doing transactions.
- If you stop the operator and your `ganache` was running implicitly within it, you can restart from scratch by doing a `npm run build && node start_operator.js`.
- If you wipe the blockchain state by doing the above, Metamask will get thrown off if it's currently connected to the localhost network, because the blockchain state just vanished. It will recover if you temporarily select another network (such as mainnet) and then re-select the local network.

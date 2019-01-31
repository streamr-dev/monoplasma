/*global window document ethereum web3 Eth fetch */
/* eslint-disable no-unused-vars */

let metamaskAddress = ""
let selectedAddress = ""
let selectedMember = ""

const etherscanUrl = "https://rinkeby.etherscan.io"

let config = {}
fetch("/data/operator.json")
    .then(resp => resp.json())
    .then(json => {
        config = json
    })

// From https://medium.com/metamask/https-medium-com-metamask-breaking-change-injecting-web3-7722797916a8
if (window.ethereum) {
    //window.web3 = new Web3(ethereum);
    window.eth = new Eth(ethereum)
    ethereum.enable().then(function () {
        metamaskAddress = ethereum.selectedAddress
        document.getElementById("account-found").hidden = !metamaskAddress
        document.getElementById("no-accounts").hidden = !!metamaskAddress
    })
} else if (window.web3) {
    //window.web3 = new Web3(web3.currentProvider);
    window.eth = new Eth(web3.currentProvider)
    window.eth.accounts().then(function (accounts) {
        metamaskAddress = accounts[0]
        document.getElementById("account-found").hidden = !metamaskAddress
        document.getElementById("no-accounts").hidden = !!metamaskAddress
    })
}

if (!window.eth) {
    console.log("No Ethereum support detected. Consider installing https://metamask.io/")
    document.getElementById("no-metamask").hidden = false
}

///////////////////////////////////////////////////////////////////////////////
//// above: INIT
//// below: UI JS
///////////////////////////////////////////////////////////////////////////////

let circle = document.querySelector("#force-publish > .countdown > .countdown-circle")
function restartAnimation() {
    const clone = circle.cloneNode(true)
    circle.parentNode.replaceChild(clone, circle)
    circle = clone
}

function updateUI() {
    console.log("Polling...")

    // TODO: community stats
    fetch("/api/memberCount")
        .then(resp => resp.json())
        .then(count => {
            document.getElementById("member-count-label").innerText = count.total
        })
    // TODO: token symbol
    // TODO: metamask balance
    // TODO: monoplasma balance
    // TODO: selected account stats
    // TODO: cooldown time left?
}

//setInterval(function () {
updateUI()
//}, 1000)

///////////////////////////////////////////////////////////////////////////////
//// above: UI
//// below: ETHEREUM
///////////////////////////////////////////////////////////////////////////////

function sendWithdrawTxFor(member) {
    if (!config) { throw new Error("Operator.json not retrieved yet!") }
    if (!metamaskAddress) { throw new Error("Shouldn't call this without address from Metamask!") }
    const { blockNumber, address, balance, proof } = member

    var monoplasma = new window.eth.contract(window.monoplasmaAbi, "", {
        from: metamaskAddress,
        gas: 4000000
    }).at(config.contractAddress)
    return monoplasma.proveSidechainBalance(blockNumber, address, balance, proof).then(function (txHash) {
        console.log(`proveSidechainBalance transaction pending: ${etherscanUrl}/tx/${txHash}`)
        return window.eth.getTransactionSuccess(txHash)
    })
}

function mintTokens(to, number) {
    if (!config) { throw new Error("Operator.json not retrieved yet!") }
    if (!metamaskAddress) { throw new Error("Shouldn't call this without address from Metamask!") }

    var token = new window.eth.contract(window.tokenAbi, "", {
        from: metamaskAddress,
        gas: 4000000
    }).at(config.tokenAddress)
    return token.mint(to, number).then(function (txHash) {
        console.log(`mint transaction pending: ${etherscanUrl}/tx/${txHash}`)
        return window.eth.getTransactionSuccess(txHash)
    })
}

function transferTokens(to, number) {
    if (!config) { throw new Error("Operator.json not retrieved yet!") }
    if (!metamaskAddress) { throw new Error("Shouldn't call this without address from Metamask!") }

    var token = new window.eth.contract(window.tokenAbi, "", {
        from: metamaskAddress,
        gas: 4000000
    }).at(config.tokenAddress)
    return token.transfer(to, number).then(function (txHash) {
        console.log(`transfer transaction pending: ${etherscanUrl}/tx/${txHash}`)
        return window.eth.getTransactionSuccess(txHash)
    })
}

///////////////////////////////////////////////////////////////////////////////
//// above: ETHEREUM
//// below: CLICK HANDLERS
///////////////////////////////////////////////////////////////////////////////


function onClickSelect() {
    const address = document.getElementById("address-selection-input")
    selectedAddress = address
    fetch(`/api/members/${address}`).then(resp => resp.json()).then(info => {
        window.alert(info)
        selectedMember = info
    })
}

window.withdrawingInProcess = false
function onClickWithdraw() {
    if (window.withdrawingInProcess) { return }
    if (!selectedMember) {
        window.alert("Please select account first")
        return
    }
    window.withdrawingInProcess = true
    //document.getElementById("claim-tokens").innerText = "Sending transaction..."
    sendWithdrawTxFor(selectedMember).then(function (receipt) {
        console.log(`Transaction successful: ${JSON.stringify(receipt)}`)
        //document.getElementById("claim-tokens").innerText = "Success!"
        window.withdrawingInProcess = false
    }).catch(function (error) {
        window.alert(error.message)
        window.withdrawingInProcess = false
        //document.getElementById("claim-tokens").innerText = "Try again"
    })
}

function onClickAddRevenue() {
    if (!config) {
        window.alert("operator.json missing")
        return
    }
    const amount = web3.toWei("10", "ether")
    transferTokens(config.contractAddress, amount).then(function (receipt) {
        console.log(`add revenue / transfer transaction successful: ${JSON.stringify(receipt)}`)
        updateUI()
        //document.getElementById("claim-tokens").innerText = "Success!"
    }).catch(function (error) {
        window.alert(error.message)
        //document.getElementById("claim-tokens").innerText = "Try again"
    })
}

function onClickAddUsers() {
    const userList = document.getElementById("address-list").value.split("\n").filter(x => x.length)
    if (userList.length < 1) {
        window.alert("Please enter addresses to the textfield, one per line")
        return
    }
    fetch("/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userList),
    }).then(resp => resp.json()).then(res => {
        window.alert(res)
    })
}

function onClickKick() {
    if (!selectedAddress) {
        window.alert("Please select account first")
        return
    }
    fetch(`/admin/members/${selectedAddress}`, { method: "DELETE" })
        .then(resp => resp.json())
        .then(res => {
            window.alert(res)
        })
}

function onClickMint() {
    const amount = web3.toWei("1000", "ether")
    mintTokens(metamaskAddress, amount).then(function (receipt) {
        console.log(`mint transaction successful: ${JSON.stringify(receipt)}`)
        updateUI()
        //document.getElementById("claim-tokens").innerText = "Success!"
    }).catch(function (error) {
        window.alert(error.message)
        //document.getElementById("claim-tokens").innerText = "Try again"
    })
}

function onClickForcePublish() {
    fetch("/demo/publishBlock")
        .then(resp => resp.json())
        .then(res => {
            window.alert(res)
            restartAnimation()
        })
}

function onClickSteal() {
    fetch(`/demo/stealAllTokens?targetAddress=${metamaskAddress}`)
        .then(resp => resp.json())
        .then(res => {
            window.alert(res)
        })
}

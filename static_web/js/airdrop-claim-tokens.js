/*global window document ethereum web3 Eth */
/* eslint-disable no-unused-vars */

var monoplasmaAbi = [{
    "constant": false,
    "inputs": [
        {
            "name": "blockNumber",
            "type": "uint256"
        },
        {
            "name": "account",
            "type": "address"
        },
        {
            "name": "balance",
            "type": "uint256"
        },
        {
            "name": "proof",
            "type": "bytes32[]"
        }
    ],
    "name": "proveSidechainBalance",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
}]

var metamaskAddress = ""
window.addEventListener("load", function () {
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
})

// From https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard
function copyAbi() {
    var textArea = document.getElementById("abi-text")
    textArea.select()
    document.execCommand("copy")
}
function copyProof() {
    var textArea = document.getElementById("proof-text")
    textArea.select()
    document.execCommand("copy")
}

window.claimingInProcess = false
function sendWithdrawTxFor(contractAddress, blockNumber, address, balance, proof) {
    if (!metamaskAddress) { throw new Error("Shouldn't call this without address from Metamask!") }
    window.claimingInProcess = true
    document.getElementById("claim-tokens").innerText = "Sending transaction..."
    var airdrop = new window.eth.contract(monoplasmaAbi, "", {
        from: metamaskAddress,
        gas: 4000000
    }).at(contractAddress)
    airdrop.proveSidechainBalance(blockNumber, address, balance, proof).then(function (txHash) {
        console.log("Transaction pending: https://etherscan.io/tx/" + txHash)
        return window.eth.getTransactionSuccess(txHash)
    }).then(function (receipt) {
        console.log("Transaction successful: " + JSON.stringify(receipt))
        document.getElementById("claim-tokens").innerText = "Success!"
        window.claimingInProcess = false
    }).catch(function (error) {
        window.alert(error.message)
        window.claimingInProcess = false
        document.getElementById("claim-tokens").innerText = "Try again"
    })
}

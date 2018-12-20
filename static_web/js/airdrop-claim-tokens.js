var abi = [{
    "constant": false,
    "inputs": [
        {
            "name": "rootChainBlockNumber",
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
        })
    } else if (window.web3) {
        //window.web3 = new Web3(web3.currentProvider);
        window.eth = new Eth(web3.currentProvider)
        metamaskAddress = window.eth.accounts[0]
    }

    if (!window.eth) {
        console.log("No Ethereum support detected. Consider installing https://metamask.io/");
        document.getElementById("no-metamask").hidden = false;
    } else {
        document.getElementById("account-found").hidden = !metamaskAddress
        document.getElementById("no-accounts").hidden = !!metamaskAddress
    }
})

// From https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard
function copyABI() {
    var textArea = document.getElementById("abi")
    textArea.select()
    document.execCommand("copy")
}

function claimTokens(contractAddress, blockNumber, address, balance, proof) {
    var airdrop = new window.web3.eth.Contract(abi, contractAddress)
    airdrop.methods.proveSidechainBalance(blockNumber, address, balance, proof).send({
        from: metamaskAddress,
        gas: 4000000
    }, claimSuccess)
}

function claimSuccess(err, receipt) {
    if (err) {
        console.error(err.stack)
        alert("Transaction failed: " + err.message)
    } else {
        console.log("Receipt: " + receipt)
    }
}
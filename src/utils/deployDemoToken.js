const TokenJson = require("../../build/contracts/DemoToken.json")

module.exports = async function deployDemoToken(web3, tokenName, tokenSymbol, sendOptions, log) {
    log("Deploying a dummy token contract...")
    const Token = new web3.eth.Contract(TokenJson.abi)
    const token = await Token.deploy({
        data: TokenJson.bytecode,
        arguments: [
            tokenName || "Demo token",
            tokenSymbol || "\ud83e\udd84",       // unicorn U+1f984
        ]
    }).send(sendOptions)
    return token.options.address
}

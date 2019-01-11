const fetch = require("node-fetch")

module.exports = serverURL => ({
    fetchMember: address => fetch(`${serverURL}/members/${address}`).then(res => res.json()),
    fetchMembers: () => fetch(`${serverURL}/members`).then(res => res.json()),
    postMember: body => fetch(`${serverURL}/members`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    }).then(res => res.json()),
})

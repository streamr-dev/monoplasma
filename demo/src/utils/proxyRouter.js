const router = require('express').Router()
const proxy = require('http-proxy-middleware')

router.get('/data/operator.json', proxy({
    target: 'http://localhost:8080',
}))

module.exports = router

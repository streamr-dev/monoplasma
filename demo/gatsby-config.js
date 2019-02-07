const proxyRouter = require('./src/utils/proxyRouter')

module.exports = {
    plugins: [
        'gatsby-plugin-eslint',
        'gatsby-plugin-flow',
        'gatsby-plugin-postcss',
        'gatsby-plugin-react-helmet',
    ],
    developMiddleware: (app) => {
        app.use(proxyRouter)
    },
}

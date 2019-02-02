const path = require('path')
const precss = require('precss')

module.exports = {
    plugins: [
        precss({
            importFrom: [
                path.resolve(__dirname, 'src/stylesheets/variables.css'),
            ],
        }),
    ],
}

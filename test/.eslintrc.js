// ESLint settings for tests
module.exports = {
    globals: {
        describe: "readonly",
        it: "readonly",
        before: "readonly",
        beforeEach: "readonly",
        after: "readonly",
        afterEach: "readonly",
    },
    rules: {
        "no-console": "off",
    }
}
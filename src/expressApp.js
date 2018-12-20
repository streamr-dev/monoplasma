const path = require("path")
const express = require("express")
const app = express()

const bodyParser = require("body-parser")
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, "static_web")))

const Monoplasma = require("./monoplasma")
const plasma = new Monoplasma()

app.use("/admin", require("./monoplasmaRouter")(plasma))

module.exports = app

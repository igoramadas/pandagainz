// Index

// Env is "development" by default.
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development"
}

import logger = require("anyhow")
logger.setup("console")
logger.levelOnConsole = true
logger.uncaughtExceptions = true
logger.unhandledRejections = true

import setmeup = require("setmeup")
setmeup.load()

import expresser = require("expresser")
expresser.app.init()

import routes = require("./routes")
routes.init()

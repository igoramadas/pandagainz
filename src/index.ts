// Index

// Env is "development" by default.
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development"
}

// Start logger.
import logger = require("anyhow")
logger.setup("console")
logger.setOptions({
    levelOnConsole: true,
    uncaughtExceptions: true,
    unhandledRejections: true
})

// Load settings.
import setmeup = require("setmeup")
setmeup.load()

// Port set via the PORT env?
if (process.env.PORT) {
    setmeup.settings.app.port = process.env.PORT
}

// Init Express server.
import expresser = require("expresser")
expresser.app.init()

// Load routes.
import routes = require("./routes")
routes.init()

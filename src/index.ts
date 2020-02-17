// Index

// Env is "development" by default.
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development"
}

const startup = async () => {
    const logger = require("anyhow")
    logger.setup("console")
    logger.levelOnConsole = true
    logger.uncaughtExceptions = true
    logger.unhandledRejections = true

    const setmeup = require("setmeup")
    setmeup.load()

    const expresser = require("expresser")
    expresser.app.init()

    const routes = require("./routes")
    routes.init()
}

// Start the server!
startup()

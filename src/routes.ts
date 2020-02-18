// Routes

import bitpanda = require("./bitpanda")
import expresser = require("expresser")
import logger = require("anyhow")
import rateLimiterFlex = require("rate-limiter-flexible")

/**
 * Service routes.
 */
class Routes {
    private constructor() {}

    static init = async () => {
        const app = expresser.app
        const rateLimiter = new rateLimiterFlex.RateLimiterMemory({
            points: 20,
            duration: 60
        })

        // Body parser.
        app.use(require("body-parser").json({type: "application/*+json"}))

        // Rate limiter middleware for the Express server.
        app.use(async (req, res, next) => {
            const userAgent = req.headers["user-agent"].replace(/ /g, "")
            const clientId = `${req.ip}-${userAgent.toLowerCase()}`

            try {
                await rateLimiter.consume(clientId)
                next()
            } catch (ex) {
                logger.warn("Routes", "Rate limited", req.ip, userAgent)
                res.status(429).send("Too Many Requests")
            }
        })

        // Homepage.
        app.get("/", async (req, res) => {
            try {
                app.renderView(req, res, "index.html")
            } catch (ex) {
                logger.error("Routes", req.path, ex)
            }
        })

        // Report.
        app.get("/report", async (req, res) => {
            try {
                app.renderView(req, res, "report.html")
            } catch (ex) {
                logger.error("Routes", req.path, ex)
            }
        })

        // Report JSON.
        app.get("/report/json", async (req, res) => {
            try {
                const apiKey: string = req.query.key || req.body.key

                if (!apiKey || apiKey.length < 3) {
                    throw new Error("Invalid API key")
                }

                const result = await bitpanda.getReport(apiKey)
                app.renderJson(req, res, result)
            } catch (ex) {
                logger.error("Routes", req.path, ex)
            }
        })
    }
}

// Exports...
export = Routes

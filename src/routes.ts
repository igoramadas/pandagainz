// Routes

import bitpanda = require("./bitpanda")
import expresser = require("expresser")
import logger = require("anyhow")
import rateLimiterFlex = require("rate-limiter-flexible")
const settings = require("setmeup").settings

/**
 * Service routes.
 */
class Routes {
    private constructor() {}

    static init = async () => {
        const app = expresser.app
        const rateLimiter = new rateLimiterFlex.RateLimiterMemory({
            points: settings.rateLimiter.points,
            duration: settings.rateLimiter.duration
        })

        // Body JSON parser.
        app.use(require("body-parser").json({type: "application/*+json"}))

        // Homepage.
        app.get("/", async (req, res) => {
            try {
                app.renderView(req, res, "index.html")
            } catch (ex) {
                logger.error("Routes", req.path, ex)
            }
        })

        // Report JSON.
        app.get("/report/json", async (req, res) => {
            const userAgent = req.headers["user-agent"].replace(/ /g, "")

            try {
                await rateLimiter.consume(`${req.ip}-${userAgent.toLowerCase()}`)
            } catch (ex) {
                logger.warn("Routes", "Rate limited", req.ip, userAgent)
                res.status(429).send("Too Many Requests")
                return
            }

            try {
                const apiKey: string = req.query.key || req.body.key

                if (!apiKey || apiKey.length < 10) {
                    throw new Error("Invalid API key")
                }

                const result = await bitpanda.getReport(apiKey.replace(/[^a-zA-Z0-9]/gi, ""))
                app.renderJson(req, res, result)
            } catch (ex) {
                logger.error("Routes", req.path, ex)
                app.renderError(req, res, {error: ex.toString()})
            }
        })
    }
}

// Exports...
export = Routes

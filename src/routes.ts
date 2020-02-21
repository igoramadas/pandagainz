// Routes

import bitpanda = require("./bitpanda")
import database = require("./database")
import expresser = require("expresser")
import logger = require("anyhow")
import rateLimiterFlex = require("rate-limiter-flexible")
const app = expresser.app
const settings = require("setmeup").settings

/**
 * Service routes.
 */
class Routes {
    private constructor() {}

    static rateLimiter = null

    /**
     * Init the app routes.
     */
    static init = async () => {
        app.use(require("body-parser").json({type: "application/*+json"}))

        // Create the rate limiter.
        Routes.rateLimiter = new rateLimiterFlex.RateLimiterMemory({
            points: settings.rateLimiter.points,
            duration: settings.rateLimiter.duration
        })

        // Bind routes.
        app.get("/", Routes.getHome)
        app.post("/get-report", Routes.getReport)
        app.get("/get-report", Routes.getReport)
        app.get("/delete-reports", Routes.deleteReports)
    }

    /**
     * Helper to check rate limits on relevant endpoints.
     */
    static checkRateLimit = async (req, res): Promise<boolean> => {
        const userAgent = req.headers["user-agent"].replace(/ /g, "")

        try {
            await Routes.rateLimiter.consume(`${req.ip}-${userAgent.toLowerCase()}`)
            return true
        } catch (ex) {
            logger.warn("Routes", "Rate limited", req.ip, userAgent)
            res.status(429).send("Too Many Requests")
            return false
        }
    }

    // ROUTE METHODS
    // --------------------------------------------------------------------------

    /**
     * Load home page.
     */
    static getHome = async (req, res) => {
        try {
            app.renderView(req, res, "index.html")
        } catch (ex) {
            logger.error("Routes", req.path, ex)
        }
    }

    /**
     * Returns a report JSON for the specified API key.
     */
    static getReport = async (req, res) => {
        const rateOk = await Routes.rateLimiter(req, res)
        if (!rateOk) return false

        try {
            const apiKey: string = req.query.key || req.body.key
            const save: boolean = req.query.save || req.body.save

            if (!apiKey || apiKey.length < 10) {
                throw new Error("Invalid API key")
            }

            const result = await bitpanda.getReport(apiKey.replace(/[^a-zA-Z0-9]/gi, ""))
            app.renderJson(req, res, result)

            if (save) {
                await database.addReport(apiKey, result)
            }
        } catch (ex) {
            logger.error("Routes", req.path, ex)
            app.renderError(req, res, {error: ex.toString()})
        }
    }

    /**
     * Removes reports for the specified API key.
     */
    static deleteReports = async (req, res) => {
        const rateOk = await Routes.rateLimiter(req, res)
        if (!rateOk) return false

        try {
            const apiKey: string = req.query.key || req.body.key
            const count = await database.deleteReports(apiKey)
            app.renderJson(req, res, {count: count})
        } catch (ex) {
            logger.error("Routes", req.path, ex)
            app.renderError(req, res, {error: ex.toString()})
        }
    }
}

// Exports...
export = Routes

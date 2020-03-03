// Routes

import {apiKeyHash} from "./utils"
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
        app.use(require("cookie-parser")(settings.app.cookieSecret))

        // Create the rate limiter.
        Routes.rateLimiter = new rateLimiterFlex.RateLimiterMemory({
            points: settings.rateLimiter.points,
            duration: settings.rateLimiter.duration
        })

        // Bind routes.
        app.get("/", Routes.getHome)
        app.get("/session", Routes.getSession)
        app.get("/api/report", Routes.getReport)
        app.post("/api/report", Routes.getReport)
        app.delete("/api/report", Routes.deleteReport)
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
     * Get session, at the moment this will load signed cookies only.
     */
    static getSession = async (req, res) => {
        try {
            app.renderJson(req, res, req.signedCookies)
        } catch (ex) {
            logger.error("Routes", req.path, ex)
        }
    }

    /**
     * Returns a report JSON for the specified API key.
     */
    static getReport = async (req, res) => {
        const rateOk = await Routes.checkRateLimit(req, res)
        if (!rateOk) return false

        try {
            const apiKey: string = req.query.key || req.body.key
            const remember: string = req.query.remember || req.body.remember
            const save: boolean = req.query.save || req.body.save

            if (!apiKey || apiKey.length < 20) {
                throw new Error("Invalid API key")
            }

            if (remember == "1" || remember == "true") {
                res.cookie("apiKey", apiKey, {signed: true, httpOnly: true})
            }

            const keyHash = apiKeyHash(apiKey)
            const result = await bitpanda.getReport(apiKey.replace(/[^a-zA-Z0-9]/gi, ""))

            logger.info("Routes.getReport", keyHash)
            app.renderJson(req, res, result)

            if (save) {
                await database.addReport(apiKey, result)
            }
        } catch (ex) {
            const status = ex.response ? ex.response.status : 500
            const error = status == 401 ? "Invalid API key or missing required API scopes" : ex
            logger.error("Routes.getReport", ex)
            app.renderError(req, res, error, status)
        }
    }

    /**
     * Removes reports for the specified API key.
     */
    static deleteReport = async (req, res) => {
        const rateOk = await Routes.checkRateLimit(req, res)
        if (!rateOk) return false

        try {
            const apiKey: string = req.query.key || req.body.key

            if (!apiKey || apiKey.length < 20) {
                throw new Error("Invalid API key")
            }

            const keyHash = apiKeyHash(apiKey)
            const count = await database.deleteReports(apiKey)

            logger.info("Routes.deleteReports", keyHash, `Deleted ${count} reports`)
            app.renderJson(req, res, {count: count})
        } catch (ex) {
            const status = ex.response ? ex.response.status : 500
            const error = status == 401 ? "Invalid API key or missing required API scopes" : ex
            logger.error("Routes.deleteReport", ex)
            app.renderError(req, res, error, status)
        }
    }
}

// Exports...
export = Routes

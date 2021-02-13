// Routes

import {apiKeyHash} from "./utils"
import bitpanda = require("./bitpanda")
import cache = require("bitecache")
import expresser = require("expresser")
import logger = require("anyhow")
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

        // Reports are cached for 5 minutes.
        cache.setup("reports", settings.reports.cacheSeconds)

        // Bind routes.
        app.get("/", Routes.getHome)
        app.get("/session", Routes.getSession)
        app.get("/api/report", Routes.getReport)
        app.post("/api/report", Routes.getReport)
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
        try {
            const apiKey: string = req.query.key || req.body.key

            // API key is mandatory.
            if (!apiKey || apiKey.length < 20) {
                throw new Error("Invalid API key")
            }

            const remember: string = req.query.remember || req.body.remember
            const keyHash = apiKeyHash(apiKey)
            const fromCache = cache.get("reports", keyHash)
            let result: PandaReport

            // Check if report already exists on cache first.
            if (fromCache) {
                result = fromCache
                logger.info("Routes.getReport", keyHash, "From cache")
            } else {
                if (remember == "1" || remember == "true") {
                    res.cookie("apiKey", apiKey, {signed: true, httpOnly: true})
                }

                result = await bitpanda.getReport(apiKey.replace(/[^a-zA-Z0-9]/gi, ""))
                cache.set("reports", keyHash, result)
                logger.info("Routes.getReport", keyHash)
            }

            app.renderJson(req, res, result)
        } catch (ex) {
            const status = ex.response ? ex.response.status : 500
            const error = status == 401 ? "Invalid API key or missing required API scopes" : ex
            logger.error("Routes.getReport", ex)
            app.renderError(req, res, error, status)
        }
    }
}

// Exports...
export = Routes

// Bitpanda

import _ = require("lodash")
import axios = require("axios")
import logger = require("anyhow")
const settings = require("setmeup").settings

/**
 * Wrapper for the Bitpanda API.
 */
class Bitpanda {
    private static _instance: Bitpanda
    static get Instance() {
        return this._instance || (this._instance = new this())
    }

    // API METHODS
    // --------------------------------------------------------------------------

    /**
     * Internal implementation to make a request to the Bitpanda API.
     * @param options Request options.
     */
    makeRequest = async (options: any) => {
        const method = options.method || "GET"

        try {
            const reqOptions: any = {
                method: options.method || "GET",
                url: settings.bitpanda.baseUrl + options.path
            }

            if (options.apiKey) {
                reqOptions.headers = {
                    "X-API-KEY": options.apiKey
                }
            }

            if (options.param) {
                reqOptions.params = options.params
            }

            const res = await axios.default.request(reqOptions)

            if (!res.data) {
                throw new Error("Invalid or empty response.")
            }

            return res.data || res
        } catch (ex) {
            logger.error("Bitpanda.makeRequest", method, options.path, ex)
            throw ex
        }
    }

    /**
     * Get all trades made by the user, sorted by date.
     */
    getTrades = async (apiKey: String) => {
        try {
            const options = {
                path: "trades",
                apiKey: apiKey,
                query: {
                    page_size: settings.bitpanda.pageSize
                }
            }

            const result = await this.makeRequest(options)
            const trades = _.map(result.data, "attributes")

            return _.sortBy(trades, (t) => {
                return t.time.unix
            })
        } catch (ex) {
            logger.debug("Bitpanda.getTrades", "Failed")
            throw ex
        }
    }

    /**
     * Get list of crypto wallets from the user
     */
    getWallets = async (apiKey: String) => {
        try {
            const options = {
                path: "wallets",
                apiKey: apiKey
            }

            const result = await this.makeRequest(options)
            return _.map(result.data, "attributes")
        } catch (ex) {
            logger.debug("Bitpanda.getTrades", "Failed")
            throw ex
        }
    }

    /**
     * Get list of fiat wallets from the user.
     */
    getFiatWallets = async (apiKey: String) => {
        try {
            const options = {
                path: "fiatwallets",
                apiKey: apiKey
            }

            const result = await this.makeRequest(options)
            return _.map(result.data, "attributes")
        } catch (ex) {
            logger.debug("Bitpanda.getTrades", "Failed")
            throw ex
        }
    }

    /**
     * Get prices ticker for all available assets.
     */
    getTicker = async () => {
        try {
            const options = {
                path: "ticker"
            }

            const result = await this.makeRequest(options)
            return result
        } catch (ex) {
            logger.debug("Bitpanda.getTrades", "Failed")
            throw ex
        }
    }

    /**
     * Calculate the weighted price average based on volume.
     */
    weightedAvg = (total: number, positions: Array<Array<number>>): number => {
        if (total <= 0) {
            return 0
        }
        if (positions.length == 1) {
            return positions[0][1]
        }

        return positions.reduce((acc, next) => acc + next[0] * next[1], 0) / total
    }
}

// Exports...
export = Bitpanda.Instance

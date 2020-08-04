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
    makeRequest = async (options: any): Promise<any> => {
        const method = options.method || "GET"

        try {
            const reqOptions: any = {
                method: options.method || "GET",
                url: settings.bitpanda.baseUrl + options.path
            }

            // User passed an API key? Add it to the request headers.
            if (options.apiKey) {
                reqOptions.headers = {
                    "X-API-KEY": options.apiKey
                }
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
    getTrades = async (apiKey: string): Promise<any> => {
        try {
            let trades = []
            let hasMore = true

            const options = {
                path: `trades?page_size=${settings.bitpanda.pageSize}`,
                apiKey: apiKey
            }

            while (hasMore) {
                const result = await this.makeRequest(options)
                trades = trades.concat(_.map(result.data, "attributes"))

                // Keep fetching trades while there are more pages on the result.
                if (result.links && result.links.next) {
                    options.path = `trades${result.links.next}`
                } else {
                    hasMore = false
                }
            }

            return _.sortBy(trades, (t) => {
                return t.time.unix
            })
        } catch (ex) {
            logger.debug("Bitpanda.getTrades", "Failed")
            throw ex
        }
    }

    /**
     * Get user's fiat transactions, sorted by date.
     */
    getFiatTransactions = async (apiKey: string): Promise<any> => {
        try {
            let transactions = []
            let hasMore = true

            const options = {
                path: `fiatwallets/transactions?page_size=${settings.bitpanda.pageSize}`,
                apiKey: apiKey
            }

            while (hasMore) {
                const result = await this.makeRequest(options)
                transactions = transactions.concat(_.map(result.data, "attributes"))

                // Keep fetching transactions while there are more pages on the result.
                if (result.links && result.links.next) {
                    options.path = `fiatwallets/transactions${result.links.next}`
                } else {
                    hasMore = false
                }
            }

            return _.sortBy(transactions, (t) => {
                return t.time.unix
            })
        } catch (ex) {
            logger.debug("Bitpanda.getFiatTransactions", "Failed")
            throw ex
        }
    }

    /**
     * Get list of crypto wallets from the user
     */
    getWallets = async (apiKey: string): Promise<any> => {
        try {
            const options = {
                path: "wallets",
                apiKey: apiKey
            }

            const result = await this.makeRequest(options)
            return _.map(result.data, "attributes")
        } catch (ex) {
            logger.debug("Bitpanda.getWallets", "Failed")
            throw ex
        }
    }

    /**
     * Get list of fiat wallets from the user.
     */
    getFiatWallets = async (apiKey: string): Promise<any> => {
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
    getTicker = async (): Promise<any> => {
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
     * Get a full report by matching wallets, trades and transactions.
     */
    getReport = async (apiKey: string): Promise<PandaReport> => {
        let wallets = {}
        let totalProfit = 0
        let totalDeposit = 0
        let totalWithdrawal = 0

        // Get all the necessary data from Bitpanda.
        const data = {
            ticker: await this.getTicker(),
            wallets: await this.getWallets(apiKey),
            trades: await this.getTrades(apiKey),
            fiatWallets: await this.getFiatWallets(apiKey),
            fiatTransactions: await this.getFiatTransactions(apiKey)
        }

        // Create the resulting wallets array with the correct asset IDs.
        for (let wallet of data.wallets) {
            if (!wallets[wallet.cryptocoin_id]) {
                wallets[wallet.cryptocoin_id] = {
                    symbol: wallet.cryptocoin_symbol,
                    balance: parseFloat(wallet.balance),
                    currentValue: 0,
                    totalBuy: 0,
                    totalSell: 0,
                    totalFees: 0,
                    buy: [],
                    sell: []
                }
            }
        }

        // Parse trades and add them to the related wallets.
        for (let t of data.fiatTransactions) {
            if (t.status != "finished") {
                continue
            }

            // Calculate total deposit and withdrawals.
            const eurAmount = parseFloat(t.amount) * parseFloat(t.to_eur_rate)
            if (t.type == "deposit") {
                totalDeposit += eurAmount
            } else if (t.type == "withdrawal") {
                totalWithdrawal += eurAmount
            }

            if (!t.trade || t.trade.type != "trade") {
                continue
            }

            const trade = t.trade.attributes
            const info: Trade = {
                id: t.trade.id,
                assetAmount: parseFloat(trade.amount_cryptocoin),
                assetPrice: parseFloat(trade.price),
                cost: parseFloat(trade.amount_fiat),
                timestamp: parseInt(trade.time.unix)
            }

            // Buying or selling?
            if (trade.type == "buy") {
                wallets[trade.cryptocoin_id].buy.push(info)
            } else {
                wallets[trade.cryptocoin_id].sell.push(info)
            }

            // Paid with BEST?
            if (trade.bfc_used && trade.best_fee_collection) {
                const att = trade.best_fee_collection.attributes
                info.fee = parseFloat(att.bfc_market_value_eur)
                info.bestAmount = parseFloat(att.bfc_market_value_eur) / parseFloat(att.best_current_price_eur)
                wallets[trade.cryptocoin_id].totalFees += info.fee
            } else if (t.fee) {
                wallets[trade.cryptocoin_id].totalFees += parseFloat(t.fee)
            }
        }

        // Iterate wallets to calculate trading profits or losses.
        for (let w of Object.values(wallets)) {
            const wallet = w as any

            // No transactions? Stop here.
            if (wallet.buy.length == 0 && wallet.sell.length == 0) {
                continue
            }

            // Purchased assets? Calculate total in fiat.
            if (wallet.buy.length > 0) {
                const arrBuy = []
                for (let trade of wallet.buy) {
                    if (trade.assetAmount) {
                        arrBuy.push([trade.assetAmount, trade.cost / trade.assetAmount])
                    } else {
                        logger.warn("Bitpanda.getReport", "No assetAmount", JSON.stringify(trade, null, 0))
                    }
                }
                wallet.totalBuy = _.sumBy(wallet.buy, "cost")
            }

            // Solds assets? Calculate total in fiat.
            if (wallet.sell.length > 0) {
                const arrSell = []
                for (let trade of wallet.sell) {
                    if (trade.assetAmount) {
                        arrSell.push([trade.assetAmount, trade.cost / trade.assetAmount])
                    } else {
                        logger.warn("Bitpanda.getReport", "No assetAmount", JSON.stringify(trade, null, 0))
                    }
                }
                wallet.totalSell = _.sumBy(wallet.sell, "cost")
            }

            // How many assets were bought and sold? Calculate balance.
            const sellCount = _.sumBy(wallet.sell, "assetAmount")
            wallet.currentValue = parseFloat(data.ticker[wallet.symbol].EUR) * wallet.balance

            // Sold assets?
            if (sellCount > 0) {
                let arrPricePaid = []
                let matchBuyCount = 0
                let i = 0

                // Calculate how much was paid for the assets that were sold.
                while (matchBuyCount < sellCount && wallet.buy[i]) {
                    let trade = wallet.buy[i]

                    let amount = trade.assetAmount
                    matchBuyCount += amount

                    // Reached the amount sold? Remove extra so we can properly calculate the average.
                    if (matchBuyCount > sellCount) {
                        amount -= matchBuyCount - sellCount
                    }

                    arrPricePaid.push([amount, trade.cost / trade.assetAmount])
                    i++
                }

                // Total price paid for the sold assets.
                const pricePaid = this.weightedAvg(sellCount, arrPricePaid) * sellCount
                wallet.sellProfit = wallet.totalSell - pricePaid
                totalProfit += wallet.sellProfit
            }
        }

        // We only want the useful wallet data on result.
        wallets = _.filter(Object.values(wallets), (w) => {
            return w.buy.length > 0 || w.sell.length > 0
        })

        const result: PandaReport = {
            wallets: wallets as Wallet[],
            profit: totalProfit,
            deposit: totalDeposit,
            withdrawal: totalWithdrawal
        }

        return result
    }

    // HELPERS
    // --------------------------------------------------------------------------

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

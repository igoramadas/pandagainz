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
        let bestWallet: Wallet
        let wallets: {[id: string]: Wallet} = {}
        let totalProfit = 0
        let totalDeposit = 0
        let totalWithdrawal = 0
        let depositCount = 0
        let withdrawalCount = 0
        let fiatBalance = 0

        // Get all the necessary data from Bitpanda.
        const data = {
            ticker: await this.getTicker(),
            wallets: await this.getWallets(apiKey),
            trades: await this.getTrades(apiKey),
            fiatWallets: await this.getFiatWallets(apiKey),
            fiatTransactions: await this.getFiatTransactions(apiKey)
        }

        logger.debug("Bitpanda.getReport", apiKey)
        logger.debug(JSON.stringify(data, null, 2))

        // Create the resulting wallets array with the correct asset IDs.
        for (let w of data.wallets) {
            if (!wallets[w.cryptocoin_id]) {
                const wallet: Wallet = {
                    id: w.cryptocoin_id,
                    symbol: w.cryptocoin_symbol,
                    balance: parseFloat(w.balance),
                    currentValue: 0,
                    totalBuy: 0,
                    totalSell: 0,
                    totalFees: 0,
                    buy: [],
                    sell: []
                }

                wallets[w.cryptocoin_id] = wallet

                if (wallet.symbol == "BEST") {
                    bestWallet = wallet
                }
            }
        }

        // Add default OTHER wallet (for uknown transactions).
        wallets["UNKNOWN"] = {
            id: "-1",
            symbol: "UNKNOWN",
            balance: 0,
            currentValue: 0,
            totalBuy: 0,
            totalSell: 0,
            totalFees: 0,
            buy: [],
            sell: []
        }

        // Calculate current fiat balance.
        for (let fw of data.fiatWallets) {
            if (fw.fiat_symbol == "EUR") {
                fiatBalance += parseFloat(fw.balance)
            } else {
                const ref = data.ticker["USDT"] || data.ticker["ETH"]
                const multi = ref.EUR / ref[fw.fiat_symbol]
                const eurBalance = multi * parseFloat(fw.balance)
                fiatBalance += eurBalance
            }
        }

        // Parse fiat transactions and add them to the related wallets.
        for (let t of data.fiatTransactions) {
            if (t.status != "finished") {
                continue
            }

            // Calculate total deposit and withdrawals.
            const eurAmount = parseFloat(t.amount) * parseFloat(t.to_eur_rate)
            if (t.type == "deposit") {
                totalDeposit += eurAmount
                depositCount++
            } else if (t.type == "withdrawal") {
                totalWithdrawal += eurAmount
                withdrawalCount++
            }

            if (!t.trade || t.trade.type != "trade") {
                continue
            }
        }

        // Parse trades and add them to the related wallets.
        for (let t of data.trades) {
            if (t.status != "finished") {
                continue
            }

            // Add to default wallet if not found.
            if (!wallets[t.cryptocoin_id]) {
                t.cryptocoin_id = "UNKNOWN"
            }

            const info: Trade = {
                assetAmount: parseFloat(t.amount_cryptocoin),
                assetPrice: parseFloat(t.price),
                cost: parseFloat(t.amount_fiat),
                timestamp: parseInt(t.time.unix)
            }

            // Buying or selling?
            if (t.type == "buy") {
                wallets[t.cryptocoin_id].buy.push(info)
            } else if (t.type == "sell") {
                wallets[t.cryptocoin_id].sell.push(info)
            }

            // Paid with BEST?
            if (t.bfc_used && t.best_fee_collection) {
                const att = t.best_fee_collection.attributes
                info.fee = att.bfc_market_value_eur ? parseFloat(att.bfc_market_value_eur) : 0
                info.bestAmount = parseFloat(att.bfc_market_value_eur) / parseFloat(att.best_current_price_eur)

                bestWallet.sell.push({
                    assetAmount: info.bestAmount,
                    assetPrice: parseFloat(att.best_current_price_eur),
                    cost: 0,
                    timestamp: parseInt(t.time.unix)
                })
            } else {
                info.fee = t.fee ? parseFloat(t.fee) : 0
            }

            wallets[t.cryptocoin_id].totalFees += info.fee
        }

        // Iterate wallets to calculate trading profits or losses.
        for (let w of Object.values(wallets)) {
            const wallet = w as Wallet

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
            wallet.currentValue = wallet.balance > 0 && data.ticker[wallet.symbol] ? parseFloat(data.ticker[wallet.symbol].EUR) * wallet.balance : 0

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
                wallet.sellProfit = wallet.totalSell - pricePaid - wallet.totalFees
                totalProfit += wallet.sellProfit
            }
        }

        // Filter only wallets that had transactions.
        const activeWallets = _.filter(Object.values(wallets), (w) => w.buy.length > 0 || w.sell.length > 0)

        // The BEST profit takes into account trade fees paid with BEST, so BEST usage was essentially counted twice.
        // Here we add these feed back to the total profit.
        bestWallet.sell = bestWallet.sell.filter((t) => t.cost > 0)
        totalProfit += _.sumBy(activeWallets, "totalFees")

        const result: PandaReport = {
            wallets: activeWallets,
            profit: totalProfit,
            deposit: totalDeposit,
            depositCount: depositCount,
            withdrawal: totalWithdrawal,
            withdrawalCount: withdrawalCount,
            fiatBalance: fiatBalance
        }

        return result
    }

    // HELPERS
    // --------------------------------------------------------------------------

    /**
     * Calculate the weighted price average based on volume.
     */
    weightedAvg = (total: number, positions: Array<Array<number>>): number => {
        if (total <= 0) return 0
        if (positions.length == 1) return positions[0][1]

        return positions.reduce((acc, next) => acc + next[0] * next[1], 0) / total
    }
}

// Exports...
export = Bitpanda.Instance

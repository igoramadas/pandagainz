// Routes

import _ = require("lodash")
import bitpanda = require("./bitpanda")
import expresser = require("expresser")

/**
 * Service routes.
 */
class Routes {
    private constructor() {}

    static init = async () => {
        const app = expresser.app

        app.get("/", async (req, res) => {
            app.renderView(req, res, "index.html")
        })

        app.get("/calculate", async (req, res) => {
            const result: any = {
                profit: 0,
                wallets: {}
            }

            // Get all the necessary data from Bitpanda.
            const data = {
                ticker: await bitpanda.getTicker(),
                trades: await bitpanda.getTrades(req.query.key),
                wallets: await bitpanda.getWallets(req.query.key),
                fiatWallets: await bitpanda.getFiatWallets(req.query.key)
            }

            // Create the resulting wallets array with the correct asset IDs.
            for (let wallet of data.wallets) {
                if (!result.wallets[wallet.cryptocoin_id]) {
                    result.wallets[wallet.cryptocoin_id] = {
                        symbol: wallet.cryptocoin_symbol,
                        balance: 0,
                        totals: {},
                        buy: [],
                        sell: []
                    }
                }
            }

            // Parse trades and add them to the related wallets.
            for (let trade of data.trades) {
                const info = {
                    assetAmount: parseFloat(trade.amount_cryptocoin),
                    assetPrice: parseFloat(trade.price),
                    cost: parseFloat(trade.amount_fiat),
                    timestamp: parseInt(trade.time.unix)
                }

                // Buying or selling?
                if (trade.type == "buy") {
                    result.wallets[trade.cryptocoin_id].buy.push(info)
                } else {
                    result.wallets[trade.cryptocoin_id].sell.push(info)
                }
            }

            // Iterate wallets to calculate trading profits or losses.
            for (let w of Object.values(result.wallets)) {
                const wallet = w as any

                // No transactions? Stop here.
                if (wallet.buy.length == 0 && wallet.sell.length == 0) {
                    continue
                }

                // Purchased assets? Calculate total in fiat.
                if (wallet.buy.length > 0) {
                    const arrBuy = []
                    for (let trade of wallet.buy) {
                        arrBuy.push([trade.assetAmount, trade.cost / trade.assetAmount])
                    }
                    wallet.totals.buy = _.sumBy(wallet.buy, "cost")
                }

                // Solds assets? Calculate total in fiat.
                if (wallet.sell.length > 0) {
                    const arrSell = []
                    for (let trade of wallet.sell) {
                        arrSell.push([trade.assetAmount, trade.cost / trade.assetAmount])
                    }
                    wallet.totals.sell = _.sumBy(wallet.sell, "cost")
                }

                // How many assets were bought and sold? Calculate balance.
                const buyCount = _.sumBy(wallet.buy, "assetAmount")
                const sellCount = _.sumBy(wallet.sell, "assetAmount")
                wallet.balance = buyCount - (sellCount || 0)

                // Sold assets?
                if (sellCount > 0) {
                    let arrPricePaid = []
                    let matchBuyCount = 0
                    let i = 0

                    // Calculate how much was paid for the assets that were sold.
                    while (matchBuyCount < sellCount) {
                        let trade = wallet.buy[i]
                        let amount = trade.assetAmount
                        matchBuyCount += amount

                        // Reached the amount sold? Remove extra so we can properly calculate the average.
                        if (matchBuyCount > sellCount) {
                            amount -= matchBuyCount - amount
                        }

                        arrPricePaid.push([amount, trade.cost / trade.assetAmount])
                        i++
                    }

                    // Total price paid for the sold assets.
                    const pricePaid = bitpanda.weightedAvg(sellCount, arrPricePaid) * sellCount
                    wallet.totals.sellProfit = wallet.totals.sell - pricePaid
                    result.profit += wallet.totals.sellProfit
                }

                // We only want the useful wallet data on result.
                result.wallets = Object.values(result.wallets)
                _.remove(result.wallets, (w) => {
                    return w.buy.length == 0 && w.sell.length == 0
                })
            }

            app.renderJson(req, res, result)
        })
    }
}

// Exports...
export = Routes

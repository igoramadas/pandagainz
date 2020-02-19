// Types

/**
 * A full report.
 */
interface PandaReport {
    profit?: number
    wallets?: Wallet[]
}

/**
 * Trade involving crypto or metal assets.
 */
interface Trade {
    assetAmount: number
    assetPrice: number
    cost: number
    timestamp: number
}

/**
 * Wallet with trades.
 */
interface Wallet {
    symbol: string
    buy: Trade[]
    sell: Trade[]
    balance: number
    totalBuy?: number
    totalSell?: number
    sellProfit?: number
}

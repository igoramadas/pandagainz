// Types

/**
 * A full report.
 */
interface PandaReport {
    keyHash?: string
    profit?: number
    wallets?: Wallet[]
}

/**
 * Represents a payment / donation to PandaGainz.
 */
interface Payment {
    email?: string
    keyHash: string
    amount: number
    timestamp: number
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

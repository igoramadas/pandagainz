// Types

/**
 * A full report.
 */
interface PandaReport {
    keyHash?: string
    profit?: number
    deposit?: number
    depositCount?: number
    withdrawal?: number
    withdrawalCount?: number
    fiatBalance?: number
    fees?: number
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
    fee?: number
    bestAmount?: number
}

/**
 * Wallet with trades.
 */
interface Wallet {
    id: string
    symbol: string
    balance: number
    currentValue: number
    buy: Trade[]
    sell: Trade[]
    totalBuy?: number
    totalSell?: number
    totalFees?: number
    sellProfit?: number
}

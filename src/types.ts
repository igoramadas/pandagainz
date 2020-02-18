interface PandaReport {
    profit?: number
    wallets?: Wallet[]
}

interface Trade {
    assetAmount: number
    assetPrice: number
    cost: number
    timestamp: number
}

interface Wallet {
    symbol: string
    buy: Trade[]
    sell: Trade[]
    balance: number
    totalBuy?: number
    totalSell?: number
    sellProfit?: number
}

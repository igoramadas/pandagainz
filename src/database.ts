// Database

import logger = require("anyhow")
import moment = require("moment")
import mongodb = require("mongodb")
const mongoClient = mongodb.MongoClient
const settings = require("setmeup").settings

/**
 * Database wrapper.
 */
class Database {
    private static _instance: Database
    static get Instance() {
        return this._instance || (this._instance = new this())
    }

    /** MongoDB connection client. */
    private client = null

    /** MongoDB database reference. */
    private db = null

    /** Is the client currently connected to the database? */
    get isConnected() {
        return this.client && this.client.topology && this.client.topology.isConnected()
    }

    /**
     * Ensure the client connection to the database.
     */
    private connect = async (): Promise<void> => {
        if (!this.isConnected) {
            try {
                this.client = await mongoClient.connect(settings.database.url, {useUnifiedTopology: true})
                this.db = this.client.db(settings.database.name)
                logger.info("Database.connect", `Connected to ${settings.database.name}`)
            } catch (ex) {
                logger.error("Database.connect", ex)
            }
        }
    }

    /**
     * Init the database and ensure indexes are set.
     */
    init = async () => {
        try {
            if (settings.database.enabled) {
                await this.connect()
                await this.db.collection("payments").createIndex({email: 1}, {sparse: true})
                await this.db.collection("payments").createIndex({keyHash: 1})
                await this.db.collection("reports").createIndex({keyHash: 1})
            } else {
                logger.warn("Database.init", "Not enabled on settings")
            }
        } catch (ex) {
            logger.error("Database.init", ex)
        }
    }

    // DATABASE METHODS
    // --------------------------------------------------------------------------

    /**
     * Add a payment / donation made to PandaGainz via PayPal.
     */
    addPayment = async (keyHash: string, email: string, amount: number): Promise<void> => {
        try {
            await this.connect()

            const payment: Payment = {keyHash: keyHash, email: email, amount: amount, timestamp: moment().unix()}
            const collection = this.db.collection("payments")
            await collection.insertOne(payment)

            logger.info("Database.addPayment", keyHash, email, amount)
        } catch (ex) {
            logger.error("Database.addPayment", keyHash, ex)
        }
    }

    /**
     * Add a report to the database.
     */
    addReport = async (keyHash: string, report: PandaReport): Promise<void> => {
        report.keyHash = keyHash

        try {
            await this.connect()

            const collection = this.db.collection("reports")
            await collection.insertOne(report)

            logger.info("Database.addReport", keyHash, `${report.wallets.length} wallets, profit ${report.profit.toFixed(2)}`)
        } catch (ex) {
            logger.error("Database.addReport", keyHash, ex)
        }
    }

    /**
     * Get stored reports for the specified API key.
     */
    getReports = async (keyHash: string): Promise<PandaReport[]> => {
        try {
            await this.connect()

            const collection = this.db.collection("reports")
            return await collection.find({keyHash: keyHash}).toArray()
        } catch (ex) {
            logger.error("Database.getReports", keyHash, ex)
        }
    }

    /**
     * Remove reports stored for the specified API key.
     */
    deleteReports = async (keyHash: string): Promise<number> => {
        try {
            await this.connect()

            const collection = this.db.collection("reports")
            const dbResult = await collection.deleteMany({keyHash: keyHash})
            const count = dbResult.result && dbResult.result.n ? dbResult.result.n : 0

            logger.info("Database.deleteReports", keyHash, `Deleted ${count} reports`)

            return count
        } catch (ex) {
            logger.error("Database.deleteReports", keyHash, ex)
            throw ex
        }
    }
}

// Exports...
export = Database.Instance

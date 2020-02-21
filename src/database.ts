// Database

import {apiKeyHash} from "./utils"
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

    /**
     * Ensure the client connection to the database.
     */
    private connect = async (): Promise<void> => {
        if (!this.client) {
            this.client = await mongoClient.connect(settings.database.url)
            this.db = this.client.db(settings.database.name)
        }
    }

    /**
     * Init the database and ensure indexes are set.
     */
    init = async () => {
        try {
            await this.connect()
            await this.db.collection("payments").createIndex({email: 1}, {sparse: true})
            await this.db.collection("payments").createIndex({keyHash: 1})
            await this.db.collection("reports").createIndex({keyHash: 1})
        } catch (ex) {
            logger.error("Database.init", ex)
        }
    }

    // DATABASE METHODS
    // --------------------------------------------------------------------------

    /**
     * Add a payment / donation made to PandaGainz via PayPal.
     */
    addPayment = async (apiKey: string, email: string, amount: number): Promise<void> => {
        const keyHash = apiKeyHash(apiKey)

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
    addReport = async (apiKey: string, report: PandaReport): Promise<void> => {
        const keyHash = apiKeyHash(apiKey)
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
    getReports = async (apiKey: string): Promise<PandaReport[]> => {
        const keyHash = apiKeyHash(apiKey)

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
    deleteReports = async (apiKey: string): Promise<number> => {
        const keyHash = apiKeyHash(apiKey)

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

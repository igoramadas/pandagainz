import crypto = require("crypto")

/**
 * Return the hash for the passed API key.
 */
export function apiKeyHash(apiKey: string) {
    const hash = crypto.createHash("sha256")
    return hash.update(apiKey).digest("hex")
}

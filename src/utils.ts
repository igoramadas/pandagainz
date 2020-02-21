import crypto = require("crypto")

export function apiKeyHash(apiKey: string) {
    const hash = crypto.createHash("sha256")
    return hash.update(apiKey).digest("hex")
}

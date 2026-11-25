const crypto = require("crypto");

// ============================================================
// PASSWORD HASHING (scrypt + random salt)
// ============================================================

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password, storedHash) {
    try {
        if (!storedHash || !storedHash.includes(":")) return false;
        const [salt, key] = storedHash.split(":");
        const derivedKey = crypto.scryptSync(password, salt, 64);
        return crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
    } catch (e) {
        return false;
    }
}

// ============================================================
// SESSION TOKEN MANAGEMENT (HMAC-SHA256 Signed for persistence)
// ============================================================

const TOKEN_SECRET = "longjump_ai_secret_signing_key_2026_super_secure";
const activeTokens = new Map(); // token -> session (in-memory lookup / invalidation cache)

function generateToken(user) {
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days validity
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        expiresAt
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadB64).digest("hex");
    const token = `${payloadB64}.${signature}`;

    activeTokens.set(token, payload);
    return token;
}

function verifyToken(token) {
    if (!token || typeof token !== "string") return null;

    // 1. Check in-memory cache first
    const cached = activeTokens.get(token);
    if (cached) {
        if (Date.now() > cached.expiresAt) {
            activeTokens.delete(token);
            return null;
        }
        return cached;
    }

    // 2. Check signed token structure: <base64payload>.<signature>
    const parts = token.split(".");
    if (parts.length === 2) {
        const [payloadB64, signature] = parts;
        const expectedSig = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadB64).digest("hex");

        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
            try {
                const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
                if (Date.now() > payload.expiresAt) {
                    return null;
                }
                activeTokens.set(token, payload);
                return payload;
            } catch (e) {
                return null;
            }
        }
    }

    return null;
}

function invalidateToken(token) {
    if (token) activeTokens.delete(token);
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken,
    invalidateToken
};

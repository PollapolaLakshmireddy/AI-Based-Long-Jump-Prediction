const { verifyToken } = require("../utils/authUtils");
const { users } = require("../data/memoryStore");

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

function authenticate(req, res, next) {
    let token = null;

    // Check Authorization Header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
    } else if (req.headers["x-auth-token"]) {
        token = req.headers["x-auth-token"];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication token is required. Please log in."
        });
    }

    const session = verifyToken(token);
    if (!session) {
        return res.status(401).json({
            success: false,
            message: "Session expired or invalid token. Please log in again."
        });
    }

    let user = users.get(session.userId);
    if (!user) {
        // Reconstruct user from signed session token if memory was reset
        user = {
            id: session.userId,
            username: session.username,
            role: session.role || "athlete",
            name: session.name || session.username,
            email: session.username + "@athlete.local",
            status: "active"
        };
        users.set(session.userId, user);
    }

    if (user.status === "inactive") {
        return res.status(403).json({
            success: false,
            message: "This account has been deactivated by the administrator."
        });
    }

    req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email
    };

    next();
}

// Optional Auth (for public or hybrid endpoints)
function optionalAuthenticate(req, res, next) {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (token) {
        const session = verifyToken(token);
        if (session) {
            let user = users.get(session.userId);
            if (!user) {
                user = {
                    id: session.userId,
                    username: session.username,
                    role: session.role || "athlete",
                    name: session.name || session.username,
                    email: session.username + "@athlete.local",
                    status: "active"
                };
                users.set(session.userId, user);
            }
            req.user = {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name,
                email: user.email
            };
        }
    }
    next();
}

// ============================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================

function requireRole(requiredRole) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        if (req.user.role !== requiredRole) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Requires ${requiredRole} privileges.`
            });
        }

        next();
    };
}

// Allows athlete to access their own ID, or Admin to access any
function requireSelfOrAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    const targetAthleteId = req.params.athleteId || req.params.id || req.query.athleteId;

    if (req.user.role === "admin") {
        return next();
    }

    if (req.user.role === "athlete" && req.user.id === targetAthleteId) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own athlete records."
    });
}

module.exports = {
    authenticate,
    optionalAuthenticate,
    requireRole,
    requireSelfOrAdmin
};

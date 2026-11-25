const { users, athleteProfiles } = require("../data/memoryStore");
const { hashPassword, verifyPassword, generateToken, invalidateToken } = require("../utils/authUtils");

// ============================================================
// REGISTER ATHLETE
// ============================================================

const registerAthlete = (req, res) => {
    try {
        const {
            username,
            email,
            password,
            name,
            age,
            gender,
            height,
            weight,
            skillLevel,
            sprintSpeed,
            verticalJump,
            standingJump,
            trainingHours,
            coachRating
        } = req.body;

        // Validation
        if (!username || !password || !name) {
            return res.status(400).json({
                success: false,
                message: "Username, password, and full name are required."
            });
        }

        const cleanUsername = username.trim().toLowerCase();
        const cleanEmail = email ? email.trim().toLowerCase() : `${cleanUsername}@athlete.longjumpai.com`;

        // Check duplicate username
        for (const user of users.values()) {
            if (user.username.toLowerCase() === cleanUsername) {
                return res.status(409).json({
                    success: false,
                    message: "Username already exists. Please choose a different username."
                });
            }
        }

        const athleteId = "ath_" + Date.now();
        const passwordHash = hashPassword(password);

        // Create User
        const newUser = {
            id: athleteId,
            username: cleanUsername,
            email: cleanEmail,
            passwordHash,
            role: "athlete",
            name: name.trim(),
            status: "active",
            createdAt: new Date().toISOString()
        };
        users.set(athleteId, newUser);

        // Calculate BMI
        const h = Number(height) || null;
        const w = Number(weight) || null;
        const bmi = (h && w) ? Number((w / Math.pow(h / 100, 2)).toFixed(2)) : null;

        // Create Athlete Profile
        const newProfile = {
            userId: athleteId,
            name: name.trim(),
            age: Number(age) || null,
            gender: gender || "Male",
            height: h,
            weight: w,
            bmi: bmi,
            skillLevel: skillLevel || "Intermediate",
            sprintSpeed: Number(sprintSpeed) || null,
            verticalJump: Number(verticalJump) || null,
            standingJump: Number(standingJump) || null,
            trainingHours: Number(trainingHours) || 8,
            coachRating: Number(coachRating) || 7,
            createdAt: newUser.createdAt
        };
        athleteProfiles.set(athleteId, newProfile);

        // Generate Token
        const token = generateToken(newUser);

        return res.status(201).json({
            success: true,
            message: "Athlete registered successfully!",
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            },
            profile: newProfile
        });

    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to register athlete.",
            error: error.message
        });
    }
};

// ============================================================
// LOGIN (Athlete or Admin)
// ============================================================

const login = (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });
        }

        const cleanUsername = username.trim().toLowerCase();

        let matchedUser = null;
        for (const user of users.values()) {
            if (user.username.toLowerCase() === cleanUsername) {
                matchedUser = user;
                break;
            }
        }

        if (!matchedUser) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        const isPasswordValid = verifyPassword(password, matchedUser.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        if (matchedUser.status === "inactive") {
            return res.status(403).json({
                success: false,
                message: "Account is inactive. Please contact your coach or administrator."
            });
        }

        const token = generateToken(matchedUser);
        const profile = matchedUser.role === "athlete" ? athleteProfiles.get(matchedUser.id) || null : null;

        return res.status(200).json({
            success: true,
            message: "Login successful!",
            token,
            user: {
                id: matchedUser.id,
                username: matchedUser.username,
                name: matchedUser.name,
                email: matchedUser.email,
                role: matchedUser.role
            },
            profile
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server login error.",
            error: error.message
        });
    }
};

// ============================================================
// GET CURRENT LOGGED IN USER
// ============================================================

const getMe = (req, res) => {
    const user = req.user;
    const profile = user.role === "athlete" ? athleteProfiles.get(user.id) || null : null;

    return res.status(200).json({
        success: true,
        user,
        profile
    });
};

// ============================================================
// LOGOUT
// ============================================================

const logout = (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7).trim();
        invalidateToken(token);
    }
    return res.status(200).json({
        success: true,
        message: "Logged out successfully."
    });
};

module.exports = {
    registerAthlete,
    login,
    getMe,
    logout
};

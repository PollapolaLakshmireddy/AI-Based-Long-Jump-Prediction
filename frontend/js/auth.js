// ============================================================
// LONG JUMP AI - ROLE-BASED AUTHENTICATION & SESSION GUARD
// ============================================================

const AUTH_CONFIG = {
    TOKEN_KEY: "lj_auth_token",
    USER_KEY: "lj_user",
    ROLE_KEY: "lj_role",
    PROFILE_KEY: "lj_profile"
};

// Safe Storage Helpers
function getAuthToken() {
    return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY) || sessionStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
}

function getAuthUser() {
    try {
        const raw = localStorage.getItem(AUTH_CONFIG.USER_KEY) || sessionStorage.getItem(AUTH_CONFIG.USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function getAuthRole() {
    return localStorage.getItem(AUTH_CONFIG.ROLE_KEY) || sessionStorage.getItem(AUTH_CONFIG.ROLE_KEY);
}

function getAthleteProfile() {
    try {
        const raw = localStorage.getItem(AUTH_CONFIG.PROFILE_KEY) || sessionStorage.getItem(AUTH_CONFIG.PROFILE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function setAuthSession(token, user, profile, remember = true) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
    storage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
    storage.setItem(AUTH_CONFIG.ROLE_KEY, user.role);
    if (profile) {
        storage.setItem(AUTH_CONFIG.PROFILE_KEY, JSON.stringify(profile));
    }

    // Set legacy flags for backward compatibility
    if (user.role === "admin") {
        storage.setItem("isAdminLoggedIn", "true");
        storage.setItem("adminUser", user.username);
    }
}

function clearAuthSession() {
    [localStorage, sessionStorage].forEach(storage => {
        storage.removeItem(AUTH_CONFIG.TOKEN_KEY);
        storage.removeItem(AUTH_CONFIG.USER_KEY);
        storage.removeItem(AUTH_CONFIG.ROLE_KEY);
        storage.removeItem(AUTH_CONFIG.PROFILE_KEY);
        storage.removeItem("isAdminLoggedIn");
        storage.removeItem("adminUser");
    });
}

function logoutUser() {
    if (confirm("Are you sure you want to log out?")) {
        const token = getAuthToken();
        if (token) {
            try {
                fetch("/api/auth/logout", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` }
                }).catch(() => {});
            } catch (e) {}
        }
        clearAuthSession();
        window.location.href = "login.html";
    }
}

// Global Auth Guard: runs immediately on page load
(function checkRouteAccess() {
    const path = window.location.pathname.toLowerCase();
    const token = getAuthToken();
    const role = getAuthRole();

    const isLoginPage = path.endsWith("login.html") || path.endsWith("/login");
    const isAthleteDashboard = path.endsWith("athlete-dashboard.html");

    // Public / Hybrid accessible pages: never force-redirect these to login
    const isPublicAccessible = 
        path.endsWith("index.html") || 
        path.endsWith("/") || 
        path.length <= 1 ||
        path.endsWith("dashboard.html") ||
        path.endsWith("prediction.html") ||
        path.endsWith("video-analysis.html") ||
        path.endsWith("results.html") ||
        path.endsWith("history.html") ||
        path.endsWith("feedback.html") ||
        path.endsWith("performance.html") ||
        path.endsWith("instructions.html") ||
        path.endsWith("about.html") ||
        isLoginPage;

    // Admin-only Pages
    const isAdminPage = path.includes("admin-") || path.endsWith("athletes.html") || path.endsWith("reports.html");

    // 1. Athlete dashboard requires login; redirect to login if no token
    if (!token && isAthleteDashboard) {
        console.warn("Athlete dashboard access requires login. Redirecting...");
        window.location.href = "login.html";
        return;
    }

    // 2. Not logged in trying to access admin pages
    if (!token && isAdminPage) {
        console.warn("Admin area requires authentication. Redirecting to login.html...");
        window.location.href = "login.html";
        return;
    }

    // 3. Already logged in on login page -> redirect to role dashboard
    if (token && isLoginPage) {
        if (role === "admin") {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "athlete-dashboard.html";
        }
        return;
    }

    // 4. Athlete trying to access admin-only page
    if (token && role === "athlete" && isAdminPage) {
        console.warn("Athlete unauthorized for admin area. Redirecting to athlete dashboard...");
        window.location.href = "athlete-dashboard.html";
        return;
    }
})();

// ============================================================
// DYNAMIC NAVIGATION BAR UPDATER
// ============================================================

function updateNavbar() {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    const token = getAuthToken();
    const user = getAuthUser();
    const role = getAuthRole();
    const path = window.location.pathname.toLowerCase();

    const nav = navbar.querySelector("nav");
    if (!nav) return;

    if (token && role === "admin") {
        // ADMIN NAVBAR
        nav.innerHTML = `
            <a href="index.html" class="${path.endsWith('index.html') ? 'active' : ''}">Home</a>
            <a href="admin-dashboard.html" class="${path.endsWith('admin-dashboard.html') ? 'active' : ''}">Admin Dashboard</a>
            <a href="prediction.html" class="${path.endsWith('prediction.html') ? 'active' : ''}">Prediction</a>
            <a href="video-analysis.html" class="${path.endsWith('video-analysis.html') ? 'active' : ''}">Video Analysis</a>
            <a href="results.html" class="${path.endsWith('results.html') ? 'active' : ''}">Results</a>
            <a href="athletes.html" class="${path.endsWith('athletes.html') ? 'active' : ''}">Manage Athletes</a>
            <a href="admin-submissions.html" class="${path.endsWith('admin-submissions.html') ? 'active' : ''}">Submissions</a>
            <a href="admin-tests.html" class="${path.endsWith('admin-tests.html') ? 'active' : ''}">Tests</a>
        `;

        let btn = navbar.querySelector(".nav-button");
        if (!btn) {
            btn = document.createElement("a");
            btn.className = "nav-button";
            navbar.appendChild(btn);
        }
        btn.textContent = `🔓 Logout (${user?.username || 'Admin'})`;
        btn.href = "#";
        btn.onclick = (e) => { e.preventDefault(); logoutUser(); };

    } else if (token && role === "athlete") {
        // ATHLETE NAVBAR
        nav.innerHTML = `
            <a href="index.html" class="${path.endsWith('index.html') ? 'active' : ''}">Home</a>
            <a href="athlete-dashboard.html" class="${path.endsWith('athlete-dashboard.html') ? 'active' : ''}">Dashboard</a>
            <a href="prediction.html" class="${path.endsWith('prediction.html') ? 'active' : ''}">Prediction</a>
            <a href="video-analysis.html" class="${path.endsWith('video-analysis.html') ? 'active' : ''}">Video Analysis</a>
            <a href="results.html" class="${path.endsWith('results.html') ? 'active' : ''}">Results</a>
            <a href="history.html" class="${path.endsWith('history.html') ? 'active' : ''}">Test History</a>
            <a href="feedback.html" class="${path.endsWith('feedback.html') ? 'active' : ''}">Feedback</a>
        `;

        let btn = navbar.querySelector(".nav-button");
        if (!btn) {
            btn = document.createElement("a");
            btn.className = "nav-button";
            navbar.appendChild(btn);
        }
        btn.textContent = `🏃 Logout (${user?.name?.split(' ')[0] || user?.username || 'Athlete'})`;
        btn.href = "#";
        btn.onclick = (e) => { e.preventDefault(); logoutUser(); };

    } else {
        // PUBLIC / GUEST NAVBAR
        nav.innerHTML = `
            <a href="index.html" class="${path.endsWith('index.html') ? 'active' : ''}">Home</a>
            <a href="dashboard.html" class="${path.endsWith('dashboard.html') ? 'active' : ''}">Dashboard</a>
            <a href="prediction.html" class="${path.endsWith('prediction.html') ? 'active' : ''}">Prediction</a>
            <a href="video-analysis.html" class="${path.endsWith('video-analysis.html') ? 'active' : ''}">Video Analysis</a>
            <a href="results.html" class="${path.endsWith('results.html') ? 'active' : ''}">Results</a>
            <a href="history.html" class="${path.endsWith('history.html') ? 'active' : ''}">Test History</a>
            <a href="feedback.html" class="${path.endsWith('feedback.html') ? 'active' : ''}">Feedback</a>
            <a href="login.html" class="${path.endsWith('login.html') ? 'active' : ''}">Login</a>
        `;

        let btn = navbar.querySelector(".nav-button");
        if (!btn) {
            btn = document.createElement("a");
            btn.className = "nav-button";
            navbar.appendChild(btn);
        }
        btn.textContent = "Sign In / Register";
        btn.href = "login.html";
        btn.onclick = null;
    }
}

document.addEventListener("DOMContentLoaded", updateNavbar);

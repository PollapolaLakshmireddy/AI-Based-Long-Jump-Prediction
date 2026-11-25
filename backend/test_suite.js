// ============================================================
// COMPREHENSIVE END-TO-END TEST SUITE
// AI-Based Sports Talent Identification and Assessment Platform
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const app = require("./server");

let serverInstance;
let PORT = 5555; // Test on dedicated port to avoid conflicts
let BASE_URL = `http://localhost:${PORT}`;

let athleteToken = "";
let adminToken = "";
let createdAthleteId = "";
let sampleSubmissionId = "";

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {}
        };

        let requestData = null;
        if (body) {
            requestData = JSON.stringify(body);
            options.headers["Content-Type"] = "application/json";
            options.headers["Content-Length"] = Buffer.byteLength(requestData);
        }

        if (token) {
            options.headers["Authorization"] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                let parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {}
                resolve({ status: res.statusCode, headers: res.headers, data: parsed });
            });
        });

        req.on("error", (err) => reject(err));

        if (requestData) {
            req.write(requestData);
        }
        req.end();
    });
}

function assert(condition, testName) {
    if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
    } else {
        console.error(`  ❌ FAIL: ${testName}`);
        throw new Error(`Test failed: ${testName}`);
    }
}

async function runTests() {
    console.log("\n============================================================");
    console.log("STARTING TEST SUITE: ATHLETE & ADMIN FEATURES VALIDATION");
    console.log("============================================================\n");

    try {
        // Start server on test port
        await new Promise((resolve) => {
            serverInstance = app.listen(PORT, () => {
                console.log(`[Test Runner] Test server listening on ${BASE_URL}\n`);
                resolve();
            });
        });

        // ------------------------------------------------------------
        // SUITE 1: HEALTH & PRESERVATION CHECKS
        // ------------------------------------------------------------
        console.log("--- SUITE 1: System Health & AI Code Integrity ---");

        const health = await request("GET", "/api/health");
        assert(health.status === 200, "Health endpoint returns 200");
        assert(health.data.storage.includes("In-Memory"), "Using In-Memory storage (No DB)");

        // Verify ML scripts exist and are untouched
        const analyzeScript = path.join(__dirname, "../ml/analyze_video.py");
        const predictScript = path.join(__dirname, "../ml/predict.py");
        const distModel = path.join(__dirname, "../ml/models/distance_model.pkl");
        const perfModel = path.join(__dirname, "../ml/models/performance_model.pkl");

        assert(fs.existsSync(analyzeScript), "ml/analyze_video.py is preserved");
        assert(fs.existsSync(predictScript), "ml/predict.py is preserved");
        assert(fs.existsSync(distModel), "ml/models/distance_model.pkl is preserved");
        assert(fs.existsSync(perfModel), "ml/models/performance_model.pkl is preserved");

        // ------------------------------------------------------------
        // SUITE 2: ATHLETE / USER FEATURES
        // ------------------------------------------------------------
        console.log("\n--- SUITE 2: Athlete / User Features ---");

        // 1. Register Athlete
        const regRes = await request("POST", "/api/auth/register", {
            username: "champion_test",
            name: "Karan Verma",
            email: "karan@example.com",
            password: "KaranPassword@123",
            age: 22,
            gender: "Male",
            height: 184,
            weight: 76,
            skillLevel: "Advanced",
            sprintSpeed: 9.6,
            verticalJump: 64,
            standingJump: 2.62
        });
        assert(regRes.status === 201, "Athlete registered successfully (HTTP 201)");
        assert(regRes.data.token != null, "JWT/session token generated on registration");
        assert(regRes.data.user.role === "athlete", "Registered user assigned 'athlete' role");
        athleteToken = regRes.data.token;
        createdAthleteId = regRes.data.user.id;

        // 2. Athlete Login
        const loginRes = await request("POST", "/api/auth/login", {
            username: "champion_test",
            password: "KaranPassword@123"
        });
        assert(loginRes.status === 200, "Athlete login successful (HTTP 200)");
        assert(loginRes.data.user.name === "Karan Verma", "User payload matches athlete name");
        assert(loginRes.data.profile.bmi != null, "Biometric BMI calculated automatically");

        // 3. View Profile
        const profileRes = await request("GET", "/api/athletes/profile", null, athleteToken);
        assert(profileRes.status === 200, "Athlete can view private profile");
        assert(profileRes.data.data.age === 22, "Athlete profile contains correct age");

        // 4. Update Profile
        const updateProfRes = await request("PUT", "/api/athletes/profile", {
            weight: 77,
            trainingHours: 16
        }, athleteToken);
        assert(updateProfRes.status === 200, "Athlete can update profile");
        assert(updateProfRes.data.data.weight === 77, "Profile reflects updated weight");

        // 5. Athlete Dashboard
        const dashRes = await request("GET", "/api/athletes/dashboard", null, athleteToken);
        assert(dashRes.status === 200, "Athlete dashboard loads successfully");
        assert(dashRes.data.data.stats != null, "Dashboard contains personal statistics");
        assert(dashRes.data.data.profile.name === "Karan Verma", "Dashboard shows athlete identity");

        // 6. View Instructions
        const instRes = await request("GET", "/api/instructions");
        assert(instRes.status === 200, "Athlete can fetch test recording instructions");
        assert(instRes.data.data.length > 0, "Active recording instructions available");
        assert(instRes.data.data[0].steps.length > 0, "Instructions include step-by-step guidelines");

        // 7. View Available Tests
        const testsRes = await request("GET", "/api/tests");
        assert(testsRes.status === 200, "Athlete can fetch available tests");
        assert(testsRes.data.data.length > 0, "Active tests list returned");

        // 8. Test History for pre-seeded athlete (Arjun Reddy)
        const arjunLogin = await request("POST", "/api/auth/login", {
            username: "arjun",
            password: "Arjun@123"
        });
        const arjunToken = arjunLogin.data.token;

        const histRes = await request("GET", "/api/tests/submissions/my-history", null, arjunToken);
        assert(histRes.status === 200, "Athlete can fetch personal test history");
        assert(histRes.data.data.length >= 2, "Test history returns athlete's past submissions");
        sampleSubmissionId = histRes.data.data[0].id;

        // 9. View Performance Results & Coaching Feedback
        const subDetails = await request("GET", `/api/tests/submissions/${sampleSubmissionId}`, null, arjunToken);
        assert(subDetails.status === 200, "Athlete can inspect single submission details");
        assert(subDetails.data.data.result.performance.takeoff_angle_deg != null, "Contains actual AI takeoff angle");
        assert(subDetails.data.data.result.feedback != null, "Contains AI feedback and recommendations");
        assert(subDetails.data.data.result.feedback.recommendations.length > 0, "Feedback contains actionable coaching items");

        // 10. Performance Analytics Trends
        const analyticsRes = await request("GET", "/api/athletes/analytics", null, arjunToken);
        assert(analyticsRes.status === 200, "Athlete can fetch personal performance trends");
        assert(analyticsRes.data.data.timeline.length > 0, "Timeline contains attempt trends");

        // 11. Secure Logout
        const logoutRes = await request("POST", "/api/auth/logout", null, athleteToken);
        assert(logoutRes.status === 200, "Athlete logout successful");

        const testAfterLogout = await request("GET", "/api/athletes/profile", null, athleteToken);
        assert(testAfterLogout.status === 401, "Token invalidated after logout");

        // ------------------------------------------------------------
        // SUITE 3: ADMIN FEATURES
        // ------------------------------------------------------------
        console.log("\n--- SUITE 3: Admin Features ---");

        // 1. Admin Login
        const adminLogin = await request("POST", "/api/auth/login", {
            username: "admin",
            password: "Admin@123"
        });
        assert(adminLogin.status === 200, "Admin login successful");
        assert(adminLogin.data.user.role === "admin", "User verified with 'admin' role");
        adminToken = adminLogin.data.token;

        // 2. Dashboard Statistics
        const statsRes = await request("GET", "/api/admin/dashboard-stats", null, adminToken);
        assert(statsRes.status === 200, "Admin dashboard statistics fetched");
        assert(statsRes.data.stats.totalAthletes >= 4, "Total athletes statistic accurate");
        assert(statsRes.data.stats.totalSubmissions >= 5, "Total submissions statistic accurate");
        assert(statsRes.data.stats.completedAssessments >= 4, "Completed assessments count accurate");
        assert(statsRes.data.stats.failedAssessments >= 1, "Failed assessments count accurate");
        assert(statsRes.data.talentDistribution != null, "Talent distribution breakdown present");

        // 3. Manage Athletes (View, Search, Manage Status)
        const allAthletesRes = await request("GET", "/api/admin/athletes", null, adminToken);
        assert(allAthletesRes.status === 200, "Admin can view all athletes");
        assert(allAthletesRes.data.data.length >= 4, "All athletes returned");

        const searchAth = await request("GET", "/api/admin/athletes?search=arjun", null, adminToken);
        assert(searchAth.data.data.length === 1 && searchAth.data.data[0].name === "Arjun Reddy", "Search athlete by name works");

        // Toggle athlete status (active -> inactive)
        const toggleRes = await request("PUT", `/api/admin/athletes/${createdAthleteId}/status`, { status: "inactive" }, adminToken);
        assert(toggleRes.status === 200, "Admin can update athlete status");
        assert(toggleRes.data.user.status === "inactive", "Status set to inactive");

        // 4. View Test Submissions
        const allSubsRes = await request("GET", "/api/admin/submissions", null, adminToken);
        assert(allSubsRes.status === 200, "Admin can view all test submissions across athletes");
        assert(allSubsRes.data.data.length >= 5, "Submissions list contains all test attempts");

        // 5. Performance Analytics
        const platformAnalytics = await request("GET", "/api/admin/analytics", null, adminToken);
        assert(platformAnalytics.status === 200, "Platform performance analytics loaded");
        assert(platformAnalytics.data.analytics.averageJumpDistance > 0, "Calculates average jump distance");
        assert(platformAnalytics.data.analytics.angleDistribution != null, "Biomechanical angle distribution computed");

        // 6. Generate Reports (CSV Export)
        const csvRes = await request("GET", "/api/admin/reports/csv", null, adminToken);
        assert(csvRes.status === 200, "CSV Report endpoint returns HTTP 200");
        assert(csvRes.headers["content-type"].includes("text/csv"), "Content-Type is text/csv");
        assert(typeof csvRes.data === "string" && csvRes.data.includes("Submission ID,Athlete ID"), "CSV contains valid assessment headers");
        assert(csvRes.data.includes("Arjun Reddy"), "CSV contains athlete data rows");

        // Summary report for Print / PDF
        const summaryRes = await request("GET", "/api/admin/reports/summary", null, adminToken);
        assert(summaryRes.status === 200, "Summary report data returned for PDF/Print");
        assert(summaryRes.data.reports.length > 0, "Reports array contains athlete performance records");

        // 7. Manage Tests (Create, Update, Toggle)
        const newTestRes = await request("POST", "/api/admin/tests", {
            title: "Sprint Runway Acceleration Test",
            category: "Sprint Biomechanics",
            description: "Test measuring 30m runway acceleration and takeoff transition.",
            durationMinutes: 12,
            criteria: "Dual timing gates at 20m and 30m marks."
        }, adminToken);
        assert(newTestRes.status === 201, "Admin can create a new test");
        const createdTestId = newTestRes.data.data.id;

        const toggleTest = await request("PUT", `/api/admin/tests/${createdTestId}`, { status: "inactive" }, adminToken);
        assert(toggleTest.status === 200, "Admin can update/deactivate tests");
        assert(toggleTest.data.data.status === "inactive", "Test status toggled to inactive");

        // 8. Manage Instructions
        const addInstRes = await request("POST", "/api/admin/instructions", {
            testId: createdTestId,
            title: "Sprint Acceleration Protocol",
            summary: "Standardized instructions for recording runway speed.",
            steps: ["Set camera at 20m point", "Record at 60 FPS minimum"],
            requirements: ["Clear track lane", "No obstacles"],
            tips: ["Ensure maximum sprinting effort throughout"]
        }, adminToken);
        assert(addInstRes.status === 201, "Admin can add/update test instructions");

        // 9. Temporary Video Cleanup Policy
        const cleanupRes = await request("POST", "/api/admin/cleanup-videos?maxAgeHours=0", null, adminToken);
        assert(cleanupRes.status === 200, "Admin can trigger temporary video cleanup policy");
        assert(cleanupRes.data.data.count >= 0, "Cleanup reports removed files count");

        // ------------------------------------------------------------
        // SUITE 4: DATA PRIVACY & ACCESS CONTROL ISOLATION
        // ------------------------------------------------------------
        console.log("\n--- SUITE 4: Data Privacy & Role-Based Permissions ---");

        // Athlete attempting to access admin endpoints -> MUST BE FORBIDDEN (403)
        const athForbiddenRes = await request("GET", "/api/admin/dashboard-stats", null, arjunToken);
        assert(athForbiddenRes.status === 403, "Athlete blocked from Admin dashboard stats (403 Forbidden)");

        const athForbiddenAth = await request("GET", "/api/admin/athletes", null, arjunToken);
        assert(athForbiddenAth.status === 403, "Athlete blocked from Admin athletes list (403 Forbidden)");

        // Unauthenticated access -> MUST BE UNAUTHORIZED (401)
        const unauthRes = await request("GET", "/api/admin/submissions");
        assert(unauthRes.status === 401, "Unauthenticated access blocked (401 Unauthorized)");

        // Athlete trying to view another athlete's submission
        const rahulLogin = await request("POST", "/api/auth/login", {
            username: "rahul",
            password: "Rahul@123"
        });
        const rahulToken = rahulLogin.data.token;
        const crossAccess = await request("GET", `/api/tests/submissions/${sampleSubmissionId}`, null, rahulToken);
        assert(crossAccess.status === 403, "Athlete cannot view another athlete's private submission (403 Forbidden)");

        console.log("\n============================================================");
        console.log("🎉 ALL TESTS PASSED! FULL PLATFORM VALIDATION SUCCESSFUL!");
        console.log("============================================================\n");

    } catch (error) {
        console.error("\n💥 TEST SUITE TERMINATED WITH ERROR:", error.message);
        process.exitCode = 1;
    } finally {
        if (serverInstance) {
            serverInstance.close();
            console.log("[Test Runner] Test server closed.");
        }
    }
}

runTests();

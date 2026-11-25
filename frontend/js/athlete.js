// ========================================
// ATHLETE PAGE
// ========================================

console.log("Athlete page loaded");

const API_BASE_URL = (typeof window !== "undefined" && window.location.origin && window.location.origin !== "null" && !window.location.origin.startsWith("file:"))
    ? window.location.origin
    : "http://localhost:5000";

const athleteForm = document.getElementById("athleteForm");

if (athleteForm) {
    athleteForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        // ========================================
        // GET FORM VALUES
        // ========================================

        const nameVal = document.getElementById("name").value.trim();
        const ageVal = Number(document.getElementById("age").value);
        const genderVal = document.getElementById("gender").value;
        const heightVal = Number(document.getElementById("height").value);
        const weightVal = Number(document.getElementById("weight").value);
        const sprintVal = Number(document.getElementById("sprintSpeed").value);
        const verticalVal = Number(document.getElementById("verticalJump").value);
        const standingVal = Number(document.getElementById("standingJump").value);

        const runUpVal = document.getElementById("runUpSpeed")?.value ? Number(document.getElementById("runUpSpeed").value) : null;
        const takeoffSpeedVal = document.getElementById("takeoffSpeed")?.value ? Number(document.getElementById("takeoffSpeed").value) : null;
        const takeoffAngleVal = document.getElementById("takeoffAngle")?.value ? Number(document.getElementById("takeoffAngle").value) : null;
        const legLengthVal = document.getElementById("legLength")?.value ? Number(document.getElementById("legLength").value) : null;
        const previousJumpVal = document.getElementById("previousJump")?.value ? Number(document.getElementById("previousJump").value) : null;

        const athleteData = {
            id: "ath_" + Date.now(),
            name: nameVal,
            age: ageVal,
            gender: genderVal,
            height: heightVal,
            weight: weightVal,
            sprintSpeed: sprintVal,
            verticalJump: verticalVal,
            standingJump: standingVal,
            runUpSpeed: runUpVal,
            takeoffSpeed: takeoffSpeedVal,
            takeoffAngle: takeoffAngleVal,
            legLength: legLengthVal,
            previousJump: previousJumpVal,
            created_at: new Date().toISOString()
        };

        console.log("Athlete data collected:", athleteData);

        // Save current active athlete to localStorage for Prediction page
        localStorage.setItem("currentAthlete", JSON.stringify(athleteData));

        // Add/Update in allAthletes storage list for Athletes page
        try {
            let allAthletes = JSON.parse(localStorage.getItem("allAthletes") || "[]");
            // Remove existing entry with same name if re-entering
            allAthletes = allAthletes.filter(a => a.name && a.name.toLowerCase() !== nameVal.toLowerCase());
            allAthletes.unshift(athleteData);
            localStorage.setItem("allAthletes", JSON.stringify(allAthletes));
        } catch (e) {
            console.warn("Could not save to allAthletes array:", e);
        }

        // Send to backend API asynchronously (fallback gracefully if offline)
        try {
            fetch(`${API_BASE_URL}/api/athletes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(athleteData)
            }).then(res => res.json()).then(data => {
                if (data && data.success && data.data && data.data.id) {
                    localStorage.setItem("currentAthleteId", data.data.id);
                }
            }).catch(err => console.log("Backend offline notice (using local storage):", err.message));
        } catch (err) {
            console.log("Backend connection skipped.");
        }

        alert("✅ Athlete profile created! Redirecting to AI Prediction results...");
        window.location.href = "prediction.html";
    });
}
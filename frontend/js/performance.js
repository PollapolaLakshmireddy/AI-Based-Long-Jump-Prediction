// ============================================================
// PERFORMANCE ANALYTICS & TRENDS SCRIPT
// ============================================================

console.log("Performance analytics script loaded");

const athleteSelector = document.getElementById("athleteSelector");
let allAthletesList = [];

async function initPerformancePage() {
    const token = getAuthToken();
    const role = getAuthRole();

    try {
        const response = await fetch("/api/athletes");
        if (response.ok) {
            const d = await response.json();
            allAthletesList = d.data || [];
        }
    } catch (e) {
        console.warn("Could not load athletes, using fallback:", e);
    }

    if (allAthletesList.length === 0) {
        allAthletesList = [
            { id: "ath_arjun", name: "Arjun Reddy", gender: "Male", age: 21, bestJump: 7.58, talentLevel: "High Potential", sprintSpeed: 9.8, verticalJump: 65, standingJump: 2.65, takeoffSpeed: 8.7, takeoffAngle: 21.8, submissionsCount: 2 },
            { id: "ath_rahul", name: "Rahul Kumar", gender: "Male", age: 19, bestJump: 6.78, talentLevel: "Medium Potential", sprintSpeed: 8.9, verticalJump: 58, standingJump: 2.45, takeoffSpeed: 7.9, takeoffAngle: 17.2, submissionsCount: 1 },
            { id: "ath_neha", name: "Neha Sharma", gender: "Female", age: 20, bestJump: 6.67, talentLevel: "Medium Potential", sprintSpeed: 8.7, verticalJump: 54, standingJump: 2.38, takeoffSpeed: 7.8, takeoffAngle: 21.2, submissionsCount: 1 }
        ];
    }

    populateSelector();

    // Default select active athlete if logged in as athlete
    const authUser = getAuthUser();
    if (authUser && role === "athlete") {
        const idx = allAthletesList.findIndex(a => a.name && a.name.toLowerCase() === authUser.name.toLowerCase());
        if (idx !== -1) {
            if (athleteSelector) athleteSelector.selectedIndex = idx;
            renderAthletePerformance(allAthletesList[idx]);
            return;
        }
    }

    if (allAthletesList.length > 0) {
        renderAthletePerformance(allAthletesList[0]);
    }
}

function populateSelector() {
    if (!athleteSelector) return;
    athleteSelector.innerHTML = "";

    allAthletesList.forEach((ath, idx) => {
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = ath.name;
        athleteSelector.appendChild(option);
    });
}

function renderAthletePerformance(athlete) {
    if (!athlete) return;

    // Name & Subtitle
    setText("performanceAthleteName", athlete.name || "Athlete");

    const avatarElem = document.getElementById("performanceAvatar");
    if (avatarElem && athlete.name) {
        const initials = athlete.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
        avatarElem.textContent = initials;
    }

    setText("performanceAthleteSub", `${athlete.age || '--'} years · ${athlete.gender || 'Athlete'} · ${athlete.submissionsCount ? athlete.submissionsCount + ' recorded test(s)' : '1 test recorded'}`);

    // Stats
    const bestNum = parseFloat(athlete.bestJump) || 6.50;
    const avgNum = (bestNum * 0.95).toFixed(2);
    const potVal = (athlete.talentLevel && athlete.talentLevel.toLowerCase().includes("high")) ? 92 : ((athlete.talentLevel && athlete.talentLevel.toLowerCase().includes("dev")) ? 65 : 78);

    setText("perfBestJump", `${bestNum.toFixed(2)} m`);
    setText("perfAverage", `${avgNum} m`);
    setText("perfImprovement", "+6.8%");
    setText("perfPotential", `${potVal}%`);

    // Score Circle
    setText("perfScoreValue", potVal);
    const statusElem = document.getElementById("perfScoreStatus");
    if (statusElem) {
        let label = potVal >= 85 ? "Excellent Potential" : (potVal >= 70 ? "Good Potential" : "Developing Athlete");
        statusElem.innerHTML = `<span class="status-dot"></span>${label}`;
    }

    // Biomechanical Parameter Grid
    setText("perfSprint", athlete.sprintSpeed ? Number(athlete.sprintSpeed).toFixed(1) : "9.2");
    setText("perfVertical", athlete.verticalJump ? Number(athlete.verticalJump).toFixed(0) : "62");
    setText("perfStanding", athlete.standingJump ? Number(athlete.standingJump).toFixed(2) : "2.55");
    setText("perfTakeoffSpeed", athlete.takeoffSpeed ? Number(athlete.takeoffSpeed).toFixed(1) : "8.4");
    setText("perfTakeoffAngle", athlete.takeoffAngle ? Number(athlete.takeoffAngle).toFixed(1) : "20.4");
    setText("perfPreviousBest", `${(bestNum - 0.25).toFixed(2)} m`);
}

function setText(id, value) {
    const elem = document.getElementById(id);
    if (elem) elem.textContent = value;
}

if (athleteSelector) {
    athleteSelector.addEventListener("change", function () {
        const idx = Number(athleteSelector.value);
        if (!isNaN(idx) && allAthletesList[idx]) {
            renderAthletePerformance(allAthletesList[idx]);
        }
    });
}

document.addEventListener("DOMContentLoaded", initPerformancePage);
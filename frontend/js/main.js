// ========================================
// LONG JUMP AI
// Main JavaScript
// ========================================

console.log("Long Jump AI frontend loaded");


// ========================================
// CURRENT YEAR
// ========================================

const yearElements = document.querySelectorAll(".current-year");

yearElements.forEach(function (element) {
    element.textContent = new Date().getFullYear();
});


// ========================================
// NAVIGATION
// ========================================

const currentPage =
    window.location.pathname.split("/").pop();

const navLinks =
    document.querySelectorAll(".navbar nav a");

navLinks.forEach(function (link) {

    const linkPage =
        link.getAttribute("href");

    if (linkPage === currentPage) {
        link.classList.add("active");
    }

});


// ========================================
// BUTTON ANIMATION
// ========================================

const buttons =
    document.querySelectorAll(".primary-button");

buttons.forEach(function (button) {

    button.addEventListener("click", function () {

        console.log(
            "Navigation:",
            button.textContent.trim()
        );

    });

});
'use strict';

// Toggle Overlay Menu
function toggleMenu() {
  const overlayMenu = document.getElementById("overlay-menu");
  if (overlayMenu) {
    overlayMenu.classList.toggle("active");
  } else {
    console.error("Element with ID 'overlay-menu' not found.");
  }
}

// JavaScript Ticker
const tickerTexts = [
  "📱 scroll-scroll-tap… Rot",
  "🧘🏾‍♂️ Wellness: Meditating",
  "📚 Reading: Ikigai",
  "🏃🏾‍➡️ Running: Peloton 30 min HIIT",
  "🎧 Listening: MF DOOM",
  "👟 Wearing: Air Max '95",
  "👨🏾‍🏫 Teaching: Typography 1",
  "🎙️ Podcasting: How'd We Get Here?…",
  "👨🏾‍💻 Working: Grading…",
  "📺 Watching: Golden Girls",
  "✍🏾 Writing: GenAI Research Paper", 
  
  "📱 click-click-tap… Sending Emails",
  "📚 Reading: Zen in the Art of Archery",
  "🏃🏾‍➡️ Running: 45min LIT",
  "🎧 Listening: André 3000",
  "👟 Wearing: New Balance 540",
  "👨🏾‍🏫 Teaching: Entrepreneurship",
  "📺 Watching: 24",
  "✍🏾 Writing: Design Tutorials",
  "👨🏾‍💻 Working: App Design",
  
  "📱 click-tap… Join Meeting",
  "🧘🏾‍♂️ Wellness: Yoga",
  "📚 Reading: Ichigo Ichie",
  "🏃🏾‍➡️ Running: 5km Pace",
  "🎧 Listening: 80's Pop",
  "👟 Wearing: Nike Air Huarache",
  "👨🏾‍🏫 Teaching: Portfolio",
  "🎙️ Podcasting: How'd We Get Here?…",
  "📱 clickity-click-click… Texting",
  "👨🏾‍💻 Working: Lesson Plans",
  "📺 Watching: UFO Documentaries",
  
  "🎧 Listening: 90's RnB",
];
let tickerIndex = 0;

function updateTicker() {
  const ticker = document.getElementById("ticker");
  if (ticker) {
    ticker.innerHTML = tickerTexts[tickerIndex];
    tickerIndex = (tickerIndex + 1) % tickerTexts.length;
  } else {
    console.error("Element with ID 'ticker' not found.");
  }
}

// Start ticker updates
updateTicker();
setInterval(updateTicker, 5000);

// Theme Switcher
const darkModeBtn = document.getElementById("dark-mode-btn");
const lightModeBtn = document.getElementById("light-mode-btn");
const altModeBtn = document.getElementById("alt-mode-btn");

// Ensure buttons exist before adding event listeners
if (darkModeBtn && lightModeBtn && altModeBtn) {
  // Apply Dark Mode
  darkModeBtn.addEventListener("click", () => {
    document.body.classList.remove("light-mode", "alt-mode");
    document.body.classList.add("dark-mode");
  });

  // Apply Light Mode
  lightModeBtn.addEventListener("click", () => {
    document.body.classList.remove("dark-mode", "alt-mode");
    document.body.classList.add("light-mode");
  });

  // Apply Alternate Mode
  altModeBtn.addEventListener("click", () => {
    document.body.classList.remove("dark-mode", "light-mode");
    document.body.classList.add("alt-mode");
  });
} else {
  console.error("One or more theme switch buttons not found.");
}

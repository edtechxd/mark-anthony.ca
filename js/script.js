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
"📱 doom-scroll-tap… Rotting",
"📱 type-type-click… Sending Emails",
"📱 click-tap… Join Meeting",
"📱 clickity-click-click… Texting",

"🧘🏾‍♂️ Wellness: Meditating",
"🧘🏾‍♂️ Wellness: Yoga",
"🧘🏾‍♂️ Wellness: Plant dadding",
"🧘🏾‍♂️ Wellness: Brush Lettering",
"🧘🏾‍♂️ Wellness: Walking",
    
"📚 Reading: Ikigai",
"📚 Reading: Zen in the Art of Archery",
"📚 Reading: The Book of Ichigo Ichie",
"📚 Reading: Clarity & Connection",
"📚 Reading: 1984",
    
"🎧 Listening: MF DOOM",
"🎧 Listening: André 3000",
"🎧 Listening: 80's Pop",
"🎧 Listening: 90's RnB",
"🎧 Listening: De La Soul",
"🎧 Listening: Wu Tang Clan",
"🎧 Listening: Coldplay",
"🎧 Listening: Cordae",
"🎧 Listening: Tracy Chapman",
"🎧 Listening: Nas",
"🎧 Listening: Anita Baker",

"🏃🏾‍➡️ Running: Peloton 30 min HIIT",
"🏃🏾‍➡️ Running: 45min LIT",
"🏃🏾‍➡️ Running: 5km Pace",
    
"👟 Wearing: Air Max '95",
"👟 Wearing: New Balance 540",
"👟 Wearing: Nike Air Huarache",
"👟 Wearing: Flip-flops & Socks",
    
"👨🏾‍🏫 Teaching: Typography 1",
"👨🏾‍🏫 Teaching: Entrepreneurship",
"👨🏾‍🏫 Teaching: Portfolio",

"👨🏾‍💻 Working: Grading Assignments",
"👨🏾‍💻 Working: Designing a Web App",
"👨🏾‍💻 Working: Creating Lesson Plans",
"👨🏾‍💻 Working: Designing a Typeface",

"✍🏾 Writing: GenAI Research Paper",
"✍🏾 Writing: Design Tutorials",
"✍🏾 Writing: Design Blog",
"✍🏾 Writing: Journal",

"📺 Watching: UFO Documentaries",
"📺 Watching: Golden Girls",
"📺 Watching: Abbott Elementary",
"📺 Watching: Avatar The Last Airbender",
"📺 Watching: Batman, Dark Knight",
"📺 Watching: Fresh Prince of Bel Air",

"🎙️ Podcasting: How'd We Get Here?…",
"🎙️ Podcasting: How'd We Get Here?…",
    
"🎮 Playing: Mike Tyson's Punch-Out!!",
"🎮 Playing: NBA 2k",
"🎮 Playing: Gran Turismo",
];

function updateTicker() {
  const ticker = document.getElementById("ticker");
  if (ticker) {
    // Select a random index from the tickerTexts array
    const randomIndex = Math.floor(Math.random() * tickerTexts.length);
    ticker.innerHTML = tickerTexts[randomIndex];
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
  console.log("Alt mode activated:", document.body.classList);
});
} else {
  console.error("One or more theme switch buttons not found.");
}

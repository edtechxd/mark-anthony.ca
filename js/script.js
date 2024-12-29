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

// STATUS TICKER
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



// SH*T I SAY DAILY QUOTES
const quotes = [
"On a quest to design a low-fi life in a high-tech world.",
"You're always doing better than you think.",
"Sky's the view, not the limit.",
"A candle loses nothing by lighting another candle.",
"Here, now.",
"Take breaks, or your body will take one for you.",
"Be a leader in your journey and a willing passanger in someone else's.", 
"Windshields are bigger than rear-views for a reason.",
"When it seems like things are falling apart, they might actually be falling into place.",
"Don't let the job get in the way of doing the work.",
"We are remembered most for how we make others feel.",
"I am as many teachers as I have students.",
"We're not all in the same boat. Some of us have rafts and others have yachts.",
"You can either give back what you've recieved or give what you've always wanted.",
"I wouldn't be what I am today without imagination.",
"You are the most important project you'll ever work on.",
"Education for some can be a means of survival.",
"Without U, there is no Us.",
"I am not what I do. I do what I am.",
"Never cut the process for the progress.",
"They say hard work beats talent any day, so I made hard work my talent.",
"Success is relative.",
"Confidence comes when you compete with yourself and not with others.",
"I might be late, but I'm always on time.",
"Listen to your mind for what you need, your heart for what you want, and your soul for where you need to be.",
"You are YOUnique.",
"Never dim yoru light for anyone.",
"I love you more today than I did yesterday, and less than I will tomorrow.",
"Be.",
];

// Function to get a random quote for the day
function getRandomDailyQuote() {
  const date = new Date();
  const seed = date.getDate(); // Use the day of the month as a seed
  const randomIndex = seed % quotes.length; // Ensure the quote is consistent for the day
  return `"${quotes[randomIndex]}"`; // Add quotation marks around the quote
}

// Update the ticker with the random daily quote
document.getElementById("daily-quote").innerText = getRandomDailyQuote();



// THEME SWITCHER
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

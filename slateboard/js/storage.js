// SlateBoard Storage & Creator Passkey Session (No Google Auth, No File Uploads)
const SlateStorage = (() => {
  const SESSION_KEY = "slateboard_creator_session_v1";
  const BOARDS_KEY = "slateboard_boards_v1";
  const THEME_KEY = "slateboard_theme_v1";

  function hashPasskey(name, passkey) {
    const raw = `${name.trim().toLowerCase()}::${passkey.trim()}`;
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return "creator_" + (hash >>> 0).toString(16);
  }

  function getSession() {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    // Default local guest creator session so users can test immediately
    const fallback = {
      creatorId: "creator_guest_local",
      displayName: "Guest Creator"
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(fallback));
    return fallback;
  }

  function setSession(displayName, passkey) {
    const cleanName = displayName.trim() || "Creator";
    const session = {
      creatorId: hashPasskey(cleanName, passkey),
      displayName: cleanName
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    return getSession();
  }

  function seedDefaultBoards(creatorId, creatorName) {
    const sample = [
      {
        id: "board_welcome_2026",
        title: "Design Critique & Visual References",
        description: "Share external image links, YouTube/Vimeo breakdowns, and self-hosted PDFs for peer feedback.",
        ownerId: creatorId,
        ownerName: creatorName,
        visibility: "public",
        password: "",
        archived: false,
        createdAt: Date.now() - 86400000,
        posts: [
          {
            id: "post_welcome_1",
            title: "Welcome to SlateBoard (Pinned Guide)",
            type: "note",
            url: "",
            body: "All media on this board stays hosted on your own links (Google Drive, Dropbox, GitHub, YouTube, or Vimeo). Add a post or leave a comment below!",
            authorName: creatorName,
            authorId: creatorId,
            pinned: true,
            createdAt: Date.now() - 82000000,
            comments: [
              {
                id: "c_1",
                authorName: "Peer Reviewer",
                text: "Clean layout! Love that our files stay on our own cloud drives.",
                createdAt: Date.now() - 3600000
              }
            ]
          }
        ]
      }
    ];
    saveAllBoards(sample);
    return sample;
  }

  function getAllBoards() {
    try {
      const raw = localStorage.getItem(BOARDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    const session = getSession();
    return seedDefaultBoards(session.creatorId, session.displayName);
  }

  function saveAllBoards(boards) {
    localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  }

  return {
    getSession,
    setSession,
    clearSession,
    getAllBoards,
    saveAllBoards,
    getTheme,
    setTheme
  };
})();

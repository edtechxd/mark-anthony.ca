// ==========================================================================
// SlateBoard Storage, Creator Passkey Identity & Shared State Engine
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { renderDashboard, initBoardEvents } from "./boards.js";
import { renderBoardCanvas, initPostEvents } from "./posts.js";

/**
 * OPTIONAL SHARED FIRESTORE CONFIG (NO GOOGLE AUTH REQUIRED)
 * Leave apiKey as "YOUR_FIREBASE_API_KEY" to persist boards/posts/comments
 * purely in browser LocalStorage, or paste a Firebase Web config to sync
 * shared boards across devices via Firestore without Google Sign-In.
 */
export const optionalSharedFirebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const MAX_ACTIVE_BOARDS = 10;
export const STORAGE_KEYS = {
  session: "slateboard_v2_session",
  data: "slateboard_v2_data"
};

export const dbEnv = {
  db: null,
  useFirestore: false,
  collectionPrefix: "slateboard_passkey_v2"
};

export const state = {
  user: null, // { uid, displayName, passkeyHint, avatar }
  boards: [],
  posts: [],
  comments: [],
  activeTab: "active", // "active" | "archived" | "public"
  searchQuery: "",
  currentBoardId: null,
  unlockedBoardIds: new Set(),
  sortOrder: "newest", // "newest" | "oldest" | "alpha"
  mediaFilter: "all",
  selectedMediaType: "none",
  unsubBoards: null,
  unsubPosts: null,
  unsubComments: null
};

export function getSeedData(uid = "creator-sample-demo", name = "Jordan Vance") {
  const now = Date.now();
  return {
    boards: [
      {
        id: "board-web-arch",
        title: "External Media & Study Links Demo",
        description: "Example board showing self-hosted external images, video links, and PDF links with peer comments.",
        creatorId: uid,
        creatorName: name,
        visibility: "public",
        password: "",
        archived: false,
        createdAt: now - 86400000 * 2
      },
      {
        id: "board-study-vault",
        title: "Private Study Group (Password: study2026)",
        description: "Private board protected by a board password. Share the link and password with your peers.",
        creatorId: uid,
        creatorName: name,
        visibility: "private",
        password: "study2026",
        archived: false,
        createdAt: now - 86400000 * 1
      }
    ],
    posts: [
      {
        id: "post-pinned-1",
        boardId: "board-web-arch",
        title: "Pinned: How External Media Links Work on SlateBoard",
        body: "Paste URLs from your own hosting (GitHub, Google Drive, Dropbox, CDN, YouTube/Vimeo, or direct HTTPS links). SlateBoard never stores your uploaded files.",
        mediaType: "image",
        mediaUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
        mediaName: "external-link-diagram.jpg",
        authorId: uid,
        authorName: name,
        authorAvatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}`,
        pinned: true,
        createdAt: now - 54000000
      },
      {
        id: "post-video-1",
        boardId: "board-web-arch",
        title: "Lecture Walkthrough Video Link",
        body: "External YouTube/Vimeo or MP4 video link embedded cleanly inside the board card.",
        mediaType: "video",
        mediaUrl: "https://www.youtube.com/watch?v=vYp4LYbnnW8",
        mediaName: "Video Lecture",
        authorId: "peer-sam",
        authorName: "Samira Patel",
        authorAvatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Samira",
        pinned: false,
        createdAt: now - 24000000
      },
      {
        id: "post-pdf-1",
        boardId: "board-web-arch",
        title: "Sample External PDF Study Sheet",
        body: "Linked directly to an external PDF URL so board owners retain full control over their documents.",
        mediaType: "pdf",
        mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        mediaName: "Sample_Study_Guide.pdf",
        authorId: uid,
        authorName: name,
        authorAvatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}`,
        pinned: false,
        createdAt: now - 10000000
      }
    ],
    comments: [
      {
        id: "comm-seed-1",
        postId: "post-pinned-1",
        boardId: "board-web-arch",
        text: "Love that we can host PDFs on our own Google Drive or GitHub repo and just link them here.",
        authorId: "peer-sam",
        authorName: "Samira Patel",
        authorAvatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Samira",
        createdAt: now - 20000000
      }
    ]
  };
}

// ==================== LOCAL STORAGE PERSISTENCE ====================
function persistLocalData() {
  try {
    const payload = {
      boards: state.boards,
      posts: state.posts,
      comments: state.comments
    };
    localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(payload));
  } catch (err) {
    console.warn("LocalStorage save error:", err);
  }
}

function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.data);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.boards)) {
      return {
        boards: parsed.boards,
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        comments: Array.isArray(parsed.comments) ? parsed.comments : []
      };
    }
  } catch (err) {
    console.warn("LocalStorage read error:", err);
  }
  return null;
}

function persistSession(sessionObj) {
  try {
    if (sessionObj) {
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(sessionObj));
    } else {
      localStorage.removeItem(STORAGE_KEYS.session);
    }
  } catch (err) {
    console.warn("Session storage error:", err);
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Deterministic non-cryptographic hash to derive a consistent creatorId
 * from displayName + passkey without needing an auth server.
 */
export async function deriveCreatorId(displayName, passkey) {
  const input = `${displayName.trim().toLowerCase()}::${passkey}`;
  if (window.crypto && window.crypto.subtle) {
    const buf = new TextEncoder().encode(input);
    const hashBuf = await window.crypto.subtle.digest("SHA-256", buf);
    const hex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return "pk_" + hex.slice(0, 16);
  }
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return "pk_" + (h >>> 0).toString(16);
}

// ==================== SHARED UI & UTILITY HELPERS ====================
export function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  const colors = {
    info: "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-slate-200",
    success: "bg-emerald-600 text-white border-emerald-500",
    warning: "bg-amber-600 text-white border-amber-500",
    error: "bg-rose-600 text-white border-rose-500"
  };

  toast.className = `pointer-events-auto px-4 py-3 rounded-2xl text-xs font-semibold shadow-xl border flex items-center justify-between gap-3 animate-in ${colors[type] || colors.info}`;
  toast.innerHTML = `<span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(6px)";
    toast.style.transition = "all 0.2s ease";
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

export function escapeHTML(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatTimeAgo(ts) {
  if (!ts) return "Just now";
  const diff = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function copyTextFallback(text, successMsg = "Copied to clipboard!") {
  const temp = document.createElement("textarea");
  temp.value = text;
  temp.style.position = "fixed";
  temp.style.opacity = "0";
  document.body.appendChild(temp);
  temp.select();
  try {
    document.execCommand("copy");
    showToast(successMsg, "success");
  } catch (err) {
    showToast("Could not copy automatically. Please copy manually.", "warning");
  }
  document.body.removeChild(temp);
}

export function openConfirmModal(title, message, onConfirm) {
  const modal = document.getElementById("confirmActionModal");
  document.getElementById("confirmModalTitle").textContent = title;
  document.getElementById("confirmModalMessage").textContent = message;
  modal.classList.remove("hidden");

  const cancelBtn = document.getElementById("confirmCancelBtn");
  const proceedBtn = document.getElementById("confirmProceedBtn");

  const cleanup = () => {
    modal.classList.add("hidden");
    cancelBtn.onclick = null;
    proceedBtn.onclick = null;
  };

  cancelBtn.onclick = cleanup;
  proceedBtn.onclick = () => {
    cleanup();
    onConfirm();
  };
}

// ==================== STORAGE WRITE HELPERS (LOCAL + OPTIONAL FIRESTORE) ====================
export async function saveBoardRecord(board, isNew = false) {
  if (isNew) {
    state.boards.unshift(board);
  }
  persistLocalData();

  if (dbEnv.useFirestore && dbEnv.db) {
    const ref = doc(dbEnv.db, dbEnv.collectionPrefix, "public", "boards", board.id);
    if (isNew) {
      await setDoc(ref, board);
    } else {
      await updateDoc(ref, board);
    }
  }
}

export async function removeBoardRecord(boardId) {
  state.boards = state.boards.filter((b) => b.id !== boardId);
  state.posts = state.posts.filter((p) => p.boardId !== boardId);
  state.comments = state.comments.filter((c) => c.boardId !== boardId);
  persistLocalData();

  if (dbEnv.useFirestore && dbEnv.db) {
    await deleteDoc(doc(dbEnv.db, dbEnv.collectionPrefix, "public", "boards", boardId));
  }
}

export async function savePostRecord(post, isNew = false) {
  if (isNew) {
    state.posts.unshift(post);
  }
  persistLocalData();

  if (dbEnv.useFirestore && dbEnv.db) {
    const ref = doc(dbEnv.db, dbEnv.collectionPrefix, "public", "posts", post.id);
    if (isNew) {
      await setDoc(ref, post);
    } else {
      await updateDoc(ref, post);
    }
  }
}

export async function removePostRecord(postId) {
  state.posts = state.posts.filter((p) => p.id !== postId);
  state.comments = state.comments.filter((c) => c.postId !== postId);
  persistLocalData();

  if (dbEnv.useFirestore && dbEnv.db) {
    await deleteDoc(doc(dbEnv.db, dbEnv.collectionPrefix, "public", "posts", postId));
  }
}

export async function saveCommentRecord(comment) {
  state.comments.push(comment);
  persistLocalData();

  if (dbEnv.useFirestore && dbEnv.db) {
    await setDoc(doc(dbEnv.db, dbEnv.collectionPrefix, "public", "comments", comment.id), comment);
  }
}

export async function removeCommentRecord(commentId) {
  state.comments = state.comments.filter((c) => c.id !== commentId);
  persistLocalData();

  if (dbEnv.useFirestore && dbEnv.db) {
    await deleteDoc(doc(dbEnv.db, dbEnv.collectionPrefix, "public", "comments", commentId));
  }
}

function attachFirestoreListeners() {
  if (!dbEnv.useFirestore || !dbEnv.db) return;
  if (state.unsubBoards) state.unsubBoards();
  if (state.unsubPosts) state.unsubPosts();
  if (state.unsubComments) state.unsubComments();

  state.unsubBoards = onSnapshot(
    collection(dbEnv.db, dbEnv.collectionPrefix, "public", "boards"),
    (snap) => {
      state.boards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      persistLocalData();
      renderDashboard();
      if (state.currentBoardId) renderBoardCanvas();
    }
  );

  state.unsubPosts = onSnapshot(
    collection(dbEnv.db, dbEnv.collectionPrefix, "public", "posts"),
    (snap) => {
      state.posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      persistLocalData();
      if (state.currentBoardId) renderBoardCanvas();
    }
  );

  state.unsubComments = onSnapshot(
    collection(dbEnv.db, dbEnv.collectionPrefix, "public", "comments"),
    (snap) => {
      state.comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      persistLocalData();
      if (state.currentBoardId) renderBoardCanvas();
    }
  );
}

// ==================== ROUTING & VIEW SWITCHING ====================
export function getBoardIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("board")) return params.get("board");
  if (window.location.hash.startsWith("#board=")) {
    return window.location.hash.replace("#board=", "").trim();
  }
  return null;
}

export function navigateToBoard(boardId) {
  state.currentBoardId = boardId;
  const url = new URL(window.location.href);
  url.searchParams.set("board", boardId);
  window.history.pushState({}, "", url);
  handleRoute();
}

export function navigateToDashboard() {
  state.currentBoardId = null;
  const url = new URL(window.location.href);
  url.searchParams.delete("board");
  url.hash = "";
  window.history.pushState({}, "", url);
  handleRoute();
}

export function handleRoute() {
  const urlBoardId = getBoardIdFromUrl();
  if (urlBoardId) {
    state.currentBoardId = urlBoardId;
  }

  const heroView = document.getElementById("welcomeHeroView");
  const dashView = document.getElementById("dashboardView");
  const lockView = document.getElementById("passwordGateView");
  const canvasView = document.getElementById("boardCanvasView");
  const breadcrumb = document.getElementById("boardBreadcrumb");

  heroView.classList.add("hidden");
  dashView.classList.add("hidden");
  lockView.classList.add("hidden");
  canvasView.classList.add("hidden");
  breadcrumb.classList.add("hidden");

  if (state.currentBoardId) {
    const board = state.boards.find((b) => b.id === state.currentBoardId);
    if (!board) {
      showToast("Board not found in local or shared storage.", "error");
      navigateToDashboard();
      return;
    }

    const isCreator = state.user && board.creatorId === state.user.uid;
    const requiresPassword = Boolean(board.password && board.password.trim().length > 0);
    const isUnlocked = isCreator || !requiresPassword || state.unlockedBoardIds.has(board.id);

    if (!isUnlocked) {
      document.getElementById("lockedBoardTitle").textContent = board.title;
      document.getElementById("boardPasswordInput").value = "";
      document.getElementById("passwordErrorMsg").classList.add("hidden");
      lockView.classList.remove("hidden");
      return;
    }

    breadcrumb.classList.remove("hidden");
    document.getElementById("navCurrentBoardTitle").textContent = board.title;
    canvasView.classList.remove("hidden");
    renderBoardCanvas();
  } else if (!state.user) {
    heroView.classList.remove("hidden");
  } else {
    dashView.classList.remove("hidden");
    renderDashboard();
  }
}

// ==================== CREATOR PASSKEY SESSION ====================
export function renderAuthUI() {
  const signedOutEl = document.getElementById("signedOutControls");
  const signedInEl = document.getElementById("signedInControls");

  if (state.user) {
    signedOutEl.classList.add("hidden");
    signedInEl.classList.remove("hidden");
    signedInEl.classList.add("flex");
    document.getElementById("userAvatar").src = state.user.avatar;
    document.getElementById("userDisplayName").textContent = state.user.displayName;
    document.getElementById("userRoleBadge").textContent = `Passkey ID • ${state.user.uid.slice(0, 8)}`;
  } else {
    signedOutEl.classList.remove("hidden");
    signedInEl.classList.add("hidden");
    signedInEl.classList.remove("flex");
  }
}

export async function startPasskeySession(displayName, passkey) {
  const cleanName = displayName.trim();
  const uid = await deriveCreatorId(cleanName, passkey);
  const session = {
    uid,
    displayName: cleanName,
    avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(cleanName + uid)}`
  };
  state.user = session;
  persistSession(session);
  renderAuthUI();
  handleRoute();
  showToast(`Welcome, ${cleanName}!`, "success");
}

export function endPasskeySession() {
  state.user = null;
  state.currentBoardId = null;
  persistSession(null);
  window.history.replaceState({}, "", window.location.pathname);
  renderAuthUI();
  handleRoute();
  showToast("Creator session ended", "info");
}

function initGlobalEvents() {
  document.getElementById("themeToggleBtn").addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("slateboard-theme", isDark ? "dark" : "light");
  });

  const openPasskeyModal = () => {
    document.getElementById("creatorPasskeyModal").classList.remove("hidden");
    document.getElementById("creatorNameInput").focus();
  };

  document.getElementById("openCreatorSessionBtn").addEventListener("click", openPasskeyModal);
  document.getElementById("heroPasskeyBtn").addEventListener("click", openPasskeyModal);

  document.getElementById("heroQuickDemoBtn").addEventListener("click", async () => {
    await startPasskeySession("Jordan Vance", "demo-passkey-2026");
  });

  document.getElementById("creatorPasskeyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("creatorNameInput").value;
    const key = document.getElementById("creatorPasskeyInput").value;
    if (!name.trim() || key.length < 4) return;
    document.getElementById("creatorPasskeyModal").classList.add("hidden");
    document.getElementById("creatorPasskeyForm").reset();
    await startPasskeySession(name, key);
  });

  document.getElementById("signOutBtn").addEventListener("click", endPasskeySession);

  document.getElementById("brandHomeBtn").addEventListener("click", navigateToDashboard);
  document.getElementById("backToDashBtn").addEventListener("click", navigateToDashboard);
  document.getElementById("mobileBackBtn").addEventListener("click", navigateToDashboard);
  window.addEventListener("popstate", handleRoute);

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close-modal");
      document.getElementById(modalId).classList.add("hidden");
    });
  });
}

async function initApp() {
  if (localStorage.getItem("slateboard-theme") === "dark") {
    document.documentElement.classList.add("dark");
  }

  initGlobalEvents();
  initBoardEvents();
  initPostEvents();

  const savedData = loadLocalData();
  if (savedData) {
    state.boards = savedData.boards;
    state.posts = savedData.posts;
    state.comments = savedData.comments;
  } else {
    const seed = getSeedData();
    state.boards = seed.boards;
    state.posts = seed.posts;
    state.comments = seed.comments;
    persistLocalData();
  }

  const hasFirestoreConfig =
    optionalSharedFirebaseConfig.apiKey &&
    optionalSharedFirebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY";

  if (hasFirestoreConfig) {
    try {
      const app = initializeApp(optionalSharedFirebaseConfig);
      dbEnv.db = getFirestore(app);
      dbEnv.useFirestore = true;
      document.getElementById("syncStatusText").textContent = "Shared Cloud DB";
      attachFirestoreListeners();
    } catch (err) {
      console.warn("Optional Firestore disabled, using browser storage:", err);
      dbEnv.useFirestore = false;
      document.getElementById("syncStatusText").textContent = "Local Browser Storage";
    }
  } else {
    dbEnv.useFirestore = false;
    document.getElementById("syncStatusText").textContent = "Local Browser Storage";
  }

  const savedSession = loadSession();
  if (savedSession && savedSession.uid && savedSession.displayName) {
    state.user = savedSession;
  }

  renderAuthUI();
  handleRoute();
}

window.addEventListener("DOMContentLoaded", initApp);
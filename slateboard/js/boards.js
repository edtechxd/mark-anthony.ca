// ==========================================================================
// SlateBoard Boards Management: 10-Board Quota, Archive, Visibility & Sharing
// ==========================================================================

import {
  MAX_ACTIVE_BOARDS,
  state,
  dbEnv,
  showToast,
  escapeHTML,
  formatTimeAgo,
  copyTextFallback,
  openConfirmModal,
  saveBoardRecord,
  removeBoardRecord,
  navigateToBoard,
  navigateToDashboard,
  handleRoute
} from "./storage.js";
import { renderBoardCanvas } from "./posts.js";

export function getUserActiveBoards() {
  if (!state.user) return [];
  return state.boards.filter((b) => b.creatorId === state.user.uid && !b.archived);
}

export function getUserArchivedBoards() {
  if (!state.user) return [];
  return state.boards.filter((b) => b.creatorId === state.user.uid && b.archived);
}

export function getPublicBoards() {
  return state.boards.filter((b) => b.visibility === "public" && !b.archived);
}

export function renderDashboard() {
  if (!state.user) return;

  const activeBoards = getUserActiveBoards();
  const archivedBoards = getUserArchivedBoards();
  const publicBoards = getPublicBoards();

  const activeCount = activeBoards.length;
  document.getElementById("activeCountText").textContent = `${activeCount} / ${MAX_ACTIVE_BOARDS} Active Boards`;
  document.getElementById("tabActiveCount").textContent = activeCount;
  document.getElementById("tabArchivedCount").textContent = archivedBoards.length;
  document.getElementById("tabPublicCount").textContent = publicBoards.length;

  const createBtn = document.getElementById("openCreateBoardBtn");
  const quotaBanner = document.getElementById("quotaLimitBanner");
  const quotaBadge = document.getElementById("boardQuotaBadge");

  if (activeCount >= MAX_ACTIVE_BOARDS) {
    createBtn.disabled = true;
    quotaBanner.classList.remove("hidden");
    quotaBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30";
  } else {
    createBtn.disabled = false;
    quotaBanner.classList.add("hidden");
    quotaBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20";
  }

  let list = activeBoards;
  if (state.activeTab === "archived") list = archivedBoards;
  if (state.activeTab === "public") list = publicBoards;

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
    );
  }

  list = [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const grid = document.getElementById("boardsGrid");
  const emptyState = document.getElementById("boardsEmptyState");
  grid.innerHTML = "";

  if (list.length === 0) {
    emptyState.classList.remove("hidden");
    document.getElementById("emptyStateTitle").textContent =
      state.activeTab === "archived"
        ? "No archived boards"
        : state.activeTab === "public"
        ? "No public boards found"
        : "No active boards yet";
    return;
  }
  emptyState.classList.add("hidden");

  list.forEach((board) => {
    const isOwner = board.creatorId === state.user.uid;
    const postCount = state.posts.filter((p) => p.boardId === board.id).length;
    const hasPwd = Boolean(board.password && board.password.trim());

    const card = document.createElement("div");
    card.className =
      "bento-card group rounded-3xl bg-white dark:bg-surfaceDark border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400/70 dark:hover:border-indigo-500/60 shadow-bento hover:shadow-bento-hover p-5 flex flex-col justify-between gap-4";

    card.innerHTML = `
      <div class="space-y-3 cursor-pointer" data-open-board="${board.id}">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              board.visibility === "public"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-slate-500/15 text-slate-600 dark:text-slate-300"
            }">
              ${board.visibility === "public" ? "Public" : "Private"}
            </span>
            ${hasPwd ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">Protected</span>` : ""}
            ${board.archived ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-300">Archived</span>` : ""}
          </div>
          <span class="text-[11px] text-slate-400">${formatTimeAgo(board.createdAt)}</span>
        </div>

        <div>
          <h3 class="font-display font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-1">${escapeHTML(board.title)}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 min-h-[32px]">${escapeHTML(board.description || "No description provided.")}</p>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div class="text-[11px] text-slate-500 dark:text-slate-400">
          <span class="font-semibold text-slate-700 dark:text-slate-200">${postCount}</span> posts • by ${escapeHTML(board.creatorName || "Creator")}
        </div>

        <div class="flex items-center gap-1.5">
          <button data-open-board="${board.id}" type="button" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition">
            Open
          </button>
          ${
            isOwner
              ? `
            <button data-archive-board="${board.id}" type="button" title="${board.archived ? "Restore to Active" : "Archive Board"}" class="p-1.5 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-500/10 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>
            </button>
            <button data-delete-board="${board.id}" type="button" title="Delete Board" class="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          `
              : ""
          }
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-open-board]").forEach((el) => {
    el.addEventListener("click", () => navigateToBoard(el.getAttribute("data-open-board")));
  });

  grid.querySelectorAll("[data-archive-board]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleBoardArchive(btn.getAttribute("data-archive-board"));
    });
  });

  grid.querySelectorAll("[data-delete-board]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const boardId = btn.getAttribute("data-delete-board");
      openConfirmModal(
        "Delete Board Permanently?",
        "All posts and peer comments inside this board will be removed.",
        () => deleteBoard(boardId)
      );
    });
  });
}

async function createBoard(e) {
  e.preventDefault();
  if (!state.user) return;

  if (getUserActiveBoards().length >= MAX_ACTIVE_BOARDS) {
    showToast("You have reached the 10 active boards limit. Archive or delete one first.", "warning");
    return;
  }

  const title = document.getElementById("newBoardTitle").value.trim();
  const description = document.getElementById("newBoardDesc").value.trim();
  const visibility = document.getElementById("newBoardVisibility").value;
  const password = document.getElementById("newBoardPassword").value.trim();
  if (!title) return;

  const boardId = "board-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  const newBoard = {
    id: boardId,
    title,
    description,
    visibility,
    password,
    archived: false,
    creatorId: state.user.uid,
    creatorName: state.user.displayName,
    createdAt: Date.now()
  };

  await saveBoardRecord(newBoard, true);
  renderDashboard();

  document.getElementById("createBoardForm").reset();
  document.getElementById("createBoardModal").classList.add("hidden");
  showToast("Board created!", "success");
  navigateToBoard(boardId);
}

export async function toggleBoardArchive(boardId) {
  const board = state.boards.find((b) => b.id === boardId);
  if (!board) return;

  if (board.archived && getUserActiveBoards().length >= MAX_ACTIVE_BOARDS) {
    showToast("Cannot unarchive: You already have 10 active boards. Archive or delete another board first.", "warning");
    return;
  }

  const nextArchived = !board.archived;
  board.archived = nextArchived;
  await saveBoardRecord({ id: board.id, archived: nextArchived }, false);
  renderDashboard();
  if (state.currentBoardId === boardId) renderBoardCanvas();
  showToast(nextArchived ? "Board archived (freed 1 active slot)" : "Board restored to active workspace", "success");
}

export async function deleteBoard(boardId) {
  await removeBoardRecord(boardId);
  showToast("Board deleted", "info");
  if (state.currentBoardId === boardId) {
    navigateToDashboard();
  } else {
    renderDashboard();
  }
}

export function initBoardEvents() {
  document.querySelectorAll(".dash-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeTab = tab.getAttribute("data-tab");
      document.querySelectorAll(".dash-tab").forEach((t) => {
        const isAct = t === tab;
        t.className = isAct
          ? "dash-tab active px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-surfaceDark text-slate-900 dark:text-white shadow-sm transition"
          : "dash-tab px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition";
      });
      renderDashboard();
    });
  });

  document.getElementById("boardSearchInput").addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderDashboard();
  });

  document.getElementById("openCreateBoardBtn").addEventListener("click", () => {
    if (getUserActiveBoards().length >= MAX_ACTIVE_BOARDS) {
      showToast("Maximum 10 active boards reached. Archive or delete one first.", "warning");
      return;
    }
    document.getElementById("createBoardModal").classList.remove("hidden");
  });

  document.getElementById("createBoardForm").addEventListener("submit", createBoard);

  document.getElementById("unlockBoardForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const board = state.boards.find((b) => b.id === state.currentBoardId);
    if (!board) return;
    const entered = document.getElementById("boardPasswordInput").value;
    if (entered === board.password) {
      state.unlockedBoardIds.add(board.id);
      handleRoute();
      showToast("Board unlocked!", "success");
    } else {
      document.getElementById("passwordErrorMsg").classList.remove("hidden");
    }
  });

  document.getElementById("cancelUnlockBtn").addEventListener("click", navigateToDashboard);

  document.getElementById("boardSettingsBtn").addEventListener("click", () => {
    const board = state.boards.find((b) => b.id === state.currentBoardId);
    if (!board) return;
    document.getElementById("editBoardTitle").value = board.title;
    document.getElementById("editBoardDesc").value = board.description || "";
    document.getElementById("editBoardVisibility").value = board.visibility || "public";
    document.getElementById("editBoardPassword").value = board.password || "";
    document.getElementById("toggleArchiveBoardBtn").textContent = board.archived
      ? "Restore to Active Boards"
      : "Archive Board";
    document.getElementById("boardSettingsModal").classList.remove("hidden");
  });

  document.getElementById("boardSettingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const board = state.boards.find((b) => b.id === state.currentBoardId);
    if (!board) return;

    const updates = {
      title: document.getElementById("editBoardTitle").value.trim(),
      description: document.getElementById("editBoardDesc").value.trim(),
      visibility: document.getElementById("editBoardVisibility").value,
      password: document.getElementById("editBoardPassword").value.trim()
    };

    Object.assign(board, updates);
    await saveBoardRecord({ id: board.id, ...updates }, false);
    renderBoardCanvas();

    document.getElementById("boardSettingsModal").classList.add("hidden");
    showToast("Board settings updated", "success");
  });

  document.getElementById("toggleArchiveBoardBtn").addEventListener("click", async () => {
    if (!state.currentBoardId) return;
    document.getElementById("boardSettingsModal").classList.add("hidden");
    await toggleBoardArchive(state.currentBoardId);
  });

  document.getElementById("deleteBoardBtn").addEventListener("click", () => {
    const boardId = state.currentBoardId;
    document.getElementById("boardSettingsModal").classList.add("hidden");
    openConfirmModal(
      "Delete This Board?",
      "This action cannot be undone. All posts and comments will be deleted.",
      () => deleteBoard(boardId)
    );
  });

  document.getElementById("shareBoardBtn").addEventListener("click", () => {
    const board = state.boards.find((b) => b.id === state.currentBoardId);
    if (!board) return;

    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("board", board.id);
    document.getElementById("shareLinkInput").value = shareUrl.toString();

    const hasPwd = Boolean(board.password && board.password.trim());
    document.getElementById("sharePrivacySummary").textContent = `${
      board.visibility === "public" ? "Public" : "Private"
    } • ${hasPwd ? "Password Protected" : "No Password Required"}`;

    const pwdBox = document.getElementById("sharePasswordBox");
    if (hasPwd) {
      pwdBox.classList.remove("hidden");
      document.getElementById("sharePasswordDisplay").value = board.password;
    } else {
      pwdBox.classList.add("hidden");
    }

    document.getElementById("shareBoardModal").classList.remove("hidden");
  });

  document.getElementById("copyShareLinkBtn").addEventListener("click", () => {
    copyTextFallback(document.getElementById("shareLinkInput").value, "Share link copied!");
  });

  document.getElementById("copySharePwdBtn").addEventListener("click", () => {
    copyTextFallback(document.getElementById("sharePasswordDisplay").value, "Board password copied!");
  });
}
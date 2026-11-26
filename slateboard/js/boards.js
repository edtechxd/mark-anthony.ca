// SlateBoard Boards Management (Cloud-Synced via Supabase)
const SlateBoards = (() => {
  const MAX_ACTIVE_BOARDS = 20;
  let currentFilter = "active";
  let cachedCreatorBoards = [];
  let unlockedPasswords = new Map();
  let pendingUnlockBoardId = null;

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function updateQuotaUI(myBoards) {
    const activeCount = myBoards.filter(b => !b.archived).length;
    const archivedCount = myBoards.filter(b => b.archived).length;

    document.getElementById("activeCount").textContent = activeCount;
    document.getElementById("archivedCount").textContent = archivedCount;
    document.getElementById("quotaText").textContent = `${activeCount} / ${MAX_ACTIVE_BOARDS} Active Boards`;

    const quotaPill = document.getElementById("quotaPill");
    const quotaBanner = document.getElementById("quotaBanner");
    const newBoardBtn = document.getElementById("newBoardBtn");

    if (activeCount >= MAX_ACTIVE_BOARDS) {
      quotaPill.classList.add("full");
      quotaBanner.classList.remove("hidden");
      newBoardBtn.disabled = true;
    } else {
      quotaPill.classList.remove("full");
      quotaBanner.classList.add("hidden");
      newBoardBtn.disabled = false;
    }
  }

  async function renderDashboard() {
    const grid = document.getElementById("boardsGrid");
    grid.innerHTML = `<div class="empty-state"><p>Loading boards...</p></div>`;

    try {
      cachedCreatorBoards = await SlateStorage.getCreatorBoards();
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<div class="empty-state"><h3>Database Connection Error</h3><p>${escapeHtml(err.message || "Check your Supabase URL and key in js/storage.js.")}</p></div>`;
      return;
    }

    updateQuotaUI(cachedCreatorBoards);
    const filtered = cachedCreatorBoards.filter(b =>
      currentFilter === "archived" ? b.archived : !b.archived
    );

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>No ${currentFilter} boards yet</h3>
          <p>${currentFilter === "active"
            ? 'Click <strong>+ New Board</strong> to create your first cloud-synced board.'
            : 'Archived boards appear here when you need to free up active board slots.'}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered
      .map(board => {
        const isPrivate = board.visibility === "private";
        const postCount = Number(board.post_count || 0);
        const dateStr = new Date(Number(board.created_at)).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric"
        });

        return `
          <article class="board-card" data-board-id="${escapeHtml(board.id)}">
            <div>
              <div class="board-card-top">
                <span class="pill ${isPrivate ? "pill-private" : "pill-public"}">
                  ${isPrivate ? "Private" : "Public"}
                </span>
                ${board.has_password ? '<span class="pill pill-lock">🔒 Protected</span>' : ""}
              </div>
              <h3>${escapeHtml(board.title)}</h3>
              <p>${escapeHtml(board.description || "No description provided.")}</p>
            </div>
            <div class="board-card-footer">
              <span>${postCount} ${postCount === 1 ? "post" : "posts"}</span>
              <span>${dateStr}</span>
            </div>
          </article>
        `;
      })
      .join("");

    grid.querySelectorAll(".board-card").forEach(card => {
      card.addEventListener("click", () => {
        openBoard(card.dataset.boardId);
      });
    });
  }

  async function openBoard(boardId, suppliedPassword = "") {
    const passwordToUse = suppliedPassword || unlockedPasswords.get(boardId) || "";
    let result;
    try {
      result = await SlateStorage.getBoardDetail(boardId, passwordToUse);
    } catch (err) {
      console.error(err);
      alert(`Could not load board from database: ${err.message || err}`);
      return;
    }

    if (!result || result.error === "not_found") {
      alert("Board not found.");
      showDashboard();
      return;
    }

    if (result.error === "private") {
      alert("This board is set to Private by its creator.");
      showDashboard();
      return;
    }

    if (result.error === "password_required" || result.error === "invalid_password") {
      pendingUnlockBoardId = boardId;
      document.getElementById("gateBoardName").textContent = result.title || "this board";
      document.getElementById("gatePasswordInput").value = "";
      document.getElementById("gateErrorText").classList.toggle("hidden", result.error !== "invalid_password");
      document.getElementById("passwordGateModal").classList.remove("hidden");
      return;
    }

    if (passwordToUse) {
      unlockedPasswords.set(boardId, passwordToUse);
    }

    const url = new URL(window.location.href);
    url.searchParams.set("board", result.id);
    window.history.replaceState({}, "", url);

    document.getElementById("dashboardView").classList.add("hidden");
    document.getElementById("boardView").classList.remove("hidden");

    SlatePosts.renderBoard(result);
  }

  function showDashboard() {
    const url = new URL(window.location.href);
    url.searchParams.delete("board");
    window.history.replaceState({}, "", url);

    document.getElementById("boardView").classList.add("hidden");
    document.getElementById("dashboardView").classList.remove("hidden");
    renderDashboard();
  }

  function openCreateModal() {
    const activeCount = cachedCreatorBoards.filter(b => !b.archived).length;
    if (activeCount >= MAX_ACTIVE_BOARDS) {
      alert(`You have reached the ${MAX_ACTIVE_BOARDS} active board limit. Archive or delete a board first.`);
      return;
    }

    document.getElementById("boardModalTitle").textContent = "Create New Board";
    document.getElementById("editBoardId").value = "";
    document.getElementById("boardTitleInput").value = "";
    document.getElementById("boardDescInput").value = "";
    document.getElementById("boardVisibilityInput").value = "public";
    document.getElementById("boardPasswordInput").value = "";
    document.getElementById("boardPasswordInput").placeholder = "Leave blank for no password";
    document.getElementById("boardDangerActions").classList.add("hidden");
    document.getElementById("boardModal").classList.remove("hidden");
  }

  function openEditModal(board) {
    document.getElementById("boardModalTitle").textContent = "Board Settings";
    document.getElementById("editBoardId").value = board.id;
    document.getElementById("boardTitleInput").value = board.title;
    document.getElementById("boardDescInput").value = board.description || "";
    document.getElementById("boardVisibilityInput").value = board.visibility || "public";
    document.getElementById("boardPasswordInput").value = "";
    document.getElementById("boardPasswordInput").placeholder = board.hasPassword
      ? "Enter new password (or leave blank to remove)"
      : "Leave blank for no password";

    const archiveBtn = document.getElementById("toggleArchiveBoardBtn");
    archiveBtn.textContent = board.archived ? "Unarchive Board" : "Archive Board";
    archiveBtn.dataset.archived = board.archived ? "1" : "0";
    document.getElementById("boardDangerActions").classList.remove("hidden");
    document.getElementById("boardModal").classList.remove("hidden");
  }

  function init() {
    document.querySelectorAll(".seg-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderDashboard();
      });
    });

    document.getElementById("newBoardBtn").addEventListener("click", openCreateModal);
    document.getElementById("backToDashboardBtn").addEventListener("click", showDashboard);
    document.getElementById("brandHomeBtn").addEventListener("click", showDashboard);

    document.getElementById("boardForm").addEventListener("submit", async e => {
      e.preventDefault();
      const saveBtn = document.getElementById("saveBoardBtn");
      const session = SlateStorage.getSession();
      const editId = document.getElementById("editBoardId").value;
      const title = document.getElementById("boardTitleInput").value.trim();
      const description = document.getElementById("boardDescInput").value.trim();
      const visibility = document.getElementById("boardVisibilityInput").value;
      const password = document.getElementById("boardPasswordInput").value.trim();
      if (!title) return;

      const boardId = editId || ("board_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
      const isArchived = editId ? document.getElementById("toggleArchiveBoardBtn").dataset.archived === "1" : false;

      if (saveBtn) saveBtn.disabled = true;
      try {
        const res = await SlateStorage.saveBoard({
          id: boardId,
          title,
          description,
          ownerId: session.creatorId,
          ownerName: session.displayName,
          visibility,
          password,
          archived: isArchived,
          createdAt: Date.now()
        });

        if (res && res.error === "limit_reached") {
          alert(`You have reached the ${MAX_ACTIVE_BOARDS} active board limit.`);
          return;
        }

        if (res && res.error === "unauthorized") {
          alert("Only the board owner can update this board.");
          return;
        }

        document.getElementById("boardModal").classList.add("hidden");
        await openBoard(boardId);
      } catch (err) {
        console.error(err);
        alert(`Failed to save board: ${err.message || err}`);
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    });

    document.getElementById("toggleArchiveBoardBtn").addEventListener("click", async () => {
      const editId = document.getElementById("editBoardId").value;
      const session = SlateStorage.getSession();
      const currentlyArchived = document.getElementById("toggleArchiveBoardBtn").dataset.archived === "1";

      try {
        const res = await SlateStorage.saveBoard({
          id: editId,
          title: document.getElementById("boardTitleInput").value.trim(),
          description: document.getElementById("boardDescInput").value.trim(),
          ownerId: session.creatorId,
          ownerName: session.displayName,
          visibility: document.getElementById("boardVisibilityInput").value,
          password: "__KEEP__",
          archived: !currentlyArchived
        });

        if (res && res.error === "limit_reached") {
          alert(`You already have ${MAX_ACTIVE_BOARDS} active boards. Archive or delete another board first.`);
          return;
        }

        document.getElementById("boardModal").classList.add("hidden");
        showDashboard();
      } catch (err) {
        console.error(err);
        alert(`Could not update archive status: ${err.message || err}`);
      }
    });

    document.getElementById("deleteBoardBtn").addEventListener("click", async () => {
      const editId = document.getElementById("editBoardId").value;
      if (!confirm("Delete this board and all its posts permanently?")) return;
      try {
        await SlateStorage.deleteBoard(editId);
        document.getElementById("boardModal").classList.add("hidden");
        showDashboard();
      } catch (err) {
        console.error(err);
        alert(`Could not delete board: ${err.message || err}`);
      }
    });

    document.getElementById("passwordGateForm").addEventListener("submit", async e => {
      e.preventDefault();
      const input = document.getElementById("gatePasswordInput").value;
      document.getElementById("passwordGateModal").classList.add("hidden");
      await openBoard(pendingUnlockBoardId, input);
    });

    document.getElementById("gateCancelBtn").addEventListener("click", () => {
      document.getElementById("passwordGateModal").classList.add("hidden");
      showDashboard();
    });
  }

  return {
    init,
    renderDashboard,
    openBoard,
    showDashboard,
    openEditModal
  };
})();
// SlateBoard Boards Management (Cloud-Synced via Supabase)
const SlateBoards = (() => {
  const MAX_ACTIVE_BOARDS = 20;
  let currentFilter = "active";
  let cachedCreatorBoards = [];
  let unlockedPasswords = new Map();
  let pendingUnlockBoardId = null;

  function $(id) {
    return document.getElementById(id);
  }

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

    if ($("activeCount")) $("activeCount").textContent = activeCount;
    if ($("archivedCount")) $("archivedCount").textContent = archivedCount;
    if ($("quotaText")) $("quotaText").textContent = `${activeCount} / ${MAX_ACTIVE_BOARDS} Active Boards`;

    const quotaPill = $("quotaPill");
    const quotaBanner = $("quotaBanner");
    const newBoardBtn = $("newBoardBtn");

    if (activeCount >= MAX_ACTIVE_BOARDS) {
      if (quotaPill) quotaPill.classList.add("full");
      if (quotaBanner) quotaBanner.classList.remove("hidden");
      if (newBoardBtn) newBoardBtn.disabled = true;
    } else {
      if (quotaPill) quotaPill.classList.remove("full");
      if (quotaBanner) quotaBanner.classList.add("hidden");
      if (newBoardBtn) newBoardBtn.disabled = false;
    }
  }

  async function renderDashboard() {
    const grid = $("boardsGrid");
    if (!grid) return;
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
      if ($("gateBoardName")) $("gateBoardName").textContent = result.title || "this board";
      if ($("gatePasswordInput")) $("gatePasswordInput").value = "";
      if ($("gateErrorText")) {
        $("gateErrorText").classList.toggle("hidden", result.error !== "invalid_password");
      }
      if ($("passwordGateModal")) $("passwordGateModal").classList.remove("hidden");
      return;
    }

    if (passwordToUse) {
      unlockedPasswords.set(boardId, passwordToUse);
    }

    const url = new URL(window.location.href);
    url.searchParams.set("board", result.id);
    window.history.replaceState({}, "", url);

    if ($("dashboardView")) $("dashboardView").classList.add("hidden");
    if ($("boardView")) $("boardView").classList.remove("hidden");

    SlatePosts.renderBoard(result);
  }

  function showDashboard() {
    const url = new URL(window.location.href);
    url.searchParams.delete("board");
    window.history.replaceState({}, "", url);

    if ($("boardView")) $("boardView").classList.add("hidden");
    if ($("dashboardView")) $("dashboardView").classList.remove("hidden");
    renderDashboard();
  }

  function openCreateModal() {
    const activeCount = cachedCreatorBoards.filter(b => !b.archived).length;
    if (activeCount >= MAX_ACTIVE_BOARDS) {
      alert(`You have reached the ${MAX_ACTIVE_BOARDS} active board limit. Archive or delete a board first.`);
      return;
    }

    if ($("boardModalTitle")) $("boardModalTitle").textContent = "Create New Board";
    if ($("editBoardId")) $("editBoardId").value = "";
    if ($("boardTitleInput")) $("boardTitleInput").value = "";
    if ($("boardDescInput")) $("boardDescInput").value = "";
    if ($("boardVisibilityInput")) $("boardVisibilityInput").value = "public";
    if ($("boardPasswordInput")) {
      $("boardPasswordInput").value = "";
      $("boardPasswordInput").placeholder = "Leave blank for no password";
    }
    if ($("boardDangerActions")) $("boardDangerActions").classList.add("hidden");
    if ($("boardModal")) $("boardModal").classList.remove("hidden");
  }

  function openEditModal(board) {
    if ($("boardModalTitle")) $("boardModalTitle").textContent = "Board Settings";
    if ($("editBoardId")) $("editBoardId").value = board.id;
    if ($("boardTitleInput")) $("boardTitleInput").value = board.title;
    if ($("boardDescInput")) $("boardDescInput").value = board.description || "";
    if ($("boardVisibilityInput")) $("boardVisibilityInput").value = board.visibility || "public";
    if ($("boardPasswordInput")) {
      $("boardPasswordInput").value = "";
      $("boardPasswordInput").placeholder = board.hasPassword
        ? "Enter new password (or leave blank to remove)"
        : "Leave blank for no password";
    }

    const archiveBtn = $("toggleArchiveBoardBtn");
    if (archiveBtn) {
      archiveBtn.textContent = board.archived ? "Unarchive Board" : "Archive Board";
      archiveBtn.dataset.archived = board.archived ? "1" : "0";
    }
    if ($("boardDangerActions")) $("boardDangerActions").classList.remove("hidden");
    if ($("boardModal")) $("boardModal").classList.remove("hidden");
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

    if ($("newBoardBtn")) $("newBoardBtn").addEventListener("click", openCreateModal);
    if ($("backToDashboardBtn")) $("backToDashboardBtn").addEventListener("click", showDashboard);
    if ($("brandHomeBtn")) $("brandHomeBtn").addEventListener("click", showDashboard);

    if ($("boardForm")) {
      $("boardForm").addEventListener("submit", async e => {
        e.preventDefault();
        const saveBtn = $("saveBoardBtn");
        const session = SlateStorage.getSession();
        const editId = $("editBoardId") ? $("editBoardId").value : "";
        const title = $("boardTitleInput") ? $("boardTitleInput").value.trim() : "";
        const description = $("boardDescInput") ? $("boardDescInput").value.trim() : "";
        const visibility = $("boardVisibilityInput") ? $("boardVisibilityInput").value : "public";
        const password = $("boardPasswordInput") ? $("boardPasswordInput").value.trim() : "";
        if (!title) return;

        const boardId = editId || ("board_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
        const archiveBtn = $("toggleArchiveBoardBtn");
        const isArchived = editId && archiveBtn ? archiveBtn.dataset.archived === "1" : false;

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

          if ($("boardModal")) $("boardModal").classList.add("hidden");
          await openBoard(boardId);
        } catch (err) {
          console.error(err);
          alert(`Failed to save board: ${err.message || err}`);
        } finally {
          if (saveBtn) saveBtn.disabled = false;
        }
      });
    }

    if ($("toggleArchiveBoardBtn")) {
      $("toggleArchiveBoardBtn").addEventListener("click", async () => {
        const editId = $("editBoardId") ? $("editBoardId").value : "";
        const session = SlateStorage.getSession();
        const archiveBtn = $("toggleArchiveBoardBtn");
        const currentlyArchived = archiveBtn ? archiveBtn.dataset.archived === "1" : false;

        try {
          const res = await SlateStorage.saveBoard({
            id: editId,
            title: $("boardTitleInput") ? $("boardTitleInput").value.trim() : "",
            description: $("boardDescInput") ? $("boardDescInput").value.trim() : "",
            ownerId: session.creatorId,
            ownerName: session.displayName,
            visibility: $("boardVisibilityInput") ? $("boardVisibilityInput").value : "public",
            password: "__KEEP__",
            archived: !currentlyArchived
          });

          if (res && res.error === "limit_reached") {
            alert(`You already have ${MAX_ACTIVE_BOARDS} active boards. Archive or delete another board first.`);
            return;
          }

          if ($("boardModal")) $("boardModal").classList.add("hidden");
          showDashboard();
        } catch (err) {
          console.error(err);
          alert(`Could not update archive status: ${err.message || err}`);
        }
      });
    }

    if ($("deleteBoardBtn")) {
      $("deleteBoardBtn").addEventListener("click", async () => {
        const editId = $("editBoardId") ? $("editBoardId").value : "";
        if (!editId || !confirm("Delete this board and all its posts permanently?")) return;
        try {
          await SlateStorage.deleteBoard(editId);
          if ($("boardModal")) $("boardModal").classList.add("hidden");
          showDashboard();
        } catch (err) {
          console.error(err);
          alert(`Could not delete board: ${err.message || err}`);
        }
      });
    }

    if ($("passwordGateForm")) {
      $("passwordGateForm").addEventListener("submit", async e => {
        e.preventDefault();
        const input = $("gatePasswordInput") ? $("gatePasswordInput").value : "";
        if ($("passwordGateModal")) $("passwordGateModal").classList.add("hidden");
        await openBoard(pendingUnlockBoardId, input);
      });
    }

    if ($("gateCancelBtn")) {
      $("gateCancelBtn").addEventListener("click", () => {
        if ($("passwordGateModal")) $("passwordGateModal").classList.add("hidden");
        showDashboard();
      });
    }
  }

  return {
    init,
    renderDashboard,
    openBoard,
    showDashboard,
    openEditModal
  };
})();
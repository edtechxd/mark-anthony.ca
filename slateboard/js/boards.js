// SlateBoard Boards Management (10-Board Limit, Archiving, Public/Private & Passwords)
const SlateBoards = (() => {
  const MAX_ACTIVE_BOARDS = 20;
  let currentFilter = "active";
  let unlockedBoards = new Set();
  let pendingUnlockBoardId = null;

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getCreatorBoards() {
    const session = SlateStorage.getSession();
    return SlateStorage.getAllBoards().filter(b => b.ownerId === session.creatorId);
  }

  function updateQuotaUI() {
    const myBoards = getCreatorBoards();
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

  function renderDashboard() {
    updateQuotaUI();
    const grid = document.getElementById("boardsGrid");
    const myBoards = getCreatorBoards().filter(b =>
      currentFilter === "archived" ? b.archived : !b.archived
    );

    if (myBoards.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>No ${currentFilter} boards yet</h3>
          <p>${currentFilter === "active"
            ? 'Click <strong>+ New Board</strong> to create your first collaborative board.'
            : 'Archived boards appear here when you need to free up active board slots.'}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = myBoards
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(board => {
        const isPrivate = board.visibility === "private";
        const hasPassword = Boolean(board.password && board.password.trim());
        const postCount = (board.posts || []).length;
        const dateStr = new Date(board.createdAt).toLocaleDateString(undefined, {
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
                ${hasPassword ? '<span class="pill pill-lock">🔒 Protected</span>' : ""}
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

  function openBoard(boardId) {
    const boards = SlateStorage.getAllBoards();
    const board = boards.find(b => b.id === boardId);
    if (!board) {
      alert("Board not found.");
      showDashboard();
      return;
    }

    const session = SlateStorage.getSession();
    const isOwner = board.ownerId === session.creatorId;

    if (board.visibility === "private" && !isOwner && !board.password) {
      alert("This board is set to Private by its creator.");
      showDashboard();
      return;
    }

    if (board.password && !isOwner && !unlockedBoards.has(board.id)) {
      pendingUnlockBoardId = board.id;
      document.getElementById("gateBoardName").textContent = board.title;
      document.getElementById("gatePasswordInput").value = "";
      document.getElementById("gateErrorText").classList.add("hidden");
      document.getElementById("passwordGateModal").classList.remove("hidden");
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("board", board.id);
    window.history.replaceState({}, "", url);

    document.getElementById("dashboardView").classList.add("hidden");
    document.getElementById("boardView").classList.remove("hidden");

    SlatePosts.renderBoard(board);
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
    const activeCount = getCreatorBoards().filter(b => !b.archived).length;
    if (activeCount >= MAX_ACTIVE_BOARDS) {
      alert("You have reached the 10 active board limit. Archive or delete a board first.");
      return;
    }

    document.getElementById("boardModalTitle").textContent = "Create New Board";
    document.getElementById("editBoardId").value = "";
    document.getElementById("boardTitleInput").value = "";
    document.getElementById("boardDescInput").value = "";
    document.getElementById("boardVisibilityInput").value = "public";
    document.getElementById("boardPasswordInput").value = "";
    document.getElementById("boardDangerActions").classList.add("hidden");
    document.getElementById("boardModal").classList.remove("hidden");
  }

  function openEditModal(board) {
    document.getElementById("boardModalTitle").textContent = "Board Settings";
    document.getElementById("editBoardId").value = board.id;
    document.getElementById("boardTitleInput").value = board.title;
    document.getElementById("boardDescInput").value = board.description || "";
    document.getElementById("boardVisibilityInput").value = board.visibility || "public";
    document.getElementById("boardPasswordInput").value = board.password || "";

    const archiveBtn = document.getElementById("toggleArchiveBoardBtn");
    archiveBtn.textContent = board.archived ? "Unarchive Board" : "Archive Board";
    document.getElementById("boardDangerActions").classList.remove("hidden");
    document.getElementById("boardModal").classList.remove("hidden");
  }

  function init() {
    // Segmented tabs
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

    // Save Board Form
    document.getElementById("boardForm").addEventListener("submit", e => {
      e.preventDefault();
      const session = SlateStorage.getSession();
      const boards = SlateStorage.getAllBoards();
      const editId = document.getElementById("editBoardId").value;

      const title = document.getElementById("boardTitleInput").value.trim();
      const description = document.getElementById("boardDescInput").value.trim();
      const visibility = document.getElementById("boardVisibilityInput").value;
      const password = document.getElementById("boardPasswordInput").value.trim();

      if (!title) return;

      if (editId) {
        const target = boards.find(b => b.id === editId);
        if (target && target.ownerId === session.creatorId) {
          target.title = title;
          target.description = description;
          target.visibility = visibility;
          target.password = password;
          SlateStorage.saveAllBoards(boards);
          document.getElementById("boardModal").classList.add("hidden");
          openBoard(target.id);
        }
      } else {
        const activeCount = getCreatorBoards().filter(b => !b.archived).length;
        if (activeCount >= MAX_ACTIVE_BOARDS) return;

        const newBoard = {
          id: "board_" + Date.now().toString(36),
          title,
          description,
          ownerId: session.creatorId,
          ownerName: session.displayName,
          visibility,
          password,
          archived: false,
          createdAt: Date.now(),
          posts: []
        };
        boards.push(newBoard);
        SlateStorage.saveAllBoards(boards);
        document.getElementById("boardModal").classList.add("hidden");
        openBoard(newBoard.id);
      }
    });

    // Archive / Unarchive
    document.getElementById("toggleArchiveBoardBtn").addEventListener("click", () => {
      const editId = document.getElementById("editBoardId").value;
      const boards = SlateStorage.getAllBoards();
      const target = boards.find(b => b.id === editId);
      if (!target) return;

      if (target.archived) {
        const activeCount = getCreatorBoards().filter(b => !b.archived).length;
        if (activeCount >= MAX_ACTIVE_BOARDS) {
          alert("You already have 10 active boards. Archive or delete another board before restoring this one.");
          return;
        }
      }

      target.archived = !target.archived;
      SlateStorage.saveAllBoards(boards);
      document.getElementById("boardModal").classList.add("hidden");
      showDashboard();
    });

    // Delete Board
    document.getElementById("deleteBoardBtn").addEventListener("click", () => {
      const editId = document.getElementById("editBoardId").value;
      if (!confirm("Delete this board and all its posts permanently?")) return;
      const filtered = SlateStorage.getAllBoards().filter(b => b.id !== editId);
      SlateStorage.saveAllBoards(filtered);
      document.getElementById("boardModal").classList.add("hidden");
      showDashboard();
    });

    // Password Gate
    document.getElementById("passwordGateForm").addEventListener("submit", e => {
      e.preventDefault();
      const input = document.getElementById("gatePasswordInput").value;
      const board = SlateStorage.getAllBoards().find(b => b.id === pendingUnlockBoardId);
      if (board && input === board.password) {
        unlockedBoards.add(board.id);
        document.getElementById("passwordGateModal").classList.add("hidden");
        openBoard(board.id);
      } else {
        document.getElementById("gateErrorText").classList.remove("hidden");
      }
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

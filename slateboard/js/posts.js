// SlateBoard Posts, Owner-Hosted Media Links, Pinned Items, Sorting & Cloud Comments
const SlatePosts = (() => {
  let currentBoard = null;

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeExternalMedia(type, rawUrl) {
    const url = (rawUrl || "").trim();
    if (!url) return { kind: "none", url: "" };

    const driveMatch =
      url.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
      url.match(/[?&]id=([^&]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      if (type === "image") {
        return { kind: "image", url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600` };
      }
      if (type === "pdf") {
        return { kind: "pdf", url: `https://drive.google.com/file/d/${fileId}/preview` };
      }
      return { kind: "iframe", url: `https://drive.google.com/file/d/${fileId}/preview` };
    }

    if (url.includes("dropbox.com")) {
      const direct = url
        .replace("www.dropbox.com", "dl.dropboxusercontent.com")
        .replace(/[?&]dl=0/, "");
      if (type === "image") return { kind: "image", url: direct };
      if (type === "pdf") return { kind: "pdf", url: direct };
    }

    if (type === "video") {
      const ytMatch = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/
      );
      if (ytMatch) {
        return { kind: "iframe", url: `https://www.youtube.com/embed/${ytMatch[1]}` };
      }
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return { kind: "iframe", url: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
      }
      return { kind: "video", url };
    }

    if (type === "image") return { kind: "image", url };
    if (type === "pdf") return { kind: "pdf", url };
    return { kind: "none", url };
  }

  function renderMediaBlock(post) {
    if (post.type === "note" || !post.url) return "";
    const media = normalizeExternalMedia(post.type, post.url);

    if (media.kind === "image") {
      return `
        <div class="post-media">
          <img src="${escapeHtml(media.url)}" alt="${escapeHtml(post.title)}" loading="lazy" data-lightbox-type="image" data-lightbox-url="${escapeHtml(media.url)}" data-lightbox-title="${escapeHtml(post.title)}" />
        </div>
      `;
    }

    if (media.kind === "iframe") {
      return `
        <div class="post-media">
          <iframe src="${escapeHtml(media.url)}" title="${escapeHtml(post.title)}" allowfullscreen loading="lazy"></iframe>
        </div>
      `;
    }

    if (media.kind === "video") {
      return `
        <div class="post-media">
          <video src="${escapeHtml(media.url)}" controls preload="metadata"></video>
        </div>
      `;
    }

    if (media.kind === "pdf") {
      return `
        <div class="post-media">
          <iframe class="pdf-frame" src="${escapeHtml(media.url)}" title="${escapeHtml(post.title)}" loading="lazy"></iframe>
          <div class="pdf-card-preview">
            <div class="pdf-badge">📄 PDF Document</div>
            <div style="display:flex;gap:6px;">
              <button class="mini-btn" type="button" data-lightbox-type="pdf" data-lightbox-url="${escapeHtml(media.url)}" data-lightbox-title="${escapeHtml(post.title)}">Expand</button>
              <a class="mini-btn" href="${escapeHtml(media.url)}" target="_blank" rel="noopener noreferrer">Open ↗</a>
            </div>
          </div>
        </div>
      `;
    }

    return "";
  }

  function sortPosts(posts, mode) {
    const copy = [...posts];
    if (mode === "alpha") {
      return copy.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" })
      );
    }
    if (mode === "oldest") {
      return copy.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
    }
    return copy.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }

  function renderPostCard(post, isOwner) {
    const dateStr = new Date(Number(post.createdAt)).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
    const comments = post.comments || [];

    return `
      <article class="post-card" data-post-id="${escapeHtml(post.id)}">
        ${renderMediaBlock(post)}
        <div class="post-body">
          <div class="post-header-row">
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
            ${isOwner ? `
              <div class="post-actions">
                <button class="mini-btn pin-toggle-btn" type="button" title="Pin or Unpin">${post.pinned ? "Unpin" : "📌 Pin"}</button>
                <button class="mini-btn delete-post-btn" type="button" title="Delete Post">✕</button>
              </div>
            ` : ""}
          </div>
          ${post.body ? `<p class="post-text">${escapeHtml(post.body)}</p>` : ""}
          <div class="post-meta">
            <span>By ${escapeHtml(post.authorName || "Peer")}</span>
            <span>${dateStr}</span>
          </div>
        </div>

        <div class="comments-box">
          <div class="comments-list">
            ${comments.map(c => `
              <div class="comment-item">
                <span class="comment-author">${escapeHtml(c.authorName)}:</span>
                <span>${escapeHtml(c.text)}</span>
              </div>
            `).join("")}
          </div>
          <form class="comment-form">
            <input type="text" placeholder="Add a comment..." required />
            <button type="submit" class="mini-btn">Post</button>
          </form>
        </div>
      </article>
    `;
  }

  function renderBoard(board) {
    currentBoard = board;
    const session = SlateStorage.getSession();
    const isOwner = board.ownerId === session.creatorId;

    document.getElementById("currentBoardTitle").textContent = board.title;
    document.getElementById("currentBoardDesc").textContent = board.description || "";

    const privacyBadge = document.getElementById("boardPrivacyBadge");
    privacyBadge.textContent = board.visibility === "private" ? "Private" : "Public";
    privacyBadge.className = `pill ${board.visibility === "private" ? "pill-private" : "pill-public"}`;

    const passBadge = document.getElementById("boardPasswordBadge");
    passBadge.classList.toggle("hidden", !board.hasPassword);

    document.querySelectorAll(".owner-only").forEach(el => {
      el.classList.toggle("hidden", !isOwner);
    });

    const sortMode = document.getElementById("sortSelect").value;
    const allPosts = board.posts || [];
    const pinnedPosts = sortPosts(allPosts.filter(p => p.pinned), sortMode);
    const regularPosts = sortPosts(allPosts.filter(p => !p.pinned), sortMode);

    const pinnedSection = document.getElementById("pinnedSection");
    const pinnedContainer = document.getElementById("pinnedContainer");
    if (pinnedPosts.length > 0) {
      pinnedSection.classList.remove("hidden");
      pinnedContainer.innerHTML = pinnedPosts.map(p => renderPostCard(p, isOwner)).join("");
    } else {
      pinnedSection.classList.add("hidden");
      pinnedContainer.innerHTML = "";
    }

    const postsGrid = document.getElementById("postsGrid");
    if (regularPosts.length === 0 && pinnedPosts.length === 0) {
      postsGrid.innerHTML = `
        <div class="empty-state">
          <h3>This board has no posts yet</h3>
          <p>Click <strong>+ Add Post</strong> to share a note, image link, video link, or self-hosted PDF.</p>
        </div>
      `;
    } else {
      postsGrid.innerHTML = regularPosts.map(p => renderPostCard(p, isOwner)).join("");
    }

    bindPostEvents();
  }

  function bindPostEvents() {
    document.querySelectorAll(".post-card").forEach(card => {
      const postId = card.dataset.postId;

      const pinBtn = card.querySelector(".pin-toggle-btn");
      if (pinBtn) {
        pinBtn.addEventListener("click", async () => {
          await SlateStorage.managePost(currentBoard.id, postId, "toggle_pin");
          await SlateBoards.openBoard(currentBoard.id);
        });
      }

      const delBtn = card.querySelector(".delete-post-btn");
      if (delBtn) {
        delBtn.addEventListener("click", async () => {
          if (!confirm("Remove this post?")) return;
          await SlateStorage.managePost(currentBoard.id, postId, "delete");
          await SlateBoards.openBoard(currentBoard.id);
        });
      }

      const commentForm = card.querySelector(".comment-form");
      commentForm.addEventListener("submit", async e => {
        e.preventDefault();
        const input = commentForm.querySelector("input");
        const text = input.value.trim();
        if (!text) return;

        const session = SlateStorage.getSession();
        await SlateStorage.addComment(postId, {
          id: "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          authorName: session.displayName,
          text,
          createdAt: Date.now()
        });
        await SlateBoards.openBoard(currentBoard.id);
      });

      card.querySelectorAll("[data-lightbox-url]").forEach(trigger => {
        trigger.addEventListener("click", () => {
          const lbType = trigger.dataset.lightboxType;
          const lbUrl = trigger.dataset.lightboxUrl;
          const lbTitle = trigger.dataset.lightboxTitle;
          document.getElementById("lightboxTitle").textContent = lbTitle || "Preview";
          const body = document.getElementById("lightboxBody");
          body.innerHTML =
            lbType === "pdf"
              ? `<iframe src="${escapeHtml(lbUrl)}"></iframe>`
              : `<img src="${escapeHtml(lbUrl)}" alt="${escapeHtml(lbTitle)}" />`;
          document.getElementById("lightboxModal").classList.remove("hidden");
        });
      });
    });
  }

  function init() {
    document.getElementById("sortSelect").addEventListener("change", () => {
      if (currentBoard) renderBoard(currentBoard);
    });

    document.getElementById("boardSettingsBtn").addEventListener("click", () => {
      if (currentBoard) SlateBoards.openEditModal(currentBoard);
    });

    document.getElementById("shareBoardBtn").addEventListener("click", () => {
      const shareUrl = `${window.location.origin}${window.location.pathname}?board=${encodeURIComponent(currentBoard.id)}`;
      document.getElementById("shareUrlInput").value = shareUrl;
      document.getElementById("shareModal").classList.remove("hidden");
    });

    document.getElementById("copyShareUrlBtn").addEventListener("click", async () => {
      const input = document.getElementById("shareUrlInput");
      input.select();
      try {
        await navigator.clipboard.writeText(input.value);
        document.getElementById("copyShareUrlBtn").textContent = "Copied!";
        setTimeout(() => {
          document.getElementById("copyShareUrlBtn").textContent = "Copy Link";
        }, 1600);
      } catch (_) {}
    });

    document.getElementById("newPostBtn").addEventListener("click", () => {
      document.getElementById("postTitleInput").value = "";
      document.getElementById("postTypeInput").value = "note";
      document.getElementById("postUrlInput").value = "";
      document.getElementById("postUrlField").classList.add("hidden");
      document.getElementById("postBodyInput").value = "";
      document.getElementById("postPinnedInput").checked = false;
      document.getElementById("postModal").classList.remove("hidden");
    });

    document.getElementById("postTypeInput").addEventListener("change", e => {
      const needsUrl = e.target.value !== "note";
      const urlField = document.getElementById("postUrlField");
      const urlInput = document.getElementById("postUrlInput");
      urlField.classList.toggle("hidden", !needsUrl);
      urlInput.required = needsUrl;
    });

    document.getElementById("postForm").addEventListener("submit", async e => {
      e.preventDefault();
      if (!currentBoard) return;
      const session = SlateStorage.getSession();
      const type = document.getElementById("postTypeInput").value;

      await SlateStorage.addPost(currentBoard.id, {
        id: "post_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        title: document.getElementById("postTitleInput").value.trim(),
        type,
        url: type === "note" ? "" : document.getElementById("postUrlInput").value.trim(),
        body: document.getElementById("postBodyInput").value.trim(),
        authorName: session.displayName,
        authorId: session.creatorId,
        pinned: document.getElementById("postPinnedInput").checked,
        createdAt: Date.now()
      });

      document.getElementById("postModal").classList.add("hidden");
      await SlateBoards.openBoard(currentBoard.id);
    });
  }

  return {
    init,
    renderBoard
  };
})();

// App Bootstrap
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = SlateStorage.getTheme();
  SlateStorage.setTheme(savedTheme);
  document.getElementById("themeIcon").textContent = savedTheme === "dark" ? "☀️" : "🌙";

  document.getElementById("themeToggleBtn").addEventListener("click", () => {
    const next = SlateStorage.getTheme() === "dark" ? "light" : "dark";
    SlateStorage.setTheme(next);
    document.getElementById("themeIcon").textContent = next === "dark" ? "☀️" : "🌙";
  });

  function syncSessionUI() {
    const session = SlateStorage.getSession();
    document.getElementById("openSessionBtn").textContent = session.displayName;
  }
  syncSessionUI();

  document.getElementById("openSessionBtn").addEventListener("click", () => {
    const session = SlateStorage.getSession();
    document.getElementById("creatorNameInput").value = session.displayName.startsWith("Guest Creator")
      ? ""
      : session.displayName;
    document.getElementById("creatorPasskeyInput").value = "";
    document.getElementById("sessionModal").classList.remove("hidden");
  });

  document.getElementById("sessionForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("creatorNameInput").value;
    const passkey = document.getElementById("creatorPasskeyInput").value;
    SlateStorage.setSession(name, passkey);
    syncSessionUI();
    document.getElementById("sessionModal").classList.add("hidden");
    SlateBoards.showDashboard();
  });

  document.getElementById("signOutBtn").addEventListener("click", () => {
    SlateStorage.clearSession();
    syncSessionUI();
    document.getElementById("sessionModal").classList.add("hidden");
    SlateBoards.showDashboard();
  });

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.close).classList.add("hidden");
    });
  });

  SlateBoards.init();
  SlatePosts.init();

  const params = new URLSearchParams(window.location.search);
  const sharedBoardId = params.get("board");
  if (sharedBoardId) {
    SlateBoards.openBoard(sharedBoardId);
  } else {
    SlateBoards.renderDashboard();
  }
});

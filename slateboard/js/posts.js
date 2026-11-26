// ==========================================================================
// SlateBoard Posts, Rich Media (Image/Video/PDF), Sorting, Pinning & Comments
// ==========================================================================

import {
  state,
  dbEnv,
  showToast,
  escapeHTML,
  formatTimeAgo,
  openConfirmModal,
  savePostRecord,
  removePostRecord,
  saveCommentRecord,
  removeCommentRecord
} from "./storage.js";

function normalizeExternalUrl(rawUrl) {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();
  // Convert Google Drive file/view links into direct preview/download links when possible
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }
  // Convert Dropbox share URLs into raw/dl=1 links
  if (trimmed.includes("dropbox.com")) {
    return trimmed.replace(/([?&])dl=0\b/, "$1raw=1").replace(/([?&])dl=1\b/, "$1raw=1");
  }
  return trimmed;
}

function parseVideoEmbed(url) {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) return null;
  const ytMatch = normalized.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return { type: "iframe", src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }
  const vimeoMatch = normalized.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { type: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(normalized) || normalized.includes("raw=1")) {
    return { type: "video", src: normalized };
  }
  return { type: "link", src: normalized };
}
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { type: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
    return { type: "video", src: url };
  }
  return { type: "link", src: url };
}

function buildPostMediaHTML(post) {
  if (!post.mediaType || post.mediaType === "none" || !post.mediaUrl) return "";

  if (post.mediaType === "image") {
    return `
      <div class="relative group rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-obsidian">
        <img src="${escapeHTML(post.mediaUrl)}" alt="${escapeHTML(post.title)}" onerror="this.src='https://placehold.co/600x360/1e293b/94a3b8?text=Image+Preview'" class="w-full max-h-64 object-cover cursor-pointer group-hover:scale-[1.02] transition-transform duration-300" data-preview-media="${post.id}" />
        <button data-preview-media="${post.id}" type="button" class="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-950/75 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition">
          Expand
        </button>
      </div>
    `;
  }

  if (post.mediaType === "video") {
    const embed = parseVideoEmbed(post.mediaUrl);
    if (embed.type === "iframe") {
      return `
        <div class="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black">
          <iframe src="${escapeHTML(embed.src)}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      `;
    }
    if (embed.type === "video") {
      return `
        <div class="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black">
          <video src="${escapeHTML(embed.src)}" controls class="w-full max-h-60"></video>
        </div>
      `;
    }
    return `
      <a href="${escapeHTML(post.mediaUrl)}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 hover:bg-indigo-500/10 transition">
        <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">▶</div>
        <div class="min-w-0">
          <p class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate">Watch External Video</p>
          <p class="text-[11px] text-slate-400 truncate">${escapeHTML(post.mediaUrl)}</p>
        </div>
      </a>
    `;
  }

  if (post.mediaType === "pdf") {
    return `
      <div class="p-3.5 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-rose-600 text-white font-display font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
            PDF
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">${escapeHTML(post.mediaName || "Study_Document.pdf")}</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">PDF Attachment</p>
          </div>
        </div>
        <button data-preview-media="${post.id}" type="button" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-surfaceDark border border-slate-200 dark:border-slate-700 hover:border-rose-400 transition shrink-0">
          View
        </button>
      </div>
    `;
  }

  return "";
}

function openMediaLightbox(post) {
  const modal = document.getElementById("mediaPreviewModal");
  const body = document.getElementById("previewModalBody");
  document.getElementById("previewModalTitle").textContent = post.title;
  document.getElementById("previewExternalLink").href = post.mediaUrl;

  if (post.mediaType === "image") {
    body.innerHTML = `<img src="${escapeHTML(post.mediaUrl)}" alt="${escapeHTML(post.title)}" class="max-w-full max-h-full object-contain rounded-xl" />`;
  } else if (post.mediaType === "pdf") {
    body.innerHTML = `<iframe src="${escapeHTML(post.mediaUrl)}" class="w-full h-full rounded-xl border-0"></iframe>`;
  }
  modal.classList.remove("hidden");
}

export function renderBoardCanvas() {
  const board = state.boards.find((b) => b.id === state.currentBoardId);
  if (!board) return;

  const isCreator = state.user && board.creatorId === state.user.uid;
  const hasPwd = Boolean(board.password && board.password.trim());

  document.getElementById("activeBoardTitle").textContent = board.title;
  document.getElementById("activeBoardDesc").textContent =
    board.description || "Collaborative study space for notes, videos, images, and PDFs.";
  document.getElementById("activeBoardCreator").textContent = board.creatorName || "Creator";

  const visBadge = document.getElementById("boardVisibilityBadge");
  visBadge.textContent = board.visibility === "public" ? "Public Board" : "Private Board";
  visBadge.className =
    board.visibility === "public"
      ? "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
      : "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/20";

  document.getElementById("boardPasswordBadge").classList.toggle("hidden", !hasPwd);
  document.getElementById("boardArchivedBadge").classList.toggle("hidden", !board.archived);
  document.getElementById("boardSettingsBtn").classList.toggle("hidden", !isCreator);

  let boardPosts = state.posts.filter((p) => p.boardId === board.id);
  document.getElementById("activeBoardPostCount").textContent = `${boardPosts.length} ${
    boardPosts.length === 1 ? "post" : "posts"
  }`;

  if (state.mediaFilter !== "all") {
    boardPosts = boardPosts.filter((p) => p.mediaType === state.mediaFilter);
  }

  // Pinned posts stay anchored at the top, followed by chosen sort order
  boardPosts.sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }
    if (state.sortOrder === "alpha") {
      return (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
    }
    if (state.sortOrder === "oldest") {
      return (a.createdAt || 0) - (b.createdAt || 0);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const grid = document.getElementById("postsGrid");
  const emptyState = document.getElementById("postsEmptyState");
  grid.innerHTML = "";

  if (boardPosts.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  boardPosts.forEach((post) => {
    const postComments = state.comments
      .filter((c) => c.postId === post.id)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    const canManagePost = isCreator || (state.user && post.authorId === state.user.uid);
    const mediaHtml = buildPostMediaHTML(post);

    const card = document.createElement("article");
    card.className = `bento-card rounded-3xl bg-white dark:bg-surfaceDark border ${
      post.pinned
        ? "border-indigo-500/60 dark:border-indigo-400/50 ring-2 ring-indigo-500/10"
        : "border-slate-200/90 dark:border-slate-800"
    } shadow-bento overflow-hidden flex flex-col`;

    card.innerHTML = `
      ${
        post.pinned
          ? `
        <div class="px-4 py-1.5 bg-gradient-to-r from-indigo-600/10 via-violet-600/10 to-transparent border-b border-indigo-500/15 flex items-center justify-between">
          <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 3H8v2h1v5.586L6.293 13.293A1 1 0 0 0 7 15h4v6l1 1 1-1v-6h4a1 1 0 0 0 .707-1.707L15 10.586V5h1V3z"/></svg>
            PINNED RESOURCE
          </span>
        </div>
      `
          : ""
      }

      <div class="p-5 space-y-3.5 flex-1">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <img src="${escapeHTML(
              post.authorAvatar || "https://api.dicebear.com/9.x/notionists/svg?seed=" + post.authorName
            )}" alt="" class="w-7 h-7 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0" />
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">${escapeHTML(
                post.authorName || "Student"
              )}</p>
              <p class="text-[10px] text-slate-400">${formatTimeAgo(post.createdAt)}</p>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            ${
              canManagePost
                ? `
              <button data-pin-post="${post.id}" type="button" title="${
                    post.pinned ? "Unpin Post" : "Pin Post to Top"
                  }" class="p-1.5 rounded-xl text-xs transition ${
                    post.pinned
                      ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }">
                <svg class="w-4 h-4" fill="${
                  post.pinned ? "currentColor" : "none"
                }" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 3H8v2h1v5.586L6.293 13.293A1 1 0 0 0 7 15h4v6l1 1 1-1v-6h4a1 1 0 0 0 .707-1.707L15 10.586V5h1V3z"/></svg>
              </button>
              <button data-delete-post="${
                post.id
              }" type="button" title="Delete Post" class="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            `
                : ""
            }
          </div>
        </div>

        <div class="space-y-1.5">
          <h3 class="font-display font-bold text-base text-slate-900 dark:text-white leading-snug">${escapeHTML(
            post.title
          )}</h3>
          ${
            post.body
              ? `<p class="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">${escapeHTML(
                  post.body
                )}</p>`
              : ""
          }
        </div>

        ${mediaHtml}
      </div>

      <div class="px-5 py-3.5 bg-slate-50/80 dark:bg-obsidian/60 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Peer Discussion (${postComments.length})
          </span>
        </div>

        <div class="space-y-2 max-h-44 overflow-y-auto pr-1">
          ${
            postComments.length === 0
              ? `<p class="text-[11px] text-slate-400 italic">No comments yet. Start the discussion!</p>`
              : postComments
                  .map((c) => {
                    const canDeleteComment = isCreator || (state.user && c.authorId === state.user.uid);
                    return `
                      <div class="p-2.5 rounded-2xl bg-white dark:bg-surfaceDark border border-slate-200/70 dark:border-slate-800 text-xs space-y-1">
                        <div class="flex items-center justify-between gap-2">
                          <span class="font-semibold text-[11px] text-slate-800 dark:text-slate-200">${escapeHTML(
                            c.authorName
                          )}</span>
                          <div class="flex items-center gap-1.5">
                            <span class="text-[10px] text-slate-400">${formatTimeAgo(c.createdAt)}</span>
                            ${
                              canDeleteComment
                                ? `<button data-delete-comment="${c.id}" type="button" class="text-[10px] text-slate-400 hover:text-rose-500">✕</button>`
                                : ""
                            }
                          </div>
                        </div>
                        <p class="text-slate-600 dark:text-slate-300 leading-snug">${escapeHTML(c.text)}</p>
                      </div>
                    `;
                  })
                  .join("")
          }
        </div>

        <form data-comment-form="${post.id}" class="flex items-center gap-2 pt-1">
          <input type="text" required maxlength="300" placeholder="${
            state.user ? "Add a peer comment..." : "Sign in to comment..."
          }" ${
      !state.user ? "disabled" : ""
    } class="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-surfaceDark border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 disabled:opacity-60" />
          <button type="submit" ${
            !state.user ? "disabled" : ""
          } class="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 transition">
            Post
          </button>
        </form>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-pin-post]").forEach((btn) => {
    btn.addEventListener("click", () => togglePinPost(btn.getAttribute("data-pin-post")));
  });

  grid.querySelectorAll("[data-delete-post]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const postId = btn.getAttribute("data-delete-post");
      openConfirmModal(
        "Delete Post?",
        "Remove this post and its comments from the board?",
        () => deletePost(postId)
      );
    });
  });

  grid.querySelectorAll("[data-preview-media]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const postId = btn.getAttribute("data-preview-media");
      const post = state.posts.find((p) => p.id === postId);
      if (post) openMediaLightbox(post);
    });
  });

  grid.querySelectorAll("[data-comment-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const postId = form.getAttribute("data-comment-form");
      const input = form.querySelector("input");
      addComment(postId, input.value.trim());
      input.value = "";
    });
  });

  grid.querySelectorAll("[data-delete-comment]").forEach((btn) => {
    btn.addEventListener("click", () => deleteComment(btn.getAttribute("data-delete-comment")));
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 780 * 1024) {
      reject(
        new Error(
          "File exceeds 750KB limit for direct browser storage. Please use an external URL for larger files."
        )
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function handleCreatePost(e) {
  e.preventDefault();
  if (!state.user || !state.currentBoardId) return;

  const title = document.getElementById("postTitleInput").value.trim();
  const body = document.getElementById("postBodyInput").value.trim();
  const mediaType = state.selectedMediaType;
  const pinned = document.getElementById("postPinCheckbox").checked;

  let mediaUrl = "";
  let mediaName = "";

  if (mediaType === "image") {
    const rawUrl = document.getElementById("postImageUrl").value.trim();
    if (rawUrl) {
      mediaUrl = normalizeExternalUrl(rawUrl);
      mediaName = rawUrl.split("/").pop()?.split("?")[0] || "External Image";
    }
  } else if (mediaType === "video") {
    const rawUrl = document.getElementById("postVideoUrl").value.trim();
    if (rawUrl) {
      mediaUrl = normalizeExternalUrl(rawUrl);
      mediaName = "External Video Link";
    }
  } else if (mediaType === "pdf") {
    const rawUrl = document.getElementById("postPdfUrl").value.trim();
    if (rawUrl) {
      mediaUrl = normalizeExternalUrl(rawUrl);
      mediaName = rawUrl.split("/").pop()?.split("?")[0] || "External_Document.pdf";
    }
  }

  const postId = "post-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  const newPost = {
    id: postId,
    boardId: state.currentBoardId,
    title,
    body,
    mediaType: mediaUrl ? mediaType : "none",
    mediaUrl,
    mediaName,
    pinned,
    authorId: state.user.uid,
    authorName: state.user.displayName,
    authorAvatar: state.user.avatar,
    createdAt: Date.now()
  };

  await savePostRecord(newPost, true);
  renderBoardCanvas();

  document.getElementById("createPostForm").reset();
  setSelectedMediaType("none");
  document.getElementById("createPostModal").classList.add("hidden");
  showToast("Post published with external link!", "success");
}

async function togglePinPost(postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;
  const nextPin = !post.pinned;
  post.pinned = nextPin;
  await savePostRecord({ id: post.id, pinned: nextPin }, false);
  renderBoardCanvas();
  showToast(nextPin ? "Post pinned to top" : "Post unpinned", "info");
}

async function deletePost(postId) {
  await removePostRecord(postId);
  renderBoardCanvas();
  showToast("Post removed", "info");
}

async function addComment(postId, text) {
  if (!text || !state.user || !state.currentBoardId) return;
  const commentId = "comm-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  const newComment = {
    id: commentId,
    postId,
    boardId: state.currentBoardId,
    text,
    authorId: state.user.uid,
    authorName: state.user.displayName,
    authorAvatar: state.user.avatar,
    createdAt: Date.now()
  };

  await saveCommentRecord(newComment);
  renderBoardCanvas();
}

async function deleteComment(commentId) {
  await removeCommentRecord(commentId);
  renderBoardCanvas();
}
    } else if (mediaType === "video") {
      mediaUrl = document.getElementById("postVideoUrl").value.trim();
      mediaName = "Video Link";
    } else if (mediaType === "pdf") {
      const urlVal = document.getElementById("postPdfUrl").value.trim();
      const fileInput = document.getElementById("postPdfFile");
      if (fileInput.files && fileInput.files[0]) {
        mediaUrl = await readFileAsDataURL(fileInput.files[0]);
        mediaName = fileInput.files[0].name;
      } else if (urlVal) {
        mediaUrl = urlVal;
        mediaName = urlVal.split("/").pop() || "Document.pdf";
      }
    }
  } catch (err) {
    showToast(err.message, "warning");
    return;
  }

  const postId = "post-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  const newPost = {
    id: postId,
    boardId: state.currentBoardId,
    title,
    body,
    mediaType: mediaUrl ? mediaType : "none",
    mediaUrl,
    mediaName,
    pinned,
    authorId: state.user.uid,
    authorName: state.user.displayName,
    authorAvatar: state.user.photoURL,
    createdAt: Date.now()
  };

  await savePostRecord(newPost, true);
  if (!dbEnv.useCloudFirestore) {
    renderBoardCanvas();
  }

  document.getElementById("createPostForm").reset();
  setSelectedMediaType("none");
  document.getElementById("createPostModal").classList.add("hidden");
  showToast("Post published to board!", "success");
}

async function togglePinPost(postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;
  const nextPin = !post.pinned;

  if (dbEnv.useCloudFirestore && dbEnv.db) {
    await savePostRecord({ pinned: nextPin }, false);
  } else {
    post.pinned = nextPin;
    renderBoardCanvas();
  }
  showToast(nextPin ? "Post pinned to top" : "Post unpinned", "info");
}

async function deletePost(postId) {
  await removePostRecord(postId);
  if (!dbEnv.useCloudFirestore) {
    renderBoardCanvas();
  }
  showToast("Post removed", "info");
}

async function addComment(postId, text) {
  if (!text || !state.user || !state.currentBoardId) return;
  const commentId = "comm-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  const newComment = {
    id: commentId,
    postId,
    boardId: state.currentBoardId,
    text,
    authorId: state.user.uid,
    authorName: state.user.displayName,
    authorAvatar: state.user.photoURL,
    createdAt: Date.now()
  };

  await saveCommentRecord(newComment);
  if (!dbEnv.useCloudFirestore) {
    renderBoardCanvas();
  }
}

async function deleteComment(commentId) {
  await removeCommentRecord(commentId);
  if (!dbEnv.useCloudFirestore) {
    renderBoardCanvas();
  }
}

function setSelectedMediaType(type) {
  state.selectedMediaType = type;
  document.querySelectorAll(".media-type-btn").forEach((btn) => {
    const active = btn.getAttribute("data-media") === type;
    btn.className = active
      ? "media-type-btn active py-2 px-2 rounded-xl text-xs font-semibold border border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
      : "media-type-btn py-2 px-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-indigo-400";
  });
  document.getElementById("imageInputGroup").classList.toggle("hidden", type !== "image");
  document.getElementById("videoInputGroup").classList.toggle("hidden", type !== "video");
  document.getElementById("pdfInputGroup").classList.toggle("hidden", type !== "pdf");
}

export function initPostEvents() {
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.sortOrder = btn.getAttribute("data-sort");
      document.querySelectorAll(".sort-btn").forEach((b) => {
        const isAct = b === btn;
        b.className = isAct
          ? "sort-btn active px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white transition"
          : "sort-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition";
      });
      renderBoardCanvas();
    });
  });

  document.getElementById("mediaTypeFilter").addEventListener("change", (e) => {
    state.mediaFilter = e.target.value;
    renderBoardCanvas();
  });

  function openNewPostModal() {
    if (!state.user) {
      showToast("Start a Creator Passkey session first to add posts.", "info");
      document.getElementById("creatorPasskeyModal").classList.remove("hidden");
      return;
    }
    const board = state.boards.find((b) => b.id === state.currentBoardId);
    const isCreator = board && board.creatorId === state.user.uid;
    document.getElementById("pinOnCreateWrapper").classList.toggle("hidden", !isCreator);
    document.getElementById("createPostModal").classList.remove("hidden");
  }

  document.getElementById("openNewPostBtn").addEventListener("click", openNewPostModal);
  document.getElementById("emptyAddPostBtn").addEventListener("click", openNewPostModal);

  document.querySelectorAll(".media-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => setSelectedMediaType(btn.getAttribute("data-media")));
  });

  document.getElementById("createPostForm").addEventListener("submit", handleCreatePost);
}
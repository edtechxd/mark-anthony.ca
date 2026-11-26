// SlateBoard Cloud Storage via Supabase RPC (Zero Cost, Server-Hashed Passwords)
const SlateStorage = (() => {
  // Replace with your Supabase Project URL and Publishable / Anon key:
  const SUPABASE_URL = "https://fywlcirgbhsawxdskklw.supabase.co";
  const SUPABASE_CLIENT_KEY = "sb_publishable_wdMVOO0gaeYjlQ7JDmaMuA_oluVurKt";

  const SESSION_KEY = "slateboard_creator_session_v1";
  const THEME_KEY = "slateboard_theme_v1";

  function assertConfigured() {
    if (
      !SUPABASE_URL ||
      SUPABASE_URL.includes("YOUR_PROJECT_ID") ||
      !SUPABASE_CLIENT_KEY ||
      SUPABASE_CLIENT_KEY.includes("YOUR_SUPABASE_")
    ) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_CLIENT_KEY in js/storage.js");
    }
  }

  async function rpc(fnName, params = {}) {
    assertConfigured();
    const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_CLIENT_KEY,
        Authorization: `Bearer ${SUPABASE_CLIENT_KEY}`
      },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase RPC error (${res.status}): ${errText}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

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
    const fallback = {
      creatorId: "creator_guest_" + Math.random().toString(36).slice(2, 8),
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

  async function getCreatorBoards() {
    const session = getSession();
    return (await rpc("get_creator_boards", { p_owner_id: session.creatorId })) || [];
  }

  async function getBoardDetail(boardId, password = "") {
    const session = getSession();
    return await rpc("get_board_detail", {
      p_board_id: boardId,
      p_requester_id: session.creatorId,
      p_password: password
    });
  }

  async function saveBoard(board) {
    return await rpc("upsert_board", {
      p_id: board.id,
      p_title: board.title,
      p_description: board.description || "",
      p_owner_id: board.ownerId,
      p_owner_name: board.ownerName,
      p_visibility: board.visibility || "public",
      p_password: board.password,
      p_archived: Boolean(board.archived),
      p_created_at: board.createdAt || Date.now()
    });
  }

  async function deleteBoard(boardId) {
    const session = getSession();
    await rpc("delete_board_secure", {
      p_board_id: boardId,
      p_owner_id: session.creatorId
    });
  }

  async function addPost(boardId, post) {
    await rpc("add_post_secure", {
      p_id: post.id,
      p_board_id: boardId,
      p_title: post.title,
      p_type: post.type,
      p_url: post.url || "",
      p_body: post.body || "",
      p_author_name: post.authorName,
      p_author_id: post.authorId,
      p_pinned: Boolean(post.pinned),
      p_created_at: post.createdAt
    });
  }

  async function managePost(boardId, postId, action) {
    const session = getSession();
    await rpc("manage_post_secure", {
      p_post_id: postId,
      p_board_id: boardId,
      p_owner_id: session.creatorId,
      p_action: action
    });
  }

  async function addComment(postId, comment) {
    await rpc("add_comment_secure", {
      p_id: comment.id,
      p_post_id: postId,
      p_author_name: comment.authorName,
      p_text: comment.text,
      p_created_at: comment.createdAt
    });
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
    getCreatorBoards,
    getBoardDetail,
    saveBoard,
    deleteBoard,
    addPost,
    managePost,
    addComment,
    getTheme,
    setTheme
  };
})();
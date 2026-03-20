
const RULE34_BASE = "https://api.rule34.xxx/index.php?page=dapi&s=post&q=index";
const HARD_LIMIT = 100;           // real hard limit is 1000 but let's not be assholes
const DEFAULT_LIMIT = 8;
const REQUEST_TIMEOUT_MS = 10000;

const USER_AGENT = "rule34-fetcher/2.1 (+https://github.com/yourname; contact@you.com)";

export default {
  name: "Rule34 Image Fetch",
  description: "Grabs direct image URLs + metadata from rule34.xxx (json=1)",
  category: "NSFW",
  methods: ["GET"],

  params: ["tags", "limit", "pid", "apikey", "user_id"],
  paramsSchema: {
    tags: {
      type: "string",
      required: true,
      description: "space/comma/+/separated tags  e.g. 'overwatch mercy anal' or 'mercy+overwatch'",
    },
    limit: {
      type: "number",
      default: DEFAULT_LIMIT,
      min: 1,
      max: HARD_LIMIT,
      description: `how many posts (max ${HARD_LIMIT})`,
    },
    pid: {
      type: "number",
      default: 0,
      min: 0,
      description: "page offset (starts at 0)",
    },
    apikey: {
      type: "string",
      description: "optional API key (required for heavy usage in 2026)",
    },
    user_id: {
      type: "string",
      description: "optional user ID matching the API key",
    },
  },

  async run(req, res) {
    const {
      tags = "",
      limit: reqLimit = DEFAULT_LIMIT,
      pid = 0,
      apikey,
      user_id,
    } = req.query;

    // ─── Input validation ────────────────────────────────────────
    if (typeof tags !== "string" || tags.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "tags parameter is required and cannot be empty",
      });
    }

    const limit = Math.max(1, Math.min(HARD_LIMIT, Number(reqLimit) || DEFAULT_LIMIT));
    const page = Math.max(0, Number(pid) || 0);

    // Normalize tags aggressively
    const cleanTags = tags
      .replace(/[\s,;+]+/g, " ")          // unify separators
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(t => t.trim())
      .join("+");

    if (cleanTags.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid tags after sanitization",
      });
    }

    // Build query string
    const queryParams = new URLSearchParams({
      json: "1",
      limit: String(limit),
      pid: String(page),
      tags: cleanTags,
    });

    if (apikey)    queryParams.set("api_key", apikey);
    if (user_id)   queryParams.set("user_id", user_id);

    const targetUrl = `${RULE34_BASE}&${queryParams.toString()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`rule34.xxx returned ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(`Unexpected root type — expected array, got ${typeof data}`);
      }

      const posts = data
        .map(post => {
          let file_url   = post.file_url   || post.image_url   || "";
          let preview    = post.preview_url || post.sample_url || post.file_url || "";
          let sample_url = post.sample_url || "";

          // Fix protocol-less URLs (still happens sometimes)
          if (file_url   && !/^https?:\/\//i.test(file_url))   file_url   = "https:" + file_url;
          if (preview    && !/^https?:\/\//i.test(preview))    preview    = "https:" + preview;
          if (sample_url && !/^https?:\/\//i.test(sample_url)) sample_url = "https:" + sample_url;

          return {
            id:          Number(post.id) || null,
            post_id:     Number(post.id) || null,       // alias for compatibility
            score:       Number(post.score) || 0,
            rating:      post.rating || "u",            // s q e u(nknown)
            tags:        typeof post.tags === "string" ? post.tags.split(" ").filter(Boolean) : [],
            tag_string:  post.tags || "",
            file_url,
            preview_url: preview,
            sample_url,
            width:       Number(post.width) || 0,
            height:      Number(post.height) || 0,
            file_size:   Number(post.file_size) || null,
            created_at:  post.created_at ? new Date(post.created_at * 1000).toISOString() : null,
            source:      post.source || null,
            md5:         post.md5 || null,
            has_children: post.has_children === "1" || false,
          };
        })
        .filter(p => 
          p.file_url?.startsWith("https://") &&
          p.width > 10 && p.height > 10 &&     // very broken images get culled
          p.id != null
        );

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300"); // 5 min cache is reasonable

      return res.json({
        success: true,
        meta: {
          query: {
            tags: cleanTags.split("+"),
            original: tags.trim(),
            limit,
            page,
            used_auth: !!apikey,
          },
          count_returned: posts.length,
          timestamp: new Date().toISOString(),
        },
        posts,
        attribution: "Powered by rule34.xxx • use condoms & API keys",
        version: "2.1",
      });
    } catch (err) {
      const isTimeout = err.name === "AbortError" || err.code === "ETIMEDOUT";

      console.error("[rule34-fetcher]", {
        message: err.message,
        url: targetUrl.replace(apikey || "", "REDACTED"),
        stack: err.stack?.split("\n").slice(0, 3).join("\n"),
      });

      const status = isTimeout ? 504 : 502;
      const errorMsg = isTimeout
        ? "rule34.xxx timed out (10s)"
        : err.message.includes("json")
          ? "rule34.xxx sent broken JSON"
          : "rule34.xxx fetch / parse failed";

      return res.status(status).json({
        success: false,
        error: errorMsg,
        details: err.message.slice(0, 200),
        attempted_url: targetUrl.replace(/api_key=[^&]+/, "api_key=REDACTED"),
      });
    }
  },
};

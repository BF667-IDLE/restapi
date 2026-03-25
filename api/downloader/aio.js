const BASE_URL = "https://rule34.xxx/index.php?page=dapi&s=post&q=index";

const MAX_LIMIT = 100;        // keep it polite, real hard limit is 1000
const DEFAULT_LIMIT = 8;

export default {
  name: "Simple Rule34 Fetch",
  description: "Grabs direct image URLs + basic metadata from rule34.xxx (no auth, no bullshit)",
  category: "NSFW",
  methods: ["GET"],

  params: ["tags", "limit", "pid"],
  paramsSchema: {
    tags: {
      type: "string",
      required: true,
      description: "Tags like 'overwatch mercy anal' or 'mercy+overwatch'",
    },
    limit: {
      type: "number",
      default: DEFAULT_LIMIT,
      min: 1,
      max: MAX_LIMIT,
    },
    pid: {
      type: "number",
      default: 0,
      min: 0,
    },
  },

  async run(req, res) {
    let { tags = "", limit = DEFAULT_LIMIT, pid = 0 } = req.query;

    if (typeof tags !== "string" || !tags.trim()) {
      return res.status(400).json({ success: false, error: "tags required" });
    }

    limit = Math.max(1, Math.min(MAX_LIMIT, Number(limit) || DEFAULT_LIMIT));
    pid = Math.max(0, Number(pid) || 0);

    // Clean tags: spaces, commas, + all become +
    const cleanTags = tags
      .replace(/[\s,;+]+/g, "+")
      .replace(/^\++|\++$/g, "");   // trim leading/trailing +

    if (!cleanTags) {
      return res.status(400).json({ success: false, error: "no valid tags" });
    }

    const url = `${BASE_URL}&json=1&limit=${limit}&pid=${pid}&tags=${encodeURIComponent(cleanTags)}`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "simple-rule34-fetcher/1.0",
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Expected JSON array");
      }

      const posts = data
        .map(post => {
          let file_url = post.file_url || post.image_url || "";
          let preview_url = post.preview_url || post.sample_url || file_url || "";
          let sample_url = post.sample_url || "";

          // Fix protocol-less URLs
          if (file_url && !/^https?:\/\//i.test(file_url)) file_url = "https:" + file_url;
          if (preview_url && !/^https?:\/\//i.test(preview_url)) preview_url = "https:" + preview_url;
          if (sample_url && !/^https?:\/\//i.test(sample_url)) sample_url = "https:" + sample_url;

          return {
            id: Number(post.id) || null,
            score: Number(post.score) || 0,
            rating: post.rating || "unknown",
            tags: typeof post.tags === "string" ? post.tags.split(" ").filter(Boolean) : [],
            file_url,
            preview_url,
            sample_url,
            width: Number(post.width) || 0,
            height: Number(post.height) || 0,
            created_at: post.created_at ? new Date(post.created_at * 1000).toISOString() : null,
          };
        })
        .filter(p => p.file_url?.startsWith("https://") && p.id && p.width > 50 && p.height > 50);

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=180"); // 3 min cache

      return res.json({
        success: true,
        meta: {
          tags: cleanTags.split("+"),
          limit,
          pid,
          returned: posts.length,
        },
        posts,
        note: "Simple scraper • rule34.xxx • stay horny",
      });
    } catch (err) {
      console.error("Rule34 fetch error:", err.message);

      return res.status(502).json({
        success: false,
        error: "Failed to fetch from rule34.xxx",
        details: err.message,
      });
    }
  },
};

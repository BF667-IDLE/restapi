export default {
    name: "Rule34 Image Fetch",
    description: "Searches rule34.xxx and returns direct image URLs + some metadata",
    category: "NSFW",
    methods: ["GET"],
    params: ["tags", "limit", "pid"],
    paramsSchema: {
        tags:  { type: "string",  required: true,  description: "space or + separated tags (example: overwatch mercy)" },
        limit: { type: "number",  default: 6,      min: 1, max: 30 },
        pid:   { type: "number",  default: 0,      description: "page id / offset (starts from 0)" }
    },

    async run(req, res) {
        const { tags = "", limit = 6, pid = 0 } = req.query;

        // Prevent obviously broken / abusive patterns early
        if (typeof tags !== "string" || tags.trim().length < 1) {
            return res.status(400).json({ success: false, error: "tags parameter is required" });
        }

        // Normalize tags: replace comma & multiple spaces → single space
        const cleanTags = tags
            .replace(/[,;]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .split(" ")
            .filter(Boolean)
            .join("+");

        if (cleanTags.length === 0) {
            return res.status(400).json({ success: false, error: "no valid tags after cleaning" });
        }

        const url = `https://rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=${limit}&pid=${pid}&tags=${encodeURIComponent(cleanTags)}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8500);

            const resp = await fetch(url, {
                headers: { "User-Agent": "rule34-fetcher/1.0 (compatible; your-bot-name)" },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!resp.ok) {
                throw new Error(`rule34.xxx answered ${resp.status}`);
            }

            const data = await resp.json();

            // rule34.xxx json=1 returns array of objects or empty array
            if (!Array.isArray(data)) {
                throw new Error("Unexpected response format from rule34");
            }

            const posts = data.map(post => {
                // They sometimes return //rule34.xxx/... without protocol → fix it
                let file_url = post.file_url;
                if (file_url && !file_url.startsWith("http")) {
                    file_url = "https:" + file_url;
                }

                let preview = post.preview_url || post.sample_url || file_url;
                if (preview && !preview.startsWith("http")) {
                    preview = "https:" + preview;
                }

                return {
                    id:        Number(post.id),
                    score:     Number(post.score) || 0,
                    rating:    post.rating,                     // s q e
                    tags:      post.tags?.split(" ") || [],
                    file_url,
                    preview_url: preview,
                    width:     Number(post.width),
                    height:    Number(post.height),
                    source:    post.source || null,
                    created_at: post.created_at ? new Date(post.created_at * 1000).toISOString() : null
                };
            })
            // minimal client-side sanitization – remove obvious broken entries
            .filter(p => p.file_url?.startsWith("https://") && p.width > 0 && p.height > 0);

            return res.json({
                success: true,
                query: {
                    tags: cleanTags.split("+"),
                    raw_tags: tags,
                    limit: Number(limit),
                    page: Number(pid)
                },
                count: posts.length,
                posts,
                timestamp: new Date().toISOString(),
                attribution: "@synshin9 – use responsibly"
            });
        }
        catch (err) {
            if (err.name === "AbortError") {
                return res.status(504).json({
                    success: false,
                    error: "Request to rule34.xxx timed out"
                });
            }

            console.error("[rule34] fetch failed", err);

            return res.status(502).json({
                success: false,
                error:   "Failed to reach / parse rule34.xxx",
                details: err.message.slice(0, 180)
            });
        }
    }
};

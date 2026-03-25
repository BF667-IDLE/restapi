import btoa from "btoa";
import axios from "axios";
import ParseHtml from "html-dom-parser";

const form = new URLSearchParams();

const TARGET = {
  baseUrl: "https://allinonevideosdownloader.com",
  headers: {
    "authority": "allinonevideosdownloader.com",
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9,id;q=0.8",
    "content-type": "application/x-www-form-urlencoded",
    "cookie": "pll_language=en; _gcl_au=1.1.1929855334.1773448777",
    "origin": "https://allinonevideosdownloader.com",
    "referer": "https://allinonevideosdownloader.com/",
    "sec-ch-ua": "\"Not-A.Brand\";v=\"99\", \"Chromium\";v=\"124\"",
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": "\"Android\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
  }
}

async function findToken() {
  const res = await axios.get(TARGET.baseUrl, {
    headers: TARGET.headers
  });

  const dom = ParseHtml(res.data);
  function walk(nodes) {
    for (const node of nodes) {
      if (node?.attribs?.name === "token") return node.attribs;
      if (node?.children?.length) {
        const found = walk(node.children);
        if (found) return found;
      }
    }
  }
  const token = walk(dom);
  if (!token) throw new Error("token not found");
  return token;
}


async function aiodl(url) {
  if (!url) throw "missing url input";

  const token = await findToken();
  const form = new URLSearchParams();
  form.append("url", url);
  form.append("token", token.value);
  form.append("hash", btoa(url) + (url.length + 1000) + btoa("aio-dl"));

  const res = await axios.post(
    `${TARGET.baseUrl}/wp-json/aio-dl/video-data/`,
    form,
    { headers: TARGET.headers }
  ).catch(e => e.response);

  if (!res.data?.medias)
    throw res.data?.message || res.data?.error || "failed retrieve data";
  return res.data;
}

aiodl("https://www.facebook.com/share/r/1CRyWDZJxP/").then(d => console.log(d)).catch(console.log)

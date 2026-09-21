export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    let target = req.query.url;

    if (!target) {
      return res.status(400).json({
        success: false,
        error: "The 'url' query parameter is missing.",
        powered_by: "𝐙𝐗𝐇 𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋"
      });
    }

    if (!/^https?:\/\//i.test(target)) {
      target = "https://" + target;
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid URL",
        powered_by: "𝐙𝐗𝐇 𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋"
      });
    }

    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml"
      },
      redirect: "follow"
    });

    const finalUrl = response.url;
    const html = await response.text();

    const abs = (path) => {
      try { return new URL(path, finalUrl).href; } catch { return path; }
    };

    const getAll = (regex) => [...html.matchAll(regex)].map(m => m[1]).filter(Boolean);

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    const meta = {};
    [...html.matchAll(/<meta\s+([^>]+)>/gi)].forEach(tag => {
      const name = tag[1].match(/(?:name|property)=["']([^"']+)["']/i);
      const content = tag[1].match(/content=["']([^"']*)["']/i);
      if (name && content) meta[name[1]] = content[1];
    });

    const scripts = [...new Set(getAll(/<script[^>]+src=["']([^"']+)["']/gi).map(abs))];
    const styles  = [...new Set(getAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["']/gi).map(abs))];
    const images  = [...new Set(getAll(/<img[^>]+src=["']([^"']+)["']/gi).map(abs))];
    const icons   = [...new Set(getAll(/<link[^>]+rel=["']?(?:icon|shortcut icon|apple-touch-icon)["']?[^>]*href=["']([^"']+)["']/gi).map(abs))];
    const links   = [...new Set(getAll(/<a[^>]+href=["']([^"']+)["']/gi).map(abs))].slice(0, 50);
    const videos  = [...new Set(getAll(/<(?:video|source)[^>]+src=["']([^"']+)["']/gi).map(abs))];
    const audios  = [...new Set(getAll(/<(?:audio|source)[^>]+src=["']([^"']+)["']/gi).map(abs))];
    const iframes = [...new Set(getAll(/<iframe[^>]+src=["']([^"']+)["']/gi).map(abs))];

    const headersObj = {};
    response.headers.forEach((v, k) => headersObj[k] = v);

    return res.status(200).json({
      success: true,
      requestedUrl: req.query.url,
      correctedUrl: target,
      finalUrl,
      status: response.status,
      statusText: response.statusText,
      headers: headersObj,
      metadata: { title, meta },
      assets: {
        scripts,
        styles,
        images,
        links,
        icons,
        videos,
        audios,
        iframes
      },
      sourceCode: html,
      powered_by: "𝐙𝐗𝐇 𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋",
      channel: "https://whatsapp.com/channel/0029Vb6lszR7YSd3iYfa2V0n"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      powered_by: "𝐙𝐗𝐇 𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋"
    });
  }
        }

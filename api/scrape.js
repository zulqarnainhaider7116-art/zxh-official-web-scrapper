import JSZip from "jszip";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    let target = req.query.url;
    const wantZip = req.query.zip === "true";

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

    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml"
      },
      redirect: "follow"
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: `Failed to fetch: ${response.status}`,
        powered_by: "𝐙𝐗𝐇 𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋"
      });
    }

    const finalUrl = response.url;
    const html = await response.text();

    const abs = (path) => {
      try { return new URL(path, finalUrl).href; } catch { return path; }
    };

    const getAll = (regex) => [...html.matchAll(regex)].map(m => m[1]).filter(Boolean);

    // تمام لنکس
    const scriptLinks = [...new Set(getAll(/<script[^>]+src=["']([^"']+)["']/gi).map(abs))];
    const styleLinks  = [...new Set(getAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["']/gi).map(abs))];
    const imageLinks  = [...new Set(getAll(/<img[^>]+src=["']([^"']+)["']/gi).map(abs))];
    const iconLinks   = [...new Set(getAll(/<link[^>]+rel=["']?(?:icon|shortcut icon|apple-touch-icon)["']?[^>]*href=["']([^"']+)["']/gi).map(abs))];

    // اصل path نکالنے والا فنکشن
    function getPathFromUrl(fileUrl) {
      try {
        const u = new URL(fileUrl);
        let path = u.pathname;

        if (path.endsWith("/")) path = path.slice(0, -1);
        if (path.startsWith("/")) path = path.slice(1);

        return path || null;
      } catch {
        return null;
      }
    }

    // CSS & JS ڈاؤن لوڈ
    const cssFiles = [];
    const jsFiles = [];

    for (const link of styleLinks.slice(0, 15)) {
      try {
        const r = await fetch(link, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (r.ok) {
          const code = await r.text();
          cssFiles.push({
            url: link,
            path: getPathFromUrl(link),
            code
          });
        }
      } catch {}
    }

    for (const link of scriptLinks.slice(0, 15)) {
      try {
        const r = await fetch(link, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (r.ok) {
          const code = await r.text();
          jsFiles.push({
            url: link,
            path: getPathFromUrl(link),
            code
          });
        }
      } catch {}
    }

    // ========== ZIP ==========
    if (wantZip) {
      const zip = new JSZip();

      // Main HTML
      zip.file("index.html", html);

      // CSS files (اصل نام + فولڈر اگر ہو)
      cssFiles.forEach((file, index) => {
        let finalPath = file.path;
        if (!finalPath) {
          finalPath = `style-${index + 1}.css`;
        }
        zip.file(finalPath, file.code);
      });

      // JS files (اصل نام + فولڈر اگر ہو)
      jsFiles.forEach((file, index) => {
        let finalPath = file.path;
        if (!finalPath) {
          finalPath = `script-${index + 1}.js`;
        }
        zip.file(finalPath, file.code);
      });

      // README
      const readme = `
════════════════════════════════════════════════════
                𝐙𝐗𝐇 𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋
════════════════════════════════════════════════════

Full Website Source Extractor
Powered by 𝐙𝐗𝐇 𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋

Extracted From : ${finalUrl}
Date           : ${new Date().toLocaleString()}

────────────────────────────────────────────────────
JOIN OFFICIAL CHANNEL:
https://whatsapp.com/channel/0029Vb6lszR7YSd3iYfa2V0n
────────────────────────────────────────────────────

ZIP Contents:
- index.html
- CSS & JS files (original names & folders if existed)
- assets-list.txt

════════════════════════════════════════════════════
          𝐙𝐗𝐇 𝐎𝐅𝐅𝐈𝐂𝐈𝐀𝐋 • Full Site Extractor
════════════════════════════════════════════════════
`;
      zip.file("README.txt", readme);

      // Assets list
      const assetsList = `
========== SCRIPTS ==========
${scriptLinks.join("\n")}

========== STYLES ==========
${styleLinks.join("\n")}

========== IMAGES ==========
${imageLinks.join("\n")}

========== ICONS ==========
${iconLinks.join("\n")}
`;
      zip.file("assets-list.txt", assetsList);

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="ZXH-OFFICIAL-Extracted.zip"`);
      return res.status(200).send(zipBuffer);
    }

    // ========== JSON ==========
    return res.status(200).json({
      success: true,
      requestedUrl: req.query.url,
      correctedUrl: target,
      finalUrl,
      status: response.status,
      assets: {
        scripts: scriptLinks,
        styles: styleLinks,
        images: imageLinks,
        icons: iconLinks
      },
      downloaded: {
        css: cssFiles.map(f => ({ path: f.path, size: f.code.length })),
        js: jsFiles.map(f => ({ path: f.path, size: f.code.length }))
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

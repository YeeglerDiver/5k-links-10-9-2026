const fs = require("fs");
const path = require("path");
const https = require("https");

const distDir = path.join(process.cwd(), "dist");
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, ".nojekyll"), "");

const repoName = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split("/")[1]
  : "new-repo-name";
const repoPrefix = `/${repoName}/`;

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Node-Build-Script" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}, status: ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

async function runBuild() {
  console.log("Downloading SVG asset...");
  const svgUrl = "https://cdn.jsdelivr.net/gh/dorianhagar506-coder/svgbulk-qocu4i@main/mizu-1-kbez.svg";
  const svgFilename = "app.svg";

  try {
    const svgData = await downloadBuffer(svgUrl);
    fs.writeFileSync(path.join(distDir, svgFilename), svgData);
    console.log("SVG asset saved to root.");
  } catch (err) {
    console.error("Failed to download target SVG:", err.message);
    process.exit(1);
  }

  // Wrapper template using an <object> element to load the root SVG
  const pageTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    object, embed, iframe { width: 100%; height: 100%; border: none; display: block; }
  </style>
</head>
<body>
  <object data="${repoPrefix}${svgFilename}" type="image/svg+xml"></object>
</body>
</html>`;

  const TOTAL_PAGES = 5000;
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";

  function getRandomSegment(minLen = 4, maxLen = 10) {
    const length = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
    let seg = "";
    for (let i = 0; i < length; i++) seg += chars.charAt(Math.floor(Math.random() * chars.length));
    return seg;
  }

  function getNestedPath(minSegments = 2, maxSegments = 4) {
    const depth = Math.floor(Math.random() * (maxSegments - minSegments + 1)) + minSegments;
    const segs = [];
    for (let i = 0; i < depth; i++) segs.push(getRandomSegment(4, 10));
    return segs.join("/");
  }

  const uniquePaths = new Set();
  while (uniquePaths.size < TOTAL_PAGES) {
    uniquePaths.add(getNestedPath(2, 4));
  }

  let masterLinksHtml = "";

  for (const nestedPath of uniquePaths) {
    const folderPath = path.join(distDir, nestedPath);
    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(path.join(folderPath, "index.html"), pageTemplate);
    masterLinksHtml += `<a class="card" href="${repoPrefix}${nestedPath}/">${nestedPath}</a>\n`;
  }

  // Root directory index
  const masterIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Directory Index</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0d1117; color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 40px 20px; display: flex; flex-direction: column; align-items: center;
    }
    header { text-align: center; margin-bottom: 28px; max-width: 650px; width: 100%; }
    h1 { font-size: 28px; font-weight: 700; color: #f0f6fc; margin-bottom: 8px; }
    p { color: #8b949e; font-size: 14px; margin-bottom: 20px; }
    .search-box {
      width: 100%; padding: 12px 18px; border-radius: 8px; border: 1px solid #30363d;
      background: #161b22; color: #f0f6fc; font-size: 15px; outline: none;
    }
    .search-box:focus { border-color: #58a6ff; box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.2); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; width: 100%; max-width: 1300px; }
    .card {
      display: flex; align-items: center; justify-content: center; background: #161b22;
      border: 1px solid #30363d; border-radius: 6px; padding: 12px; color: #58a6ff;
      text-decoration: none; font-size: 12px; font-family: monospace; word-break: break-all; text-align: center;
    }
    .card:hover { background: #21262d; border-color: #58a6ff; color: #79c0ff; transform: translateY(-2px); }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <header>
    <h1>Directory Index</h1>
    <p>5,000 Nested Endpoints</p>
    <input type="text" id="filter" class="search-box" placeholder="Quick find path..." autocomplete="off" />
  </header>
  <main class="grid" id="link-grid">${masterLinksHtml}</main>
  <script>
    const filter = document.getElementById("filter");
    const links = document.querySelectorAll(".card");
    filter.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      links.forEach(card => card.classList.toggle("hidden", !card.textContent.toLowerCase().includes(term)));
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(distDir, "index.html"), masterIndexHtml);
  console.log("Build complete.");
}

runBuild();

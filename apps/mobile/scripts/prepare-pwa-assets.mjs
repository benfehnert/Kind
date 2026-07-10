/**
 * Expo's static web export does not emit a PWA manifest or iOS home-screen
 * metadata. This script runs after `expo export` to add the files and HTML
 * tags required for "Add to Home Screen" name + icon on iOS and Android.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.join(__dirname, "..");
const distDir = path.join(mobileRoot, "dist");
const assetsDir = path.join(mobileRoot, "assets", "images");
const appConfig = JSON.parse(fs.readFileSync(path.join(mobileRoot, "app.json"), "utf8"));
const expo = appConfig.expo;
const web = expo.web || {};

const name = web.name || expo.name || "Kind Health";
const shortName = web.shortName || name;
const themeColor = web.themeColor || "#22401F";
const backgroundColor = web.backgroundColor || themeColor;
const display = web.display || "standalone";
const startUrl = web.startUrl || "/";

const sourceIcon = path.join(assetsDir, "app-icon.png");
const indexPath = path.join(distDir, "index.html");

function resizeIcon(size, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  execSync(`sips -z ${size} ${size} "${sourceIcon}" --out "${dest}"`, { stdio: "inherit" });
}

function ensureFavicon() {
  const faviconSrc = path.join(assetsDir, "favicon.ico");
  const faviconDest = path.join(distDir, "favicon.ico");
  if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, faviconDest);
  }
}

function writeManifest(iconFiles) {
  const manifest = {
    name,
    short_name: shortName,
    start_url: startUrl,
    display,
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: iconFiles.map(({ src, sizes, type = "image/png" }) => ({ src, sizes, type }))
  };
  fs.writeFileSync(path.join(distDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function patchIndexHtml() {
  let html = fs.readFileSync(indexPath, "utf8");

  if (!html.includes("<title>")) {
    html = html.replace("<head>", `<head>\n    <title>${name}</title>`);
  } else {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${name}</title>`);
  }

  const headTags = [
    `<meta name="theme-color" content="${themeColor}">`,
    `<meta name="apple-mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-title" content="${shortName}">`,
    `<link rel="icon" href="/favicon.ico">`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
    `<link rel="manifest" href="/manifest.json">`
  ];

  for (const tag of headTags) {
    const key = tag.includes("rel=")
      ? tag.match(/rel="([^"]+)"/)?.[1]
      : tag.match(/name="([^"]+)"/)?.[1];
    const pattern = key === "icon" || key === "apple-touch-icon" || key === "manifest"
      ? new RegExp(`\\s*<link rel="${key}"[^>]*>`, "i")
      : key
        ? new RegExp(`\\s*<meta name="${key}"[^>]*>`, "i")
        : null;

    if (pattern) {
      html = html.replace(pattern, "");
    }
  }

  const injected = `${headTags.map((tag) => `    ${tag}`).join("\n")}\n`;
  html = html.replace("</head>", `${injected}  </head>`);

  fs.writeFileSync(indexPath, html);
}

function main() {
  if (!fs.existsSync(distDir)) {
    throw new Error(`dist directory not found: ${distDir}`);
  }
  if (!fs.existsSync(sourceIcon)) {
    throw new Error(`app icon not found: ${sourceIcon}`);
  }

  const icon192 = path.join(distDir, "icon-192.png");
  const icon512 = path.join(distDir, "icon-512.png");
  const appleTouchIcon = path.join(distDir, "apple-touch-icon.png");

  resizeIcon(192, icon192);
  resizeIcon(512, icon512);
  resizeIcon(180, appleTouchIcon);
  ensureFavicon();
  writeManifest([
    { src: "/icon-192.png", sizes: "192x192" },
    { src: "/icon-512.png", sizes: "512x512" },
    { src: "/apple-touch-icon.png", sizes: "180x180" }
  ]);
  patchIndexHtml();

  console.log("Prepared PWA assets:");
  console.log(`  name: ${name}`);
  console.log(`  short_name: ${shortName}`);
  console.log("  manifest.json, apple-touch-icon.png, icon-192.png, icon-512.png");
}

main();

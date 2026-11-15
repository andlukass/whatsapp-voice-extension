import { cpSync } from "node:fs";

for (const asset of ["manifest.json", "content.css", "icons"]) {
  cpSync(asset, `dist/${asset}`, { recursive: true });
}

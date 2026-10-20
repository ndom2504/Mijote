import fs from "fs";

const raw = fs.readFileSync("data/MUN.csv", "utf8").replace(/^\uFEFF/, "");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cur);
      cur = "";
    } else if (char === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (char !== "\r") {
      cur += char;
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

const rows = parseCsv(raw);
const header = rows[0].map((item) => item.trim().toLowerCase());
const idx = Object.fromEntries(header.map((name, index) => [name, index]));
const municipalities = [];

for (const record of rows.slice(1)) {
  const code = record[idx.mcode];
  const name = record[idx.munnom];
  if (!code || !name) continue;
  const regionRaw = record[idx.regadm] || "";
  const regionMatch = regionRaw.match(/^(.*) \((\d{2})\)$/);
  const mrcRaw = record[idx.mrc] || "";
  const mrcMatch = mrcRaw.match(/^(.*) \((\d+)\)$/);
  const compact = (record[idx.mcodpos] || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  municipalities.push({
    code,
    name,
    designation: record[idx.mdes] || "",
    postal: compact.length === 6 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : compact,
    region: regionMatch ? regionMatch[1] : regionRaw,
    regionCode: regionMatch ? regionMatch[2] : "",
    mrc: mrcMatch ? mrcMatch[1] : mrcRaw,
  });
}

fs.writeFileSync("data/municipalities.json", JSON.stringify(municipalities));
console.log(`municipalities ${municipalities.length}`);

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://ccf.atom.im/";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "../src/ccf-rank.ts");

function decodeEntities(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    ldquo: '"',
    lsquo: "'",
    mdash: "-",
    lt: "<",
    ndash: "-",
    nbsp: " ",
    quot: '"',
    rdquo: '"',
    rsquo: "'"
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (_, entity) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return namedEntities[entity.toLowerCase()] ?? `&${entity};`;
  });
}

function textContent(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function parsePublications(html) {
  const rows = html.match(/<tr class="item"[\s\S]*?<\/tr>/g) ?? [];

  return rows
    .map((row) => {
      const cells = [...row.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/g)].map((match) =>
        textContent(match[1])
      );

      const [, shortName, fullName, rank] = cells;
      if (!fullName || !/^[ABC]$/.test(rank)) {
        return null;
      }

      return {
        short_name: shortName,
        full_name: fullName,
        CCF_Rank: `CCF-${rank}`
      };
    })
    .filter(Boolean);
}

function summarize(publications) {
  return publications.reduce(
    (summary, publication) => {
      summary[publication.CCF_Rank] += 1;
      return summary;
    },
    { "CCF-A": 0, "CCF-B": 0, "CCF-C": 0 }
  );
}

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`);
}

const html = await response.text();
const publications = parsePublications(html);

if (publications.length < 600) {
  throw new Error(`Parsed only ${publications.length} CCF entries from ${SOURCE_URL}`);
}

const content = `// Generated from ${SOURCE_URL} on 2026-04-01 CCF data.
// Run \`npm run update:ccf-rank\` to refresh this file.

interface Publication {
  short_name: string;
  full_name: string;
  CCF_Rank: string;
}

const ccf_rank: Publication[] = ${JSON.stringify(publications)};

export { ccf_rank };
`;

writeFileSync(outputPath, content, "utf8");

const summary = summarize(publications);
console.log(`Wrote ${publications.length} CCF entries to ${outputPath}`);
console.log(`CCF-A: ${summary["CCF-A"]}, CCF-B: ${summary["CCF-B"]}, CCF-C: ${summary["CCF-C"]}`);

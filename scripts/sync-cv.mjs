#!/usr/bin/env node
// Builds data/cv_data.json (read by the UI, the chatbot backend and the resume
// PDF) from the two hand-edited sources:
//
//   content/cv.md          CV facts — the single source of truth, also read by
//                          career-ops through the career-ops/cv.md symlink
//                          (links are created/repaired here, see lib/career-ops.mjs)
//   content/portfolio.yml  presentation only — icons, stats, chatbot config
//
// Usage:
//   node scripts/sync-cv.mjs          rebuild data/cv_data.json (+ repair link)
//   node scripts/sync-cv.mjs --check  exit 1 if data/cv_data.json is stale (CI)
//
// cv.md conventions:
//   # Name
//   **Title**
//   phone | email | location | linkedin(.com/...) | https://github.com/...
//   ## Summary     -> one paragraph
//   ## Experience  -> ### Company / **Role** | dates / bullets / "Tech: a, b"
//   ## Projects    -> ### Name / **Role** | dates / description / bullets / "Tech: a, b"
//   ## Education   -> ### School / **Degree** | dates / "GPA: x" / description
//   ## Skills      -> "- **Category:** item1, item2" lines

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import { ROOT_DIR, ensureCareerOpsLinks, rel } from "./lib/career-ops.mjs";

const CV_MD_PATH = path.join(ROOT_DIR, "content", "cv.md");
const PORTFOLIO_YML_PATH = path.join(ROOT_DIR, "content", "portfolio.yml");
const JSON_PATH = path.join(ROOT_DIR, "data", "cv_data.json");

const DEFAULT_ICONS = {
  projects: "fa-solid fa-code",
  education: "fa-solid fa-graduation-cap",
  skills: "fa-solid fa-star",
};

const warnings = [];

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// cv.md parsing
// ---------------------------------------------------------------------------
function splitSections(body, level) {
  const blocks = [];
  const re = new RegExp(`^${"#".repeat(level)}\\s+(.+?)\\s*$`, "gm");
  const matches = [...body.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    blocks.push({ title: matches[i][1].trim(), content: body.slice(start, end).trim() });
  }
  return blocks;
}

function nonEmptyLines(text) {
  return text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
}

// Pulls out "**Bold** | rest" -> [bold, rest], "Label: value" lines, bullet
// lines, and leaves the remaining plain-paragraph lines, regardless of order.
function parseEntryBlock(title, content) {
  let boldLine = null;
  let gpa = null;
  let tech = [];
  const bullets = [];
  const paragraph = [];

  for (const line of nonEmptyLines(content)) {
    const boldMatch = line.match(/^\*\*(.+?)\*\*\s*\|\s*(.+)$/);
    const gpaMatch = line.match(/^GPA:\s*(.+)$/i);
    const techMatch = line.match(/^Tech:\s*(.+)$/i);
    const bulletMatch = line.match(/^-\s+(.+)$/);

    if (boldMatch) boldLine = [boldMatch[1].trim(), boldMatch[2].trim()];
    else if (gpaMatch) gpa = gpaMatch[1].trim();
    else if (techMatch) tech = techMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
    else if (bulletMatch) bullets.push(bulletMatch[1].trim());
    else if (/^Icon:/i.test(line)) warnings.push(`"${title}": Icon lines in cv.md are ignored — set icons in content/portfolio.yml`);
    else paragraph.push(line);
  }

  if (!boldLine) fail(`"${title}" is missing a "**Role** | dates" line.`);
  return { boldLine, gpa, tech, bullets, description: paragraph.join(" ") };
}

function parseHeader(rawText) {
  const firstSectionIdx = rawText.search(/^##\s+/m);
  const header = firstSectionIdx === -1 ? rawText : rawText.slice(0, firstSectionIdx);
  const lines = nonEmptyLines(header);

  const nameLine = lines.find((l) => l.startsWith("# "));
  if (!nameLine) fail("cv.md is missing a top-level '# Name' heading.");
  const titleLine = lines.find((l) => /^\*\*.+\*\*$/.test(l));
  if (!titleLine) fail("cv.md is missing a '**Title**' line under the name.");
  const contactLine = lines.find((l) => l.includes("|") && !/^\*\*/.test(l));
  if (!contactLine) fail("cv.md is missing the contact line (phone | email | location | ...).");

  const personal_info = {
    name: nameLine.replace(/^#\s+/, "").trim(),
    title: titleLine.replace(/^\*\*|\*\*$/g, "").trim(),
  };
  const rest = [];
  for (const token of contactLine.split("|").map((t) => t.trim()).filter(Boolean)) {
    if (token.includes("@")) personal_info.email = token;
    else if (token.includes("github.com")) personal_info.github_url = token;
    else if (token.includes("linkedin.com")) {
      personal_info.linkedin = token.replace(/^https?:\/\/(www\.)?/, "");
      personal_info.linkedin_url = token.startsWith("http") ? token : `https://${token}`;
    } else if (/^[0-9+()\-.\s]+$/.test(token)) personal_info.phone = token;
    else rest.push(token);
  }
  personal_info.location = rest.join(", ");
  return personal_info;
}

// ---------------------------------------------------------------------------
// portfolio.yml overlay
// ---------------------------------------------------------------------------
function pickIcon(icons, kind, title) {
  const needle = title.toLowerCase();
  const match = Object.entries(icons?.[kind] ?? {}).find(([key]) => needle.includes(key.toLowerCase()));
  if (match) return match[1];
  warnings.push(`No ${kind} icon in portfolio.yml matches "${title}" — using default`);
  return DEFAULT_ICONS[kind];
}

// "BonVoye — Location-Based ..." -> "BonVoye"
function shortProjectName(name) {
  return name.split(/\s+[—–-]\s+/)[0].trim();
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const SECTION_KINDS = [
  ["summary", /summary|profile|objective/i],
  ["experience", /experience|employment/i],
  ["projects", /project/i],
  ["education", /education/i],
  ["skills", /skill/i],
];

function buildCvData() {
  // HTML comments (e.g. CV Studio's `<!-- career-ops-cv-meta: ... -->`) are not content.
  const raw = readFileSync(CV_MD_PATH, "utf-8").replace(/<!--[\s\S]*?-->/g, "");
  const overlay = loadYaml(readFileSync(PORTFOLIO_YML_PATH, "utf-8")) ?? {};
  const icons = overlay.icons ?? {};
  // Keyed by kind, so "## Professional Summary" or "## Work Experience" (as CV
  // Studio names them for new CVs) read the same as "## Summary"/"## Experience".
  const sections = {};
  for (const { title, content } of splitSections(raw, 2)) {
    const kind = SECTION_KINDS.find(([, re]) => re.test(title))?.[0];
    if (kind && !(kind in sections)) sections[kind] = content;
  }

  const summary = (sections.summary || "").replace(/\s+/g, " ").trim();
  if (!summary) fail("cv.md is missing a '## Summary' section.");

  const work_experience = splitSections(sections.experience || "", 3).map(({ title, content }) => {
    const { boldLine, tech, bullets } = parseEntryBlock(title, content);
    return { company: title, role: boldLine[0], dates: boldLine[1], bullets, tech };
  });

  const projects = splitSections(sections.projects || "", 3).map(({ title, content }) => {
    const { boldLine, tech, bullets, description } = parseEntryBlock(title, content);
    return {
      name: title,
      role: boldLine[0],
      dates: boldLine[1],
      icon: pickIcon(icons, "projects", title),
      description,
      bullets,
      tech,
    };
  });

  const skills = nonEmptyLines(sections.skills || "")
    .map((l) => l.match(/^-\s*\*\*(.+?):\*\*\s*(.+)$/))
    .filter(Boolean)
    .map((m) => ({ category: m[1].trim(), icon: pickIcon(icons, "skills", m[1].trim()), items: m[2].trim() }));

  const education = splitSections(sections.education || "", 3).map(({ title, content }) => {
    const { boldLine, gpa, description } = parseEntryBlock(title, content);
    return {
      school: title,
      degree: boldLine[0],
      dates: boldLine[1],
      gpa: gpa || "",
      icon: pickIcon(icons, "education", title),
      desc: description,
    };
  });

  const assistant = overlay.assistant ?? {};
  if (!assistant.salary_statement) fail("portfolio.yml is missing assistant.salary_statement.");
  const projectSuggestions = projects.map((p) => ({
    text: `Tell me about ${shortProjectName(p.name)}.`,
    topics: ["projects"],
  }));

  return {
    personal_info: parseHeader(raw),
    summary,
    stats: overlay.stats ?? [],
    work_experience,
    projects,
    skills,
    education,
    assistant: {
      name: assistant.name || "AI Assistant",
      salary_statement: assistant.salary_statement.trim(),
      suggestions: [...(assistant.suggestions ?? []), ...projectSuggestions],
    },
    site: {
      api_base: (overlay.site?.api_base || "").replace(/\/+$/, ""),
      web3forms_access_key: overlay.site?.web3forms_access_key || "",
      url: (overlay.site?.url || "").replace(/\/+$/, ""),
    },
  };
}

function main() {
  const check = process.argv.includes("--check");
  ensureCareerOpsLinks({ dryRun: check, fail });

  const json = JSON.stringify(buildCvData(), null, 2) + "\n";
  for (const w of [...new Set(warnings)]) console.warn(`Warning: ${w}`);

  if (check) {
    const current = existsSync(JSON_PATH) ? readFileSync(JSON_PATH, "utf-8") : "";
    if (current !== json) fail(`${rel(JSON_PATH)} is out of date — run \`npm run sync\` and commit the result.`);
    console.log(`${rel(JSON_PATH)} is up to date.`);
    return;
  }

  writeFileSync(JSON_PATH, json, "utf-8");
  console.log(`Wrote ${rel(JSON_PATH)} from ${rel(CV_MD_PATH)} + ${rel(PORTFOLIO_YML_PATH)}`);
}

main();

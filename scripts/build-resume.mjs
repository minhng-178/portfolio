#!/usr/bin/env node
// Renders ui/resume.pdf through career-ops's CV pipeline, so the public resume
// and career-ops's tailored CVs share one template system, the ATS text
// normalisation, the section-order guard and the fact check against cv.md.
//
//   npm run resume                        template = career-ops profile default
//                                         (config/profile.yml → cv.template)
//   npm run resume -- --template=modern   try any other career-ops template
//
//   content/cv.md → CV Studio's parser + core payload mapping (career-ops/web)
//     → build-cv-html.mjs → generate-pdf.mjs (career-ops/output/portfolio-resume.*)
//     → ui/resume.pdf
//
// Reusing the Studio's modules means a CV Studio export of cv.md with the same
// template and paper size is this exact document. Local only: needs the
// career-ops clone (see README).

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { load as loadYaml } from "js-yaml";
import { CAREER_OPS_DIR, ROOT_DIR, careerOpsPresent, ensureCareerOpsLinks, rel } from "./lib/career-ops.mjs";

const CV_MD_PATH = path.join(ROOT_DIR, "content", "cv.md");
const PORTFOLIO_YML_PATH = path.join(ROOT_DIR, "content", "portfolio.yml");
const RESUME_PDF_PATH = path.join(ROOT_DIR, "ui", "resume.pdf");
const STUDIO_LIB_DIR = path.join(CAREER_OPS_DIR, "web", "src", "lib", "cv");
const OUT_DIR = path.join(CAREER_OPS_DIR, "output");
const OUT = (ext) => path.join(OUT_DIR, `portfolio-resume.${ext}`);

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function careerOps(script, args, { capture = false } = {}) {
  try {
    return execFileSync(process.execPath, [script, ...args], {
      cwd: CAREER_OPS_DIR,
      encoding: "utf-8",
      stdio: ["ignore", capture ? "pipe" : "inherit", "inherit"],
    });
  } catch (err) {
    fail(`career-ops ${script} exited with status ${err.status ?? "unknown"} (see output above).`);
  }
}

async function importStudio(file) {
  const full = path.join(STUDIO_LIB_DIR, file);
  if (!existsSync(full)) fail(`${rel(full)} not found — the career-ops checkout needs the CV Studio (branch cv-studio).`);
  return import(pathToFileURL(full).href);
}

async function main() {
  if (!careerOpsPresent()) {
    fail(`career-ops is not cloned at ${rel(CAREER_OPS_DIR)} — see README "How This Site Works".`);
  }
  ensureCareerOpsLinks({ fail });

  const templateArg = process.argv.find((a) => a.startsWith("--template="))?.split("=")[1];
  const overlay = loadYaml(readFileSync(PORTFOLIO_YML_PATH, "utf-8")) ?? {};
  const format = overlay.resume?.format || "letter";
  if (!["letter", "a4"].includes(format)) fail(`resume.format must be letter or a4, got "${format}".`);

  const { parseCvMarkdown } = await importStudio("cv-markdown.mjs");
  const { toCorePayload } = await importStudio("core-render.mjs");
  const { data } = parseCvMarkdown(readFileSync(CV_MD_PATH, "utf-8"));
  // The site itself is the natural "portfolio" contact link.
  const siteUrl = (overlay.site?.url || "").trim();
  if (siteUrl && !data.personal.website) data.personal.website = siteUrl;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT("json"), JSON.stringify(toCorePayload(data, { format }), null, 2) + "\n", "utf-8");

  const template = careerOps("cv-templates.mjs", ["resolve", "cv", ...(templateArg ? [templateArg] : [])], {
    capture: true,
  }).trim();
  console.log(`Template: ${path.relative(CAREER_OPS_DIR, template)}`);

  careerOps("build-cv-html.mjs", [OUT("json"), OUT("html"), template], { capture: true });
  careerOps("generate-pdf.mjs", [OUT("html"), OUT("pdf"), `--format=${format}`]);

  copyFileSync(OUT("pdf"), RESUME_PDF_PATH);
  console.log(`Wrote ${rel(RESUME_PDF_PATH)}`);
}

main();

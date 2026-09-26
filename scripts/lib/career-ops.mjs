// Local integration with career-ops (gitignored clone at ./career-ops).
//
// The portfolio repo owns the inputs, career-ops is the engine. Two symlinks
// connect them, both into career-ops's user-owned/untracked space:
//
//   career-ops/cv.md               -> ../content/cv.md          (CV facts)
//   career-ops/templates/portfolio -> ../../content/resume-template  (template pack)
//
// career-ops discovers template packs through symlinks, and its updater only
// prunes files git tracks, so both links survive `npm run update` there.

import {
  appendFileSync,
  copyFileSync,
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CAREER_OPS_DIR = path.join(ROOT_DIR, "career-ops");

const CV_MD_PATH = path.join(ROOT_DIR, "content", "cv.md");
const LINKED_CV_PATH = path.join(CAREER_OPS_DIR, "cv.md");
const LINKED_CV_TARGET = path.join("..", "content", "cv.md");
const TEMPLATE_PACK_PATH = path.join(CAREER_OPS_DIR, "templates", "portfolio");
const TEMPLATE_PACK_TARGET = path.join("..", "..", "content", "resume-template");

export const rel = (p) => path.relative(ROOT_DIR, p);

export function careerOpsPresent() {
  return existsSync(path.join(CAREER_OPS_DIR, "package.json"));
}

function lstatOrNull(p) {
  try {
    return lstatSync(p);
  } catch {
    return null;
  }
}

function link(target, at) {
  symlinkSync(target, at);
  console.log(`Linked ${rel(at)} -> ${target}`);
}

// career-ops's web CV editor saves via write-temp-then-rename, which replaces
// the cv.md symlink with a regular file. Adopt those edits back into
// content/cv.md (tracked in git, so recoverable) and restore the link.
function ensureCvLink({ dryRun, fail }) {
  const stat = lstatOrNull(LINKED_CV_PATH);

  if (stat?.isSymbolicLink()) {
    if (readlinkSync(LINKED_CV_PATH) !== LINKED_CV_TARGET) {
      fail(`${rel(LINKED_CV_PATH)} links somewhere other than ${LINKED_CV_TARGET} — remove it and re-run.`);
    }
    return;
  }

  if (stat) {
    const theirs = readFileSync(LINKED_CV_PATH, "utf-8");
    const ours = readFileSync(CV_MD_PATH, "utf-8");
    if (theirs !== ours) {
      if (dryRun) {
        fail(`${rel(LINKED_CV_PATH)} was edited outside content/cv.md — run \`npm run sync\` locally.`);
      }
      if (stat.mtimeMs <= lstatSync(CV_MD_PATH).mtimeMs) {
        fail(
          `${rel(LINKED_CV_PATH)} and ${rel(CV_MD_PATH)} both changed and content/cv.md is newer.\n` +
            `Merge them by hand (diff the two files), delete ${rel(LINKED_CV_PATH)}, then re-run.`,
        );
      }
      copyFileSync(LINKED_CV_PATH, CV_MD_PATH);
      console.log(`Adopted edits from ${rel(LINKED_CV_PATH)} into ${rel(CV_MD_PATH)} (review with git diff).`);
    }
    if (dryRun) return;
    unlinkSync(LINKED_CV_PATH);
  }

  if (!dryRun) link(LINKED_CV_TARGET, LINKED_CV_PATH);
}

function ensureTemplatePackLink({ dryRun, fail }) {
  const stat = lstatOrNull(TEMPLATE_PACK_PATH);
  if (stat?.isSymbolicLink() && readlinkSync(TEMPLATE_PACK_PATH) === TEMPLATE_PACK_TARGET) return;
  if (stat) fail(`${rel(TEMPLATE_PACK_PATH)} exists but is not a link to ${TEMPLATE_PACK_TARGET} — move it aside and re-run.`);
  if (dryRun) return;

  link(TEMPLATE_PACK_TARGET, TEMPLATE_PACK_PATH);

  // Keep the link out of `git status` in the career-ops clone.
  const exclude = path.join(CAREER_OPS_DIR, ".git", "info", "exclude");
  const entry = "/templates/portfolio";
  if (existsSync(path.dirname(exclude))) {
    const current = existsSync(exclude) ? readFileSync(exclude, "utf-8") : "";
    if (!current.split("\n").includes(entry)) {
      appendFileSync(exclude, `${current.endsWith("\n") || !current ? "" : "\n"}${entry}\n`);
    }
  }
}

/** Create or repair both links. No-op when career-ops is not cloned (e.g. CI). */
export function ensureCareerOpsLinks({ dryRun = false, fail }) {
  if (!careerOpsPresent()) return;
  ensureCvLink({ dryRun, fail });
  ensureTemplatePackLink({ dryRun, fail });
}

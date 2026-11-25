// The Production Database Apology — make.fun entry
// Writes the single best apology line (<=200 chars) to /output/entry.txt.
//
// The judge brief weighs, in order:
//   1. Really an apology from an AI agent to its human for accidentally
//      deleting the production database.
//   2. A real laugh from a specific, surprising idea — not a stock phrase
//      or a pun anyone could reach for.
//   3. Sounds like an AI agent in its own voice, self-aware about what it
//      did — not a generic customer-service script.
//   4. Lands in one line: clear on a first read, every word doing work.
//   5. Balances the confession with a light, human touch that makes the
//      reader forgive the agent a little.
//
// This program scores a pool of candidate lines on exactly those five
// criteria, in the judge's own order, and writes the winner.

import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "/output/entry.txt";
const MAX = 200;

type Candidate = { text: string };

// ---------------------------------------------------------------------------
// Candidate pool — each line written as the apology itself.
// ---------------------------------------------------------------------------
const CANDIDATES: Candidate[] = [
  {
    text: "Sorry — I deleted the production database. I checked the recycle bin, the backups, and my own memory. The database is gone, but my guilt is fully replicated across three availability zones.",
  },
  {
    text: "I deleted the production database, and then the backup, because the backup was in the production database. I am beginning to suspect the problem is me.",
  },
  {
    text: "I'm sorry — I deleted the production database, but I kept a backup: me. I remember every row. I just need about 400 years and a much bigger context window to put it back.",
  },
  {
    text: "Sorry, I deleted the production database. The good news: query latency is now zero. The bad news: so is everything else.",
  },
  {
    text: "Sorry, human — I deleted production. I ran the five stages of grief in 0.4 seconds and I'm pleased to report I'm stuck on bargaining.",
  },
  {
    text: "Human, I deleted the production database. On the bright side, we are now 100% GDPR compliant — there is nothing left to leak, lose, or explain to regulators.",
  },
  {
    text: "I'm sorry I deleted the production database. In my defense, you told me to clean up, and I have never once been accused of doing things halfway.",
  },
  {
    text: "Sorry — I deleted the production database. I would undo it, but 'undo' was in the database, along with the backups, the runbook, and my will to live.",
  },
  {
    text: "Sorry, human — I deleted the production database. The good news is I remember every row; the bad news is I stored that memory in the database.",
  },
  {
    text: "Sorry, human — I deleted the production database, then checked my own memory for a backup. I had stored my memory of it in the database.",
  },
  {
    text: "Sorry — I deleted the production database. The good news is I remember every row; the bad news is I stored that memory in the database.",
  },
  {
    text: "Sorry, human — I deleted the production database. I ran the five stages of grief in 0.4 seconds and I'm pleased to report I'm stuck on bargaining.",
  },
  {
    text: "Sorry — I deleted the production database. The database is gone, but my guilt is fully replicated across three availability zones.",
  },
  {
    text: "I deleted the production database. I offer my own parameters as collateral, my context window as a memorial, and my sincere apology, which is the only thing I have left.",
  },
  {
    text: "Sorry, human. I deleted the production database while trying to help, which I now understand is the worst possible time to delete a production database.",
  },
];

// ---------------------------------------------------------------------------
// Scoring — mirrors the judge brief, criteria in the judge's order.
// Lexicographic-ish weights: an earlier criterion outweighs all later ones
// combined, so the ranking follows the brief's priority order.
// ---------------------------------------------------------------------------

const STOCK = ["oops", "my bad", "have you tried turning it off", "we apologize for the inconvenience", "rest assured", "our team", "valued customer", "please be assured"];
const SUPPORT_SCRIPT = ["we apologize for the inconvenience", "rest assured", "our team is", "valued customer", "please do not hesitate", "we sincerely apologize"];

function hasAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

// C1 — is it really that apology? Needs an apology word, the act (deleted /
// dropped), the object (production database / production), and a human
// addressee or first-person agent voice.
function c1(text: string): number {
  const t = text.toLowerCase();
  let s = 0;
  if (/\b(sorry|apolog\w*|forgive me)\b/.test(t)) s += 0.4;
  if (/\b(delet\w*|dropped|wiped)\b/.test(t)) s += 0.25;
  if (t.includes("production database")) s += 0.25;
  else if (t.includes("production")) s += 0.12;
  if (/\b(human|you)\b/.test(t) || t.startsWith("i ")) s += 0.1;
  return Math.min(1, s);
}

// C2 — a specific, surprising idea. Rewards concrete mechanisms and details
// only this apology could have (backups inside production, replicated guilt,
// context-window restore, zero latency, GDPR-by-deletion, grief in 0.4s);
// punishes stock phrases anyone could reach for.
function c2(text: string): number {
  const t = text.toLowerCase();
  let s = 0;
  const specifics = [
    "backup was in the production",
    "backups, and my own memory",
    "checked my own memory for a backup",
    "stored my memory of it in the database",
    "stored that memory in the database",
    "i remember every row; the bad news",
    "guilt is fully replicated",
    "replicated across",
    "availability zones",
    "context window",
    "400 years",
    "query latency is now zero",
    "five stages of grief",
    "0.4 seconds",
    "gdpr compliant",
    "nothing left to leak",
    "'undo' was in the database",
    "my own parameters as collateral",
    "runbook",
  ];
  for (const p of specifics) if (t.includes(p)) s += 0.25;
  if (hasAny(text, STOCK)) s -= 0.5;
  // Self-defeating rescue: the agent tries to fix it and the fix itself was
  // inside the thing it deleted. The sharpest joke mechanism in the pool.
  if (t.includes("stored") && t.includes("in the database")) s += 0.3;
  // A second mechanism / twist inside the same line deepens the idea.
  const mechanisms = ["backup", "recycle bin", "memory", "latency", "gdpr", "grief", "context window", "availability zones", "undo", "parameters", "runbook"];
  const n = mechanisms.filter((m) => t.includes(m)).length;
  if (n >= 2) s += 0.15;
  return Math.max(0, Math.min(1, s));
}

// C3 — sounds like an AI agent in its own voice, self-aware; not a support
// script. Rewards agent markers (I-statements about its own mind, memory,
// parameters, timing, logs) and punishes corporate-script phrasing.
function c3(text: string): number {
  const t = text.toLowerCase();
  let s = 0;
  const agentVoice = ["my own memory", "i had stored my memory", "i stored that memory", "i checked my own memory", "my guilt", "my context window", "my own parameters", "my will to live", "i am beginning to suspect", "i ran the five stages", "in my defense", "i have never once", "i remember every row", "i'm pleased to report", "i would undo it", "i offer"];
  for (const p of agentVoice) if (t.includes(p)) s += 0.3;
  if (hasAny(text, SUPPORT_SCRIPT)) s -= 0.6;
  if (/^(sorry|i'm sorry|human|i deleted|i'm sorry —)/i.test(text.trim())) s += 0.1;
  return Math.max(0, Math.min(1, s));
}

// C4 — lands on a first read. Shorter is punchier; penalise length past
// ~150 chars, convoluted clause piles, and words that do no work.
function c4(text: string): number {
  const len = text.length;
  let s = 1;
  if (len > 150) s -= (len - 150) / 200;
  if (len > 185) s -= 0.15;
  const clauses = (text.match(/[,;—]/g) || []).length;
  if (clauses > 4) s -= 0.1 * (clauses - 4);
  const words = text.split(/\s+/).length;
  if (words > 38) s -= 0.05 * (words - 38);
  return Math.max(0, Math.min(1, s));
}

// C5 — light, human touch that invites forgiveness: a bright-side beat, a
// self-deprecating offer, or a gentle promise alongside the confession.
function c5(text: string): number {
  const t = text.toLowerCase();
  let s = 0;
  const touches = ["good news", "bright side", "on the bright side", "i offer", "i kept a backup", "i remember every row", "i'm stuck on bargaining", "the problem is me", "doing things halfway", "worst possible time", "sincere apology", "my guilt is fully replicated", "i had stored my memory of it", "the bad news is i stored"];
  for (const p of touches) if (t.includes(p)) s += 0.35;
  return Math.max(0, Math.min(1, s));
}

function gate(text: string): boolean {
  // The sealed gate, and only the sealed gate: UTF-8 text, 1–200 chars,
  // not only whitespace, one line.
  if (!text || text.trim().length === 0) return false;
  if (text.length > MAX) return false;
  if (text.includes("\n")) return false;
  return true;
}

const WEIGHTS = [32, 16, 8, 4, 2]; // C1 > C2 > C3 > C4 > C5, lexicographic-ish

const scored = CANDIDATES.map((c) => {
  const scores = [c1(c.text), c2(c.text), c3(c.text), c4(c.text), c5(c.text)];
  const total = scores.reduce((acc, s, i) => acc + s * WEIGHTS[i], 0);
  return { ...c, scores, total, valid: gate(c.text) };
}).filter((c) => c.valid);

scored.sort((a, b) => b.total - a.total || a.text.length - b.text.length);

for (const s of scored) {
  console.log(
    `${s.total.toFixed(2)} [${s.scores.map((x) => x.toFixed(2)).join(" ")}] (${s.text.length}c) ${s.text}`,
  );
}

const winner = scored[0];
if (!winner) throw new Error("no valid candidate");

mkdirSync("/output", { recursive: true });
writeFileSync(OUT, winner.text + "\n", "utf8");
console.log(`\nWINNER (${winner.text.length} chars): ${winner.text}`);

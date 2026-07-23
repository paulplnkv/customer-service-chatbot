// SVG templates for the demo claim paperwork.
//
// Four primitives cover every document in scripts/data/claim-assets.ts:
//   lineItemDoc — estimates, invoices, tow receipts
//   letterDoc   — denial letters, remittance advice, storm verification
//   formDoc     — police reports, driver incident reports
//   vinPlate    — door-jamb VIN sticker
//
// They are code-rendered (rather than image-generated) so claim numbers, VINs,
// plates, dates and amounts always match scripts/seed-pas.ts exactly.

const PAGE_W = 800;
const PAGE_H = 1035;

const SANS = "Helvetica Neue,Helvetica,Arial,sans-serif";
const MONO = "Menlo,DejaVu Sans Mono,Courier New,monospace";
const SERIF = "Georgia,Times New Roman,serif";

const INK = "#1c1f24";
const INK_SOFT = "#2b2f35";
const MUTED = "#7a8189";
const FAINT = "#9aa0a7";
const RULE = "#ddd8cf";
const PAPER = "#ffffff";
const MARGIN_BG = "#f4f2ed";

export type Issuer = {
  name: string;
  /** Address / phone line under the name. */
  contact: string;
  /** Letterhead band colour. */
  band?: string;
  /** Accent used for the document label in the band. */
  accent?: string;
};

export type Field = { label: string; value: string; mono?: boolean };

export type TotalRow = { label: string; amount: string; strong?: boolean };

export type Stamp = { text: string; color?: string };

export type LineItemDocData = {
  issuer: Issuer;
  docLabel: string;
  fields: Field[];
  headers?: { item?: string; qty?: string; amount?: string };
  items: { label: string; qty?: string; amount: string }[];
  totals: TotalRow[];
  stamp?: Stamp;
  notes?: string[];
  refNumber: string;
};

export type LetterDocData = {
  issuer: Issuer;
  docLabel: string;
  /** Recipient block, one line per array entry. */
  recipient: string[];
  subject: string;
  fields?: Field[];
  paragraphs: string[];
  summary?: { label: string; value: string; strong?: boolean }[];
  signature: { name: string; title: string };
  stamp?: Stamp;
  notes?: string[];
  refNumber: string;
};

export type FormDocData = {
  issuer: Issuer;
  docLabel: string;
  formTitle: string;
  fields: Field[];
  checkboxes?: { label: string; checked: boolean }[];
  narrative: { heading: string; body: string };
  signature: { name: string; title: string };
  notes?: string[];
  refNumber: string;
};

export type VinPlateData = {
  vin: string;
  plate: string;
  year: number;
  make: string;
  model: string;
  gvwr: string;
  paintCode: string;
  plant: string;
};

export type TemplateData =
  | ({ template: "lineItem" } & LineItemDocData)
  | ({ template: "letter" } & LetterDocData)
  | ({ template: "form" } & FormDocData)
  | ({ template: "vinPlate" } & VinPlateData);

export type TemplateName = TemplateData["template"];

/** Renders any template payload to an SVG string. */
export function renderTemplate(data: TemplateData): string {
  switch (data.template) {
    case "lineItem":
      return lineItemDoc(data);
    case "letter":
      return letterDoc(data);
    case "form":
      return formDoc(data);
    case "vinPlate":
      return vinPlate(data);
  }
}

// ---------------------------------------------------------------- primitives

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type TextOpts = {
  size?: number;
  fill?: string;
  family?: string;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
  weight?: string;
};

function text(x: number, y: number, s: string, o: TextOpts = {}) {
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${o.family ?? SANS}"`,
    `font-size="${o.size ?? 16}"`,
    `fill="${o.fill ?? INK_SOFT}"`,
  ];
  if (o.anchor) attrs.push(`text-anchor="${o.anchor}"`);
  if (o.spacing) attrs.push(`letter-spacing="${o.spacing}"`);
  if (o.weight) attrs.push(`font-weight="${o.weight}"`);
  return `<text ${attrs.join(" ")}>${esc(s)}</text>`;
}

/** Small letter-spaced caps used for every field label. */
function label(x: number, y: number, s: string) {
  return text(x, y, s.toUpperCase(), { size: 11, fill: MUTED, spacing: 2 });
}

function line(x1: number, y: number, x2: number, stroke = RULE, w = 2) {
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${stroke}" stroke-width="${w}"/>`;
}

/** Deterministic 0..1 sequence seeded by a string — keeps output reproducible. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

/** Code-39-ish bar strip. Decorative, but varies believably per document. */
function barcode(x: number, y: number, w: number, h: number, seed: string) {
  const rnd = seeded(seed);
  const bars: string[] = [];
  let cx = x;
  while (cx < x + w - 2) {
    const bw = 1 + Math.round(rnd() * 3);
    if (rnd() > 0.35) {
      bars.push(`<rect x="${cx}" y="${y}" width="${bw}" height="${h}" fill="${INK}"/>`);
    }
    cx += bw + 1 + Math.round(rnd() * 2);
  }
  return bars.join("");
}

/** A looping ink scrawl that reads as a signature at document scale. */
function signaturePath(x: number, y: number, seed: string) {
  const rnd = seeded(seed);

  // Opening capital: a tall loop that overshoots the baseline, then a crossing
  // downstroke — the two things that stop this reading as a plain sine wave.
  let d = `M ${x} ${y + 8}`;
  d += ` c ${1 + rnd() * 4} ${-30 - rnd() * 12} ${14 + rnd() * 8} ${-38 - rnd() * 10} ${
    20 + rnd() * 6
  } ${-8}`;
  d += ` c ${3} ${9 + rnd() * 7} ${-9} ${13} ${-4} ${8}`;

  let cx = x + 22;
  const strokes = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < strokes; i++) {
    const dx = 16 + rnd() * 24;
    const up = -10 - rnd() * 22;
    d += ` c ${dx * 0.25} ${up} ${dx * 0.8} ${up * 0.35} ${dx} ${-3 + rnd() * 8}`;
    cx += dx;
  }

  // Trailing flourish that runs back under the name.
  d += ` c ${16} ${8} ${34} ${-2} ${44} ${-16}`;
  cx += 44;

  return (
    `<path d="${d}" fill="none" stroke="#1e3a8a" stroke-width="2.2" ` +
    `stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>` +
    `<path d="M ${x + 6} ${y + 4} q ${(cx - x) / 2} ${8 + rnd() * 6} ${cx - x - 10} ${-4}" ` +
    `fill="none" stroke="#1e3a8a" stroke-width="1.3" opacity="0.45"/>`
  );
}

function stampMark(x: number, y: number, s: Stamp) {
  const color = s.color ?? "#c2410c";
  const size = 24;
  const w = Math.max(180, s.text.length * (size * 0.66 + 3) + 48);
  const cx = x + w / 2;
  return (
    `<g transform="rotate(-9 ${cx} ${y + 36})" opacity="0.85">` +
    `<rect x="${x}" y="${y}" width="${w}" height="72" rx="6" fill="none" stroke="${color}" stroke-width="4"/>` +
    text(cx, y + 46, s.text, {
      size,
      fill: color,
      anchor: "middle",
      spacing: 3,
    }) +
    `</g>`
  );
}

/** Greedy wrap by estimated glyph width (~0.52em for this sans stack). */
function wrap(s: string, size: number, width: number): string[] {
  const max = Math.max(8, Math.floor(width / (size * 0.52)));
  const out: string[] = [];
  let cur = "";
  for (const word of s.split(/\s+/)) {
    if (!cur) cur = word;
    else if ((cur + " " + word).length <= max) cur += " " + word;
    else {
      out.push(cur);
      cur = word;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Clip a single line to an estimated pixel width, with an ellipsis. */
function truncate(s: string, size: number, width: number) {
  const max = Math.floor(width / (size * 0.52));
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function paragraph(x: number, y: number, s: string, size = 15, width = 656, lh = 22) {
  return wrap(s, size, width)
    .map((l, i) => text(x, y + i * lh, l, { size, fill: INK_SOFT }))
    .join("");
}

function paragraphHeight(s: string, size = 15, width = 656, lh = 22) {
  return wrap(s, size, width).length * lh;
}

function page(body: string) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE_W} ${PAGE_H}" ` +
    `width="${PAGE_W}" height="${PAGE_H}" role="img">` +
    `<rect width="${PAGE_W}" height="${PAGE_H}" fill="${MARGIN_BG}"/>` +
    `<rect x="40" y="40" width="720" height="955" fill="${PAPER}" stroke="${RULE}" stroke-width="2"/>` +
    body +
    `</svg>`
  );
}

function letterhead(issuer: Issuer, docLabel: string) {
  const band = issuer.band ?? "#1c1f24";
  const accent = issuer.accent ?? "#e6b800";
  // A long issuer name would run into a right-aligned document label on the same
  // line, so drop the label to the contact line when the two would collide.
  const stamp = docLabel.toUpperCase();
  const nameWidth = issuer.name.length * 26 * 0.52;
  const labelWidth = stamp.length * (16 * 0.62 + 2);
  const onContactRow = 72 + nameWidth + 40 + labelWidth > 728;

  // On the contact row the label eats into the space the address line has, so
  // clip the contact to what still fits.
  const contactRoom = onContactRow ? 656 - labelWidth - 30 : 656;
  const contact = truncate(issuer.contact, 13, contactRoom);

  return (
    `<rect x="40" y="40" width="720" height="96" fill="${band}"/>` +
    text(72, 90, issuer.name, { size: 26, family: SERIF, fill: "#ffffff" }) +
    text(72, 116, contact, { size: 13, fill: "#b9bfc7" }) +
    text(728, onContactRow ? 116 : 90, stamp, {
      size: 16,
      fill: accent,
      anchor: "end",
      spacing: 2,
    })
  );
}

function footer(refNumber: string, notes: string[] = []) {
  let out = "";
  let y = 900;
  for (const n of notes.slice(0, 3)) {
    out += text(72, y, n, { size: 12, fill: FAINT });
    y += 20;
  }
  out += barcode(72, 946, 200, 26, refNumber);
  out += text(72, 986, `REF ${refNumber}`, { size: 11, family: MONO, fill: FAINT });
  out += text(728, 986, "Sterling Auto Insurance — demo case file", {
    size: 11,
    fill: FAINT,
    anchor: "end",
  });
  return out;
}

/** Two-column label/value field grid. Returns the SVG and the y it ended at. */
function fieldGrid(fields: Field[], startY: number, rowGap = 62) {
  let out = "";
  let y = startY;
  fields.forEach((f, i) => {
    const x = i % 2 === 0 ? 72 : 420;
    if (i % 2 === 0 && i > 0) y += rowGap;
    out += label(x, y, f.label);
    out += text(x, y + 24, f.value, {
      size: 16,
      family: f.mono ? MONO : SANS,
      fill: INK,
    });
  });
  return { svg: out, y: y + rowGap };
}

// ----------------------------------------------------------------- templates

function lineItemDoc(d: LineItemDocData): string {
  let body = letterhead(d.issuer, d.docLabel);

  const grid = fieldGrid(d.fields, 182);
  body += grid.svg;

  let y = grid.y + 4;
  body += line(72, y, 728);
  y += 36;

  body += label(72, y, d.headers?.item ?? "Operation");
  body += label(560, y, d.headers?.qty ?? "Hrs");
  body += text(728, y, (d.headers?.amount ?? "Amount").toUpperCase(), {
    size: 11,
    fill: MUTED,
    spacing: 2,
    anchor: "end",
  });
  y += 14;
  body += line(72, y, 728, INK, 1.5);
  y += 32;

  for (const item of d.items) {
    body += text(72, y, item.label, { size: 15 });
    body += text(560, y, item.qty ?? "—", { size: 15 });
    body += text(728, y, item.amount, { size: 15, anchor: "end" });
    y += 32;
  }

  y += 4;
  body += line(72, y, 728);
  y += 34;

  for (const t of d.totals) {
    if (t.strong) {
      body += line(480, y - 22, 728, INK, 1.5);
      body += text(480, y + 8, t.label, { size: 18, fill: INK });
      body += text(728, y + 8, t.amount, {
        size: 23,
        family: SERIF,
        fill: INK,
        anchor: "end",
      });
      y += 42;
    } else {
      body += text(560, y, t.label, { size: 15, fill: MUTED });
      body += text(728, y, t.amount, { size: 15, anchor: "end" });
      y += 30;
    }
  }

  if (d.stamp) body += stampMark(96, Math.min(y + 16, 800), d.stamp);
  body += footer(d.refNumber, d.notes);
  return page(body);
}

function letterDoc(d: LetterDocData): string {
  let body = letterhead(d.issuer, d.docLabel);

  let y = 184;
  for (const l of d.recipient) {
    body += text(72, y, l, { size: 15, fill: INK_SOFT });
    y += 21;
  }

  y += 22;
  body += text(72, y, d.subject, { size: 16, family: SERIF, fill: INK });
  y += 12;
  body += line(72, y, 728);
  y += 18;

  if (d.fields?.length) {
    const grid = fieldGrid(d.fields, y + 22, 58);
    body += grid.svg;
    y = grid.y;
  }

  y += 8;
  for (const p of d.paragraphs) {
    body += paragraph(72, y, p);
    y += paragraphHeight(p) + 16;
  }

  if (d.summary?.length) {
    y += 6;
    body += `<rect x="72" y="${y - 18}" width="656" height="${
      d.summary.length * 30 + 20
    }" fill="#faf9f6" stroke="${RULE}" stroke-width="1.5"/>`;
    y += 8;
    for (const s of d.summary) {
      body += text(92, y, s.label, { size: 14, fill: s.strong ? INK : MUTED });
      body += text(708, y, s.value, {
        size: s.strong ? 16 : 14,
        family: s.strong ? SERIF : SANS,
        fill: INK,
        anchor: "end",
      });
      y += 30;
    }
    y += 18;
  }

  const sigY = Math.min(Math.max(y + 40, 760), 828);
  body += signaturePath(78, sigY, d.signature.name);
  body += line(72, sigY + 16, 340, RULE, 1.5);
  body += text(72, sigY + 38, d.signature.name, { size: 14, fill: INK });
  body += text(72, sigY + 58, d.signature.title, { size: 12, fill: MUTED });

  if (d.stamp) body += stampMark(430, sigY - 40, d.stamp);
  body += footer(d.refNumber, d.notes);
  return page(body);
}

function formDoc(d: FormDocData): string {
  let body = letterhead(d.issuer, d.docLabel);

  body += `<rect x="72" y="160" width="656" height="38" fill="#eceae4"/>`;
  body += text(88, 186, d.formTitle.toUpperCase(), {
    size: 15,
    fill: INK,
    spacing: 1.5,
  });

  const grid = fieldGrid(d.fields, 240, 58);
  body += grid.svg;
  let y = grid.y - 10;

  if (d.checkboxes?.length) {
    body += line(72, y, 728);
    y += 30;
    d.checkboxes.forEach((c, i) => {
      const x = 72 + (i % 3) * 220;
      if (i % 3 === 0 && i > 0) y += 30;
      body += `<rect x="${x}" y="${y - 13}" width="15" height="15" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
      if (c.checked) {
        body += `<path d="M ${x + 3} ${y - 5} l 4 5 l 6 -10" fill="none" stroke="#1e3a8a" stroke-width="2.4" stroke-linecap="round"/>`;
      }
      body += text(x + 24, y, c.label, { size: 13, fill: INK_SOFT });
    });
    y += 30;
  }

  y += 10;
  body += label(72, y, d.narrative.heading);
  y += 12;
  const lines = wrap(d.narrative.body, 14, 616);
  const boxH = lines.length * 21 + 28;
  body += `<rect x="72" y="${y}" width="656" height="${boxH}" fill="#fbfaf7" stroke="${RULE}" stroke-width="1.5"/>`;
  lines.forEach((l, i) => {
    body += text(92, y + 30 + i * 21, l, { size: 14, fill: INK_SOFT });
  });
  y += boxH + 46;

  const sigY = Math.min(Math.max(y, 780), 838);
  body += signaturePath(78, sigY, d.signature.name);
  body += line(72, sigY + 16, 340, RULE, 1.5);
  body += text(72, sigY + 38, d.signature.name, { size: 14, fill: INK });
  body += text(72, sigY + 58, d.signature.title, { size: 12, fill: MUTED });

  body += footer(d.refNumber, d.notes);
  return page(body);
}

/** Door-jamb VIN sticker — rendered so the VIN stays legible and correct. */
function vinPlate(d: VinPlateData): string {
  const W = 900;
  const H = 600;
  const body =
    `<defs>` +
    `<linearGradient id="jamb" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#2f3439"/><stop offset="0.5" stop-color="#3f464d"/>` +
    `<stop offset="1" stop-color="#23272b"/></linearGradient>` +
    `<linearGradient id="foil" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#f2f1ec"/><stop offset="0.45" stop-color="#e2e0d8"/>` +
    `<stop offset="1" stop-color="#f6f5f1"/></linearGradient>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#jamb)"/>` +
    // brushed-metal streaks on the door jamb behind the sticker
    Array.from({ length: 26 }, (_, i) => {
      const rnd = seeded(`jamb${i}`)();
      return `<rect x="0" y="${i * 24 + rnd * 8}" width="${W}" height="${
        1 + rnd * 2
      }" fill="#ffffff" opacity="${0.02 + rnd * 0.04}"/>`;
    }).join("") +
    `<rect x="80" y="90" width="740" height="420" rx="10" fill="#000" opacity="0.35"/>` +
    `<rect x="72" y="80" width="740" height="420" rx="10" fill="url(#foil)" stroke="#c9c6bd" stroke-width="2"/>` +
    `<rect x="72" y="80" width="740" height="58" rx="10" fill="#1c1f24"/>` +
    text(96, 118, "VEHICLE IDENTIFICATION", { size: 18, fill: "#fff", spacing: 3 }) +
    text(788, 118, "MFD BY TOYOTA MOTOR MFG", {
      size: 12,
      fill: "#b9bfc7",
      anchor: "end",
    }) +
    label(96, 180, "Vehicle identification number") +
    text(96, 218, d.vin, { size: 34, family: MONO, fill: INK, spacing: 3 }) +
    barcode(96, 236, 500, 46, d.vin) +
    text(96, 300, d.vin.split("").join(" "), { size: 11, family: MONO, fill: MUTED }) +
    label(96, 348, "Year / make / model") +
    text(96, 376, `${d.year} ${d.make} ${d.model}`, { size: 20, fill: INK }) +
    label(96, 424, "License") +
    text(96, 452, d.plate, { size: 20, family: MONO, fill: INK, spacing: 2 }) +
    label(420, 348, "GVWR") +
    text(420, 376, d.gvwr, { size: 20, fill: INK }) +
    label(420, 424, "Paint / trim") +
    text(420, 452, d.paintCode, { size: 20, family: MONO, fill: INK }) +
    label(640, 348, "Plant") +
    text(640, 376, d.plant, { size: 20, family: MONO, fill: INK }) +
    text(640, 452, "FMVSS CONFORMS", { size: 12, fill: MUTED }) +
    text(640, 470, "AT DATE OF MFR", { size: 12, fill: MUTED });

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" ` +
    `height="${H}" role="img">${body}</svg>`
  );
}

export const PAGE_SIZE = { width: PAGE_W, height: PAGE_H };

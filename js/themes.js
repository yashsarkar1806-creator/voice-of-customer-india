
/** Keyword theme + sentiment tagging on English text (after translation). */
export const THEMES = [
  { id: "delivery", label: "Delivery / logistics", patterns: [/deliver/i, /late/i, /shipping/i, /courier/i, /track/i, /arrived/i, /week/i, /days? late/i] },
  { id: "packaging", label: "Packaging / product condition", patterns: [/packag/i, /leak/i, /broken/i, /bottle/i, /damaged/i, /seal/i] },
  { id: "product_quality", label: "Product quality", patterns: [/quality/i, /cream/i, /product/i, /result/i, /work(s|ed)?/i, /good/i, /fine/i] },
  { id: "support", label: "Customer support", patterns: [/support/i, /customer care/i, /refund/i, /whatsapp/i, /reply/i, /phone/i, /email/i, /mail/i] },
  { id: "pricing", label: "Price / value", patterns: [/price/i, /expensive/i, /cost/i, /value/i, /worth/i, /high/i] },
  { id: "sizing", label: "Fit / sizing", patterns: [/size/i, /fit/i, /chart/i, /small/i, /large/i] },
  { id: "recommend", label: "Advocacy / repurchase", patterns: [/recommend/i, /friend/i, /order again/i, /5 star/i, /happy/i, /love/i] },
];

const POS = [/good/i, /great/i, /super/i, /happy/i, /love/i, /recommend/i, /again/i, /quick/i, /excellent/i, /fine/i, /5 star/i];
const NEG = [/late/i, /bad/i, /leak/i, /broken/i, /no reply/i, /did not/i, /didn't/i, /fail/i, /poor/i, /misleading/i, /expensive/i, /week/i];

export function tagThemes(englishText) {
  const hits = THEMES.filter((t) => t.patterns.some((re) => re.test(englishText))).map((t) => t.label);
  return hits.length ? hits : ["General feedback"];
}

export function scoreSentiment(englishText) {
  let score = 0;
  POS.forEach((re) => { if (re.test(englishText)) score += 1; });
  NEG.forEach((re) => { if (re.test(englishText)) score -= 1; });
  if (score > 0) return { label: "Positive", className: "sent-pos", score };
  if (score < 0) return { label: "Negative", className: "sent-neg", score };
  return { label: "Neutral / mixed", className: "sent-neu", score };
}

/** Map themes to likely NPS drivers for CX storytelling. */
export function npsDrivers(themes, sentimentLabel) {
  const drivers = [];
  const joined = themes.join(" | ").toLowerCase();
  if (joined.includes("delivery") || joined.includes("packaging")) drivers.push("Promoter risk: operations reliability");
  if (joined.includes("support")) drivers.push(sentimentLabel === "Positive" ? "Promoter lever: support speed" : "Detractor risk: support responsiveness");
  if (joined.includes("product")) drivers.push("Core product experience");
  if (joined.includes("price") || joined.includes("pricing")) drivers.push("Value-for-money perception");
  if (joined.includes("advocacy") || joined.includes("repurchase")) drivers.push("Promoter lever: advocacy");
  if (joined.includes("fit") || joined.includes("sizing")) drivers.push("PDP / sizing clarity");
  if (!drivers.length) drivers.push("Uncategorised voice signal — review manually");
  return drivers;
}

export function summariseRows(rows) {
  const total = rows.length;
  const pos = rows.filter((r) => r.sentiment === "Positive").length;
  const neg = rows.filter((r) => r.sentiment === "Negative").length;
  const neu = total - pos - neg;
  const themeCounts = {};
  rows.forEach((r) => r.themes.forEach((t) => { themeCounts[t] = (themeCounts[t] || 0) + 1; }));
  const topThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { total, pos, neg, neu, topThemes };
}

export function toCsv(rows) {
  const headers = ["id", "source", "language", "original_text", "english_text", "sentiment", "themes", "nps_drivers", "mode"];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    lines.push([
      r.id, r.source, r.language, r.original, r.english, r.sentiment,
      r.themes.join("; "), r.drivers.join("; "), r.mode,
    ].map(escape).join(","));
  });
  return lines.join("\n");
}

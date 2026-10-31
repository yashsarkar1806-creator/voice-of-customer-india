
import { translateToEnglish, speechToEnglish } from "./sarvam.js";
import { tagThemes, scoreSentiment, npsDrivers, summariseRows, toCsv } from "./themes.js";

const KEY_STORAGE = "voc_india_sarvam_key";
const $ = (id) => document.getElementById(id);

let rows = [];

function getKey() {
  return ($("api-key").value || "").trim() || localStorage.getItem(KEY_STORAGE) || "";
}

function setBadge() {
  const key = getKey();
  const b = $("mode-badge");
  if (key) { b.className = "pill live"; b.textContent = "Live Sarvam mode"; }
  else { b.className = "pill demo"; b.textContent = "Demo / synthetic mode"; }
}

function analyseEnglish(english, meta) {
  const themes = tagThemes(english);
  const sent = scoreSentiment(english);
  const drivers = npsDrivers(themes, sent.label);
  return {
    id: meta.id,
    source: meta.source,
    language: meta.language,
    original: meta.original,
    english,
    sentiment: sent.label,
    sentimentClass: sent.className,
    themes,
    drivers,
    mode: meta.mode,
  };
}

function render() {
  const tbody = $("tbody");
  tbody.innerHTML = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escape(r.id)}<div class="status">${escape(r.mode)}</div></td>
      <td>${escape(r.language)}</td>
      <td>${escape(r.original)}</td>
      <td>${escape(r.english)}</td>
      <td class="${r.sentimentClass}">${escape(r.sentiment)}</td>
      <td>${escape(r.themes.join(", "))}</td>
      <td>${escape(r.drivers.join("; "))}</td>`;
    tbody.appendChild(tr);
  });
  const s = summariseRows(rows);
  $("stats").innerHTML = `
    <div class="stat"><strong>${s.total}</strong><span>Items analysed</span></div>
    <div class="stat"><strong>${s.pos}</strong><span>Positive</span></div>
    <div class="stat"><strong>${s.neu}</strong><span>Neutral / mixed</span></div>
    <div class="stat"><strong>${s.neg}</strong><span>Negative</span></div>
    <div class="stat"><strong>${s.topThemes[0] ? s.topThemes[0][0] : "—"}</strong><span>Top theme</span></div>`;
}

function escape(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

async function loadSynthetic() {
  $("status").textContent = "Loading synthetic sample pack…";
  const data = await fetch("data/sample-reviews.json").then((r) => r.json());
  rows = data.reviews.map((r) => analyseEnglish(r.english_translation, {
    id: r.id,
    source: r.source,
    language: r.language_hint,
    original: r.original_text,
    mode: "SYNTHETIC demo (no API)",
  }));
  render();
  $("status").textContent = `${data.label}`;
}

async function analysePaste() {
  const text = $("paste").value.trim();
  if (!text) { $("status").textContent = "Paste at least one review."; return; }
  const chunks = text.split(/\n+/).map((t) => t.trim()).filter(Boolean);
  const apiKey = getKey();
  $("run-paste").disabled = true;
  const built = [];
  try {
    for (let i = 0; i < chunks.length; i++) {
      const original = chunks[i];
      let english = original;
      let language = $("src-lang").value;
      let mode = "English assumed (no key)";
      if (apiKey) {
        $("status").textContent = `Translating ${i + 1}/${chunks.length} with Sarvam…`;
        const out = await translateToEnglish(apiKey, original, language === "auto" ? "auto" : language);
        english = out.text || original;
        language = out.detected || language;
        mode = "Sarvam translate → EN";
      } else if (language !== "en-IN" && language !== "auto") {
        mode = "Demo: English analysis skipped translation (add key for live Sarvam)";
      }
      built.push(analyseEnglish(english, {
        id: `P-${Date.now()}-${i + 1}`,
        source: "pasted_text",
        language,
        original,
        mode,
      }));
    }
    rows = built;
    render();
    $("status").textContent = apiKey
      ? `Analysed ${built.length} review(s) with Sarvam translate.`
      : `Analysed ${built.length} line(s) locally. Add a Sarvam key to translate Indian-language text first.`;
  } catch (err) {
    $("status").textContent = `Error: ${err.message}`;
  } finally {
    $("run-paste").disabled = false;
  }
}

async function analyseAudio() {
  const file = $("audio").files?.[0];
  if (!file) { $("status").textContent = "Choose an audio file first (≤ ~30s for Sarvam REST)."; return; }
  const apiKey = getKey();
  if (!apiKey) {
    $("status").textContent = "Voice notes need a Sarvam API key (Saaras speech-to-text, mode=translate).";
    return;
  }
  $("run-audio").disabled = true;
  $("status").textContent = "Transcribing + translating with Sarvam Saaras…";
  try {
    const out = await speechToEnglish(apiKey, file);
    const row = analyseEnglish(out.text, {
      id: `A-${Date.now()}`,
      source: file.name,
      language: out.language,
      original: `[audio] ${file.name}`,
      mode: "Sarvam STT translate → EN",
    });
    rows = [row, ...rows];
    render();
    $("status").textContent = "Voice note analysed.";
  } catch (err) {
    $("status").textContent = `Audio error: ${err.message}`;
  } finally {
    $("run-audio").disabled = false;
  }
}

function downloadCsv() {
  if (!rows.length) { $("status").textContent = "Nothing to export yet."; return; }
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "voice-of-customer-india.csv";
  a.click();
}

function init() {
  const saved = localStorage.getItem(KEY_STORAGE) || "";
  if (saved) $("api-key").value = saved;
  setBadge();
  $("save-key").addEventListener("click", () => {
    const key = $("api-key").value.trim();
    if (key) localStorage.setItem(KEY_STORAGE, key); else localStorage.removeItem(KEY_STORAGE);
    setBadge();
  });
  $("clear-key").addEventListener("click", () => {
    $("api-key").value = ""; localStorage.removeItem(KEY_STORAGE); setBadge();
  });
  $("api-key").addEventListener("input", setBadge);
  $("load-sample").addEventListener("click", loadSynthetic);
  $("run-paste").addEventListener("click", analysePaste);
  $("run-audio").addEventListener("click", analyseAudio);
  $("export").addEventListener("click", downloadCsv);
  loadSynthetic();
}

init();


export const SARVAM_BASE = "https://api.sarvam.ai";

export async function translateToEnglish(apiKey, input, sourceLanguageCode = "auto") {
  const res = await fetch(`${SARVAM_BASE}/translate`, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      source_language_code: sourceLanguageCode,
      target_language_code: "en-IN",
      model: "mayura:v1",
      mode: "formal",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || data?.message || `HTTP ${res.status}`);
  return {
    text: data.translated_text || data.translatedText || "",
    detected: data.source_language_code || sourceLanguageCode,
  };
}

/** Speech-to-text with translate mode → English transcript. Max ~30s on REST. */
export async function speechToEnglish(apiKey, file) {
  const form = new FormData();
  form.append("file", file);
  form.append("model", "saaras:v4");
  form.append("mode", "translate");
  const res = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": apiKey },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || data?.message || `HTTP ${res.status}`);
  return {
    text: data.transcript || "",
    language: data.language_code || "unknown",
  };
}


import test from "node:test";
import assert from "node:assert/strict";
import { tagThemes, scoreSentiment, npsDrivers, summariseRows, toCsv } from "../js/themes.js";

test("tags delivery and support themes", () => {
  const themes = tagThemes("Delivery was late and customer care did not reply");
  assert.ok(themes.some((t) => /Delivery/i.test(t)));
  assert.ok(themes.some((t) => /support/i.test(t)));
});

test("scores negative sentiment for leak/late language", () => {
  const s = scoreSentiment("The bottle was leaking and delivery was late");
  assert.equal(s.label, "Negative");
});

test("scores positive sentiment for recommend language", () => {
  const s = scoreSentiment("Very happy, I will recommend to a friend and order again");
  assert.equal(s.label, "Positive");
});

test("maps themes to nps drivers", () => {
  const d = npsDrivers(["Customer support", "Delivery / logistics"], "Negative");
  assert.ok(d.length >= 1);
  assert.ok(d.some((x) => /support|operations/i.test(x)));
});

test("csv export includes header and rows", () => {
  const csv = toCsv([{
    id: "1", source: "paste", language: "hi-IN", original: "x", english: "y",
    sentiment: "Positive", themes: ["Advocacy / repurchase"], drivers: ["Promoter lever: advocacy"], mode: "demo",
  }]);
  assert.match(csv, /^id,source/);
  assert.match(csv, /Promoter lever: advocacy/);
});

test("summarise counts sentiments", () => {
  const s = summariseRows([
    { sentiment: "Positive", themes: ["A"] },
    { sentiment: "Negative", themes: ["A", "B"] },
    { sentiment: "Neutral / mixed", themes: ["B"] },
  ]);
  assert.equal(s.total, 3);
  assert.equal(s.pos, 1);
  assert.equal(s.neg, 1);
});

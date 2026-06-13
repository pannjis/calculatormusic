"use strict";

const PRESETS = {
  default:  { admin: 9.5, premi: 0.5, service: 4.5, fixed: 0 },
  nonstar:  { admin: 9.5,  premi: 0.5, service: 4.5, fixed: 0 },
  star:     { admin: 7.5,  premi: 0.5, service: 4.0, fixed: 0 },
  starplus: { admin: 5.5,  premi: 0.5, service: 4.0, fixed: 0 },
};

const $ = (id) => document.getElementById(id);
const rupiah = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");
const parseNum = (str) => {
  if (!str) return 0;
  const d = String(str).replace(/[^\d]/g, "");
  return d ? parseInt(d, 10) : 0;
};
const pct = (id) => { const v = parseFloat($(id).value); return isNaN(v) ? 0 : v / 100; };

let mode = "earning";
let platform = "shopee";

// Format ribuan
function attachFormat(el) {
  if (!el) return;
  el.addEventListener("input", () => {
    const raw = parseNum(el.value);
    el.value = raw ? raw.toLocaleString("id-ID") : "";
  });
}
["sellPrice", "costPrice", "costPrice2", "targetValue", "ttSellPrice", "ttCostPrice", "ttCostPrice2", "ttTargetValue"].forEach((id) => attachFormat($(id)));

function getActiveMode() {
  if (platform === "shopee") return mode;
  return mode === "earning" ? "tiktokEarning" : "tiktokPricing";
}

// Core
function getFees() {
  return { admin: pct("adminRate"), premi: pct("premiRate"), service: pct("serviceRate"), fixed: parseNum($("fixedFee").value) };
}

function breakdown(price) {
  const f = getFees();
  const admin = Math.round(price * f.admin);
  const premi = Math.round(price * f.premi);
  const service = Math.round(price * f.service);
  const total = admin + premi + service + f.fixed;
  return { price, admin, premi, service, fixed: f.fixed, total, net: price - total };
}

// Render
function showResult() {
  $("emptyState").hidden = true;
  $("emptyState").style.display = "none";
  $("resultContent").hidden = false;
  $("resultContent").style.display = "block";
  setTimeout(() => { $("resultHero").scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
}
function resetResult() {
  $("emptyState").hidden = false;
  $("emptyState").style.display = "";
  $("resultContent").hidden = true;
  $("resultContent").style.display = "none";
}

function fillBreakdown(b) {
  $("rSubtotal").textContent = rupiah(b.price);
  $("rProduct").textContent = rupiah(b.price);
  $("rAdmin").textContent = "-" + rupiah(b.admin);
  $("rPremi").textContent = "-" + rupiah(b.premi);
  $("rService").textContent = "-" + rupiah(b.service);
  $("rFeesTotal").textContent = "-" + rupiah(b.total);
  $("rNet").textContent = rupiah(b.net);
  if (b.fixed > 0) { $("rowFixed").hidden = false; $("rFixed").textContent = "-" + rupiah(b.fixed); }
  else { $("rowFixed").hidden = true; }
}

function fillProfit(net, cost) {
  if (cost <= 0) { $("profitPanel").hidden = true; return; }
  const profit = net - cost;
  const margin = net > 0 ? (profit / net) * 100 : 0;
  $("rCost").textContent = rupiah(cost);
  $("rProfit").textContent = rupiah(profit);
  $("rMargin").textContent = margin.toFixed(1) + "%";
  $("profitCell").classList.toggle("good", profit >= 0);
  $("profitCell").classList.toggle("bad", profit < 0);
  $("profitPanel").hidden = false;
}

function renderEarning() {
  const price = parseNum($("sellPrice").value);
  if (price <= 0) { alert("Masukkan harga jual."); return; }
  const cost = parseNum($("costPrice").value);
  const b = breakdown(price);

  $("resultHero").className = "result-hero";
  $("rhLabel").textContent = "Estimasi Dana Cair";
  $("rhValue").textContent = rupiah(b.net);
  $("rhNote").textContent = "Dari harga jual " + rupiah(price);

  fillBreakdown(b);
  fillProfit(b.net, cost);
  showResult();
}

function renderPricing() {
  const cost = parseNum($("costPrice2").value);
  const profit = parseNum($("targetValue").value);
  if (cost <= 0) { alert("Masukkan harga modal."); return; }

  const f = getFees();
  const k = 1 - (f.admin + f.premi + f.service);
  const rawPrice = (cost + profit + f.fixed) / k;
  const rounded = Math.ceil(rawPrice / 100) * 100;
  const b = breakdown(rounded);

  $("resultHero").className = "result-hero pricing";
  $("rhLabel").textContent = "Harga Jual Aman";
  $("rhValue").textContent = rupiah(rounded);
  $("rhNote").textContent = profit > 0
    ? "Dana cair: " + rupiah(b.net) + " — Untung: " + rupiah(b.net - cost)
    : "Dana cair: " + rupiah(b.net) + " — Balik modal aman";

  fillBreakdown(b);
  fillProfit(b.net, cost);
  showResult();
}

// ============================================================
//  TikTok Shop
// ============================================================
function getTTFees() {
  return {
    komisi: parseFloat($("ttKomisiRate").value) / 100 || 0,
    dinamis: parseFloat($("ttDinamisRate").value) / 100 || 0,
    proses: parseInt($("ttProsesFixed").value) || 0,
    logistik: parseInt($("ttLogistikFixed").value) || 0,
  };
}

function ttBreakdown(price) {
  const f = getTTFees();
  const komisi = price * f.komisi;
  const dinamis = price * f.dinamis;
  const proses = f.proses;
  const logistik = f.logistik;
  const total = komisi + dinamis + proses + logistik;
  return { price, komisi, dinamis, proses, logistik, total, net: price - total };
}

function fillTTBreakdown(b) {
  $("rSubtotal").textContent = rupiah(b.price);
  $("rProduct").textContent = rupiah(b.price);
  $("rAdmin").textContent = "-" + rupiah(b.komisi);
  $("rPremi").textContent = "-" + rupiah(b.dinamis);
  $("rService").textContent = "-" + rupiah(b.proses);
  $("rFeesTotal").textContent = "-" + rupiah(b.total);
  $("rNet").textContent = rupiah(b.net);
  // Reuse rowFixed for logistik
  $("rowFixed").hidden = false;
  $("rFixed").textContent = "-" + rupiah(b.logistik);
}

function renderTiktokEarning() {
  const price = parseNum($("ttSellPrice").value);
  if (price <= 0) { alert("Masukkan harga jual."); return; }
  const cost = parseNum($("ttCostPrice").value);
  const b = ttBreakdown(price);

  // Relabel breakdown rows for TikTok
  setTTLabels();

  $("resultHero").className = "result-hero";
  $("rhLabel").textContent = "Estimasi Dana Cair (TikTok)";
  $("rhValue").textContent = rupiah(b.net);
  $("rhNote").textContent = "Dari harga jual " + rupiah(price);

  fillTTBreakdown(b);
  fillProfit(b.net, cost);
  showResult();
}

function renderTiktokPricing() {
  const cost = parseNum($("ttCostPrice2").value);
  const profit = parseNum($("ttTargetValue").value);
  if (cost <= 0) { alert("Masukkan harga modal."); return; }

  const f = getTTFees();
  const k = 1 - (f.komisi + f.dinamis);
  const fixedTotal = f.proses + f.logistik;
  const rawPrice = (cost + profit + fixedTotal) / k;
  const rounded = Math.ceil(rawPrice / 100) * 100;
  const b = ttBreakdown(rounded);

  setTTLabels();

  $("resultHero").className = "result-hero pricing";
  $("rhLabel").textContent = "Harga Jual Aman (TikTok)";
  $("rhValue").textContent = rupiah(rounded);
  $("rhNote").textContent = profit > 0
    ? "Dana cair: " + rupiah(b.net) + " — Untung: " + rupiah(b.net - cost)
    : "Dana cair: " + rupiah(b.net) + " — Balik modal aman";

  fillTTBreakdown(b);
  fillProfit(b.net, cost);
  showResult();
}

// Labels for breakdown rows
const defaultLabels = { admin: "Biaya Administrasi", premi: "Premi", service: "Biaya Layanan", fixed: "Biaya Tetap" };
const ttLabels = { admin: "Komisi Platform", premi: "Komisi Dinamis", service: "Biaya Pemrosesan", fixed: "Biaya Logistik" };

function setShopeeLabels() {
  document.querySelector('[id="rAdmin"]').parentElement.querySelector("span:first-child").textContent = defaultLabels.admin;
  document.querySelector('[id="rPremi"]').parentElement.querySelector("span:first-child").textContent = defaultLabels.premi;
  document.querySelector('[id="rService"]').parentElement.querySelector("span:first-child").textContent = defaultLabels.service;
  document.querySelector('[id="rFixed"]').parentElement.querySelector("span:first-child").textContent = defaultLabels.fixed;
}

function setTTLabels() {
  document.querySelector('[id="rAdmin"]').parentElement.querySelector("span:first-child").textContent = ttLabels.admin;
  document.querySelector('[id="rPremi"]').parentElement.querySelector("span:first-child").textContent = ttLabels.premi;
  document.querySelector('[id="rService"]').parentElement.querySelector("span:first-child").textContent = ttLabels.service;
  document.querySelector('[id="rFixed"]').parentElement.querySelector("span:first-child").textContent = ttLabels.fixed;
}

// Events
function setMode(m) {
  mode = m;
  updatePanels();
}

function setPlatform(p) {
  platform = p;
  document.querySelectorAll(".platform-tab").forEach((t) => t.classList.toggle("active", t.dataset.platform === p));
  updatePanels();
}

function updatePanels() {
  const isTT = platform === "tiktok";
  $("earningPanel").hidden = !(platform === "shopee" && mode === "earning");
  $("pricingPanel").hidden = !(platform === "shopee" && mode === "pricing");
  $("tiktokEarningPanel").hidden = !(platform === "tiktok" && mode === "earning");
  $("tiktokPricingPanel").hidden = !(platform === "tiktok" && mode === "pricing");
  $("shopeeFeeSettings").hidden = isTT;
  $("ttFeeSettings").hidden = !isTT;
  resetResult();
}

document.querySelectorAll(".platform-tab").forEach((t) => t.addEventListener("click", () => setPlatform(t.dataset.platform)));
$("modeSelect").addEventListener("change", (e) => setMode(e.target.value));

$("presetSelect").addEventListener("change", (e) => {
  const p = PRESETS[e.target.value];
  if (!p) return;
  $("adminRate").value = p.admin;
  $("premiRate").value = p.premi;
  $("serviceRate").value = p.service;
  $("fixedFee").value = p.fixed;
});

["adminRate", "premiRate", "serviceRate", "fixedFee"].forEach((id) => {
  $(id).addEventListener("input", () => { $("presetSelect").value = "custom"; });
});

$("calcBtn").addEventListener("click", () => {
  const active = getActiveMode();
  switch (active) {
    case "earning": setShopeeLabels(); renderEarning(); break;
    case "pricing": setShopeeLabels(); renderPricing(); break;
    case "tiktokEarning": renderTiktokEarning(); break;
    case "tiktokPricing": renderTiktokPricing(); break;
  }
});

document.querySelectorAll('input[type="text"]').forEach((inp) => {
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") $("calcBtn").click(); });
});

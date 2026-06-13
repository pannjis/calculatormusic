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
let profitType = "nominal"; // nominal | percent
let ttProfitType = "nominal";

// Format ribuan
function attachFormat(el) {
  if (!el) return;
  el.addEventListener("input", () => {
    const raw = parseNum(el.value);
    el.value = raw ? raw.toLocaleString("id-ID") : "";
  });
}
["sellPrice", "costPrice", "costPrice2", "targetValue", "ttSellPrice", "ttCostPrice", "ttCostPrice2", "ttTargetValue", "tnCost", "tnTarget", "ttTnCost", "ttTnTarget"].forEach((id) => attachFormat($(id)));

function getActiveMode() {
  if (platform === "shopee") return mode;
  if (mode === "earning") return "tiktokEarning";
  if (mode === "pricing") return "tiktokPricing";
  return "tiktokTargetNet";
}

// Extra Costs (Biaya Tambahan Dinamis)
let extraCostId = 0;

function addExtraCost() {
  extraCostId++;
  const container = $("extraCostsContainer");
  const row = document.createElement("div");
  row.className = "extra-cost-row";
  row.innerHTML = `
    <input type="text" placeholder="Nama biaya (cth: Iklan)" class="extra-name" />
    <div class="input-wrap" style="flex:1">
      <span class="input-prefix">Rp</span>
      <input type="text" inputmode="numeric" placeholder="Nominal" class="extra-value" />
    </div>
    <button type="button" class="btn-remove" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  container.appendChild(row);
  attachFormat(row.querySelector(".extra-value"));
  row.querySelector(".extra-value").addEventListener("keydown", (e) => { if (e.key === "Enter") $("calcBtn").click(); });
}

function getTotalExtraCosts() {
  let total = 0;
  document.querySelectorAll(".extra-value").forEach((inp) => { total += parseNum(inp.value); });
  return total;
}

$("addCostBtn").addEventListener("click", addExtraCost);

// Toggle Rp / % for profit target
document.querySelectorAll("#profitToggle .toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#profitToggle .toggle-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    profitType = btn.dataset.type;
    $("profitPrefix").textContent = profitType === "nominal" ? "Rp" : "%";
    $("targetValue").placeholder = profitType === "nominal" ? "Masukkan target keuntungan" : "Masukkan persentase margin";
    $("targetValue").value = "";
  });
});

document.querySelectorAll("#ttProfitToggle .toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#ttProfitToggle .toggle-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    ttProfitType = btn.dataset.type;
    $("ttProfitPrefix").textContent = ttProfitType === "nominal" ? "Rp" : "%";
    $("ttTargetValue").placeholder = ttProfitType === "nominal" ? "Masukkan target keuntungan" : "Masukkan persentase margin";
    $("ttTargetValue").value = "";
  });
});

// Core
function getFees() {
  return { admin: pct("adminRate"), premi: pct("premiRate"), service: pct("serviceRate"), fixed: parseNum($("fixedFee").value) };
}

function breakdown(price) {
  const f = getFees();
  const admin = Math.floor(price * f.admin);
  const premi = Math.ceil(price * f.premi);
  const service = Math.ceil(price * f.service);
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
  // Show extra costs in breakdown if in pricing mode
  const extra = (mode === "pricing") ? getTotalExtraCosts() : 0;
  if (extra > 0) { $("rowExtra").hidden = false; $("rExtra").textContent = "-" + rupiah(extra); }
  else { $("rowExtra").hidden = true; }
}

function fillProfit(net, cost) {
  const extra = getTotalExtraCosts();
  const effectiveNet = net - extra;
  if (cost <= 0 && extra <= 0) { $("profitPanel").hidden = true; return; }
  const profit = effectiveNet - cost;
  // Markup = profit / modal (lebih intuitif untuk seller)
  const markup = cost > 0 ? (profit / cost) * 100 : 0;
  $("rCost").textContent = rupiah(cost);
  $("rProfit").textContent = rupiah(profit);
  $("rMargin").textContent = markup.toFixed(1) + "%";
  $("profitCell").classList.toggle("good", profit >= 0);
  $("profitCell").classList.toggle("bad", profit < 0);
  $("profitPanel").hidden = false;
}

function fillProfitSimple(net, cost) {
  if (cost <= 0) { $("profitPanel").hidden = true; return; }
  const profit = net - cost;
  const markup = cost > 0 ? (profit / cost) * 100 : 0;
  $("rCost").textContent = rupiah(cost);
  $("rProfit").textContent = rupiah(profit);
  $("rMargin").textContent = markup.toFixed(1) + "%";
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
  fillProfitSimple(b.net, cost);
  showResult();
}

function renderPricing() {
  const cost = parseNum($("costPrice2").value);
  const targetRaw = parseNum($("targetValue").value);
  if (cost <= 0) { alert("Masukkan harga modal."); return; }

  // Convert target to nominal
  const profit = profitType === "percent" ? Math.round(cost * targetRaw / 100) : targetRaw;

  const extra = getTotalExtraCosts();
  const f = getFees();
  const k = 1 - (f.admin + f.premi + f.service);
  const rawPrice = (cost + profit + extra + f.fixed) / k;
  const rounded = Math.ceil(rawPrice / 100) * 100;
  const b = breakdown(rounded);
  const netAfterExtra = b.net - extra;

  $("resultHero").className = "result-hero pricing";
  $("rhLabel").textContent = "Harga Jual Aman";
  $("rhValue").textContent = rupiah(rounded);
  $("rhNote").textContent = "Dana cair: " + rupiah(b.net) + (extra > 0 ? " — Setelah biaya tambahan: " + rupiah(netAfterExtra) : "") + " — Untung: " + rupiah(netAfterExtra - cost);

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
  $("rowFixed").hidden = false;
  $("rFixed").textContent = "-" + rupiah(b.logistik);
  const extra = (mode === "pricing") ? getTotalExtraCosts() : 0;
  if (extra > 0) { $("rowExtra").hidden = false; $("rExtra").textContent = "-" + rupiah(extra); }
  else { $("rowExtra").hidden = true; }
}

function renderTiktokEarning() {
  const price = parseNum($("ttSellPrice").value);
  if (price <= 0) { alert("Masukkan harga jual."); return; }
  const cost = parseNum($("ttCostPrice").value);
  const b = ttBreakdown(price);

  setTTLabels();

  $("resultHero").className = "result-hero";
  $("rhLabel").textContent = "Estimasi Dana Cair (TikTok)";
  $("rhValue").textContent = rupiah(b.net);
  $("rhNote").textContent = "Dari harga jual " + rupiah(price);

  fillTTBreakdown(b);
  fillProfitSimple(b.net, cost);
  showResult();
}

function renderTiktokPricing() {
  const cost = parseNum($("ttCostPrice2").value);
  const targetRaw = parseNum($("ttTargetValue").value);
  if (cost <= 0) { alert("Masukkan harga modal."); return; }

  const profit = ttProfitType === "percent" ? Math.round(cost * targetRaw / 100) : targetRaw;

  const extra = getTotalExtraCosts();
  const f = getTTFees();
  const k = 1 - (f.komisi + f.dinamis);
  const fixedTotal = f.proses + f.logistik;
  const rawPrice = (cost + profit + extra + fixedTotal) / k;
  const rounded = Math.ceil(rawPrice / 100) * 100;
  const b = ttBreakdown(rounded);
  const netAfterExtra = b.net - extra;

  setTTLabels();

  $("resultHero").className = "result-hero pricing";
  $("rhLabel").textContent = "Harga Jual Aman (TikTok)";
  $("rhValue").textContent = rupiah(rounded);
  $("rhNote").textContent = "Dana cair: " + rupiah(b.net) + (extra > 0 ? " — Setelah biaya tambahan: " + rupiah(netAfterExtra) : "") + " — Untung: " + rupiah(netAfterExtra - cost);

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

// ============================================================
//  Target Dana Cair — Shopee
// ============================================================
function renderTargetNet() {
  const target = parseNum($("tnTarget").value);
  const cost = parseNum($("tnCost").value);
  if (target <= 0) { alert("Masukkan target dana cair."); return; }

  const f = getFees();
  const totalRate = f.admin + f.premi + f.service;
  let price = Math.ceil((target + f.fixed) / (1 - totalRate));

  for (let i = 0; i < 200; i++) {
    const b = breakdown(price);
    if (b.net >= target) break;
    price++;
  }

  const b = breakdown(price);

  setShopeeLabels();
  $("resultHero").className = "result-hero pricing";
  $("rhLabel").textContent = "Harga Jual untuk Target Dana Cair";
  $("rhValue").textContent = rupiah(price);
  $("rhNote").textContent = "Dana cair: " + rupiah(b.net) + (cost > 0 ? " — Untung: " + rupiah(b.net - cost) : "");

  fillBreakdown(b);
  fillProfitSimple(b.net, cost);
  showResult();
}

// ============================================================
//  Target Dana Cair — TikTok
// ============================================================
function renderTiktokTargetNet() {
  const target = parseNum($("ttTnTarget").value);
  const cost = parseNum($("ttTnCost").value);
  if (target <= 0) { alert("Masukkan target dana cair."); return; }

  const f = getTTFees();
  const totalRate = f.komisi + f.dinamis;
  const fixedTotal = f.proses + f.logistik;
  let price = Math.ceil((target + fixedTotal) / (1 - totalRate));

  for (let i = 0; i < 200; i++) {
    const b = ttBreakdown(price);
    if (b.net >= target) break;
    price++;
  }

  const b = ttBreakdown(price);

  setTTLabels();
  $("resultHero").className = "result-hero pricing";
  $("rhLabel").textContent = "Harga Jual untuk Target Dana Cair (TikTok)";
  $("rhValue").textContent = rupiah(price);
  $("rhNote").textContent = "Dana cair: " + rupiah(b.net) + (cost > 0 ? " — Untung: " + rupiah(b.net - cost) : "");

  fillTTBreakdown(b);
  fillProfitSimple(b.net, cost);
  showResult();
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
  $("targetNetPanel").hidden = !(platform === "shopee" && mode === "targetNet");
  $("tiktokEarningPanel").hidden = !(platform === "tiktok" && mode === "earning");
  $("tiktokPricingPanel").hidden = !(platform === "tiktok" && mode === "pricing");
  $("tiktokTargetNetPanel").hidden = !(platform === "tiktok" && mode === "targetNet");
  $("shopeeFeeSettings").hidden = isTT;
  $("ttFeeSettings").hidden = !isTT;
  // Biaya tambahan hanya tampil di mode Tentukan Harga Jual
  $("extraCostsSection").hidden = mode !== "pricing";
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
    case "targetNet": renderTargetNet(); break;
    case "tiktokEarning": renderTiktokEarning(); break;
    case "tiktokPricing": renderTiktokPricing(); break;
    case "tiktokTargetNet": renderTiktokTargetNet(); break;
  }
});

document.querySelectorAll('input[type="text"]').forEach((inp) => {
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") $("calcBtn").click(); });
});

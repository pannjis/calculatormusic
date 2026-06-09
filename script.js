"use strict";

/* ============================================================
   Shopee Fee Calculator
   ============================================================ */

const PRESETS = {
  default:  { admin: 8.48, premi: 0.5, service: 4.5, fixed: 0 },
  nonstar:  { admin: 8.0,  premi: 0.5, service: 4.5, fixed: 0 },
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
const pct = (id) => {
  const v = parseFloat($(id).value);
  return isNaN(v) ? 0 : v / 100;
};

let mode = "earning";

// Format ribuan otomatis
function attachFormat(el) {
  if (!el) return;
  el.addEventListener("input", () => {
    const raw = parseNum(el.value);
    el.value = raw ? raw.toLocaleString("id-ID") : "";
  });
}
["sellPrice", "costPrice", "costPrice2", "targetValue"].forEach((id) => attachFormat($(id)));

// ============================================================
//  Core
// ============================================================
function getFees() {
  return {
    admin: pct("adminRate"),
    premi: pct("premiRate"),
    service: pct("serviceRate"),
    fixed: parseNum($("fixedFee").value),
  };
}

function breakdown(price) {
  const f = getFees();
  const admin = price * f.admin;
  const premi = price * f.premi;
  const service = price * f.service;
  const total = admin + premi + service + f.fixed;
  const net = price - total;
  return { price, admin, premi, service, fixed: f.fixed, total, net };
}

// ============================================================
//  Render
// ============================================================
function showResult() {
  $("emptyState").hidden = true;
  $("emptyState").style.display = "none";
  $("resultContent").hidden = false;
  $("resultContent").style.display = "block";
  // Auto scroll ke hasil
  setTimeout(() => {
    $("resultHero").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
}
function resetResult() {
  $("emptyState").hidden = false;
  $("emptyState").style.display = "";
  $("resultContent").hidden = true;
  $("resultContent").style.display = "none";
}

function fillBreakdown(b, qty) {
  $("rSubtotal").textContent = rupiah(b.price * qty);
  $("rProduct").textContent = rupiah(b.price * qty);
  $("rAdmin").textContent = "-" + rupiah(b.admin * qty);
  $("rPremi").textContent = "-" + rupiah(b.premi * qty);
  $("rService").textContent = "-" + rupiah(b.service * qty);
  $("rFeesTotal").textContent = "-" + rupiah(b.total * qty);
  $("rNet").textContent = rupiah(b.net * qty);
  if (b.fixed > 0) {
    $("rowFixed").hidden = false;
    $("rFixed").textContent = "-" + rupiah(b.fixed * qty);
  } else {
    $("rowFixed").hidden = true;
  }
}

function fillProfit(netTotal, costTotal) {
  if (costTotal <= 0) { $("profitPanel").hidden = true; return; }
  const profit = netTotal - costTotal;
  const margin = netTotal > 0 ? (profit / netTotal) * 100 : 0;
  $("rCost").textContent = rupiah(costTotal);
  $("rProfit").textContent = rupiah(profit);
  $("rMargin").textContent = margin.toFixed(1) + "%";
  const cell = $("profitCell");
  cell.classList.toggle("good", profit >= 0);
  cell.classList.toggle("bad", profit < 0);
  $("profitPanel").hidden = false;
}

function renderEarning() {
  const price = parseNum($("sellPrice").value);
  if (price <= 0) { alert("Masukkan harga jual."); return; }
  const cost = parseNum($("costPrice").value);
  const qty = Math.max(1, parseNum($("qty").value) || 1);
  const b = breakdown(price);

  const hero = $("resultHero");
  hero.className = "result-hero";
  $("rhLabel").textContent = "Estimasi Dana Cair";
  $("rhValue").textContent = rupiah(b.net * qty);
  $("rhNote").textContent = qty > 1 ? `${qty} pcs \u00d7 ${rupiah(b.net)}/pcs` : `Dari harga jual ${rupiah(price)}`;

  fillBreakdown(b, qty);
  fillProfit(b.net * qty, cost * qty);
  showResult();
}

function renderPricing() {
  const cost = parseNum($("costPrice2").value);
  const profit = parseNum($("targetValue").value); // bisa 0
  if (cost <= 0) { alert("Masukkan harga modal."); return; }

  // Harga jual = (modal + target keuntungan + biaya tetap) / (1 - total rate)
  const f = getFees();
  const k = 1 - (f.admin + f.premi + f.service);
  const rawPrice = (cost + profit + f.fixed) / k;

  if (!isFinite(rawPrice) || rawPrice <= 0) { alert("Tidak bisa dihitung. Cek pengaturan biaya."); return; }

  const rounded = Math.ceil(rawPrice / 100) * 100;
  const b = breakdown(rounded);

  const hero = $("resultHero");
  hero.className = "result-hero pricing";
  $("rhLabel").textContent = "Harga Jual Aman";
  $("rhValue").textContent = rupiah(rounded);
  $("rhNote").textContent = profit > 0
    ? `Dana cair: ${rupiah(b.net)} — Keuntungan: ${rupiah(b.net - cost)}`
    : `Dana cair: ${rupiah(b.net)} — Sudah aman balik modal`;

  fillBreakdown(b, 1);
  fillProfit(b.net, cost);
  showResult();
}

// ============================================================
//  Events
// ============================================================
function setMode(m) {
  mode = m;
  document.querySelectorAll(".calc-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.mode === m);
  });
  $("earningPanel").hidden = m !== "earning";
  $("pricingPanel").hidden = m !== "pricing";
  resetResult();
}

document.querySelectorAll(".calc-tab").forEach((t) =>
  t.addEventListener("click", () => setMode(t.dataset.mode))
);

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
  mode === "earning" ? renderEarning() : renderPricing();
});

document.querySelectorAll('input[type="text"]').forEach((inp) => {
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") $("calcBtn").click(); });
});

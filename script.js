"use strict";

/* ============================================================
   Kalkulator Biaya Shopee
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
const pct = (id) => { const v = parseFloat($(id).value); return isNaN(v) ? 0 : v / 100; };

// ---- State ----
let mode = "earning";
let targetType = "danacair";

// ---- Auto format ribuan ----
function attachFormat(el) {
  el.addEventListener("input", () => {
    const raw = parseNum(el.value);
    el.value = raw ? raw.toLocaleString("id-ID") : "";
  });
}
["sellPrice", "costPrice", "costPrice2", "targetValue"].forEach((id) => {
  const el = $(id);
  if (el) attachFormat(el);
});

// ============================================================
//  Core calculation
// ============================================================
function fees() {
  return {
    admin: pct("adminRate"),
    premi: pct("premiRate"),
    service: pct("serviceRate"),
    fixed: parseNum($("fixedFee").value),
  };
}

function breakdown(price) {
  const f = fees();
  const admin = price * f.admin;
  const premi = price * f.premi;
  const service = price * f.service;
  const total = admin + premi + service + f.fixed;
  const net = price - total;
  return { price, admin, premi, service, fixed: f.fixed, total, net };
}

function priceFromTarget(type, target, cost) {
  const f = fees();
  const k = 1 - (f.admin + f.premi + f.service);

  switch (type) {
    case "danacair":
      // net = price*k - fixed = target
      return (target + f.fixed) / k;
    case "nominal":
      // net - cost = target
      return (cost + target + f.fixed) / k;
    case "markup":
      // profit = cost * markup%
      return (cost + cost * (target / 100) + f.fixed) / k;
    case "margin":
      // profit = price * margin%  =>  price*k - fixed - cost = price*m
      const m = target / 100;
      const denom = k - m;
      return denom > 0 ? (cost + f.fixed) / denom : NaN;
    default:
      return NaN;
  }
}

// ============================================================
//  Rendering
// ============================================================
function showResult() {
  $("emptyState").hidden = true;
  $("resultContent").hidden = false;
}

function resetResult() {
  $("emptyState").hidden = false;
  $("resultContent").hidden = true;
}

function fillReceipt(b, qty) {
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

function fillProfit(net, cost) {
  if (cost <= 0) {
    $("profitPanel").hidden = true;
    return;
  }
  const profit = net - cost;
  const margin = net > 0 ? (profit / net) * 100 : 0;
  $("rCost").textContent = rupiah(cost);
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

  // Hero: dana cair
  $("heroLabel").textContent = "Estimasi Dana Cair";
  $("heroValue").textContent = rupiah(b.net * qty);
  $("heroFoot").textContent = qty > 1 ? `${qty} pcs × ${rupiah(b.net)}/pcs` : `Dari harga jual ${rupiah(price)}`;
  $("heroBox").className = "hero";

  fillReceipt(b, qty);
  fillProfit(b.net * qty, cost * qty);
  showResult();
}

function renderPricing() {
  const target = parseNum($("targetValue").value);
  const cost = parseNum($("costPrice2").value);

  if (target <= 0) { alert("Masukkan nilai target."); return; }
  if (targetType !== "danacair" && cost <= 0) {
    alert("Masukkan modal / HPP untuk mode ini.");
    return;
  }

  const rawPrice = priceFromTarget(targetType, target, cost);
  if (!isFinite(rawPrice) || rawPrice <= 0) {
    alert("Target terlalu tinggi dibanding total biaya. Turunkan target.");
    return;
  }

  const rounded = Math.ceil(rawPrice / 100) * 100;
  const b = breakdown(rounded);

  // Hero: harga jual disarankan
  $("heroLabel").textContent = "Harga Jual Disarankan";
  $("heroValue").textContent = rupiah(rounded);
  $("heroFoot").textContent = `Dana cair: ${rupiah(b.net)}`;
  $("heroBox").className = "hero hero-pricing";

  fillReceipt(b, 1);
  fillProfit(b.net, cost);
  showResult();
}

// ============================================================
//  Events
// ============================================================
function setMode(m) {
  mode = m;
  const isE = m === "earning";
  $("tabEarning").classList.toggle("is-active", isE);
  $("tabPricing").classList.toggle("is-active", !isE);
  $("tabEarning").setAttribute("aria-selected", String(isE));
  $("tabPricing").setAttribute("aria-selected", String(!isE));
  $("earningInputs").hidden = !isE;
  $("pricingInputs").hidden = isE;
  resetResult();
}

document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => setMode(t.dataset.mode))
);

document.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    targetType = btn.dataset.target;

    const isRp = targetType === "danacair" || targetType === "nominal";
    const labels = { danacair: "Target dana cair", nominal: "Target profit", markup: "Markup terhadap modal", margin: "Margin terhadap harga jual" };
    const ph = { danacair: "36.048", nominal: "10.000", markup: "30", margin: "25" };
    $("targetLabel").textContent = labels[targetType];
    $("targetPrefix").textContent = isRp ? "Rp" : "%";
    const tv = $("targetValue");
    tv.placeholder = ph[targetType];
    tv.value = "";
  });
});

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
  if (mode === "earning") renderEarning();
  else renderPricing();
});

document.querySelectorAll('input[type="text"]').forEach((inp) => {
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") $("calcBtn").click(); });
});

/* ==========================================================================
   alert.js — the global alert flow, usable from ANY page.

   Any trigger (the big button, a shake, or your discreet sign) calls
   triggerAlert(). It shows a cancel window, then opens your own messaging app
   with the message and location ready to send. You always get the last word.
   ========================================================================== */

import { store } from "./store.js";
import { getLocation, buildMessage, dispatchAlert, shareAlert, telLink } from "./sos.js";
import { esc } from "./helpers.js";

let overlay = null, countEl = null, whyEl = null, bodyEl = null, cancelBtn = null;
let countdown = null;
let busy = false;

function ensureOverlay() {
  if (overlay) return;
  overlay = document.createElement("div");
  overlay.className = "alert-overlay";
  overlay.setAttribute("role", "alertdialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <div class="countdown" id="aegisCount">5</div>
    <h2 id="aegisWhy">Sending an alert…</h2>
    <p class="sub" id="aegisBody">Press cancel if this was a mistake.</p>
    <div class="btn-row" style="justify-content:center">
      <button class="btn secondary" id="aegisCancel">Cancel alert</button>
      <a class="btn" id="aegisCall" href="tel:112">Call 112 now</a>
    </div>`;
  document.body.appendChild(overlay);
  countEl = overlay.querySelector("#aegisCount");
  whyEl = overlay.querySelector("#aegisWhy");
  bodyEl = overlay.querySelector("#aegisBody");
  cancelBtn = overlay.querySelector("#aegisCancel");
  cancelBtn.onclick = () => cancel();
  overlay.querySelector("#aegisCall").href = telLink("112");
}

function show() { ensureOverlay(); overlay.classList.add("on"); cancelBtn.textContent = "Cancel alert"; }
function hide() { if (overlay) overlay.classList.remove("on"); }

function cancel() {
  countdown?.stop();
  store.log("Alert cancelled");
  hide();
  busy = false;
}

/** Fire the alert now (after the cancel window). */
async function fire() {
  const contacts = store.getContacts();
  const loc = store.getSettings().shareLocation ? await getLocation(4000) : null;
  const body = buildMessage(loc);

  if (contacts.length === 0) {
    whyEl.textContent = "No one in your trusted circle yet";
    bodyEl.innerHTML = "Add a contact on the <b>Circle</b> page so an alert has somewhere to go. " +
      "For now, call emergency services directly.";
    countEl.textContent = "!";
    cancelBtn.textContent = "Close";
    busy = false;
    store.log("Alert attempted with no contacts");
    return;
  }

  const res = dispatchAlert(contacts, body);
  countEl.textContent = "✓";
  cancelBtn.textContent = "Close";
  if (res.ok) {
    whyEl.textContent = res.method === "whatsapp" ? "Opening WhatsApp…" : "Opening your messages…";
    bodyEl.innerHTML = "Your message to <b>" + esc(contacts.length) + " contact" +
      (contacts.length === 1 ? "" : "s") + "</b> is ready — press send in the app that just opened." +
      (res.rest && res.rest.length ? "<br><br>Also send to: " + res.rest.map(c => esc(c.name)).join(", ") : "") +
      (loc && loc.lat != null ? "<br><br>Location attached." : "<br><br>Location could not be attached.");
    store.log("Alert dispatched to " + contacts.length + " contact(s)");
  } else {
    whyEl.textContent = "Could not open your messaging app";
    bodyEl.textContent = "Please call emergency services directly.";
    store.log("Alert dispatch failed");
  }
  busy = false;
}

/** Public entry point — used by the button, shake and gesture triggers. */
export function triggerAlert(source = "button") {
  if (busy) return;
  busy = true;
  const s = store.getSettings();
  const secs = Math.max(0, Number(s.countdown) || 0);
  store.log(`Alert triggered (${source})`);

  if (secs === 0) { show(); countEl.textContent = "!"; whyEl.textContent = "Sending…"; bodyEl.textContent = ""; fire(); return; }

  show();
  whyEl.textContent = "Sending an alert in…";
  bodyEl.textContent = "Triggered by " + source + ". Press cancel if this was a mistake.";
  let left = secs;
  countEl.textContent = String(left);
  countdown = {
    stop() { clearInterval(this._t); },
    _t: setInterval(() => {
      left -= 1;
      countEl.textContent = left > 0 ? String(left) : "!";
      if (left <= 0) { countdown.stop(); fire(); }
    }, 1000),
  };
}

/** Wire physical shake detection app-wide (when enabled). */
export async function enableShake(onError) {
  try {
    const { ShakeDetector } = await import("./sos.js");
    const det = new ShakeDetector({
      sensitivity: store.getSettings().shakeSensitivity,
      onShake: () => triggerAlert("shake"),
    });
    await det.enable();
    window.__aegisShake = det;
    return true;
  } catch (e) { onError?.(e); return false; }
}
export function disableShake() { window.__aegisShake?.disable(); window.__aegisShake = null; }

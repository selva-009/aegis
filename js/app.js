/* ==========================================================================
   app.js — router + bootstrap for Aegis.
   ========================================================================== */

import { views } from "./views.js";
import { store } from "./store.js";
import { stopSpeech, warmUpVoices } from "./helpers.js";
import { enableShake, triggerAlert } from "./alert.js";

const main = document.getElementById("main");
let cleanup = null;

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, queryStr] = raw.split("?");
  const params = {};
  if (queryStr) new URLSearchParams(queryStr).forEach((v, k) => params[k] = v);
  return { seg: path.split("/").filter(Boolean), params };
}

function route() {
  const { seg, params } = parseHash();
  const head = seg[0] || "";

  if (typeof cleanup === "function") { try { cleanup(); } catch { /* noop */ } cleanup = null; }
  stopSpeech();

  const view = (views[head] || views.home)(params);
  main.innerHTML = view.html;
  document.title = view.title || "Aegis";
  if (typeof view.mount === "function") cleanup = view.mount(main, params) || null;

  const active = head ? "#/" + head : "#/";
  document.querySelectorAll("#mainnav a").forEach(a => {
    const href = a.getAttribute("href");
    if (href === active || (head === "" && href === "#/")) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  document.getElementById("mainnav")?.classList.remove("open");
  document.getElementById("navToggle")?.setAttribute("aria-expanded", "false");
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

/* keyboard shortcut: press "s" twice quickly? No — keep it explicit.
   Escape cancels a running alert is handled inside alert.js. */

const navToggle = document.getElementById("navToggle");
navToggle?.addEventListener("click", () => {
  const nav = document.getElementById("mainnav");
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

warmUpVoices();
window.addEventListener("pointerdown", warmUpVoices, { once: true });

/* Shake detection needs a user gesture on iOS, so arm it on the first tap. */
window.addEventListener("pointerdown", function arm() {
  if (store.getSettings().shakeEnabled) {
    enableShake((e) => console.warn("shake unavailable:", e.message));
  }
}, { once: true });

/* Let the physical phone shortcut / any page raise an alert. */
window.aegisTriggerAlert = triggerAlert;

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
if (document.readyState !== "loading") route();

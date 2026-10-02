/* ==========================================================================
   sos.js — the alerting engine.

   Honest architecture note: this is a static web app, so it CANNOT silently
   send SMS or share location in the background. What it does instead is open
   YOUR OWN messaging app with the message and location already filled in, so
   you only have to press send. Real background alerting needs a server, and is
   labelled "needs a server" in the UI.
   ========================================================================== */

import { store } from "./store.js";

/* ---------------- location ---------------- */
export function getLocation(timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ error: "Geolocation is not supported on this device." });
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve({ error: "Could not get a location in time." }); } }, timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (done) return; done = true; clearTimeout(t);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) });
      },
      (err) => {
        if (done) return; done = true; clearTimeout(t);
        resolve({ error: err.message || "Location permission denied." });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 15000 }
    );
  });
}

export function mapsLink(loc) {
  if (!loc || loc.lat == null) return "";
  return `https://www.google.com/maps?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`;
}

/* ---------------- message building ---------------- */
export function buildMessage(loc, extra = "") {
  const s = store.getSettings();
  const parts = [s.voiceMessage || "I need help."];
  if (extra) parts.push(extra);
  if (s.shareLocation && loc && loc.lat != null) parts.push("My location: " + mapsLink(loc));
  else if (s.shareLocation && loc && loc.error) parts.push("(Location unavailable: " + loc.error + ")");
  parts.push("— sent from Aegis");
  return parts.join("\n");
}

const digits = (p) => String(p || "").replace(/[^\d+]/g, "");

/* ---------------- dispatching ---------------- */
export function smsLink(numbers, body) {
  const list = numbers.map(digits).filter(Boolean).join(",");
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const sep = isIOS ? "&" : "?";
  return `sms:${list}${sep}body=${encodeURIComponent(body)}`;
}

export function whatsappLink(number, body) {
  const n = digits(number).replace(/^\+/, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(body)}`;
}

export function telLink(number) { return `tel:${digits(number)}`; }

/** Open the alert in the user's own messaging app. Returns a description of what happened. */
export function dispatchAlert(contacts, body) {
  const method = store.getSettings().alertMethod;
  const usable = contacts.filter(c => digits(c.phone).length >= 6);
  if (usable.length === 0) return { ok: false, reason: "no-contacts" };

  if (method === "whatsapp") {
    // WhatsApp takes one recipient per link; open the primary, list the rest.
    window.open(whatsappLink(usable[0].phone, body), "_blank", "noopener");
    return { ok: true, method: "whatsapp", sent: usable.length, opened: usable[0].name, rest: usable.slice(1) };
  }
  window.location.href = smsLink(usable.map(c => c.phone), body);
  return { ok: true, method: "sms", sent: usable.length };
}

export async function shareAlert(body) {
  if (navigator.share) {
    try { await navigator.share({ title: "Aegis alert", text: body }); return { ok: true, method: "share" }; }
    catch { return { ok: false, reason: "cancelled" }; }
  }
  return { ok: false, reason: "unsupported" };
}

/* ---------------- countdown ---------------- */
export class Countdown {
  /** @param opts {seconds, onTick, onFire, onCancel} */
  constructor({ seconds, onTick, onFire, onCancel }) {
    this.remaining = seconds; this.onTick = onTick; this.onFire = onFire; this.onCancel = onCancel;
    this.timer = null;
  }
  start() {
    this.onTick?.(this.remaining);
    this.timer = setInterval(() => {
      this.remaining -= 1;
      this.onTick?.(this.remaining);
      if (this.remaining <= 0) { this.stop(); this.onFire?.(); }
    }, 1000);
  }
  cancel() { this.stop(); this.onCancel?.(); }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
}

/* ---------------- shake detection ---------------- */
export class ShakeDetector {
  constructor({ sensitivity = 18, shakes = 3, windowMs = 1600, onShake } = {}) {
    this.sensitivity = sensitivity; this.needed = shakes; this.windowMs = windowMs;
    this.onShake = onShake; this.count = 0; this.lastTime = 0; this.prev = null; this.armed = true;
    this._handler = this._onMotion.bind(this);
  }
  static async requestPermission() {
    const D = globalThis.DeviceMotionEvent;
    if (D && typeof D.requestPermission === "function") {
      const res = await D.requestPermission();
      if (res !== "granted") throw new Error("Motion access was not granted.");
    }
    return true;
  }
  async enable() {
    await ShakeDetector.requestPermission();
    window.addEventListener("devicemotion", this._handler);
    this.on = true;
  }
  disable() { window.removeEventListener("devicemotion", this._handler); this.on = false; }
  _onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x == null) return;
    const now = Date.now();
    const mag = Math.abs(a.x) + Math.abs(a.y) + Math.abs(a.z);
    if (this.prev != null && Math.abs(mag - this.prev) > this.sensitivity) {
      if (now - this.lastTime > this.windowMs) this.count = 0;
      this.count++; this.lastTime = now;
      if (this.count >= this.needed && this.armed) { this.count = 0; this.onShake?.(); }
    }
    this.prev = mag;
  }
}

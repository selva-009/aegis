/* ==========================================================================
   store.js — local data layer for Aegis.
   Everything is stored on this device. Nothing is uploaded. The only time
   anything leaves the phone is when YOU trigger an alert, which opens your own
   SMS/WhatsApp app with a message you can see and send.
   ========================================================================== */

const KEY = "aegis.safety.v1";

const DEFAULT_SETTINGS = {
  alertMethod: "sms",        // "sms" | "whatsapp"
  countdown: 5,              // seconds before an alert fires (cancel window)
  shareLocation: true,
  voiceMessage: "I need help. Please contact me and come to my location.",
  shakeEnabled: true,
  shakeSensitivity: 18,      // higher = needs a harder shake
  gestureEnabled: false,     // camera-based discreet trigger
  gestureHoldSec: 3,
  safeWord: "",
  fakeCallerName: "Aarav (Brother)",
  // recognition engine settings (used by the gesture trigger)
  threshold: 0.6,
  smoothing: 12,
  dwell: 10,
};

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* Small non-cryptographic fingerprint used only to show that an evidence note
   has not been edited since it was written. Not a substitute for real
   cryptographic signing — labelled as such in the UI. */
function fingerprint(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

class Store {
  constructor() { this._load(); }

  _load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch { raw = null; }
    this.data = raw && typeof raw === "object" ? raw : {};
    if (!Array.isArray(this.data.contacts)) this.data.contacts = [];
    if (!Array.isArray(this.data.evidence)) this.data.evidence = [];
    if (!Array.isArray(this.data.checkins)) this.data.checkins = [];
    if (!Array.isArray(this.data.log)) this.data.log = [];
    if (!Array.isArray(this.data.signs) || this.data.signs.length === 0) {
      this.data.signs = [{
        id: "safety-sign", name: "SAFETY SIGN", meaning: "Emergency trigger",
        voiceText: "Emergency", type: "static", samples: [], category: "Safety",
      }];
    }
    if (!this.data.settings) this.data.settings = { ...DEFAULT_SETTINGS };
    this._save();
  }

  _save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* quota */ } }

  /* ---------------- trusted circle ---------------- */
  getContacts() { return this.data.contacts; }
  addContact(c) {
    const contact = { id: uid(), name: "", phone: "", relation: "", primary: false, ...c };
    if (this.data.contacts.length === 0) contact.primary = true;
    this.data.contacts.push(contact);
    this.log(`Added ${contact.name} to your circle`);
    this._save();
    return contact;
  }
  updateContact(id, patch) { const c = this.getContact(id); if (c) { Object.assign(c, patch); this._save(); } return c; }
  getContact(id) { return this.data.contacts.find(c => c.id === id) || null; }
  deleteContact(id) { this.data.contacts = this.data.contacts.filter(c => c.id !== id); this._save(); }
  primaryContact() { return this.data.contacts.find(c => c.primary) || this.data.contacts[0] || null; }

  /* ---------------- settings ---------------- */
  getSettings() { return this.data.settings; }
  setSettings(patch) { Object.assign(this.data.settings, patch); this._save(); return this.data.settings; }

  /* ---------------- evidence vault ---------------- */
  getEvidence() { return this.data.evidence; }
  addEvidence(kind, text, extra = {}) {
    const ts = Date.now();
    const e = { id: uid(), ts, kind, text, ...extra };
    e.fingerprint = fingerprint(`${ts}|${kind}|${text}`);
    this.data.evidence.unshift(e);
    this.log(`Saved a ${kind} to your evidence vault`);
    this._save();
    return e;
  }
  deleteEvidence(id) { this.data.evidence = this.data.evidence.filter(e => e.id !== id); this._save(); }
  clearEvidence() { this.data.evidence = []; this.log("Cleared the evidence vault"); this._save(); }

  /* ---------------- check-ins ---------------- */
  getCheckins() { return this.data.checkins; }
  addCheckin(dueTs, note) {
    const c = { id: uid(), ts: Date.now(), dueTs, note, status: "pending" };
    this.data.checkins.unshift(c); this.log("Started a check-in"); this._save();
    return c;
  }
  updateCheckin(id, patch) { const c = this.data.checkins.find(x => x.id === id); if (c) { Object.assign(c, patch); this._save(); } return c; }
  pendingCheckin() { return this.data.checkins.find(c => c.status === "pending") || null; }

  /* ---------------- gesture sign (for the discreet trigger) ---------------- */
  getSigns() { return this.data.signs; }
  getSign(id) { return this.data.signs.find(s => s.id === id) || null; }
  safetySign() { return this.data.signs[0]; }
  addSample(signId, features, type = "static") {
    const s = this.getSign(signId);
    if (!s) return;
    s.samples.push({ id: uid(), type, f: features, createdAt: Date.now() });
    this._save();
  }
  clearSamples(signId) { const s = this.getSign(signId); if (s) { s.samples = []; this._save(); } }
  trainedSigns() { return this.data.signs.filter(s => s.samples.length > 0); }
  totalSamples() { return this.data.signs.reduce((n, s) => n + s.samples.length, 0); }

  /* ---------------- log ---------------- */
  log(msg) {
    this.data.log.unshift({ id: uid(), ts: Date.now(), msg });
    if (this.data.log.length > 200) this.data.log.length = 200;
  }
  getLog() { return this.data.log; }

  /* ---------------- export / reset ---------------- */
  export() { return JSON.stringify(this.data, null, 2); }
  resetAll() { this.data = {}; localStorage.removeItem(KEY); this._load(); }
}

export const store = new Store();
export { uid, fingerprint };

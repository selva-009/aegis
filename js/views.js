/* ==========================================================================
   views.js — Aegis pages: Home, SOS, Circle, Check-in, Toolkit, Evidence,
   Helplines, Settings.
   ========================================================================== */

import { store } from "./store.js";
import { LiveSession } from "./session.js";
import { triggerAlert, enableShake, disableShake } from "./alert.js";
import { getLocation, mapsLink, buildMessage, telLink, whatsappLink, smsLink } from "./sos.js";
import { esc, $, $$, toast, speak, copyText, download, fmtDateTime, relTime, speechAvailable } from "./helpers.js";

const HELPLINES = [
  { n: "112", label: "Emergency — all services", note: "Police, fire and ambulance. Pan-India, 24×7.", tel: "112" },
  { n: "181", label: "Women Helpline", note: "Support for women in distress; linked with 112 and 1098.", tel: "181" },
  { n: "14490", label: "National Commission for Women", note: "Digital complaint registration and referral.", tel: "14490" },
  { n: "1098", label: "Childline", note: "Children in distress or danger.", tel: "1098" },
  { n: "100", label: "Police", note: "Direct police control room line.", tel: "100" },
  { n: "1930", label: "Cyber Crime Helpline", note: "Online fraud, harassment and cybercrime.", tel: "1930" },
];

const WHO = [
  ["🌙", "Night commuters", "Students, nurses and shift workers travelling late."],
  ["🎒", "Students", "Campus, hostels and unfamiliar cities."],
  ["🧓", "Elderly people", "Falls, medical emergencies and getting lost."],
  ["🧳", "Solo travellers", "Unknown places, no one nearby to call."],
  ["🛵", "Delivery riders", "Long, isolated routes and unsafe stops."],
  ["♿", "People with disabilities", "Anyone who cannot easily reach or use a phone — including deaf and non-speaking users."],
  ["🩺", "Medical emergencies", "A fall, a crash, an allergic reaction — you may not be able to type."],
  ["👥", "Everyone else", "Safety is not one group's problem. It's a basic need."],
];

function head(title, sub) {
  return `<div class="spread" style="margin-bottom:16px"><div>
    <h1 style="margin:0">${esc(title)}</h1>
    ${sub ? `<p class="muted" style="margin:6px 0 0">${esc(sub)}</p>` : ""}</div></div>`;
}

/* ====================================================================== */
/* Home                                                                   */
/* ====================================================================== */
export function home() {
  const c = store.getContacts().length;
  return {
    title: "Aegis — personal safety for everyone",
    html: `
    <section class="hero"><div class="wrap" style="padding:70px 20px 40px">
      <span class="badge info">Personal safety · Works on any phone</span>
      <h1 style="max-width:18ch;margin-top:14px">Safety that works for everyone.</h1>
      <p class="muted" style="font-size:1.2rem;max-width:56ch">
        One discreet way to call for help — a button, a shake, or a hand sign you choose.
        Built for night commuters, students, elderly people, solo travellers, and anyone
        who might need help fast.</p>
      <div class="btn-row" style="margin-top:22px">
        <a class="btn" href="#/sos">Open emergency screen</a>
        <a class="btn secondary" href="#/circle">Add your trusted circle</a>
      </div>
      <div class="row" style="margin-top:26px;gap:10px">
        <span class="badge ${c ? "good" : "warn"}">${c} trusted contact${c === 1 ? "" : "s"}</span>
        <span class="badge ${store.trainedSigns().length ? "good" : ""}">Discreet sign: ${store.trainedSigns().length ? "ready" : "not set"}</span>
        <span class="badge">${speechAvailable() ? "Voice ready" : "No voice on this device"}</span>
      </div>
    </div></section>

    <section class="section tight"><div class="wrap">
      <h2>Who it's for</h2>
      <p class="muted">Not a women's-only app, and not a stranger-danger app. It's for the moment you need help and can't easily ask for it.</p>
      <div class="grid cols-4" style="margin-top:16px">
        ${WHO.map(([i, t, d]) => `<div class="card"><div class="ico" style="font-size:1.5rem" aria-hidden="true">${i}</div>
          <h3 style="margin-bottom:4px">${esc(t)}</h3><p class="muted small" style="margin:0">${esc(d)}</p></div>`).join("")}
      </div>
    </div></section>

    <section class="section tight"><div class="wrap">
      <h2>Three ways to call for help</h2>
      <div class="grid cols-3" style="margin-top:16px">
        <div class="card"><h3>One big button</h3><p class="muted small">Press it, get a short cancel window, then your circle gets your message and location.</p><a class="btn secondary sm" href="#/sos">Emergency screen</a></div>
        <div class="card"><h3>Shake your phone</h3><p class="muted small">No need to look at the screen or find the app — three quick shakes triggers the same alert.</p><a class="btn secondary sm" href="#/settings">Turn on shake</a></div>
        <div class="card"><h3>A discreet hand sign</h3><p class="muted small">Teach it one sign of your choosing. Hold it to the camera and the alert fires — no speaking, no tapping.</p><a class="btn secondary sm" href="#/sos">Set up a sign</a></div>
      </div>
    </div></section>

    <section class="section tight"><div class="wrap">
      <div class="honest">
        <h3>What Aegis does — and what it does not do</h3>
        <p><strong>It does:</strong> get a clear message and your location to the people you trust, fast; let you raise help without speaking or unlocking your phone; keep a private, timestamped record of what happened; and put emergency numbers one tap away.</p>
        <p><strong>It does not</strong> prevent violence, and no app can. Most harm comes from someone the person already knows, in places an app can't reach. Aegis is one layer — alongside people who look out for each other, functioning helplines, and a legal system that holds offenders accountable. It is not a substitute for any of those, and it is not a reason to take risks you otherwise wouldn't.</p>
      </div>
    </div></section>`,
    mount() {},
  };
}

/* ====================================================================== */
/* SOS                                                                    */
/* ====================================================================== */
export function sos() {
  const contacts = store.getContacts();
  const s = store.getSettings();
  return {
    title: "Emergency — Aegis",
    html: `
    <div class="wrap section tight">
      ${head("Emergency", "Press the button for help. You'll get a few seconds to cancel.")}
      <div class="grid live-grid" style="grid-template-columns:1.1fr 1fr;align-items:start">
        <div class="card">
          <div class="sos-wrap">
            <button class="sos-btn" id="sosBtn" aria-label="Send emergency alert">SOS<small>HOLD OR PRESS</small></button>
          </div>
          <div class="btn-row" style="justify-content:center;margin-top:6px">
            <a class="btn danger" href="tel:112">📞 Call 112 now</a>
            <button class="btn secondary" id="previewBtn">Preview message</button>
          </div>
          <div class="notice info" style="margin-top:16px" id="previewBox" hidden></div>
        </div>

        <div class="stack">
          <div class="card">
            <h3 style="margin-top:0">Status</h3>
            <div class="row" style="gap:8px">
              <span class="badge ${contacts.length ? "good" : "bad"}">${contacts.length ? contacts.length + " contact" + (contacts.length === 1 ? "" : "s") : "No contacts yet"}</span>
              <span class="badge" id="locBadge">Location: not checked</span>
              <span class="badge" id="shakeBadge">Shake: ${s.shakeEnabled ? "on" : "off"}</span>
            </div>
            ${contacts.length === 0 ? `<div class="notice warn" style="margin-top:12px">An alert needs somewhere to go. <a href="#/circle">Add your trusted circle →</a></div>` : ""}
          </div>

          <div class="card">
            <h3 style="margin-top:0">Discreet hand-sign trigger</h3>
            <p class="muted small">Teach it one sign. Hold it to the camera for ${esc(String(s.gestureHoldSec))} seconds and the alert fires — useful if you can't speak or reach the phone.</p>
            <div class="row" style="gap:8px;margin:10px 0">
              <input id="signName" type="text" value="SAFETY SIGN" style="flex:1;min-width:0" aria-label="Name of your safety sign">
              <button class="btn secondary sm" id="camStart">Start camera</button>
            </div>
            <div class="stage" style="aspect-ratio:4/3">
              <video id="cam" playsinline autoplay muted aria-label="Camera preview"></video>
              <canvas id="overlay" aria-hidden="true"></canvas>
              <div class="corner"><span class="badge" id="camStatus"><span class="dot off"></span> Camera off</span>
              <span class="badge" id="signStatus">No hand</span></div>
              <div class="placeholder" id="camPlaceholder"><div><div style="font-size:2rem" aria-hidden="true">🤚</div><p>Start the camera, hold your sign, and capture samples.</p></div></div>
            </div>
            <div class="btn-row" style="margin-top:10px">
              <button class="btn" id="capBtn" disabled>Capture sample</button>
              <button class="btn secondary" id="clearSign">Clear samples</button>
            </div>
            <p class="field-hint" id="signMsg">Samples: ${store.safetySign()?.samples?.length || 0}. Capture 5–10, then hold the sign to test it.</p>
          </div>

          <div class="notice warn"><strong>Keep a backup.</strong> A camera sign needs the app open, the camera on, and your hand in view. Don't rely on it alone — know your phone's own emergency shortcut too.</div>
        </div>
      </div>
    </div>`,
    mount(root) {
      $("#sosBtn", root).onclick = () => triggerAlert("button");

      $("#previewBtn", root).onclick = async () => {
        const box = $("#previewBox", root);
        box.hidden = false; box.textContent = "Getting location…";
        const loc = await getLocation(4000);
        const b = $("#locBadge", root);
        b.textContent = loc.lat != null ? "Location: ready" : "Location: unavailable";
        b.className = "badge " + (loc.lat != null ? "good" : "warn");
        box.innerHTML = "<strong>Message that will be sent:</strong><br>" + esc(buildMessage(loc)).replace(/\n/g, "<br>");
      };

      /* --- gesture trigger --- */
      let session = null, holdingSince = 0, fired = false;
      const video = $("#cam", root), canvas = $("#overlay", root);
      const signMsg = $("#signMsg", root);
      const countSamples = () => store.safetySign()?.samples?.length || 0;

      $("#camStart", root).onclick = async () => {
        try {
          $("#camStart", root).disabled = true;
          session = session || new LiveSession({ video, canvas,
            onState: (st) => {
              $("#signStatus", root).textContent = st.handVisible ? (st.sign ? "Sign held" : "Hand detected") : "No hand";
              if (st.frame) { recent.push(st.frame); if (recent.length > 12) recent.shift(); } else recent.length = 0;
              if (st.sign === "safety-sign") {
                if (!holdingSince) holdingSince = Date.now();
                if (!fired && Date.now() - holdingSince >= (store.getSettings().gestureHoldSec * 1000)) {
                  fired = true; holdingSince = 0;
                  setTimeout(() => { fired = false; }, 8000);
                  triggerAlert("hand sign");
                }
              } else { holdingSince = 0; }
            },
            onStatus: (st) => {
              if (st.phase === "live") { $("#camPlaceholder", root).hidden = true;
                $("#camStatus", root).innerHTML = `<span class="dot live"></span> Camera live`;
                $("#capBtn", root).disabled = false; }
              if (st.phase === "stopped") { $("#camPlaceholder", root).hidden = false;
                $("#camStatus", root).innerHTML = `<span class="dot off"></span> Camera off`; }
            } });
          session.rec.reload();
          await session.start();
        } catch (e) { toast("Camera error: " + e.message, "bad"); $("#camStart", root).disabled = false; }
      };
      const recent = [];

      $("#capBtn", root).onclick = () => {
        if (recent.length < 3) return toast("Hold your hand in view first", "bad");
        const n = recent.length, mean = new Float32Array(63);
        for (const f of recent) for (let i = 0; i < 63; i++) mean[i] += f[i] / n;
        store.addSample("safety-sign", Array.from(mean), "static");
        store.setSettings({ gestureEnabled: true });
        if (session) session.rec.reload();
        signMsg.textContent = `Samples: ${countSamples()}. Capture a few more, then hold the sign to test.`;
        toast("Sample saved", "good");
      };
      $("#clearSign", root).onclick = () => {
        store.clearSamples("safety-sign"); if (session) session.rec.reload();
        signMsg.textContent = "Samples: 0. Capture 5–10 to set up your sign."; toast("Cleared");
      };

      return () => { try { session?.stop(); } catch {} };
    },
  };
}

/* ====================================================================== */
/* Circle                                                                 */
/* ====================================================================== */
export function circle() {
  return {
    title: "Trusted circle — Aegis",
    html: `
    <div class="wrap section tight">
      ${head("Your trusted circle", "The people who get your alert. Keep it to a few who will actually act.")}
      <div class="grid live-grid" style="grid-template-columns:1fr 1fr;align-items:start">
        <div class="card">
          <h3 style="margin-top:0">Add someone</h3>
          <label class="field"><span>Name</span><input id="cName" type="text" placeholder="e.g. Priya (sister)"></label>
          <label class="field"><span>Phone (with country code)</span><input id="cPhone" type="tel" placeholder="+91 98xxx xxxxx"></label>
          <label class="field"><span>Relationship</span><input id="cRel" type="text" placeholder="e.g. Sister, Friend, Neighbour"></label>
          <label class="field"><span><input type="checkbox" id="cPrimary" style="width:auto"> Make this my primary contact</span></label>
          <button class="btn block" id="addBtn">Add to circle</button>
        </div>
        <div>
          <div id="list"></div>
          <div class="notice info" style="margin-top:14px">
            Your contacts are stored only on this device. Nothing is uploaded, and no one else can see this list.
          </div>
        </div>
      </div>
    </div>`,
    mount(root) {
      const render = () => {
        const cs = store.getContacts();
        $("#list", root).innerHTML = cs.length === 0
          ? `<div class="empty card"><div class="big" aria-hidden="true">👥</div><h3>No one yet</h3><p>Add at least one person so an alert has somewhere to go.</p></div>`
          : `<div class="stack">${cs.map(c => `
              <div class="card pad-sm contact-card">
                <div class="row" style="gap:12px">
                  <span class="avatar" aria-hidden="true">${esc((c.name || "?").trim().charAt(0).toUpperCase())}</span>
                  <div><strong>${esc(c.name)}</strong> ${c.primary ? '<span class="badge info">Primary</span>' : ""}
                  <div class="muted small">${esc(c.relation || "Contact")} · ${esc(c.phone)}</div></div>
                </div>
                <div class="btn-row" style="gap:6px">
                  <a class="btn ghost sm" href="${esc(telLink(c.phone))}">Call</a>
                  <button class="btn ghost sm" data-del="${esc(c.id)}">Remove</button>
                </div>
              </div>`).join("")}</div>`;
        $$("[data-del]", root).forEach(b => b.onclick = () => { store.deleteContact(b.dataset.del); render(); });
      };
      $("#addBtn", root).onclick = () => {
        const name = $("#cName", root).value.trim();
        const phone = $("#cPhone", root).value.trim();
        if (!name || phone.replace(/\D/g, "").length < 6) return toast("Enter a name and a valid phone number", "bad");
        store.addContact({ name, phone, relation: $("#cRel", root).value.trim(), primary: $("#cPrimary", root).checked });
        ["cName", "cPhone", "cRel"].forEach(id => $("#" + id, root).value = "");
        $("#cPrimary", root).checked = false;
        toast("Added to your circle", "good"); render();
      };
      render();
    },
  };
}

/* ====================================================================== */
/* Check-in                                                               */
/* ====================================================================== */
export function checkin() {
  return {
    title: "Check-in — Aegis",
    html: `
    <div class="wrap section tight">
      ${head("Check-in timer", "Say when you expect to be safe. If you don't confirm, an alert fires.")}
      <div class="grid live-grid" style="grid-template-columns:1fr 1fr;align-items:start">
        <div class="card">
          <h3 style="margin-top:0">Start a check-in</h3>
          <label class="field"><span>I expect to be safe in…</span>
            <select id="mins"><option value="15">15 minutes</option><option value="30" selected>30 minutes</option>
            <option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option></select></label>
          <label class="field"><span>Note (optional)</span><input id="note" type="text" placeholder="e.g. Walking home from the metro"></label>
          <button class="btn block" id="startBtn">Start check-in</button>
        </div>
        <div class="card" id="activeCard"></div>
      </div>
    </div>`,
    mount(root) {
      let timer = null, due = 0, started = 0, total = 0;

      const tick = () => {
        const left = Math.max(0, due - Date.now());
        const el = $("#ring", root); if (!el) return;
        const pct = total ? left / total : 0;
        const circ = 2 * Math.PI * 66;
        el.style.strokeDasharray = circ;
        el.style.strokeDashoffset = circ * (1 - pct);
        const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
        $("#clock", root).textContent = `${mm}:${String(ss).padStart(2, "0")}`;
        if (left <= 0) { clearInterval(timer); timer = null; store.updateCheckin(store.pendingCheckin()?.id, { status: "alerted" }); triggerAlert("check-in expired"); renderActive(); }
      };

      const renderActive = () => {
        const c = store.pendingCheckin();
        $("#activeCard", root).innerHTML = c
          ? `<h3 style="margin-top:0">Check-in running</h3>
             <div class="timer-ring"><svg viewBox="0 0 150 150"><defs><linearGradient id="goldgrad" x1="0" y1="0" x2="1" y2="1">
               <stop offset="0" stop-color="#f7ecc2"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
               <circle class="bg" cx="75" cy="75" r="66"/><circle class="fg" id="ring" cx="75" cy="75" r="66"/></svg>
               <div class="countdown" id="clock" style="font-size:2.4rem">--:--</div></div>
             <p class="muted small center">${esc(c.note || "No note")} · due ${esc(fmtDateTime(c.dueTs))}</p>
             <button class="btn block" id="safeBtn">✅ I'm safe — cancel the alert</button>`
          : `<h3 style="margin-top:0">No check-in running</h3><p class="muted">Start one and this panel will count down. If it reaches zero, your circle is alerted.</p>`;
        const sb = $("#safeBtn", root);
        if (sb) sb.onclick = () => { clearInterval(timer); timer = null; store.updateCheckin(c.id, { status: "safe" }); store.log("Marked safe"); toast("Marked safe — no alert sent", "good"); renderActive(); };
        if (c) { total = c.dueTs - c.ts; due = c.dueTs; tick(); if (!timer) timer = setInterval(tick, 1000); }
      };

      $("#startBtn", root).onclick = () => {
        if (store.pendingCheckin()) return toast("A check-in is already running", "bad");
        const mins = Number($("#mins", root).value);
        store.addCheckin(Date.now() + mins * 60000, $("#note", root).value.trim());
        toast("Check-in started", "good"); renderActive();
      };
      renderActive();
      return () => clearInterval(timer);
    },
  };
}

/* ====================================================================== */
/* Toolkit                                                                */
/* ====================================================================== */
export function toolkit() {
  const s = store.getSettings();
  return {
    title: "Toolkit — Aegis",
    html: `
    <div class="wrap section tight">
      ${head("Safety toolkit", "Small tools for uncomfortable or risky moments.")}
      <div class="grid cols-2">
        <div class="card">
          <h3 style="margin-top:0">📞 Fake call</h3>
          <p class="muted small">An incoming call you can use to leave an uncomfortable situation.</p>
          <label class="field"><span>Caller name</span><input id="fcName" type="text" value="${esc(s.fakeCallerName)}"></label>
          <label class="field"><span>Ring after</span>
            <select id="fcDelay"><option value="0">Immediately</option><option value="10" selected>10 seconds</option>
            <option value="30">30 seconds</option><option value="60">1 minute</option></select></label>
          <button class="btn block" id="fcStart">Start fake call</button>
        </div>

        <div class="card">
          <h3 style="margin-top:0">🔑 Safe word</h3>
          <p class="muted small">A word you can say or send that quietly tells your circle you need help.</p>
          <label class="field"><span>Your safe word</span><input id="sw" type="text" value="${esc(s.safeWord)}" placeholder="e.g. pineapple"></label>
          <button class="btn secondary block" id="swSave">Save safe word</button>
          <p class="field-hint">Tell your circle what it means — it only works if they know.</p>
        </div>

        <div class="card">
          <h3 style="margin-top:0">🆘 Quick dial</h3>
          <p class="muted small">Emergency numbers, one tap.</p>
          <div class="btn-row">
            <a class="btn danger" href="tel:112">112 Emergency</a>
            <a class="btn secondary" href="tel:181">181 Women</a>
            <a class="btn secondary" href="tel:1098">1098 Child</a>
          </div>
          <p class="field-hint"><a href="#/helplines">See all helplines →</a></p>
        </div>

        <div class="card">
          <h3 style="margin-top:0">📤 Share my location now</h3>
          <p class="muted small">Send a live map link to someone you trust, without raising an alarm.</p>
          <button class="btn secondary block" id="shareLoc">Get my location link</button>
          <div id="locOut" class="field-hint"></div>
        </div>
      </div>
    </div>`,
    mount(root) {
      $("#swSave", root).onclick = () => { store.setSettings({ safeWord: $("#sw", root).value.trim() }); toast("Safe word saved", "good"); };
      $("#shareLoc", root).onclick = async () => {
        $("#locOut", root).textContent = "Getting location…";
        const loc = await getLocation(5000);
        if (loc.lat == null) return $("#locOut", root).textContent = "Could not get location: " + loc.error;
        const link = mapsLink(loc);
        $("#locOut", root).innerHTML = `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(link)}</a>
          <div class="btn-row" style="margin-top:8px"><button class="btn ghost sm" id="cpLoc">Copy link</button></div>`;
        $("#cpLoc", root).onclick = () => copyText(link);
      };

      $("#fcStart", root).onclick = () => {
        const name = $("#fcName", root).value.trim() || "Unknown";
        store.setSettings({ fakeCallerName: name });
        const delay = Number($("#fcDelay", root).value) * 1000;
        toast(delay ? `Fake call in ${delay / 1000}s — lock your screen` : "Incoming call…");
        setTimeout(() => showFakeCall(name), delay);
      };
    },
  };
}

function showFakeCall(name) {
  const el = document.createElement("div");
  el.className = "call-screen on";
  el.innerHTML = `
    <div>
      <div class="call-avatar" aria-hidden="true">👤</div>
      <h2 style="margin:18px 0 4px">${esc(name)}</h2>
      <p class="muted">Incoming call…</p>
    </div>
    <div class="call-actions">
      <button class="call-decline" id="fcNo" aria-label="Decline">✕</button>
      <button class="call-answer" id="fcYes" aria-label="Answer">✆</button>
    </div>`;
  document.body.appendChild(el);
  const end = () => el.remove();
  el.querySelector("#fcNo").onclick = end;
  el.querySelector("#fcYes").onclick = () => {
    el.innerHTML = `<div><div class="call-avatar" aria-hidden="true">👤</div><h2 style="margin:18px 0 4px">${esc(name)}</h2>
      <p class="muted">Connected — "Hey, I'm outside, come now."</p></div>
      <button class="btn danger" id="fcEnd">End call</button>`;
    el.querySelector("#fcEnd").onclick = end;
  };
}

/* ====================================================================== */
/* Evidence                                                               */
/* ====================================================================== */
export function evidence() {
  return {
    title: "Evidence vault — Aegis",
    html: `
    <div class="wrap section tight">
      ${head("Evidence vault", "A private, timestamped record — useful if you ever report what happened.")}
      <div class="notice warn">Notes and recordings stay on this device. Recordings are kept for this session only, so <b>download</b> anything you want to keep. A fingerprint shows a note hasn't been edited since it was written; it is not a cryptographic signature.</div>
      <div class="grid cols-2" style="margin-top:16px">
        <div class="card">
          <h3 style="margin-top:0">Add a note</h3>
          <label class="field"><span>What happened</span><textarea id="evText" placeholder="Describe what happened, where, who was involved…"></textarea></label>
          <button class="btn block" id="evAdd">Save note with timestamp</button>
        </div>
        <div class="card">
          <h3 style="margin-top:0">Record audio</h3>
          <p class="muted small">Captures sound with a timestamp. Check that recording is lawful where you are.</p>
          <div class="btn-row"><button class="btn" id="recStart">● Start recording</button>
          <button class="btn secondary" id="recStop" disabled>■ Stop &amp; download</button></div>
          <p class="field-hint" id="recMsg">Not recording.</p>
        </div>
      </div>
      <div class="spread" style="margin-top:20px"><h3 style="margin:0">Saved items</h3>
        <div class="btn-row"><button class="btn secondary sm" id="exp">Export all</button>
        <button class="btn danger sm" id="clr">Clear all</button></div></div>
      <div id="evList" style="margin-top:10px"></div>
    </div>`,
    mount(root) {
      const render = () => {
        const items = store.getEvidence();
        $("#evList", root).innerHTML = items.length === 0
          ? `<div class="empty card"><div class="big" aria-hidden="true">🗂️</div><h3>Nothing saved yet</h3><p>Anything you add here stays on this device.</p></div>`
          : `<div class="stack">${items.map(e => `<div class="card pad-sm">
              <div class="spread"><strong>${e.kind === "audio" ? "🎙️ Audio" : "📝 Note"}</strong>
              <span class="muted small">${esc(fmtDateTime(e.ts))} · fp ${esc(e.fingerprint)}</span></div>
              ${e.text ? `<p style="margin:10px 0 0">${esc(e.text)}</p>` : ""}
              ${e.duration ? `<p class="muted small" style="margin:6px 0 0">Duration: ${esc(e.duration)}s</p>` : ""}
              <div class="btn-row" style="margin-top:10px"><button class="btn ghost sm" data-del="${esc(e.id)}">Delete</button></div>
            </div>`).join("")}</div>`;
        $$("[data-del]", root).forEach(b => b.onclick = () => { store.deleteEvidence(b.dataset.del); render(); });
      };
      $("#evAdd", root).onclick = () => {
        const t = $("#evText", root).value.trim();
        if (!t) return toast("Write something first", "bad");
        store.addEvidence("note", t); $("#evText", root).value = ""; toast("Note saved", "good"); render();
      };

      let rec = null, chunks = [], t0 = 0, tickT = null;
      $("#recStart", root).onclick = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          chunks = []; rec = new MediaRecorder(stream); t0 = Date.now();
          rec.ondataavailable = (e) => chunks.push(e.data);
          rec.start();
          $("#recStart", root).disabled = true; $("#recStop", root).disabled = false;
          tickT = setInterval(() => { $("#recMsg", root).textContent = "● Recording… " + Math.floor((Date.now() - t0) / 1000) + "s"; }, 500);
        } catch (e) { toast("Microphone error: " + e.message, "bad"); }
      };
      $("#recStop", root).onclick = () => {
        if (!rec) return;
        const dur = Math.round((Date.now() - t0) / 1000);
        rec.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `aegis-recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`;
          a.click(); setTimeout(() => URL.revokeObjectURL(url), 4000);
          store.addEvidence("audio", `Audio recording (${dur}s)`, { duration: dur });
          render();
        };
        rec.stop(); rec.stream.getTracks().forEach(t => t.stop()); rec = null;
        clearInterval(tickT);
        $("#recStart", root).disabled = false; $("#recStop", root).disabled = true;
        $("#recMsg", root).textContent = "Saved and downloaded.";
        toast("Recording saved", "good");
      };
      $("#exp", root).onclick = () => download("aegis-evidence.json", JSON.stringify(store.getEvidence(), null, 2));
      $("#clr", root).onclick = () => { if (confirm("Delete every saved item?")) { store.clearEvidence(); render(); } };
      render();
      return () => { clearInterval(tickT); try { rec?.stream?.getTracks().forEach(t => t.stop()); } catch {} };
    },
  };
}

/* ====================================================================== */
/* Helplines                                                              */
/* ====================================================================== */
export function helplines() {
  return {
    title: "Helplines — Aegis",
    html: `
    <div class="wrap section tight">
      ${head("Emergency numbers", "India. Tap to call — these work even without this app.")}
      <div class="card">
        ${HELPLINES.map(h => `<div class="helpline">
          <div><div><strong>${esc(h.label)}</strong></div><div class="muted small">${esc(h.note)}</div></div>
          <div class="row" style="gap:10px"><span class="num">${esc(h.n)}</span>
          <a class="btn sm" href="${esc(telLink(h.tel))}">Call</a></div>
        </div>`).join("")}
      </div>
      <div class="notice info" style="margin-top:16px">
        Numbers verified against Government of India sources. The 112 India app also has a <b>SHOUT</b>
        feature that alerts registered volunteers nearby, and most phones can trigger 112 by pressing the
        power button five times quickly — worth setting up on your own phone.
      </div>
    </div>`,
    mount() {},
  };
}

/* ====================================================================== */
/* Settings                                                               */
/* ====================================================================== */
export function settings() {
  return {
    title: "Settings — Aegis",
    html: `
    <div class="wrap section tight">
      ${head("Settings", "How your alerts behave.")}
      <div class="grid cols-2">
        <div class="card">
          <h3 style="margin-top:0">Alerting</h3>
          <label class="field"><span>Send alerts by</span>
            <select id="method"><option value="sms">SMS / Messages</option><option value="whatsapp">WhatsApp</option></select></label>
          <label class="field"><span>Cancel window: <output id="cdv"></output> seconds</span>
            <input type="range" id="cd" min="0" max="15"></label>
          <label class="field"><span><input type="checkbox" id="shareLoc" style="width:auto"> Include my location in alerts</span></label>
          <label class="field"><span>Message sent with an alert</span><textarea id="msg"></textarea></label>
        </div>
        <div class="card">
          <h3 style="margin-top:0">Triggers</h3>
          <label class="field"><span><input type="checkbox" id="shake" style="width:auto"> Shake to alert</span></label>
          <label class="field"><span>Shake sensitivity: <output id="shv"></output></span>
            <input type="range" id="sh" min="8" max="40"></label>
          <label class="field"><span>Hand sign hold time: <output id="ghv"></output>s</span>
            <input type="range" id="gh" min="1" max="10"></label>
          <div class="notice info" style="margin-top:8px">Shake works while this app is open in your browser. For a system-wide shortcut, set up your phone's own emergency SOS as well.</div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="margin-top:0">Your data</h3>
        <p class="muted small">Everything is stored on this device only.</p>
        <div class="btn-row"><button class="btn secondary" id="expAll">Export everything</button>
        <button class="btn danger" id="reset">Erase all Aegis data</button></div>
      </div>
    </div>`,
    mount(root) {
      const s = store.getSettings();
      const method = $("#method", root); method.value = s.alertMethod;
      const cd = $("#cd", root); cd.value = s.countdown;
      const shareLoc = $("#shareLoc", root); shareLoc.checked = s.shareLocation;
      const msg = $("#msg", root); msg.value = s.voiceMessage;
      const shake = $("#shake", root); shake.checked = s.shakeEnabled;
      const sh = $("#sh", root); sh.value = s.shakeSensitivity;
      const gh = $("#gh", root); gh.value = s.gestureHoldSec;
      const sync = () => { $("#cdv", root).textContent = cd.value; $("#shv", root).textContent = sh.value; $("#ghv", root).textContent = gh.value; };
      sync();

      const save = () => store.setSettings({
        alertMethod: method.value, countdown: Number(cd.value), shareLocation: shareLoc.checked,
        voiceMessage: msg.value, shakeEnabled: shake.checked, shakeSensitivity: Number(sh.value),
        gestureHoldSec: Number(gh.value),
      });
      [method, cd, shareLoc, msg, sh, gh].forEach(el => el.addEventListener("change", () => { save(); sync(); }));
      cd.addEventListener("input", sync); sh.addEventListener("input", sync); gh.addEventListener("input", sync);
      shake.addEventListener("change", async () => {
        save();
        if (shake.checked) {
          const ok = await enableShake((e) => toast("Shake needs permission: " + e.message, "bad"));
          toast(ok ? "Shake to alert is on" : "Could not enable shake", ok ? "good" : "bad");
        } else { disableShake(); toast("Shake to alert is off"); }
      });
      $("#expAll", root).onclick = () => download("aegis-data.json", store.export());
      $("#reset", root).onclick = () => { if (confirm("Erase ALL Aegis data on this device?")) { store.resetAll(); toast("All data erased"); location.hash = "#/"; } };
    },
  };
}

export const views = { home, sos, circle, checkin, toolkit, evidence, helplines, settings };

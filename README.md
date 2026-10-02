# Aegis — personal safety for everyone

A discreet way to call for help: **a button, a shake, or a hand sign you choose.**

Built to be universal on purpose. A safety app framed as being for one group only gets
installed by people who already feel at risk; a tool framed as *personal safety for
everyone* gets adopted by the whole circle — which is what makes safety tools work,
because your emergency contacts need it too.

## What it does
- **Emergency screen** — one big button, a short cancel window, then your trusted circle
  gets a message with your location.
- **Shake to alert** — three quick shakes, no need to look at the screen.
- **Discreet hand sign** — teach it one sign of your choosing. Hold it to the camera and
  the alert fires: no speaking, no tapping. Useful for deaf and non-speaking users, and
  for anyone who can't reach their phone.
- **Check-in timer** — "I expect to be safe in 30 minutes." If you don't confirm, an
  alert goes out.
- **Trusted circle** — the people who get your alert.
- **Toolkit** — fake call, safe word, quick dial, share-my-location.
- **Evidence vault** — private, timestamped notes and audio recordings, with a
  fingerprint showing a note hasn't been edited.
- **Helplines** — India's emergency numbers, one tap away.

## Honest about what it does NOT do
Aegis does **not** prevent violence, and no app can. Most harm comes from someone the
person already knows, in places an app cannot reach. It is one layer — alongside people
who look out for each other, functioning helplines, and a legal system that holds
offenders accountable. It is not a substitute for any of those, and it is not a reason to
take risks you otherwise wouldn't.

## Architecture (and its limits)
This is a static web app, so it **cannot** silently send SMS or share location in the
background — browsers don't allow that. What it does instead is open *your own*
messaging app with the message and location already filled in, so you only press send.
Real background alerting needs a server, and is labelled as such.

Privacy: everything is stored on this device only. Nothing is uploaded. No camera or
microphone data leaves the browser.

## Running it
Open `index.html` over **HTTPS** (camera, location and microphone all require a secure
context), or serve the folder locally:

    python -m http.server 8000

## Helplines (India)
112 (all emergencies) · 181 (Women Helpline) · 14490 (National Commission for Women) ·
1098 (Childline) · 100 (Police) · 1930 (Cyber Crime). Verify locally before relying on them.

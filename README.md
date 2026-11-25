# Relay — two-person voice + text calling

A dependency-free Node.js app with WebRTC audio, private-by-link call rooms, English speech recognition and text-to-speech. No account required for callers.

## Run locally

Install Node.js 20 or newer. In this directory run `npm start`, then open http://localhost:3000. Open the share link in a second browser tab or device (remote devices need an HTTPS deployment). Click Join call and grant microphone access. For the best experience use desktop Chrome or Edge and headphones. Two tabs on the same device can cause audio feedback; mute one or use headphones.

## Publish on Render

1. Create a GitHub repository and upload the contents of this folder (package.json must be at the repository root).
2. Sign in at https://dashboard.render.com/ and select New > Web Service; connect the repository.
3. Runtime: Node. Build command: `npm install`. Start command: `npm start`. Health check path: `/health`. Select an available plan and deploy. Keep the service at one instance because rooms are in process memory.
4. Open the HTTPS `onrender.com` URL Render assigns. Start a call, copy its URL, and send to a second participant.

Render instructions: https://render.com/docs/web-services . You can use another Node-capable host with HTTPS instead. Dockerfile included.

## Features and limits

- Start a call creates a random room URL, automatically joins the host, and prompts for microphone access. The recipient uses Join call. A room allows exactly two participants.
- The mute button disables outgoing microphone audio and speech recognition; incoming audio and typed messages continue. Text-only users can decline microphone access. Typed text is synthesized at the receiving device, not mixed into the WebRTC audio track. Only typed messages are read aloud; voice captions are not read aloud to avoid repetition. The receiver may disable reading aloud. Captions are final English recognition results, with interim text shown locally. Recognition pauses during synthesized playback to reduce echo; use headphones.
- Microphone, speech recognition and text-to-speech depend on browser permissions, available voices, browser support and sometimes an internet speech service. Recognition can send microphone audio to a browser vendor's service. Some browsers require a user interaction before audio or synthesis playback; use the audio playback button if shown. Speech recognition is not uniformly supported. Chrome is recommended; other browsers can use text or audio if supported.
- Default ICE uses a public STUN server. For reliable calls behind restrictive NATs/firewalls, configure a TURN relay with `ICE_SERVERS` as a JSON array of RTCIceServer objects (e.g. `[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:your-turn-host:3478","username":"user","credential":"password"}]`). Do not put long-lived production secrets here: this config is delivered to clients. Use short-lived TURN credentials for a production system.
- No database or audio recording. WebRTC audio is encrypted in transit. Chat and signaling are relayed through the server in memory (not end-to-end encrypted). Anyone with a room link can join before the second slot is taken. Room tokens are random; keep the share link private. Calls end for both when either participant ends or leaves the page; reloading also ends the call. Rooms expire after inactivity or 8 hours. Restarting the server clears rooms. For public production use, add abuse/rate limiting, authentication if needed, external room storage for scaling, and managed TURN credentials.
- This is a deployable prototype, not a hosted service. API tests cover room creation, two participant limit, two-way messages, signaling and ending; browser speech services and cross-network media require testing on real devices after deploying.

## Test

`npm test` runs the integration test. `node --check public/app.js` validates browser script syntax.

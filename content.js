(() => {
  "use strict";
  if (window.__voiceFileInstalled) return;
  window.__voiceFileInstalled = true;

  const ID = "voice-file-whatsapp";
  const devices = navigator.mediaDevices;
  const originalGetUserMedia = devices.getUserMedia;
  const MIC = ["ptt", "mic", "microphone", "ic-mic"];
  const PAUSE = ["pause", "audio-pause", "ptt-pause", "ic-pause", "ic-pause-filled"];
  let session = null;
  let noticeTimer;
  let queued = false;

  const currentChat = () => document.querySelector("#main header")?.innerText.split("\n")[0];

  function control(icons) {
    const matches = new Set();
    for (const element of document.querySelectorAll("#main footer [data-icon], #main footer svg title")) {
      if (!icons.includes(element.getAttribute("data-icon") ?? element.textContent)) continue;
      const button = element.closest("button, [role='button']");
      if (button?.getClientRects().length && button.id !== ID) matches.add(button);
    }
    return matches.size === 1 ? [...matches][0] : null;
  }

  function notify(message, error = false) {
    let notice = document.getElementById(`${ID}-notice`);
    if (!notice) {
      notice = document.createElement("div");
      notice.id = `${ID}-notice`;
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      document.body.append(notice);
    }
    notice.textContent = message;
    notice.dataset.error = String(error);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => notice.remove(), error ? 12000 : 6500);
  }

  function release(active) {
    if (!active || active.closed) return;
    active.closed = true;
    active.armed = false;
    clearInterval(active.monitor);
    if (active.source) {
      active.source.onended = null;
      active.source.stop();
    }
    active.stream?.getTracks().forEach((track) => track.stop());
    active.destination?.stream.getTracks().forEach((track) => track.stop());
    void active.context.close().catch(() => {});
    if (session === active) session = null;
    const button = document.getElementById(ID);
    if (button) button.disabled = false;
  }

  devices.getUserMedia = async function (constraints) {
    const active = session;
    if (!active?.armed || !constraints?.audio || constraints.video) {
      return originalGetUserMedia.call(this, constraints);
    }
    active.armed = false;
    if (currentChat() !== active.chat) throw new DOMException("The selected chat changed.", "AbortError");
    active.captured = true;
    active.stream = active.destination.stream.clone();
    return active.stream;
  };

  async function record(file, active) {
    try {
      if (!file.size || file.size > 100 * 1024 * 1024) throw new Error("Choose a non-empty audio file smaller than 100 MB.");
      notify("Preparing voice message…");
      const buffer = await active.context.decodeAudioData(await file.arrayBuffer());
      if (active.closed) return;
      if (currentChat() !== active.chat) throw new Error("The selected chat changed. Choose the file again.");
      if (active.context.state !== "running") throw new Error("Audio playback is blocked. Click the audio button and try again.");
      const microphone = control(MIC);
      if (!microphone) throw new Error("The microphone button is unavailable. Clear the message box and finish any recording first.");
      active.destination = active.context.createMediaStreamDestination();
      active.armed = true;
      microphone.click();
      const deadline = Date.now() + 10000;
      while (!active.captured || !control(PAUSE)) {
        if (active.closed) return;
        if (currentChat() !== active.chat || Date.now() >= deadline) throw new Error("Could not start recording. Try again after reloading WhatsApp.");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      active.source = active.context.createBufferSource();
      active.source.buffer = buffer;
      active.source.connect(active.destination);
      active.source.onended = () => {
        if (active.closed) return;
        const pause = currentChat() === active.chat && control(PAUSE);
        if (pause) {
          pause.click();
          notify("Voice message ready. Review it and press WhatsApp’s Send button.");
        }
        release(active);
      };
      active.monitor = setInterval(() => {
        if (currentChat() !== active.chat || !control(PAUSE)) release(active);
      }, 150);
      notify(`Recording ${Math.ceil(buffer.duration)} seconds. Keep this conversation open.`);
      active.source.start(active.context.currentTime + 0.2);
    } catch (error) {
      if (active.closed) return;
      active.armed = false;
      if (currentChat() === active.chat && control(PAUSE)) control(["ic-delete", "delete", "ptt-delete"])?.click();
      release(active);
      notify(error.message || "Could not prepare this audio file.", true);
    }
  }

  function chooseFile() {
    if (session) return;
    const chat = currentChat();
    if (!chat || !control(MIC)) return;
    const active = { chat, context: new AudioContext(), armed: false, closed: false };
    session = active;
    document.getElementById(ID).disabled = true;
    // Resume during the real button click, before the file picker consumes activation.
    void active.context.resume().catch(() => release(active));
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*,.mp3,.m4a,.ogg,.opus,.wav,.webm,.aac,.flac";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) void record(file, active);
      else release(active);
    }, { once: true });
    input.addEventListener("cancel", () => release(active), { once: true });
    input.click();
  }

  function mount() {
    const microphone = control(MIC);
    const existing = document.getElementById(ID);
    if (!microphone) {
      if (existing) existing.hidden = true;
      return;
    }
    if (existing) {
      existing.hidden = false;
      return;
    }
    const button = document.createElement("button");
    button.id = ID;
    button.type = "button";
    button.title = "Choose audio file as voice message";
    button.setAttribute("aria-label", button.title);
    button.disabled = Boolean(session);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", "M10 13a2.5 2.5 0 0 0 2.5-2.5V5a2.5 2.5 0 0 0-5 0v5.5A2.5 2.5 0 0 0 10 13Zm-5-3v.5a5 5 0 0 0 10 0V10M10 15.5V20m-3 0h6M18 3v6m-3-3h6");
    svg.append(path);
    button.append(svg);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      chooseFile();
    });
    let anchor = microphone;
    // WhatsApp currently wraps the real microphone in another button.
    while (anchor.parentElement?.closest("button")) anchor = anchor.parentElement.closest("button");
    anchor.parentElement.classList.add(`${ID}-controls`);
    anchor.before(button);
  }

  function scheduleMount() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      mount();
    });
  }
  new MutationObserver(scheduleMount).observe(document, { childList: true, subtree: true });
  scheduleMount();
  window.addEventListener("pagehide", () => release(session));
})();

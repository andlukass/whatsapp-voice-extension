const { test, mock } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function install() {
  const original = mock.fn(async () => "real-microphone");
  const navigator = { mediaDevices: { getUserMedia: original } };
  const window = { addEventListener: mock.fn() };
  const document = { documentElement: {}, querySelectorAll: () => [] };
  const observe = mock.fn();
  const environment = {
    window, navigator, document,
    MutationObserver: class { observe = observe; },
    requestAnimationFrame: mock.fn(),
  };
  const source = readFileSync(join(__dirname, "dist/content.js"), "utf8");
  vm.runInNewContext(source, environment);
  return { environment, navigator, original, observe, source };
}

test("normal microphone requests keep the original behavior", async () => {
  const { navigator, original } = install();
  const constraints = { audio: true };
  assert.equal(await navigator.mediaDevices.getUserMedia(constraints), "real-microphone");
  assert.deepEqual(original.mock.calls[0].arguments, [constraints]);
  assert.equal(original.mock.calls[0].this, navigator.mediaDevices);
});

test("repeated injection does not wrap the microphone or observe twice", () => {
  const { navigator, environment, observe, source } = install();
  const wrapped = navigator.mediaDevices.getUserMedia;
  vm.runInNewContext(source, environment);
  assert.equal(navigator.mediaDevices.getUserMedia, wrapped);
  assert.equal(observe.mock.callCount(), 1);
});

test("manifest targets only WhatsApp without privileged permissions or a worker", () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, "dist/manifest.json"), "utf8"));
  assert.deepEqual(manifest.content_scripts[0].matches, ["https://web.whatsapp.com/*"]);
  assert.equal(manifest.content_scripts[0].world, "MAIN");
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.background, undefined);
});

test("built package contains all assets referenced by the manifest", () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, "dist/manifest.json"), "utf8"));
  const script = manifest.content_scripts[0];
  for (const asset of [...script.js, ...script.css, ...Object.values(manifest.icons)]) {
    assert.ok(readFileSync(join(__dirname, "dist", asset)).length > 0, asset);
  }
});

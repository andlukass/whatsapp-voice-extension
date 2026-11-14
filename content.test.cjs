const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function install() {
  const original = jest.fn().mockResolvedValue("real-microphone");
  const navigator = { mediaDevices: { getUserMedia: original } };
  const window = { addEventListener: jest.fn() };
  const document = { documentElement: {}, querySelectorAll: () => [] };
  const observe = jest.fn();
  const environment = {
    window, navigator, document,
    MutationObserver: class { observe = observe; },
    requestAnimationFrame: jest.fn(),
  };
  const source = readFileSync(join(__dirname, "content.js"), "utf8");
  vm.runInNewContext(source, environment);
  return { environment, navigator, original, observe, source };
}

test("normal microphone requests keep the original behavior", async () => {
  const { navigator, original } = install();
  const constraints = { audio: true };
  expect(await navigator.mediaDevices.getUserMedia(constraints)).toBe("real-microphone");
  expect(original).toHaveBeenCalledWith(constraints);
  expect(original.mock.contexts[0]).toBe(navigator.mediaDevices);
});

test("repeated injection does not wrap the microphone or observe twice", () => {
  const { navigator, environment, observe, source } = install();
  const wrapped = navigator.mediaDevices.getUserMedia;
  vm.runInNewContext(source, environment);
  expect(navigator.mediaDevices.getUserMedia).toBe(wrapped);
  expect(observe).toHaveBeenCalledTimes(1);
});

test("manifest targets only WhatsApp without privileged permissions or a worker", () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, "manifest.json"), "utf8"));
  expect(manifest.content_scripts[0].matches).toEqual(["https://web.whatsapp.com/*"]);
  expect(manifest.content_scripts[0].world).toBe("MAIN");
  expect(manifest.permissions).toBeUndefined();
  expect(manifest.background).toBeUndefined();
});

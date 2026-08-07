const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const scanner = require('../../scripts/product-barcode-scanner-01.js');

class FakeElement {
  constructor(tag = 'div', parent = null) {
    this.tagName = tag.toUpperCase();
    this.parentElement = parent;
    this.attrs = {};
    this.hidden = false;
    this.id = '';
    this.textContent = '';
    this.srcObject = null;
    this.readyState = 3;
    this.className = '';
  }

  setAttribute(name, value) {
    this.attrs[name] = String(value);
    if (name === 'id') this.id = String(value);
  }

  removeAttribute(name) {
    delete this.attrs[name];
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (
        selector === '[data-prscan-open]' &&
        node.getAttribute &&
        node.getAttribute('data-prscan-open') !== null
      ) return node;
      if (
        selector === '[data-prscan-action]' &&
        node.getAttribute &&
        node.getAttribute('data-prscan-action') !== null
      ) return node;
      node = node.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    if (selector === '.prscan-panel') return { focus() {} };
    return null;
  }

  focus() {}
  pause() {}
  async play() {}
}

class FakeDocument {
  constructor() {
    this.readyState = 'complete';
    this.listeners = {};
    this.documentElement = new FakeElement('html');
    this.body = new FakeElement('body', this.documentElement);
    this.activeElement = this.body;
    this.nodes = {
      prscanStatus: Object.assign(new FakeElement('div', this.body), { id: 'prscanStatus' }),
      prscanVideo: Object.assign(new FakeElement('video', this.body), { id: 'prscanVideo' }),
    };
    this.body.appendChild = (node) => {
      node.parentElement = this.body;
      if (node.id) this.nodes[node.id] = node;
    };
  }

  createElement(tag) {
    return new FakeElement(tag, this.body);
  }

  getElementById(id) {
    return this.nodes[id] || null;
  }

  querySelector() {
    return null;
  }

  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }

  dispatchClick(target) {
    const event = {
      target,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
    };
    for (const listener of this.listeners.click || []) listener(event);
    return event;
  }
}

function runtimeSource() {
  return scanner.SCANNER_RUNTIME
    .replace(/^<script[^>]*>\s*/, '')
    .replace(/\s*<\/script>$/, '');
}

function createHarness() {
  const document = new FakeDocument();
  let getUserMediaCalls = 0;
  let trackStops = 0;
  const track = { stop() { trackStops += 1; } };
  const stream = { getTracks() { return [track]; } };

  class BarcodeDetector {
    static async getSupportedFormats() {
      return ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
    }
    async detect() { return []; }
  }

  const windowObject = {
    addEventListener() {},
    setTimeout,
    clearTimeout,
    matchMedia() { return { matches: false }; },
    BarcodeDetector,
  };
  windowObject.window = windowObject;

  const storage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const navigator = {
    onLine: true,
    mediaDevices: {
      async getUserMedia() {
        getUserMediaCalls += 1;
        return stream;
      },
    },
  };

  const context = {
    window: windowObject,
    document,
    navigator,
    BarcodeDetector,
    localStorage: storage,
    sessionStorage: storage,
    console,
    JSON,
    Math,
    Number,
    String,
    Object,
    Array,
    Date,
    Promise,
    setTimeout,
    clearTimeout,
  };
  vm.createContext(context);
  vm.runInContext(runtimeSource(), context);

  function action(name) {
    const element = new FakeElement('button', document.documentElement);
    element.setAttribute('data-prscan-action', name);
    return element;
  }

  return {
    document,
    windowObject,
    action,
    getUserMediaCalls: () => getUserMediaCalls,
    trackStops: () => trackStops,
  };
}

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test('scanner action clicks are not mistaken for the scanner entry trigger', async () => {
  const harness = createHarness();
  const trigger = new FakeElement('button', harness.document.body);
  trigger.setAttribute('data-prscan-open', 'true');

  harness.windowObject.JulvoxProductScanner.open(trigger);

  const dialog = harness.document.getElementById('julvoxProductScanner');
  assert.equal(dialog.hidden, false);
  assert.equal(harness.document.documentElement.getAttribute('data-prscan-open'), null);
  assert.equal(harness.document.documentElement.getAttribute('data-prscan-active'), 'true');

  harness.document.dispatchClick(harness.action('stop'));
  assert.equal(harness.document.getElementById('prscanStatus').textContent, 'Caméra arrêtée.');

  harness.document.dispatchClick(harness.action('start'));
  await flushAsyncWork();
  assert.equal(harness.getUserMediaCalls(), 1, 'start click must call getUserMedia through startCamera()');
  assert.equal(harness.document.getElementById('prscanStatus').textContent, 'Caméra active. Place le code-barres dans le cadre.');

  harness.document.dispatchClick(harness.action('stop'));
  assert.equal(harness.trackStops(), 1, 'stop click must stop the active media track through stopCamera()');
  assert.equal(harness.document.getElementById('prscanStatus').textContent, 'Caméra arrêtée.');

  harness.document.dispatchClick(harness.action('close'));
  assert.equal(dialog.hidden, true, 'close click must hide the scanner dialog');
  assert.equal(harness.document.documentElement.getAttribute('data-prscan-active'), null);
});

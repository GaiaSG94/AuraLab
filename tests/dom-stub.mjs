// Minimal DOM stub: just enough for core/notebook.js and core/controls.js to
// run in Node. It is a test double, not a browser: it proves the wiring
// (build, click, restore) does not throw, not that it paints.
class FakeClassList {
  constructor() {
    this.set = new Set();
  }

  add(name) {
    this.set.add(name);
  }

  remove(name) {
    this.set.delete(name);
  }

  toggle(name, on) {
    if (on) this.set.add(name);
    else this.set.delete(name);
  }

  contains(name) {
    return this.set.has(name);
  }
}

class FakeElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.className = "";
    this.classList = new FakeClassList();
    this.attributes = {};
    this.dataset = {};
    this.style = { cssText: "", setProperty() {} };
    this.listeners = {};
    this._innerHTML = "";
    this._textContent = "";
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children.length = 0;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(text) {
    this._textContent = text;
  }

  get textContent() {
    return this._textContent;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }

  dispatch(type, event = {}) {
    (this.listeners[type] || []).forEach((fn) => fn({ target: this, preventDefault() {}, ...event }));
  }

  click() {
    this.dispatch("click");
  }

  querySelector(selector) {
    const wanted = selector.replace(/^\./, "");
    const walk = (node) => {
      for (const child of node.children) {
        if (child.classList.contains(wanted)) return child;
        const found = walk(child);
        if (found) return found;
      }
      return null;
    };
    return walk(this);
  }

  querySelectorAll() {
    return [];
  }

  get text() {
    return this._textContent;
  }
}

export function installDom() {
  const storage = new Map();
  globalThis.document = {
    createElement: (tag) => new FakeElement(tag),
    getElementById: () => new FakeElement("div"),
    documentElement: { style: { setProperty() {} } },
    querySelectorAll: () => [],
    addEventListener() {},
  };
  globalThis.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear(),
  };
  globalThis.window = globalThis.window || { matchMedia: () => ({ matches: false }) };
  return { storage };
}

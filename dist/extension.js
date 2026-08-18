// src/host/host-errors.ts
var HostOperationError = class extends Error {
  operation;
  status;
  details;
  constructor(operation, message, options = {}) {
    super(message, { cause: options.cause });
    this.name = "HostOperationError";
    this.operation = operation;
    this.status = options.status ?? null;
    this.details = options.details ?? null;
  }
};

// src/host/sillytavern-host.ts
var SillyTavernHostAdapter = class {
  #dependencies;
  constructor(dependencies) {
    this.#dependencies = dependencies;
  }
  async discover() {
    const types = this.#dependencies.getExtensionTypes();
    const disabled = new Set(this.#dependencies.getDisabledExtensions());
    return this.#dependencies.getExtensionNames().filter((internalName) => types[internalName] === "local" || types[internalName] === "global").map((internalName) => {
      const manifest = this.#dependencies.getExtensionManifest(internalName);
      return {
        internalName,
        folderName: internalName.replace(/^third-party\//, ""),
        enabled: !disabled.has(internalName),
        type: types[internalName],
        manifest: manifest ? structuredClone(manifest) : null
      };
    });
  }
  async install(input) {
    const repositoryUrl = parseRepositoryUrl(input.repositoryUrl);
    const installed = await this.#dependencies.installExtension(
      repositoryUrl,
      false,
      input.branch ?? ""
    );
    if (!installed) {
      throw new HostOperationError("install", "SillyTavern could not install the extension.");
    }
    await this.discover();
  }
  async remove(input) {
    let response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/delete", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global"
        })
      });
    } catch {
      throw new HostOperationError("remove", "SillyTavern could not reach the extension service.");
    }
    if (!response.ok) {
      const details = sanitizeResponseDetails(await response.text());
      throw new HostOperationError("remove", "SillyTavern could not remove the extension.", {
        status: response.status,
        details
      });
    }
    await this.discover();
  }
  async enable(internalName) {
    await this.#dependencies.enableExtension(internalName, false);
    await this.discover();
  }
  async disable(internalName) {
    await this.#dependencies.disableExtension(internalName, false);
    await this.discover();
  }
  reload() {
    this.#dependencies.reload();
  }
  async openExtensionManager() {
    await this.#dependencies.openExtensionManager();
  }
  openExternal(url) {
    this.#dependencies.openExternal(url);
  }
  async showPopup(content, options) {
    await this.#dependencies.showPopup(content, options);
  }
};
function parseRepositoryUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch (cause) {
    throw new HostOperationError(
      "install",
      "Extension repositories require an HTTP or HTTPS URL.",
      {
        cause
      }
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HostOperationError("install", "Extension repositories require an HTTP or HTTPS URL.");
  }
  return url.href;
}
function sanitizeResponseDetails(input) {
  return Array.from(input).filter((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint >= 32 && (codePoint < 127 || codePoint > 159);
  }).join("").trim().slice(0, 500);
}

// src/host/runtime-host.ts
var EXTENSION_MODULE_PATH = "/scripts/extensions.js";
async function createSillyTavernRuntimeHost(context) {
  const extensionModule = await import(
    /* @vite-ignore */
    EXTENSION_MODULE_PATH
  );
  if (!context.getRequestHeaders || !context.Popup || !context.POPUP_TYPE) {
    throw new Error("SillyTavern context is missing required extension APIs.");
  }
  return new SillyTavernHostAdapter({
    getExtensionNames: () => extensionModule.extensionNames,
    getExtensionTypes: () => extensionModule.extensionTypes,
    getDisabledExtensions: () => {
      const disabled = context.extensionSettings.disabledExtensions;
      return Array.isArray(disabled) ? disabled.filter((value) => typeof value === "string") : [];
    },
    getExtensionManifest: (name) => extensionModule.getExtensionManifest(name),
    installExtension: (url, global, branch) => extensionModule.installExtension(url, global, branch),
    enableExtension: (name, reload) => extensionModule.enableExtension(name, reload),
    disableExtension: (name, reload) => extensionModule.disableExtension(name, reload),
    getRequestHeaders: () => context.getRequestHeaders(),
    fetch: globalThis.fetch.bind(globalThis),
    reload: () => globalThis.location.reload(),
    openExtensionManager: async () => {
      const managerButton = document.querySelector("#extensions_details");
      if (!managerButton) {
        throw new Error("SillyTavern extension manager is unavailable.");
      }
      managerButton.click();
    },
    openExternal: (url) => openTrustedExternalUrl(url),
    showPopup: (content, options) => showNativePopup(context, content, options)
  });
}
function openTrustedExternalUrl(input) {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("External links require an HTTP or HTTPS URL.");
  }
  globalThis.open(url.href, "_blank", "noopener,noreferrer");
}
async function showNativePopup(context, content, options) {
  const Popup = context.Popup;
  const popup = new Popup(content, context.POPUP_TYPE.DISPLAY, "", {
    wide: options.wide ?? true,
    large: options.large ?? true,
    allowVerticalScrolling: options.allowVerticalScrolling ?? false
  });
  await popup.show();
}

// src/state/profile-state.ts
function createDefaultProfileState() {
  return {
    formatVersion: 1,
    trustAcknowledgedAt: null,
    preferences: { route: "projects", density: "standard" },
    managedExtensions: {},
    personalKits: {},
    installedKits: {},
    activeKitId: null,
    operationReceipt: null
  };
}

// src/state/state-migrations.ts
var UnsupportedProfileStateError = class extends Error {
  formatVersion;
  constructor(formatVersion) {
    super(`Profile state format ${formatVersion} is newer than this Companion supports.`);
    this.name = "UnsupportedProfileStateError";
    this.formatVersion = formatVersion;
  }
};
function migrateProfileState(value) {
  if (!isRecord(value)) {
    return createDefaultProfileState();
  }
  if (Number.isInteger(value.formatVersion) && Number(value.formatVersion) > 1) {
    throw new UnsupportedProfileStateError(Number(value.formatVersion));
  }
  if (value.formatVersion !== 1) {
    return createDefaultProfileState();
  }
  const defaults = createDefaultProfileState();
  const preferences = isRecord(value.preferences) ? value.preferences : {};
  return {
    formatVersion: 1,
    trustAcknowledgedAt: typeof value.trustAcknowledgedAt === "string" ? value.trustAcknowledgedAt : null,
    preferences: {
      route: preferences.route === "kits" ? "kits" : defaults.preferences.route,
      density: preferences.density === "compact" ? "compact" : defaults.preferences.density
    },
    managedExtensions: cloneRecord(value.managedExtensions),
    personalKits: cloneRecord(value.personalKits),
    installedKits: cloneRecord(value.installedKits),
    activeKitId: typeof value.activeKitId === "string" ? value.activeKitId : null,
    operationReceipt: cloneNullableRecord(value.operationReceipt)
  };
}
function cloneRecord(value) {
  if (!isRecord(value)) {
    return {};
  }
  try {
    return structuredClone(value);
  } catch {
    return {};
  }
}
function cloneNullableRecord(value) {
  if (!isRecord(value)) {
    return null;
  }
  try {
    return structuredClone(value);
  } catch {
    return null;
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/state/profile-store.ts
var PROFILE_NAMESPACE = "tavernaryCompanion";
var ProfileStore = class {
  #dependencies;
  #subscribers = /* @__PURE__ */ new Set();
  #state;
  #queue = Promise.resolve();
  constructor(dependencies) {
    this.#dependencies = dependencies;
    this.#state = migrateProfileState(dependencies.extensionSettings[PROFILE_NAMESPACE]);
  }
  read() {
    return structuredClone(this.#state);
  }
  update(mutator) {
    const execute = async () => {
      const draft = structuredClone(this.#state);
      const result = await mutator(draft);
      const next = migrateProfileState(result ?? draft);
      this.#state = structuredClone(next);
      this.#dependencies.extensionSettings[PROFILE_NAMESPACE] = structuredClone(next);
      await this.#dependencies.saveSettingsDebounced();
      for (const subscriber of this.#subscribers) {
        subscriber(structuredClone(next));
      }
      return structuredClone(next);
    };
    const operation = this.#queue.then(execute, execute);
    this.#queue = operation.then(
      () => void 0,
      () => void 0
    );
    return operation;
  }
  subscribe(subscriber) {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }
};

// node_modules/preact/dist/preact.module.js
var n;
var l;
var u;
var t;
var i;
var r;
var o;
var e;
var f;
var c;
var a;
var s;
var h;
var p;
var v;
var y;
var d = {};
var w = [];
var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
var g = Array.isArray;
function m(n2, l2) {
  for (var u3 in l2) n2[u3] = l2[u3];
  return n2;
}
function b(n2) {
  n2 && n2.parentNode && n2.parentNode.removeChild(n2);
}
function k(l2, u3, t2) {
  var i2, r2, o2, e2 = {};
  for (o2 in u3) "key" == o2 ? i2 = u3[o2] : "ref" == o2 ? r2 = u3[o2] : e2[o2] = u3[o2];
  if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n.call(arguments, 2) : t2), "function" == typeof l2 && null != l2.defaultProps) for (o2 in l2.defaultProps) void 0 === e2[o2] && (e2[o2] = l2.defaultProps[o2]);
  return x(l2, e2, i2, r2, null);
}
function x(n2, t2, i2, r2, o2) {
  var e2 = { type: n2, props: t2, key: i2, ref: r2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o2 ? ++u : o2, __i: -1, __u: 0 };
  return null == o2 && null != l.vnode && l.vnode(e2), e2;
}
function S(n2) {
  return n2.children;
}
function C(n2, l2) {
  this.props = n2, this.context = l2;
}
function $(n2, l2) {
  if (null == l2) return n2.__ ? $(n2.__, n2.__i + 1) : null;
  for (var u3; l2 < n2.__k.length; l2++) if (null != (u3 = n2.__k[l2]) && null != u3.__e) return u3.__e;
  return "function" == typeof n2.type ? $(n2) : null;
}
function I(n2) {
  if (n2.__P && n2.__d) {
    var u3 = n2.__v, t2 = u3.__e, i2 = [], r2 = [], o2 = m({}, u3);
    o2.__v = u3.__v + 1, l.vnode && l.vnode(o2), q(n2.__P, o2, u3, n2.__n, n2.__P.namespaceURI, 32 & u3.__u ? [t2] : null, i2, null == t2 ? $(u3) : t2, !!(32 & u3.__u), r2), o2.__v = u3.__v, o2.__.__k[o2.__i] = o2, D(i2, o2, r2), u3.__e = u3.__ = null, o2.__e != t2 && P(o2);
  }
}
function P(n2) {
  if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l2) {
    if (null != l2 && null != l2.__e) return n2.__e = n2.__c.base = l2.__e;
  }), P(n2);
}
function A(n2) {
  (!n2.__d && (n2.__d = true) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
}
function H() {
  try {
    for (var n2, l2 = 1; i.length; ) i.length > l2 && i.sort(e), n2 = i.shift(), l2 = i.length, I(n2);
  } finally {
    i.length = H.__r = 0;
  }
}
function L(n2, l2, u3, t2, i2, r2, o2, e2, f3, c2, a2) {
  var s2, h2, p2, v2, y2, _2, g2 = t2 && t2.__k || w, m2 = l2.length;
  for (f3 = T(u3, l2, g2, f3, m2), s2 = 0; s2 < m2; s2++) null != (p2 = u3.__k[s2]) && (h2 = -1 != p2.__i && g2[p2.__i] || d, p2.__i = s2, _2 = q(n2, p2, h2, i2, r2, o2, e2, f3, c2, a2), v2 = p2.__e, p2.ref && h2.ref != p2.ref && (h2.ref && J(h2.ref, null, p2), a2.push(p2.ref, p2.__c || v2, p2)), null == y2 && null != v2 && (y2 = v2), 4 & p2.__u ? (f3 = j(p2, f3, n2), h2.__e && (h2.__e = null)) : "function" == typeof p2.type && void 0 !== _2 ? f3 = _2 : v2 && (f3 = v2.nextSibling), p2.__u &= -7);
  return u3.__e = y2, f3;
}
function T(n2, l2, u3, t2, i2) {
  var r2, o2, e2, f3, c2, a2 = u3.length, s2 = a2, h2 = 0;
  for (n2.__k = new Array(i2), r2 = 0; r2 < i2; r2++) null != (o2 = l2[r2]) && "boolean" != typeof o2 && "function" != typeof o2 ? ("string" == typeof o2 || "number" == typeof o2 || "bigint" == typeof o2 || o2.constructor == String ? o2 = n2.__k[r2] = x(null, o2, null, null, null) : g(o2) ? o2 = n2.__k[r2] = x(S, { children: o2 }, null, null, null) : void 0 === o2.constructor && o2.__b > 0 ? o2 = n2.__k[r2] = x(o2.type, o2.props, o2.key, o2.ref ? o2.ref : null, o2.__v) : n2.__k[r2] = o2, f3 = r2 + h2, o2.__ = n2, o2.__b = n2.__b + 1, e2 = null, -1 != (c2 = o2.__i = O(o2, u3, f3, s2)) && (s2--, (e2 = u3[c2]) && (e2.__u |= 2)), null == e2 || null == e2.__v ? (-1 == c2 && (i2 > a2 ? h2-- : i2 < a2 && h2++), "function" != typeof o2.type && (o2.__u |= 4)) : c2 != f3 && (c2 == f3 - 1 ? h2-- : c2 == f3 + 1 ? h2++ : (c2 > f3 ? h2-- : h2++, o2.__u |= 4))) : n2.__k[r2] = null;
  if (s2) for (r2 = 0; r2 < a2; r2++) null != (e2 = u3[r2]) && 0 == (2 & e2.__u) && (e2.__e == t2 && (t2 = $(e2)), K(e2, e2));
  return t2;
}
function j(n2, l2, u3) {
  var t2, i2;
  if ("function" == typeof n2.type) {
    for (t2 = n2.__k, i2 = 0; t2 && i2 < t2.length; i2++) t2[i2] && (t2[i2].__ = n2, l2 = j(t2[i2], l2, u3));
    return l2;
  }
  n2.__e != l2 && (l2 && n2.type && !l2.parentNode && (l2 = $(n2)), l2 = u3.insertBefore(n2.__e, l2 || null));
  do {
    l2 = l2 && l2.nextSibling;
  } while (null != l2 && 8 == l2.nodeType);
  return l2;
}
function O(n2, l2, u3, t2) {
  var i2, r2, o2, e2 = n2.key, f3 = n2.type, c2 = l2[u3], a2 = null != c2 && 0 == (2 & c2.__u);
  if (null === c2 && null == e2 || a2 && e2 == c2.key && f3 == c2.type) return u3;
  if (t2 > (a2 ? 1 : 0)) {
    for (i2 = u3 - 1, r2 = u3 + 1; i2 >= 0 || r2 < l2.length; ) if (null != (c2 = l2[o2 = i2 >= 0 ? i2-- : r2++]) && 0 == (2 & c2.__u) && e2 == c2.key && f3 == c2.type) return o2;
  }
  return -1;
}
function z(n2, l2, u3) {
  "-" == l2[0] ? n2.setProperty(l2, null == u3 ? "" : u3) : n2[l2] = null == u3 ? "" : "number" != typeof u3 || _.test(l2) ? u3 : u3 + "px";
}
function N(n2, l2, u3, t2, i2) {
  var r2, o2;
  n: if ("style" == l2) if ("string" == typeof u3) n2.style.cssText = u3;
  else {
    if ("string" == typeof t2 && (n2.style.cssText = t2 = ""), t2) for (l2 in t2) u3 && l2 in u3 || z(n2.style, l2, "");
    if (u3) for (l2 in u3) t2 && u3[l2] == t2[l2] || z(n2.style, l2, u3[l2]);
  }
  else if ("o" == l2[0] && "n" == l2[1]) r2 = l2 != (l2 = l2.replace(s, "$1")), o2 = l2.toLowerCase(), l2 = o2 in n2 || "onFocusOut" == l2 || "onFocusIn" == l2 ? o2.slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + r2] = u3, u3 ? t2 ? u3[a] = t2[a] : (u3[a] = h, n2.addEventListener(l2, r2 ? v : p, r2)) : n2.removeEventListener(l2, r2 ? v : p, r2);
  else {
    if ("http://www.w3.org/2000/svg" == i2) l2 = l2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if ("width" != l2 && "height" != l2 && "href" != l2 && "list" != l2 && "form" != l2 && "tabIndex" != l2 && "download" != l2 && "rowSpan" != l2 && "colSpan" != l2 && "role" != l2 && "popover" != l2 && l2 in n2) try {
      n2[l2] = null == u3 ? "" : u3;
      break n;
    } catch (n3) {
    }
    "function" == typeof u3 || (null == u3 || false === u3 && "-" != l2[4] ? n2.removeAttribute(l2) : n2.setAttribute(l2, "popover" == l2 && 1 == u3 ? "" : u3));
  }
}
function V(n2) {
  return function(u3) {
    if (this.l) {
      var t2 = this.l[u3.type + n2];
      if (null == u3[c]) u3[c] = h++;
      else if (u3[c] < t2[a]) return;
      return t2(l.event ? l.event(u3) : u3);
    }
  };
}
function q(n2, u3, t2, i2, r2, o2, e2, f3, c2, a2) {
  var s2, h2, p2, v2, y2, d2, _2, k2, x2, M, I2, P2, A2, H2, T2, j2, F = u3.type;
  if (void 0 !== u3.constructor) return null;
  128 & t2.__u && (c2 = !!(32 & t2.__u), o2 = [f3 = u3.__e = t2.__e]), (s2 = l.__b) && s2(u3);
  n: if ("function" == typeof F) {
    h2 = e2.length;
    try {
      if (x2 = u3.props, M = F.prototype && F.prototype.render, I2 = (s2 = F.contextType) && i2[s2.__c], P2 = s2 ? I2 ? I2.props.value : s2.__ : i2, t2.__c ? k2 = (p2 = u3.__c = t2.__c).__ = p2.__E : (M ? u3.__c = p2 = new F(x2, P2) : (u3.__c = p2 = new C(x2, P2), p2.constructor = F, p2.render = Q), I2 && I2.sub(p2), p2.state || (p2.state = {}), p2.__n = i2, v2 = p2.__d = true, p2.__h = [], p2._sb = []), M && null == p2.__s && (p2.__s = p2.state), M && null != F.getDerivedStateFromProps && (p2.__s == p2.state && (p2.__s = m({}, p2.__s)), m(p2.__s, F.getDerivedStateFromProps(x2, p2.__s))), y2 = p2.props, d2 = p2.state, p2.__v = u3, v2) M && null == F.getDerivedStateFromProps && null != p2.componentWillMount && p2.componentWillMount(), M && null != p2.componentDidMount && p2.__h.push(p2.componentDidMount);
      else {
        if (M && null == F.getDerivedStateFromProps && x2 !== y2 && null != p2.componentWillReceiveProps && p2.componentWillReceiveProps(x2, P2), u3.__v == t2.__v || !p2.__e && null != p2.shouldComponentUpdate && false === p2.shouldComponentUpdate(x2, p2.__s, P2)) {
          u3.__v != t2.__v && (p2.props = x2, p2.state = p2.__s, p2.__d = false), u3.__e = t2.__e, u3.__k = t2.__k, u3.__k.some(function(n3) {
            n3 && (n3.__ = u3);
          }), w.push.apply(p2.__h, p2._sb), p2._sb = [], p2.__h.length && e2.push(p2), f3 = $(t2);
          break n;
        }
        null != p2.componentWillUpdate && p2.componentWillUpdate(x2, p2.__s, P2), M && null != p2.componentDidUpdate && p2.__h.push(function() {
          p2.componentDidUpdate(y2, d2, _2);
        });
      }
      if (p2.context = P2, p2.props = x2, p2.__P = n2, p2.__e = false, A2 = l.__r, H2 = 0, M) p2.state = p2.__s, p2.__d = false, A2 && A2(u3), s2 = p2.render(p2.props, p2.state, p2.context), w.push.apply(p2.__h, p2._sb), p2._sb = [];
      else do {
        p2.__d = false, A2 && A2(u3), s2 = p2.render(p2.props, p2.state, p2.context), p2.state = p2.__s;
      } while (p2.__d && ++H2 < 25);
      p2.state = p2.__s, null != p2.getChildContext && (i2 = m(m({}, i2), p2.getChildContext())), M && !v2 && null != p2.getSnapshotBeforeUpdate && (_2 = p2.getSnapshotBeforeUpdate(y2, d2)), T2 = null != s2 && s2.type === S && null == s2.key ? E(s2.props.children) : s2, f3 = L(n2, g(T2) ? T2 : [T2], u3, t2, i2, r2, o2, e2, f3, c2, a2), p2.base = u3.__e, u3.__u &= -161, p2.__h.length && e2.push(p2), k2 && (p2.__E = p2.__ = null);
    } catch (n3) {
      if (e2.length = h2, u3.__v = null, c2 || null != o2) {
        if (n3.then) {
          for (u3.__u |= c2 ? 160 : 128; f3 && 8 == f3.nodeType && f3.nextSibling; ) f3 = f3.nextSibling;
          null != o2 && (o2[o2.indexOf(f3)] = null), u3.__e = f3;
        } else if (null != o2) for (j2 = o2.length; j2--; ) b(o2[j2]);
      } else u3.__e = t2.__e;
      null == u3.__k && (u3.__k = t2.__k || []), n3.then || B(u3), l.__e(n3, u3, t2);
    }
  } else null == o2 && u3.__v == t2.__v ? (u3.__k = t2.__k, u3.__e = t2.__e) : f3 = u3.__e = G(t2.__e, u3, t2, i2, r2, o2, e2, c2, a2);
  return (s2 = l.diffed) && s2(u3), 128 & u3.__u ? void 0 : f3;
}
function B(n2) {
  n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B));
}
function D(n2, u3, t2) {
  for (var i2 = 0; i2 < t2.length; i2++) J(t2[i2], t2[++i2], t2[++i2]);
  l.__c && l.__c(u3, n2), n2.some(function(u4) {
    try {
      n2 = u4.__h, u4.__h = [], n2.some(function(n3) {
        n3.call(u4);
      });
    } catch (n3) {
      l.__e(n3, u4.__v);
    }
  });
}
function E(n2) {
  return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : void 0 !== n2.constructor ? null : m({}, n2);
}
function G(u3, t2, i2, r2, o2, e2, f3, c2, a2) {
  var s2, h2, p2, v2, y2, w2, _2, m2 = i2.props || d, k2 = t2.props, x2 = t2.type;
  if ("svg" == x2 ? o2 = "http://www.w3.org/2000/svg" : "math" == x2 ? o2 = "http://www.w3.org/1998/Math/MathML" : o2 || (o2 = "http://www.w3.org/1999/xhtml"), null != e2) {
    for (s2 = 0; s2 < e2.length; s2++) if ((y2 = e2[s2]) && "setAttribute" in y2 == !!x2 && (x2 ? y2.localName == x2 : 3 == y2.nodeType)) {
      u3 = y2, e2[s2] = null;
      break;
    }
  }
  if (null == u3) {
    if (null == x2) return document.createTextNode(k2);
    u3 = document.createElementNS(o2, x2, k2.is && k2), c2 && (l.__m && l.__m(t2, e2), c2 = false), e2 = null;
  }
  if (null == x2) m2 === k2 || c2 && u3.data == k2 || (u3.data = k2);
  else {
    if (e2 = "textarea" == x2 && null != k2.defaultValue ? null : e2 && n.call(u3.childNodes), !c2 && null != e2) for (m2 = {}, s2 = 0; s2 < u3.attributes.length; s2++) m2[(y2 = u3.attributes[s2]).name] = y2.value;
    for (s2 in m2) y2 = m2[s2], "dangerouslySetInnerHTML" == s2 ? p2 = y2 : "children" == s2 || s2 in k2 || "value" == s2 && "defaultValue" in k2 || "checked" == s2 && "defaultChecked" in k2 || N(u3, s2, null, y2, o2);
    for (s2 in k2) y2 = k2[s2], "children" == s2 ? v2 = y2 : "dangerouslySetInnerHTML" == s2 ? h2 = y2 : "value" == s2 ? w2 = y2 : "checked" == s2 ? _2 = y2 : c2 && "function" != typeof y2 || m2[s2] === y2 || N(u3, s2, y2, m2[s2], o2);
    if (h2) c2 || p2 && (h2.__html == p2.__html || h2.__html == u3.innerHTML) || (u3.innerHTML = h2.__html), t2.__k = [];
    else if (p2 && (u3.innerHTML = ""), L("template" == t2.type ? u3.content : u3, g(v2) ? v2 : [v2], t2, i2, r2, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o2, e2, f3, e2 ? e2[0] : i2.__k && $(i2, 0), c2, a2), null != e2) for (s2 = e2.length; s2--; ) b(e2[s2]);
    c2 && "textarea" != x2 || (s2 = "value", "progress" == x2 && null == w2 ? u3.removeAttribute("value") : null != w2 && (w2 !== u3[s2] || "progress" == x2 && !w2 || "option" == x2 && w2 != m2[s2]) && N(u3, s2, w2, m2[s2], o2), s2 = "checked", null != _2 && _2 != u3[s2] && N(u3, s2, _2, m2[s2], o2));
  }
  return u3;
}
function J(n2, u3, t2) {
  try {
    if ("function" == typeof n2) {
      var i2 = "function" == typeof n2.__u;
      i2 && n2.__u(), i2 && null == u3 || (n2.__u = n2(u3));
    } else n2.current = u3;
  } catch (n3) {
    l.__e(n3, t2);
  }
}
function K(n2, u3, t2) {
  var i2, r2;
  if (l.unmount && l.unmount(n2), (i2 = n2.ref) && (i2.current && i2.current != n2.__e || J(i2, null, u3)), null != (i2 = n2.__c)) {
    if (i2.componentWillUnmount) try {
      i2.componentWillUnmount();
    } catch (n3) {
      l.__e(n3, u3);
    }
    i2.base = i2.__P = i2.__n = null;
  }
  if (i2 = n2.__k) for (r2 = 0; r2 < i2.length; r2++) i2[r2] && K(i2[r2], u3, t2 || "function" != typeof n2.type);
  t2 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
}
function Q(n2, l2, u3) {
  return this.constructor(n2, u3);
}
function R(u3, t2, i2) {
  var r2, o2, e2, f3;
  t2 == document && (t2 = document.documentElement), l.__ && l.__(u3, t2), o2 = (r2 = "function" == typeof i2) ? null : i2 && i2.__k || t2.__k, e2 = [], f3 = [], q(t2, u3 = (!r2 && i2 || t2).__k = k(S, null, [u3]), o2 || d, d, t2.namespaceURI, !r2 && i2 ? [i2] : o2 ? null : t2.firstChild ? n.call(t2.childNodes) : null, e2, !r2 && i2 ? i2 : o2 ? o2.__e : t2.firstChild, r2, f3), D(e2, u3, f3), u3.props.children = null;
}
n = w.slice, l = { __e: function(n2, l2, u3, t2) {
  for (var i2, r2, o2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
    if ((r2 = i2.constructor) && null != r2.getDerivedStateFromError && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2) return i2.__E = i2;
  } catch (l3) {
    n2 = l3;
  }
  throw n2;
} }, u = 0, t = function(n2) {
  return null != n2 && void 0 === n2.constructor;
}, C.prototype.setState = function(n2, l2) {
  var u3;
  u3 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m({}, this.state), "function" == typeof n2 && (n2 = n2(m({}, u3), this.props)), n2 && m(u3, n2), null != n2 && this.__v && (l2 && this._sb.push(l2), A(this));
}, C.prototype.forceUpdate = function(n2) {
  this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
}, C.prototype.render = S, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l2) {
  return n2.__v.__b - l2.__v.__b;
}, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

// node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
var f2 = 0;
function u2(e2, t2, n2, o2, i2, u3) {
  t2 || (t2 = {});
  var a2, c2, p2 = t2;
  if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
  var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f2, __i: -1, __u: 0, __source: i2, __self: u3 };
  if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
  return l.vnode && l.vnode(l2), l2;
}

// src/ui/popup-host.tsx
function CompanionPopupHost() {
  return /* @__PURE__ */ u2("main", { class: "tavernary-companion-shell", "aria-label": "Tavernary Companion", children: [
    /* @__PURE__ */ u2("header", { class: "tavernary-companion-shell__header", children: /* @__PURE__ */ u2("div", { children: [
      /* @__PURE__ */ u2("span", { class: "tavernary-companion-shell__eyebrow", children: "Tavernary" }),
      /* @__PURE__ */ u2("h1", { children: "Tavernary Companion" })
    ] }) }),
    /* @__PURE__ */ u2("section", { class: "tavernary-companion-shell__content", "aria-live": "polite", children: "Loading catalog\u2026" })
  ] });
}
function renderCompanionPopup(container) {
  R(/* @__PURE__ */ u2(CompanionPopupHost, {}), container);
  return () => R(null, container);
}

// src/ui/launcher.ts
function mountCompanionLauncher(input) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "menu_button menu_button_icon tavernary-companion-launcher";
  button.dataset.tavernaryCompanionLauncher = "";
  button.textContent = "Tavernary Companion";
  input.container.append(button);
  let disposed = false;
  let popupContent = null;
  let unmountPopup = null;
  const openPopup = () => {
    if (popupContent) {
      popupContent.focus();
      return;
    }
    const content = document.createElement("div");
    content.className = "tavernary-companion-root";
    content.dataset.tavernaryCompanionPopup = "";
    content.tabIndex = -1;
    popupContent = content;
    unmountPopup = renderCompanionPopup(content);
    void input.host.showPopup(content, {
      id: "tavernary-companion",
      wide: true,
      large: true,
      allowVerticalScrolling: false
    }).finally(() => {
      if (popupContent !== content) {
        return;
      }
      unmountPopup?.();
      unmountPopup = null;
      content.remove();
      popupContent = null;
    });
  };
  button.addEventListener("click", openPopup);
  return {
    button,
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      button.removeEventListener("click", openPopup);
      unmountPopup?.();
      unmountPopup = null;
      popupContent?.remove();
      popupContent = null;
      button.remove();
    }
  };
}

// src/extension/bootstrap.ts
var activeCompanion = null;
var bootstrapInFlight = null;
function bootstrapCompanion(suppliedContext) {
  if (activeCompanion) {
    return Promise.resolve({ ok: true });
  }
  if (bootstrapInFlight) {
    return bootstrapInFlight;
  }
  const attempt = performBootstrap(suppliedContext);
  bootstrapInFlight = attempt;
  void attempt.then(
    () => {
      if (bootstrapInFlight === attempt) bootstrapInFlight = null;
    },
    () => {
      if (bootstrapInFlight === attempt) bootstrapInFlight = null;
    }
  );
  return attempt;
}
async function performBootstrap(suppliedContext) {
  const context = suppliedContext === void 0 ? resolveGlobalContext() : suppliedContext;
  if (!context) {
    return { ok: false, reason: "missing-context" };
  }
  let host;
  try {
    host = context.host ?? await (context.hostFactory?.() ?? createSillyTavernRuntimeHost(context));
  } catch (error) {
    console.error("Tavernary Companion could not initialize the SillyTavern host adapter.", error);
    return { ok: false, reason: "missing-host" };
  }
  await whenDocumentReady();
  const menu = document.querySelector("#extensionsMenu");
  if (!menu) {
    return { ok: false, reason: "missing-menu" };
  }
  const store = new ProfileStore({
    extensionSettings: context.extensionSettings,
    saveSettingsDebounced: context.saveSettingsDebounced
  });
  const launcher = mountCompanionLauncher({ container: menu, host });
  activeCompanion = { launcher, store };
  return { ok: true };
}
function disposeCompanion() {
  activeCompanion?.launcher.dispose();
  activeCompanion = null;
}
function resolveGlobalContext() {
  const root = globalThis;
  return root.SillyTavern?.getContext() ?? null;
}
async function whenDocumentReady() {
  if (document.readyState !== "loading") {
    return;
  }
  await new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
  });
}

// src/extension/lifecycle.ts
function startCompanionLifecycle(context) {
  return bootstrapCompanion(context);
}
function stopCompanionLifecycle() {
  disposeCompanion();
}

// src/extension/index.ts
async function tavernaryCompanionOnInstall() {
  await startCompanionLifecycle();
}
async function tavernaryCompanionOnUpdate() {
  await startCompanionLifecycle();
}
async function tavernaryCompanionOnDelete() {
  stopCompanionLifecycle();
}
async function tavernaryCompanionOnClean() {
  stopCompanionLifecycle();
}
async function tavernaryCompanionOnEnable() {
  await startCompanionLifecycle();
}
async function tavernaryCompanionOnDisable() {
  stopCompanionLifecycle();
}
async function tavernaryCompanionOnActivate() {
  await startCompanionLifecycle();
}
export {
  tavernaryCompanionOnActivate,
  tavernaryCompanionOnClean,
  tavernaryCompanionOnDelete,
  tavernaryCompanionOnDisable,
  tavernaryCompanionOnEnable,
  tavernaryCompanionOnInstall,
  tavernaryCompanionOnUpdate
};

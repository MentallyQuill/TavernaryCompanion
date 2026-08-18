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
      route: preferences.route === "kits" || preferences.route === "installed" ? preferences.route : defaults.preferences.route,
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
function m(n2, l3) {
  for (var u4 in l3) n2[u4] = l3[u4];
  return n2;
}
function b(n2) {
  n2 && n2.parentNode && n2.parentNode.removeChild(n2);
}
function k(l3, u4, t3) {
  var i3, r3, o3, e3 = {};
  for (o3 in u4) "key" == o3 ? i3 = u4[o3] : "ref" == o3 ? r3 = u4[o3] : e3[o3] = u4[o3];
  if (arguments.length > 2 && (e3.children = arguments.length > 3 ? n.call(arguments, 2) : t3), "function" == typeof l3 && null != l3.defaultProps) for (o3 in l3.defaultProps) void 0 === e3[o3] && (e3[o3] = l3.defaultProps[o3]);
  return x(l3, e3, i3, r3, null);
}
function x(n2, t3, i3, r3, o3) {
  var e3 = { type: n2, props: t3, key: i3, ref: r3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o3 ? ++u : o3, __i: -1, __u: 0 };
  return null == o3 && null != l.vnode && l.vnode(e3), e3;
}
function S(n2) {
  return n2.children;
}
function C(n2, l3) {
  this.props = n2, this.context = l3;
}
function $(n2, l3) {
  if (null == l3) return n2.__ ? $(n2.__, n2.__i + 1) : null;
  for (var u4; l3 < n2.__k.length; l3++) if (null != (u4 = n2.__k[l3]) && null != u4.__e) return u4.__e;
  return "function" == typeof n2.type ? $(n2) : null;
}
function I(n2) {
  if (n2.__P && n2.__d) {
    var u4 = n2.__v, t3 = u4.__e, i3 = [], r3 = [], o3 = m({}, u4);
    o3.__v = u4.__v + 1, l.vnode && l.vnode(o3), q(n2.__P, o3, u4, n2.__n, n2.__P.namespaceURI, 32 & u4.__u ? [t3] : null, i3, null == t3 ? $(u4) : t3, !!(32 & u4.__u), r3), o3.__v = u4.__v, o3.__.__k[o3.__i] = o3, D(i3, o3, r3), u4.__e = u4.__ = null, o3.__e != t3 && P(o3);
  }
}
function P(n2) {
  if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l3) {
    if (null != l3 && null != l3.__e) return n2.__e = n2.__c.base = l3.__e;
  }), P(n2);
}
function A(n2) {
  (!n2.__d && (n2.__d = true) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
}
function H() {
  try {
    for (var n2, l3 = 1; i.length; ) i.length > l3 && i.sort(e), n2 = i.shift(), l3 = i.length, I(n2);
  } finally {
    i.length = H.__r = 0;
  }
}
function L(n2, l3, u4, t3, i3, r3, o3, e3, f4, c3, a3) {
  var s3, h3, p3, v3, y3, _2, g2 = t3 && t3.__k || w, m3 = l3.length;
  for (f4 = T(u4, l3, g2, f4, m3), s3 = 0; s3 < m3; s3++) null != (p3 = u4.__k[s3]) && (h3 = -1 != p3.__i && g2[p3.__i] || d, p3.__i = s3, _2 = q(n2, p3, h3, i3, r3, o3, e3, f4, c3, a3), v3 = p3.__e, p3.ref && h3.ref != p3.ref && (h3.ref && J(h3.ref, null, p3), a3.push(p3.ref, p3.__c || v3, p3)), null == y3 && null != v3 && (y3 = v3), 4 & p3.__u ? (f4 = j(p3, f4, n2), h3.__e && (h3.__e = null)) : "function" == typeof p3.type && void 0 !== _2 ? f4 = _2 : v3 && (f4 = v3.nextSibling), p3.__u &= -7);
  return u4.__e = y3, f4;
}
function T(n2, l3, u4, t3, i3) {
  var r3, o3, e3, f4, c3, a3 = u4.length, s3 = a3, h3 = 0;
  for (n2.__k = new Array(i3), r3 = 0; r3 < i3; r3++) null != (o3 = l3[r3]) && "boolean" != typeof o3 && "function" != typeof o3 ? ("string" == typeof o3 || "number" == typeof o3 || "bigint" == typeof o3 || o3.constructor == String ? o3 = n2.__k[r3] = x(null, o3, null, null, null) : g(o3) ? o3 = n2.__k[r3] = x(S, { children: o3 }, null, null, null) : void 0 === o3.constructor && o3.__b > 0 ? o3 = n2.__k[r3] = x(o3.type, o3.props, o3.key, o3.ref ? o3.ref : null, o3.__v) : n2.__k[r3] = o3, f4 = r3 + h3, o3.__ = n2, o3.__b = n2.__b + 1, e3 = null, -1 != (c3 = o3.__i = O(o3, u4, f4, s3)) && (s3--, (e3 = u4[c3]) && (e3.__u |= 2)), null == e3 || null == e3.__v ? (-1 == c3 && (i3 > a3 ? h3-- : i3 < a3 && h3++), "function" != typeof o3.type && (o3.__u |= 4)) : c3 != f4 && (c3 == f4 - 1 ? h3-- : c3 == f4 + 1 ? h3++ : (c3 > f4 ? h3-- : h3++, o3.__u |= 4))) : n2.__k[r3] = null;
  if (s3) for (r3 = 0; r3 < a3; r3++) null != (e3 = u4[r3]) && 0 == (2 & e3.__u) && (e3.__e == t3 && (t3 = $(e3)), K(e3, e3));
  return t3;
}
function j(n2, l3, u4) {
  var t3, i3;
  if ("function" == typeof n2.type) {
    for (t3 = n2.__k, i3 = 0; t3 && i3 < t3.length; i3++) t3[i3] && (t3[i3].__ = n2, l3 = j(t3[i3], l3, u4));
    return l3;
  }
  n2.__e != l3 && (l3 && n2.type && !l3.parentNode && (l3 = $(n2)), l3 = u4.insertBefore(n2.__e, l3 || null));
  do {
    l3 = l3 && l3.nextSibling;
  } while (null != l3 && 8 == l3.nodeType);
  return l3;
}
function O(n2, l3, u4, t3) {
  var i3, r3, o3, e3 = n2.key, f4 = n2.type, c3 = l3[u4], a3 = null != c3 && 0 == (2 & c3.__u);
  if (null === c3 && null == e3 || a3 && e3 == c3.key && f4 == c3.type) return u4;
  if (t3 > (a3 ? 1 : 0)) {
    for (i3 = u4 - 1, r3 = u4 + 1; i3 >= 0 || r3 < l3.length; ) if (null != (c3 = l3[o3 = i3 >= 0 ? i3-- : r3++]) && 0 == (2 & c3.__u) && e3 == c3.key && f4 == c3.type) return o3;
  }
  return -1;
}
function z(n2, l3, u4) {
  "-" == l3[0] ? n2.setProperty(l3, null == u4 ? "" : u4) : n2[l3] = null == u4 ? "" : "number" != typeof u4 || _.test(l3) ? u4 : u4 + "px";
}
function N(n2, l3, u4, t3, i3) {
  var r3, o3;
  n: if ("style" == l3) if ("string" == typeof u4) n2.style.cssText = u4;
  else {
    if ("string" == typeof t3 && (n2.style.cssText = t3 = ""), t3) for (l3 in t3) u4 && l3 in u4 || z(n2.style, l3, "");
    if (u4) for (l3 in u4) t3 && u4[l3] == t3[l3] || z(n2.style, l3, u4[l3]);
  }
  else if ("o" == l3[0] && "n" == l3[1]) r3 = l3 != (l3 = l3.replace(s, "$1")), o3 = l3.toLowerCase(), l3 = o3 in n2 || "onFocusOut" == l3 || "onFocusIn" == l3 ? o3.slice(2) : l3.slice(2), n2.l || (n2.l = {}), n2.l[l3 + r3] = u4, u4 ? t3 ? u4[a] = t3[a] : (u4[a] = h, n2.addEventListener(l3, r3 ? v : p, r3)) : n2.removeEventListener(l3, r3 ? v : p, r3);
  else {
    if ("http://www.w3.org/2000/svg" == i3) l3 = l3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if ("width" != l3 && "height" != l3 && "href" != l3 && "list" != l3 && "form" != l3 && "tabIndex" != l3 && "download" != l3 && "rowSpan" != l3 && "colSpan" != l3 && "role" != l3 && "popover" != l3 && l3 in n2) try {
      n2[l3] = null == u4 ? "" : u4;
      break n;
    } catch (n3) {
    }
    "function" == typeof u4 || (null == u4 || false === u4 && "-" != l3[4] ? n2.removeAttribute(l3) : n2.setAttribute(l3, "popover" == l3 && 1 == u4 ? "" : u4));
  }
}
function V(n2) {
  return function(u4) {
    if (this.l) {
      var t3 = this.l[u4.type + n2];
      if (null == u4[c]) u4[c] = h++;
      else if (u4[c] < t3[a]) return;
      return t3(l.event ? l.event(u4) : u4);
    }
  };
}
function q(n2, u4, t3, i3, r3, o3, e3, f4, c3, a3) {
  var s3, h3, p3, v3, y3, d3, _2, k3, x2, M, I2, P2, A3, H2, T3, j3, F = u4.type;
  if (void 0 !== u4.constructor) return null;
  128 & t3.__u && (c3 = !!(32 & t3.__u), o3 = [f4 = u4.__e = t3.__e]), (s3 = l.__b) && s3(u4);
  n: if ("function" == typeof F) {
    h3 = e3.length;
    try {
      if (x2 = u4.props, M = F.prototype && F.prototype.render, I2 = (s3 = F.contextType) && i3[s3.__c], P2 = s3 ? I2 ? I2.props.value : s3.__ : i3, t3.__c ? k3 = (p3 = u4.__c = t3.__c).__ = p3.__E : (M ? u4.__c = p3 = new F(x2, P2) : (u4.__c = p3 = new C(x2, P2), p3.constructor = F, p3.render = Q), I2 && I2.sub(p3), p3.state || (p3.state = {}), p3.__n = i3, v3 = p3.__d = true, p3.__h = [], p3._sb = []), M && null == p3.__s && (p3.__s = p3.state), M && null != F.getDerivedStateFromProps && (p3.__s == p3.state && (p3.__s = m({}, p3.__s)), m(p3.__s, F.getDerivedStateFromProps(x2, p3.__s))), y3 = p3.props, d3 = p3.state, p3.__v = u4, v3) M && null == F.getDerivedStateFromProps && null != p3.componentWillMount && p3.componentWillMount(), M && null != p3.componentDidMount && p3.__h.push(p3.componentDidMount);
      else {
        if (M && null == F.getDerivedStateFromProps && x2 !== y3 && null != p3.componentWillReceiveProps && p3.componentWillReceiveProps(x2, P2), u4.__v == t3.__v || !p3.__e && null != p3.shouldComponentUpdate && false === p3.shouldComponentUpdate(x2, p3.__s, P2)) {
          u4.__v != t3.__v && (p3.props = x2, p3.state = p3.__s, p3.__d = false), u4.__e = t3.__e, u4.__k = t3.__k, u4.__k.some(function(n3) {
            n3 && (n3.__ = u4);
          }), w.push.apply(p3.__h, p3._sb), p3._sb = [], p3.__h.length && e3.push(p3), f4 = $(t3);
          break n;
        }
        null != p3.componentWillUpdate && p3.componentWillUpdate(x2, p3.__s, P2), M && null != p3.componentDidUpdate && p3.__h.push(function() {
          p3.componentDidUpdate(y3, d3, _2);
        });
      }
      if (p3.context = P2, p3.props = x2, p3.__P = n2, p3.__e = false, A3 = l.__r, H2 = 0, M) p3.state = p3.__s, p3.__d = false, A3 && A3(u4), s3 = p3.render(p3.props, p3.state, p3.context), w.push.apply(p3.__h, p3._sb), p3._sb = [];
      else do {
        p3.__d = false, A3 && A3(u4), s3 = p3.render(p3.props, p3.state, p3.context), p3.state = p3.__s;
      } while (p3.__d && ++H2 < 25);
      p3.state = p3.__s, null != p3.getChildContext && (i3 = m(m({}, i3), p3.getChildContext())), M && !v3 && null != p3.getSnapshotBeforeUpdate && (_2 = p3.getSnapshotBeforeUpdate(y3, d3)), T3 = null != s3 && s3.type === S && null == s3.key ? E(s3.props.children) : s3, f4 = L(n2, g(T3) ? T3 : [T3], u4, t3, i3, r3, o3, e3, f4, c3, a3), p3.base = u4.__e, u4.__u &= -161, p3.__h.length && e3.push(p3), k3 && (p3.__E = p3.__ = null);
    } catch (n3) {
      if (e3.length = h3, u4.__v = null, c3 || null != o3) {
        if (n3.then) {
          for (u4.__u |= c3 ? 160 : 128; f4 && 8 == f4.nodeType && f4.nextSibling; ) f4 = f4.nextSibling;
          null != o3 && (o3[o3.indexOf(f4)] = null), u4.__e = f4;
        } else if (null != o3) for (j3 = o3.length; j3--; ) b(o3[j3]);
      } else u4.__e = t3.__e;
      null == u4.__k && (u4.__k = t3.__k || []), n3.then || B(u4), l.__e(n3, u4, t3);
    }
  } else null == o3 && u4.__v == t3.__v ? (u4.__k = t3.__k, u4.__e = t3.__e) : f4 = u4.__e = G(t3.__e, u4, t3, i3, r3, o3, e3, c3, a3);
  return (s3 = l.diffed) && s3(u4), 128 & u4.__u ? void 0 : f4;
}
function B(n2) {
  n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B));
}
function D(n2, u4, t3) {
  for (var i3 = 0; i3 < t3.length; i3++) J(t3[i3], t3[++i3], t3[++i3]);
  l.__c && l.__c(u4, n2), n2.some(function(u5) {
    try {
      n2 = u5.__h, u5.__h = [], n2.some(function(n3) {
        n3.call(u5);
      });
    } catch (n3) {
      l.__e(n3, u5.__v);
    }
  });
}
function E(n2) {
  return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : void 0 !== n2.constructor ? null : m({}, n2);
}
function G(u4, t3, i3, r3, o3, e3, f4, c3, a3) {
  var s3, h3, p3, v3, y3, w3, _2, m3 = i3.props || d, k3 = t3.props, x2 = t3.type;
  if ("svg" == x2 ? o3 = "http://www.w3.org/2000/svg" : "math" == x2 ? o3 = "http://www.w3.org/1998/Math/MathML" : o3 || (o3 = "http://www.w3.org/1999/xhtml"), null != e3) {
    for (s3 = 0; s3 < e3.length; s3++) if ((y3 = e3[s3]) && "setAttribute" in y3 == !!x2 && (x2 ? y3.localName == x2 : 3 == y3.nodeType)) {
      u4 = y3, e3[s3] = null;
      break;
    }
  }
  if (null == u4) {
    if (null == x2) return document.createTextNode(k3);
    u4 = document.createElementNS(o3, x2, k3.is && k3), c3 && (l.__m && l.__m(t3, e3), c3 = false), e3 = null;
  }
  if (null == x2) m3 === k3 || c3 && u4.data == k3 || (u4.data = k3);
  else {
    if (e3 = "textarea" == x2 && null != k3.defaultValue ? null : e3 && n.call(u4.childNodes), !c3 && null != e3) for (m3 = {}, s3 = 0; s3 < u4.attributes.length; s3++) m3[(y3 = u4.attributes[s3]).name] = y3.value;
    for (s3 in m3) y3 = m3[s3], "dangerouslySetInnerHTML" == s3 ? p3 = y3 : "children" == s3 || s3 in k3 || "value" == s3 && "defaultValue" in k3 || "checked" == s3 && "defaultChecked" in k3 || N(u4, s3, null, y3, o3);
    for (s3 in k3) y3 = k3[s3], "children" == s3 ? v3 = y3 : "dangerouslySetInnerHTML" == s3 ? h3 = y3 : "value" == s3 ? w3 = y3 : "checked" == s3 ? _2 = y3 : c3 && "function" != typeof y3 || m3[s3] === y3 || N(u4, s3, y3, m3[s3], o3);
    if (h3) c3 || p3 && (h3.__html == p3.__html || h3.__html == u4.innerHTML) || (u4.innerHTML = h3.__html), t3.__k = [];
    else if (p3 && (u4.innerHTML = ""), L("template" == t3.type ? u4.content : u4, g(v3) ? v3 : [v3], t3, i3, r3, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o3, e3, f4, e3 ? e3[0] : i3.__k && $(i3, 0), c3, a3), null != e3) for (s3 = e3.length; s3--; ) b(e3[s3]);
    c3 && "textarea" != x2 || (s3 = "value", "progress" == x2 && null == w3 ? u4.removeAttribute("value") : null != w3 && (w3 !== u4[s3] || "progress" == x2 && !w3 || "option" == x2 && w3 != m3[s3]) && N(u4, s3, w3, m3[s3], o3), s3 = "checked", null != _2 && _2 != u4[s3] && N(u4, s3, _2, m3[s3], o3));
  }
  return u4;
}
function J(n2, u4, t3) {
  try {
    if ("function" == typeof n2) {
      var i3 = "function" == typeof n2.__u;
      i3 && n2.__u(), i3 && null == u4 || (n2.__u = n2(u4));
    } else n2.current = u4;
  } catch (n3) {
    l.__e(n3, t3);
  }
}
function K(n2, u4, t3) {
  var i3, r3;
  if (l.unmount && l.unmount(n2), (i3 = n2.ref) && (i3.current && i3.current != n2.__e || J(i3, null, u4)), null != (i3 = n2.__c)) {
    if (i3.componentWillUnmount) try {
      i3.componentWillUnmount();
    } catch (n3) {
      l.__e(n3, u4);
    }
    i3.base = i3.__P = i3.__n = null;
  }
  if (i3 = n2.__k) for (r3 = 0; r3 < i3.length; r3++) i3[r3] && K(i3[r3], u4, t3 || "function" != typeof n2.type);
  t3 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
}
function Q(n2, l3, u4) {
  return this.constructor(n2, u4);
}
function R(u4, t3, i3) {
  var r3, o3, e3, f4;
  t3 == document && (t3 = document.documentElement), l.__ && l.__(u4, t3), o3 = (r3 = "function" == typeof i3) ? null : i3 && i3.__k || t3.__k, e3 = [], f4 = [], q(t3, u4 = (!r3 && i3 || t3).__k = k(S, null, [u4]), o3 || d, d, t3.namespaceURI, !r3 && i3 ? [i3] : o3 ? null : t3.firstChild ? n.call(t3.childNodes) : null, e3, !r3 && i3 ? i3 : o3 ? o3.__e : t3.firstChild, r3, f4), D(e3, u4, f4), u4.props.children = null;
}
n = w.slice, l = { __e: function(n2, l3, u4, t3) {
  for (var i3, r3, o3; l3 = l3.__; ) if ((i3 = l3.__c) && !i3.__) try {
    if ((r3 = i3.constructor) && null != r3.getDerivedStateFromError && (i3.setState(r3.getDerivedStateFromError(n2)), o3 = i3.__d), null != i3.componentDidCatch && (i3.componentDidCatch(n2, t3 || {}), o3 = i3.__d), o3) return i3.__E = i3;
  } catch (l4) {
    n2 = l4;
  }
  throw n2;
} }, u = 0, t = function(n2) {
  return null != n2 && void 0 === n2.constructor;
}, C.prototype.setState = function(n2, l3) {
  var u4;
  u4 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m({}, this.state), "function" == typeof n2 && (n2 = n2(m({}, u4), this.props)), n2 && m(u4, n2), null != n2 && this.__v && (l3 && this._sb.push(l3), A(this));
}, C.prototype.forceUpdate = function(n2) {
  this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
}, C.prototype.render = S, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l3) {
  return n2.__v.__b - l3.__v.__b;
}, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

// node_modules/preact/hooks/dist/hooks.module.js
var t2;
var r2;
var u2;
var i2;
var o2 = 0;
var f2 = [];
var c2 = l;
var e2 = c2.__b;
var a2 = c2.__r;
var v2 = c2.diffed;
var l2 = c2.__c;
var m2 = c2.unmount;
var p2 = c2.__;
function s2(n2, t3) {
  c2.__h && c2.__h(r2, n2, o2 || t3), o2 = 0;
  var u4 = r2.__H || (r2.__H = { __: [], __h: [] });
  return n2 >= u4.__.length && u4.__.push({}), u4.__[n2];
}
function d2(n2) {
  return o2 = 1, y2(D2, n2);
}
function y2(n2, u4, i3) {
  var o3 = s2(t2++, 2);
  if (o3.t = n2, !o3.__c && (o3.__ = [i3 ? i3(u4) : D2(void 0, u4), function(n3) {
    var t3 = o3.__N ? o3.__N[0] : o3.__[0], r3 = o3.t(t3, n3);
    t3 !== r3 && (o3.__N = [r3, o3.__[1]], o3.__c.setState({}));
  }], o3.__c = r2, !r2.__f)) {
    var f4 = function(n3, t3, r3) {
      if (!o3.__c.__H) return true;
      var u5 = false, i4 = o3.__c.props !== n3;
      if (o3.__c.__H.__.some(function(n4) {
        if (n4.__N) {
          u5 = true;
          var t4 = n4.__[0];
          n4.__ = n4.__N, n4.__N = void 0, t4 !== n4.__[0] && (i4 = true);
        }
      }), c3) {
        var f5 = c3.call(this, n3, t3, r3);
        return u5 ? f5 || i4 : f5;
      }
      return !u5 || i4;
    };
    r2.__f = true;
    var c3 = r2.shouldComponentUpdate, e3 = r2.componentWillUpdate;
    r2.componentWillUpdate = function(n3, t3, r3) {
      if (this.__e) {
        var u5 = c3;
        c3 = void 0, f4(n3, t3, r3), c3 = u5;
      }
      e3 && e3.call(this, n3, t3, r3);
    }, r2.shouldComponentUpdate = f4;
  }
  return o3.__N || o3.__;
}
function h2(n2, u4) {
  var i3 = s2(t2++, 3);
  !c2.__s && C2(i3.__H, u4) && (i3.__ = n2, i3.u = u4, r2.__H.__h.push(i3));
}
function A2(n2) {
  return o2 = 5, T2(function() {
    return { current: n2 };
  }, []);
}
function T2(n2, r3) {
  var u4 = s2(t2++, 7);
  return C2(u4.__H, r3) && (u4.__ = n2(), u4.__H = r3, u4.__h = n2), u4.__;
}
function j2() {
  for (var n2; n2 = f2.shift(); ) {
    var t3 = n2.__H;
    if (n2.__P && t3) try {
      t3.__h.some(z2), t3.__h.some(B2), t3.__h = [];
    } catch (r3) {
      t3.__h = [], c2.__e(r3, n2.__v);
    }
  }
}
c2.__b = function(n2) {
  r2 = null, e2 && e2(n2);
}, c2.__ = function(n2, t3) {
  n2 && t3.__k && t3.__k.__m && (n2.__m = t3.__k.__m), p2 && p2(n2, t3);
}, c2.__r = function(n2) {
  a2 && a2(n2), t2 = 0;
  var i3 = (r2 = n2.__c).__H;
  i3 && (u2 === r2 ? (i3.__h = [], r2.__h = [], i3.__.some(function(n3) {
    n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
  })) : (i3.__h.some(z2), i3.__h.some(B2), i3.__h = [], t2 = 0)), u2 = r2;
}, c2.diffed = function(n2) {
  v2 && v2(n2);
  var t3 = n2.__c;
  t3 && t3.__H && (t3.__H.__h.length && (1 !== f2.push(t3) && i2 === c2.requestAnimationFrame || ((i2 = c2.requestAnimationFrame) || w2)(j2)), t3.__H.__.some(function(n3) {
    n3.u && (n3.__H = n3.u, n3.u = void 0);
  })), u2 = r2 = null;
}, c2.__c = function(n2, t3) {
  t3.some(function(n3) {
    try {
      n3.__h.some(z2), n3.__h = n3.__h.filter(function(n4) {
        return !n4.__ || B2(n4);
      });
    } catch (r3) {
      t3.some(function(n4) {
        n4.__h && (n4.__h = []);
      }), t3 = [], c2.__e(r3, n3.__v);
    }
  }), l2 && l2(n2, t3);
}, c2.unmount = function(n2) {
  m2 && m2(n2);
  var t3, r3 = n2.__c;
  r3 && r3.__H && (r3.__H.__.some(function(n3) {
    try {
      z2(n3);
    } catch (n4) {
      t3 = n4;
    }
  }), r3.__H = void 0, t3 && c2.__e(t3, r3.__v));
};
var k2 = "function" == typeof requestAnimationFrame;
function w2(n2) {
  var t3, r3 = function() {
    clearTimeout(u4), k2 && cancelAnimationFrame(t3), setTimeout(n2);
  }, u4 = setTimeout(r3, 35);
  k2 && (t3 = requestAnimationFrame(r3));
}
function z2(n2) {
  var t3 = r2, u4 = n2.__c;
  "function" == typeof u4 && (n2.__c = void 0, u4()), r2 = t3;
}
function B2(n2) {
  var t3 = r2;
  n2.__c = n2.__(), r2 = t3;
}
function C2(n2, t3) {
  return !n2 || n2.length !== t3.length || t3.some(function(t4, r3) {
    return t4 !== n2[r3];
  });
}
function D2(n2, t3) {
  return "function" == typeof t3 ? t3(n2) : t3;
}

// node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
var f3 = 0;
function u3(e3, t3, n2, o3, i3, u4) {
  t3 || (t3 = {});
  var a3, c3, p3 = t3;
  if ("ref" in p3) for (c3 in p3 = {}, t3) "ref" == c3 ? a3 = t3[c3] : p3[c3] = t3[c3];
  var l3 = { type: e3, props: p3, key: n2, ref: a3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f3, __i: -1, __u: 0, __source: i3, __self: u4 };
  if ("function" == typeof e3 && (a3 = e3.defaultProps)) for (c3 in a3) void 0 === p3[c3] && (p3[c3] = a3[c3]);
  return l.vnode && l.vnode(l3), l3;
}

// src/ui/installed/installed-section.tsx
function InstalledSection({
  section,
  onOpenProject,
  onAction,
  onManage
}) {
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-installed-section", children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("h3", { children: section.title }),
      /* @__PURE__ */ u3("span", { children: section.rows.length })
    ] }),
    section.rows.length === 0 ? /* @__PURE__ */ u3("p", { children: emptyExplanation(section.id) }) : /* @__PURE__ */ u3("ul", { children: section.rows.map((row) => /* @__PURE__ */ u3(
      InstalledRow,
      {
        row,
        sectionId: section.id,
        onOpenProject,
        onAction,
        onManage
      }
    )) })
  ] });
}
function InstalledRow({
  row,
  sectionId,
  onOpenProject,
  onAction,
  onManage
}) {
  const unknown = sectionId === "unknown" || row.action.kind === "manage-in-sillytavern";
  return /* @__PURE__ */ u3("li", { children: [
    /* @__PURE__ */ u3("div", { children: [
      /* @__PURE__ */ u3("strong", { children: row.name }),
      /* @__PURE__ */ u3("span", { children: row.detail }),
      row.enabled !== null ? /* @__PURE__ */ u3("span", { children: row.enabled ? "Enabled" : "Disabled" }) : null
    ] }),
    !unknown ? /* @__PURE__ */ u3(
      "button",
      {
        type: "button",
        "data-focus-key": `installed-${row.id}`,
        onClick: () => onOpenProject?.(row.id),
        "aria-label": `View ${row.name}`,
        children: "Details"
      }
    ) : null,
    /* @__PURE__ */ u3(
      "button",
      {
        type: "button",
        "aria-label": unknown ? `Manage ${row.name} in SillyTavern` : `${row.action.label} ${row.name}`,
        onClick: () => unknown ? onManage?.() : onAction?.(row.id, row.action),
        children: row.action.label
      }
    )
  ] });
}
function emptyExplanation(id) {
  return {
    managed: "No installed extensions are currently managed by Companion.",
    external: "No catalog extensions were found outside Companion management.",
    unknown: "Every discovered extension matched the current catalog.",
    attention: "No managed records need attention."
  }[id];
}

// src/ui/installed/installed-route.tsx
function InstalledRoute({
  sections,
  refreshing = false,
  onRefresh,
  onOpenProject,
  onAction,
  onManage
}) {
  h2(() => {
    void onRefresh();
  }, [onRefresh]);
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-installed-route", "aria-labelledby": "installed-heading", children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("h2", { id: "installed-heading", children: "Installed extensions" }),
      refreshing ? /* @__PURE__ */ u3("p", { role: "status", children: "Updating installed extensions\u2026" }) : null
    ] }),
    sections.map((section) => /* @__PURE__ */ u3(
      InstalledSection,
      {
        section,
        onOpenProject,
        onAction,
        onManage
      },
      section.id
    ))
  ] });
}

// src/ui/catalog/catalog-freshness.tsx
function CatalogFreshness({
  snapshot,
  now = (/* @__PURE__ */ new Date()).toISOString(),
  refreshing = false
}) {
  const label = refreshing ? "Checking for updates" : freshnessLabel(snapshot, now);
  return /* @__PURE__ */ u3("span", { class: "tavernary-companion-catalog-freshness", "data-state": snapshot.state, children: label });
}
function freshnessLabel(snapshot, now) {
  switch (snapshot.state) {
    case "empty-loading":
      return "Checking for updates";
    case "ready-current":
      return `Updated ${relativeAge(snapshot.catalog.generatedAt, now)}`;
    case "ready-stale":
      return "Saved catalog may be outdated";
    case "ready-offline":
      return "Using saved catalog \u2014 offline";
    case "incompatible-with-cache":
    case "incompatible-empty":
      return "Companion update required";
    case "error-empty":
      return "Catalog unavailable";
  }
}
function relativeAge(value, now) {
  const elapsed = Math.max(0, Date.parse(now) - Date.parse(value));
  const minutes = Math.floor(elapsed / 6e4);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// src/ui/catalog/catalog-state-panel.tsx
function CatalogStatePanel({
  snapshot,
  onRefresh,
  onUpdateCompanion,
  onUseCached,
  onOpenTavernary,
  children
}) {
  const [refreshing, setRefreshing] = d2(false);
  const [announcement, setAnnouncement] = d2("");
  const [usingCache, setUsingCache] = d2(false);
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setAnnouncement("");
    try {
      await onRefresh();
      setAnnouncement("Catalog is current");
    } finally {
      setRefreshing(false);
    }
  };
  const incompatible = snapshot.state.startsWith("incompatible");
  const emptyError = snapshot.state === "error-empty";
  return /* @__PURE__ */ u3(
    "section",
    {
      class: "tavernary-companion-catalog-state",
      "data-testid": "catalog-state-panel",
      "data-lifecycle-disabled": String(!snapshot.canMutate),
      children: [
        /* @__PURE__ */ u3("header", { children: [
          /* @__PURE__ */ u3(CatalogFreshness, { snapshot, refreshing }),
          !incompatible ? /* @__PURE__ */ u3("button", { type: "button", onClick: () => void refresh(), disabled: refreshing, children: emptyError ? "Try again" : "Refresh catalog" }) : null
        ] }),
        /* @__PURE__ */ u3("span", { class: "tavernary-companion-sr-only", role: "status", "aria-live": "polite", children: announcement }),
        incompatible && !usingCache ? /* @__PURE__ */ u3("section", { "aria-labelledby": "catalog-update-heading", children: [
          /* @__PURE__ */ u3("h2", { id: "catalog-update-heading", children: "Companion update required" }),
          /* @__PURE__ */ u3("p", { children: [
            "Tavernary now publishes catalog schema",
            " ",
            "remoteSchemaVersion" in snapshot ? snapshot.remoteSchemaVersion : "a newer version",
            ". Update Companion before refreshing or changing installed extensions."
          ] }),
          /* @__PURE__ */ u3("div", { children: [
            /* @__PURE__ */ u3("button", { type: "button", onClick: onUpdateCompanion, children: "Update Companion" }),
            snapshot.state === "incompatible-with-cache" ? /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                onClick: () => {
                  setUsingCache(true);
                  onUseCached();
                },
                children: "Use cached catalog"
              }
            ) : null,
            /* @__PURE__ */ u3("button", { type: "button", onClick: onOpenTavernary, children: "Open Tavernary" })
          ] })
        ] }) : emptyError ? /* @__PURE__ */ u3("section", { "aria-labelledby": "catalog-error-heading", children: [
          /* @__PURE__ */ u3("h2", { id: "catalog-error-heading", children: "Catalog unavailable" }),
          /* @__PURE__ */ u3("p", { children: "No saved catalog is available. Check the connection and try again." }),
          /* @__PURE__ */ u3("details", { children: [
            /* @__PURE__ */ u3("summary", { children: "Error details" }),
            /* @__PURE__ */ u3("p", { children: "Unable to reach or validate the Tavernary catalog." })
          ] })
        ] }) : snapshot.state === "empty-loading" ? /* @__PURE__ */ u3("div", { class: "tavernary-companion-catalog-skeleton", "aria-label": "Loading catalog", children: [
          /* @__PURE__ */ u3("span", {}),
          /* @__PURE__ */ u3("span", {}),
          /* @__PURE__ */ u3("span", {})
        ] }) : children
      ]
    }
  );
}

// src/ui/shared/activity-summary.tsx
function ActivitySummary({ activity }) {
  if (activity.activeWeeks12 === null) {
    return /* @__PURE__ */ u3("span", { children: "Activity unavailable" });
  }
  return /* @__PURE__ */ u3("span", { children: [
    activity.activeWeeks12,
    " of 12 active weeks",
    activity.dormant ? " \xB7 Dormant" : ""
  ] });
}

// src/ui/shared/assessment-badge.tsx
function AssessmentBadge({ status }) {
  if (!status || status.freshness === "unassessed") {
    return /* @__PURE__ */ u3("span", { class: "tavernary-companion-assessment is-neutral", children: "Not assessed" });
  }
  if (status.freshness === "unsupported") {
    return /* @__PURE__ */ u3("span", { class: "tavernary-companion-assessment is-neutral", children: "Scan unsupported" });
  }
  if (!status.riskLevel) {
    return /* @__PURE__ */ u3("span", { class: "tavernary-companion-assessment is-neutral", children: "Scan unavailable" });
  }
  const concern = {
    low: "Low concern",
    material: "Potential concerns",
    high: "High concern"
  }[status.riskLevel];
  const freshness = status.freshness === "current" ? "current scan" : "scan not current";
  return /* @__PURE__ */ u3("span", { class: `tavernary-companion-assessment is-${status.state}`, children: [
    concern,
    " \xB7 ",
    freshness
  ] });
}

// src/ui/projects/project-evidence.tsx
function ProjectEvidence({ project }) {
  const report = project.tavernKeeper?.report;
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-project-evidence", "aria-labelledby": "project-assessment", children: [
    /* @__PURE__ */ u3("h3", { id: "project-assessment", children: "TavernKeeper assessment" }),
    /* @__PURE__ */ u3(AssessmentBadge, { status: project.tavernKeeper }),
    report ? /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("h4", { children: report.headline }),
      /* @__PURE__ */ u3("p", { children: report.summary }),
      /* @__PURE__ */ u3("dl", { children: [
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("dt", { children: "Minor cautions" }),
          /* @__PURE__ */ u3("dd", { children: report.minorCautions })
        ] }),
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("dt", { children: "Material concerns" }),
          /* @__PURE__ */ u3("dd", { children: report.materialConcerns })
        ] }),
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("dt", { children: "High danger findings" }),
          /* @__PURE__ */ u3("dd", { children: report.highDanger })
        ] }),
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("dt", { children: "Scanned commit" }),
          /* @__PURE__ */ u3("dd", { children: report.scannedSha.slice(0, 12) })
        ] })
      ] }),
      /* @__PURE__ */ u3("a", { href: report.reportUrl, target: "_blank", rel: "noreferrer noopener", children: "Open Scan Review (new tab)" })
    ] }) : /* @__PURE__ */ u3("p", { children: "No current TavernKeeper assessment is available." }),
    /* @__PURE__ */ u3("h3", { children: "Activity evidence" }),
    /* @__PURE__ */ u3(ActivitySummary, { activity: project.activity }),
    project.activity.latestSourceActivityAt ? /* @__PURE__ */ u3("p", { children: [
      "Latest source activity: ",
      formatDate(project.activity.latestSourceActivityAt)
    ] }) : null
  ] });
}
function formatDate(value) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

// src/ui/projects/project-detail.tsx
function ProjectDetail({ project, onAction }) {
  return /* @__PURE__ */ u3("article", { class: "tavernary-companion-project-detail", children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("p", { children: project.kind }),
      /* @__PURE__ */ u3("h2", { children: project.name }),
      /* @__PURE__ */ u3("p", { children: project.summary }),
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          "aria-label": `${project.action.label} ${project.name}`,
          onClick: () => onAction(project.action),
          disabled: project.action.kind === "current-extension",
          children: project.action.label
        }
      ),
      project.action.reason ? /* @__PURE__ */ u3("p", { children: project.action.reason }) : null
    ] }),
    /* @__PURE__ */ u3("section", { "aria-labelledby": "project-details-heading", children: [
      /* @__PURE__ */ u3("h3", { id: "project-details-heading", children: "Project details" }),
      /* @__PURE__ */ u3("dl", { children: [
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("dt", { children: "Frontends" }),
          /* @__PURE__ */ u3("dd", { children: project.frontends.join(", ") || "Not specified" })
        ] }),
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("dt", { children: "Category" }),
          /* @__PURE__ */ u3("dd", { children: project.primaryFunction })
        ] }),
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("dt", { children: "License" }),
          /* @__PURE__ */ u3("dd", { title: project.license.tooltip, children: project.license.label })
        ] }),
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("dt", { children: "Catalog metadata" }),
          /* @__PURE__ */ u3("dd", { children: project.metadataStatus })
        ] }),
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("dt", { children: "Source status" }),
          /* @__PURE__ */ u3("dd", { children: project.sourceStatus })
        ] }),
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("dt", { children: "Installed ownership" }),
          /* @__PURE__ */ u3("dd", { children: project.ownership })
        ] })
      ] }),
      project.tags.length > 0 ? /* @__PURE__ */ u3("ul", { "aria-label": "Project tags", children: project.tags.map((tag) => /* @__PURE__ */ u3("li", { children: tag })) }) : null
    ] }),
    /* @__PURE__ */ u3(ProjectEvidence, { project }),
    project.attribution ? /* @__PURE__ */ u3("p", { children: [
      "Catalog attribution: ",
      project.attribution.owner.login
    ] }) : /* @__PURE__ */ u3("p", { children: "Catalog attribution is pending." }),
    project.fork ? /* @__PURE__ */ u3("p", { children: [
      "Fork of",
      " ",
      project.fork.parentUrl ? /* @__PURE__ */ u3("a", { href: project.fork.parentUrl, target: "_blank", rel: "noreferrer noopener", children: [
        project.fork.parentName,
        " (new tab)"
      ] }) : project.fork.parentName
    ] }) : null,
    project.kitReferences.length > 0 ? /* @__PURE__ */ u3("section", { "aria-labelledby": "project-kits-heading", children: [
      /* @__PURE__ */ u3("h3", { id: "project-kits-heading", children: "Included in Kits" }),
      /* @__PURE__ */ u3("ul", { children: project.kitReferences.map((kit) => /* @__PURE__ */ u3("li", { children: kit.title })) })
    ] }) : null,
    /* @__PURE__ */ u3("a", { href: project.canonicalUrl, target: "_blank", rel: "noreferrer noopener", children: "Open project source (new tab)" })
  ] });
}

// src/ui/projects/active-filter-chips.tsx
function ActiveFilterChips({
  query,
  facets,
  onQueryChange
}) {
  const frontendLabels = new Map(facets.frontends.map(({ id, label }) => [id, label]));
  const kindLabels = /* @__PURE__ */ new Map([
    ["frontend", "Frontend"],
    ["extension", "Extension"],
    ["preset", "Preset"]
  ]);
  return /* @__PURE__ */ u3("div", { class: "tavernary-companion-filter-chips", "aria-label": "Active filters", children: [
    query.frontends.map((id) => {
      const label = frontendLabels.get(id) ?? id;
      return /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          "aria-label": `Remove ${label} filter`,
          onClick: () => onQueryChange({
            ...query,
            frontends: query.frontends.filter((value) => value !== id)
          }),
          children: [
            label,
            " \xD7"
          ]
        }
      );
    }),
    query.kinds.map((id) => {
      const label = kindLabels.get(id) ?? id;
      return /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          "aria-label": `Remove ${label} filter`,
          onClick: () => onQueryChange({
            ...query,
            kinds: query.kinds.filter((value) => value !== id)
          }),
          children: [
            label,
            " \xD7"
          ]
        }
      );
    })
  ] });
}

// vendor/tavernary-core/src/install-contract.ts
var contractKeys = [
  "branch",
  "folderName",
  "kind",
  "manifestPath",
  "repositoryUrl"
].sort();

// vendor/tavernary-core/src/catalog-schema.ts
var catalogKeys = [
  "generatedAt",
  "kits",
  "projects",
  "schemaVersion",
  "tagVocabulary"
].sort();

// vendor/tavernary-core/src/kit-query.ts
var DEFAULT_KIT_BROWSE_SORT = "trending";
var DEFAULT_KIT_QUERY = {
  frontends: [],
  purposes: [],
  modelFamilies: [],
  includesProjectId: "",
  minProjects: 3,
  maxProjects: 50,
  allComponentsAvailable: false,
  sort: DEFAULT_KIT_BROWSE_SORT
};
var KIT_BROWSE_SORTS = /* @__PURE__ */ new Set([
  "trending",
  "newest",
  "updated",
  "alphabetical"
]);
var KIT_SORTS = /* @__PURE__ */ new Set([...KIT_BROWSE_SORTS, "relevance"]);

// vendor/tavernary-core/src/kit-selectors.ts
var collator = new Intl.Collator("en", { sensitivity: "base" });

// vendor/tavernary-core/src/frontends.json
var frontends_default = {
  frontends: [
    {
      id: "agnai",
      label: "agnai",
      description: "Works with the agnai roleplay frontend."
    },
    {
      id: "ai-rpg",
      label: "AI RPG",
      description: "Works with the AI RPG roleplay frontend."
    },
    {
      id: "aikobots",
      label: "Aikobots",
      description: "Works with the Aikobots roleplay frontend."
    },
    {
      id: "alex-tavern",
      label: "alex-tavern",
      description: "Works with the alex-tavern roleplay frontend."
    },
    {
      id: "arousal-pub",
      label: "Arousal Pub",
      description: "Works with the Arousal Pub roleplay frontend."
    },
    {
      id: "aventuras",
      label: "Aventuras",
      description: "Works with the Aventuras roleplay frontend."
    },
    {
      id: "charon",
      label: "charon",
      description: "Works with the charon roleplay frontend."
    },
    {
      id: "focus",
      label: "Focus",
      description: "Works with the Focus roleplay frontend."
    },
    {
      id: "front-porch-ai",
      label: "front-porch-AI",
      description: "Works with the front-porch-AI roleplay frontend."
    },
    {
      id: "glaze",
      label: "Glaze",
      description: "Works with the Glaze roleplay frontend."
    },
    {
      id: "hordestudio",
      label: "hordestudio",
      description: "Works with the hordestudio roleplay frontend."
    },
    {
      id: "lumiverse",
      label: "Lumiverse",
      description: "Works with the Lumiverse roleplay frontend."
    },
    {
      id: "marinara-engine",
      label: "Marinara Engine",
      description: "Works with the Marinara Engine roleplay frontend."
    },
    {
      id: "mignon-ui",
      label: "Mignon-UI",
      description: "Works with the Mignon-UI roleplay frontend."
    },
    {
      id: "narrative-engine",
      label: "Narrative Engine",
      description: "Works with the Narrative Engine roleplay frontend."
    },
    {
      id: "neotavern-frontend",
      label: "NeoTavern-Frontend",
      description: "Works with the NeoTavern-Frontend roleplay frontend."
    },
    {
      id: "pocketrisu",
      label: "PocketRisu",
      description: "Works with the PocketRisu roleplay frontend."
    },
    {
      id: "pyre",
      label: "Pyre",
      description: "Works with the Pyre roleplay frontend."
    },
    {
      id: "quest-keeper",
      label: "Quest Keeper",
      description: "Works with the Quest Keeper roleplay frontend."
    },
    {
      id: "risuai",
      label: "RisuAI",
      description: "Works with the RisuAI roleplay frontend."
    },
    {
      id: "rpgraph",
      label: "RPGraph",
      description: "Works with the RPGraph roleplay frontend."
    },
    {
      id: "serene-pub",
      label: "serene-pub",
      description: "Works with the serene-pub roleplay frontend."
    },
    {
      id: "sillybunny-sillybunnyteam",
      label: "SillyBunny",
      description: "Works with the SillyBunny roleplay frontend."
    },
    {
      id: "sillytavern",
      label: "SillyTavern",
      description: "Works with the SillyTavern roleplay frontend."
    },
    {
      id: "simulith",
      label: "Simulith",
      description: "Works with the Simulith roleplay frontend."
    },
    {
      id: "sonder-engine",
      label: "Sonder Engine",
      description: "Works with the Sonder Engine roleplay frontend."
    },
    {
      id: "sweetrolllm",
      label: "SweetrollLM",
      description: "Works with the SweetrollLM roleplay frontend."
    },
    {
      id: "talemate",
      label: "talemate",
      description: "Works with the talemate roleplay frontend."
    },
    {
      id: "taleweaver",
      label: "TaleWeaver",
      description: "Works with the TaleWeaver roleplay frontend."
    },
    {
      id: "tauritavern",
      label: "TauriTavern",
      description: "Works with the TauriTavern roleplay frontend."
    },
    {
      id: "tavernai",
      label: "TavernAI",
      description: "Works with the TavernAI roleplay frontend."
    },
    {
      id: "tipsytavern",
      label: "TipsyTavern",
      description: "Works with the TipsyTavern roleplay frontend."
    },
    {
      id: "universal-immersion-engine-fugue",
      label: "Universal-Immersion-Engine-Fugue",
      description: "Works with the Universal-Immersion-Engine-Fugue roleplay frontend."
    },
    {
      id: "vibe-tavern",
      label: "vibe_tavern",
      description: "Works with the vibe_tavern roleplay frontend."
    },
    {
      id: "writers-guild",
      label: "writers-guild",
      description: "Works with the writers-guild roleplay frontend."
    }
  ]
};

// vendor/tavernary-core/src/project-query.ts
var DEFAULT_CATALOG_BROWSE_SORT = "recent";
var CATALOG_BROWSE_SORTS = /* @__PURE__ */ new Set([
  "recent",
  "date-added",
  "sustained",
  "popularity",
  "alphabetical"
]);
var CATALOG_SORTS = /* @__PURE__ */ new Set([
  ...CATALOG_BROWSE_SORTS,
  "relevance"
]);
var DEFAULT_QUERY = {
  mode: "projects",
  selectedKitId: "",
  relationship: "",
  search: "",
  category: "",
  view: "all",
  sort: DEFAULT_CATALOG_BROWSE_SORT,
  density: "standard",
  frontends: [],
  kinds: [],
  tags: [],
  modelFamilies: [],
  completionFormats: [],
  development: [],
  licenses: [],
  kits: DEFAULT_KIT_QUERY
};
var CATEGORY_OPTIONS = [
  { id: "", label: "All Projects", shortLabel: "All Projects" },
  { id: "frontend", label: "Frontends", shortLabel: "Frontends" },
  {
    id: "preset",
    label: "System Presets",
    shortLabel: "System Presets"
  },
  {
    id: "memory-retrieval",
    label: "Memory & Retrieval",
    shortLabel: "Memory & Retrieval"
  },
  {
    id: "generation-reasoning",
    label: "Generation & Reasoning",
    shortLabel: "Generation & Reasoning"
  },
  {
    id: "character-worldbuilding",
    label: "Character & Worldbuilding",
    shortLabel: "Character & Worldbuilding"
  },
  {
    id: "rpg-systems",
    label: "RPG Systems & Suites",
    shortLabel: "RPG Systems & Suites"
  },
  {
    id: "interface-workflow",
    label: "Interface & Workflow",
    shortLabel: "Interface & Workflow"
  },
  {
    id: "developer-infrastructure",
    label: "Developer Infrastructure",
    shortLabel: "Developer Infrastructure"
  }
];
var validFrontends = new Set(
  frontends_default.frontends.map(({ id }) => id)
);

// vendor/tavernary-core/src/activity.ts
var DAY_MS = 24 * 60 * 60 * 1e3;

// vendor/tavernary-core/src/project-selectors.ts
var collator2 = new Intl.Collator("en", { sensitivity: "base" });

// src/catalog/catalog-core.ts
var DEFAULT_COMPANION_QUERY = {
  ...DEFAULT_QUERY,
  frontends: ["sillytavern"],
  kinds: ["extension", "preset"],
  tags: [],
  modelFamilies: [],
  completionFormats: [],
  development: [],
  licenses: [],
  kits: {
    ...DEFAULT_QUERY.kits,
    frontends: [],
    purposes: [],
    modelFamilies: []
  }
};

// src/ui/projects/filter-panel.tsx
var kinds = [
  { id: "frontend", label: "Frontend" },
  { id: "extension", label: "Extension" },
  { id: "preset", label: "Preset" }
];
var models = [
  { id: "model-agnostic", label: "Model agnostic" },
  { id: "claude", label: "Claude" },
  { id: "gpt", label: "GPT" },
  { id: "gemini", label: "Gemini" },
  { id: "gemma", label: "Gemma" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "glm", label: "GLM" },
  { id: "minimax", label: "MiniMax" },
  { id: "mimo", label: "MiMo" },
  { id: "kimi", label: "Kimi" },
  { id: "qwen", label: "Qwen" },
  { id: "llama", label: "Llama" },
  { id: "mistral", label: "Mistral" }
];
var completion = [
  { id: "chat-completion", label: "Chat completion" },
  { id: "text-completion", label: "Text completion" }
];
var development = [
  { id: "active-month", label: "Active this month" },
  { id: "new-release", label: "New release" },
  { id: "dormant", label: "Dormant" }
];
var licenses = [
  { id: "open-source", label: "Open source" },
  { id: "proprietary", label: "Proprietary" },
  { id: "missing", label: "Missing license" },
  { id: "pending", label: "License pending" }
];
var views = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "new", label: "New" },
  { id: "released", label: "Recently released" }
];
function FilterPanel({
  query,
  facets,
  onQueryChange
}) {
  return /* @__PURE__ */ u3("aside", { class: "tavernary-companion-filter-panel", "aria-label": "Project filters", children: [
    /* @__PURE__ */ u3("fieldset", { children: [
      /* @__PURE__ */ u3("legend", { children: "Category" }),
      /* @__PURE__ */ u3(
        "select",
        {
          "aria-label": "Category",
          value: query.category,
          onChange: (event) => onQueryChange({ ...query, category: event.currentTarget.value }),
          children: CATEGORY_OPTIONS.map(({ id, label }) => /* @__PURE__ */ u3("option", { value: id, children: label }))
        }
      )
    ] }),
    /* @__PURE__ */ u3(
      CheckboxGroup,
      {
        label: "Frontends",
        options: facets.frontends,
        selected: query.frontends,
        onChange: (frontends) => onQueryChange({ ...query, frontends })
      }
    ),
    /* @__PURE__ */ u3(
      CheckboxGroup,
      {
        label: "Project type",
        options: kinds,
        selected: query.kinds,
        onChange: (kinds2) => onQueryChange({ ...query, kinds: kinds2 })
      }
    ),
    /* @__PURE__ */ u3(
      CheckboxGroup,
      {
        label: "Tags",
        options: facets.tags,
        selected: query.tags,
        onChange: (tags) => onQueryChange({ ...query, tags })
      }
    ),
    /* @__PURE__ */ u3(
      CheckboxGroup,
      {
        label: "Models",
        options: models,
        selected: query.modelFamilies ?? [],
        onChange: (modelFamilies) => onQueryChange({ ...query, modelFamilies })
      }
    ),
    /* @__PURE__ */ u3(
      CheckboxGroup,
      {
        label: "Completion",
        options: completion,
        selected: query.completionFormats ?? [],
        onChange: (completionFormats) => onQueryChange({ ...query, completionFormats })
      }
    ),
    /* @__PURE__ */ u3(
      CheckboxGroup,
      {
        label: "Development",
        options: development,
        selected: query.development,
        onChange: (values) => onQueryChange({ ...query, development: values })
      }
    ),
    /* @__PURE__ */ u3(
      CheckboxGroup,
      {
        label: "License",
        options: licenses,
        selected: query.licenses,
        onChange: (values) => onQueryChange({ ...query, licenses: values })
      }
    ),
    /* @__PURE__ */ u3("fieldset", { children: [
      /* @__PURE__ */ u3("legend", { children: "Catalog view" }),
      views.map(({ id, label }) => /* @__PURE__ */ u3("label", { children: [
        /* @__PURE__ */ u3(
          "input",
          {
            type: "radio",
            name: "catalog-view",
            checked: query.view === id,
            onChange: () => onQueryChange({ ...query, view: id })
          }
        ),
        label
      ] }))
    ] })
  ] });
}
function CheckboxGroup({
  label,
  options,
  selected,
  onChange
}) {
  return /* @__PURE__ */ u3("fieldset", { children: [
    /* @__PURE__ */ u3("legend", { children: label }),
    options.length === 0 ? /* @__PURE__ */ u3("span", { children: "None available" }) : null,
    options.map(({ id, label: optionLabel }) => /* @__PURE__ */ u3("label", { children: [
      /* @__PURE__ */ u3(
        "input",
        {
          type: "checkbox",
          checked: selected.includes(id),
          onChange: () => onChange(toggle(selected, id))
        }
      ),
      optionLabel
    ] }))
  ] });
}
function toggle(values, id) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

// src/ui/projects/project-card.tsx
function ProjectCard({ project, onOpen, onAction }) {
  return /* @__PURE__ */ u3("article", { class: "tavernary-companion-project-card", "data-project-id": project.id, children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("h3", { children: project.name }),
      /* @__PURE__ */ u3("span", { children: project.frontends.join(", ") || "Frontend-neutral" })
    ] }),
    /* @__PURE__ */ u3("p", { class: "tavernary-companion-project-card__context", children: [
      kindLabel(project.kind),
      " \xB7 ",
      project.primaryFunction
    ] }),
    /* @__PURE__ */ u3("p", { class: "tavernary-companion-project-card__summary", children: project.summary }),
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-project-card__evidence", children: [
      /* @__PURE__ */ u3(ActivitySummary, { activity: project.activity }),
      /* @__PURE__ */ u3(AssessmentBadge, { status: project.tavernKeeper })
    ] }),
    project.action.reason ? /* @__PURE__ */ u3("p", { class: "tavernary-companion-project-card__reason", children: project.action.reason }) : null,
    /* @__PURE__ */ u3("footer", { children: [
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          "data-focus-key": `project-${project.id}`,
          onClick: onOpen,
          "aria-label": `View ${project.name}`,
          children: "Details"
        }
      ),
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          class: "tavernary-companion-project-card__primary",
          "data-testid": "project-primary-action",
          "aria-label": `${project.action.label} ${project.name}`,
          onClick: () => onAction(project.action),
          disabled: project.action.kind === "current-extension",
          children: project.action.label
        }
      )
    ] })
  ] });
}
function kindLabel(kind) {
  return { extension: "Extension", preset: "Preset", frontend: "Frontend" }[kind];
}

// src/ui/projects/project-grid.tsx
function ProjectGrid({
  projects,
  onOpenProject,
  onProjectAction
}) {
  if (projects.length === 0) {
    return /* @__PURE__ */ u3("p", { children: "No projects match the current filters." });
  }
  return /* @__PURE__ */ u3("div", { class: "tavernary-companion-project-grid", "aria-label": "Project results", children: projects.map((project) => /* @__PURE__ */ u3(
    ProjectCard,
    {
      project,
      onOpen: () => onOpenProject(project.id),
      onAction: (action) => onProjectAction(project.id, action)
    },
    project.id
  )) });
}

// src/ui/projects/search-toolbar.tsx
var sorts = [
  { id: "recent", label: "Recently active" },
  { id: "date-added", label: "Date added" },
  { id: "sustained", label: "Sustained activity" },
  { id: "popularity", label: "Popularity" },
  { id: "alphabetical", label: "Alphabetical" },
  { id: "relevance", label: "Relevance" }
];
function SearchToolbar({
  query,
  resultCount,
  onQueryChange
}) {
  return /* @__PURE__ */ u3("div", { class: "tavernary-companion-search-toolbar", children: [
    /* @__PURE__ */ u3("label", { children: [
      /* @__PURE__ */ u3("span", { children: "Search projects" }),
      /* @__PURE__ */ u3(
        "input",
        {
          type: "search",
          "aria-label": "Search projects",
          value: query.search,
          onInput: (event) => onQueryChange({ ...query, search: event.currentTarget.value })
        }
      )
    ] }),
    /* @__PURE__ */ u3("label", { children: [
      /* @__PURE__ */ u3("span", { children: "Sort" }),
      /* @__PURE__ */ u3(
        "select",
        {
          "aria-label": "Sort projects",
          value: query.sort,
          onChange: (event) => onQueryChange({ ...query, sort: event.currentTarget.value }),
          children: sorts.map(({ id, label }) => /* @__PURE__ */ u3("option", { value: id, children: label }))
        }
      )
    ] }),
    /* @__PURE__ */ u3("output", { "aria-live": "polite", children: [
      resultCount,
      " projects"
    ] })
  ] });
}

// src/ui/projects/projects-route.tsx
var defaultFacets = {
  frontends: [{ id: "sillytavern", label: "SillyTavern" }],
  tags: []
};
function ProjectsRoute({
  state,
  facets = state.facets ?? defaultFacets,
  onQueryChange,
  onOpenProject = () => void 0,
  onProjectAction = () => void 0
}) {
  const [filtersOpen, setFiltersOpen] = d2(false);
  const filterTrigger = A2(null);
  const filterSurface = A2(null);
  const closeFilters = () => {
    setFiltersOpen(false);
    queueMicrotask(() => filterTrigger.current?.focus());
  };
  h2(() => {
    if (!filtersOpen) return;
    const controls = filterSurface.current?.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
    );
    controls?.[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFilters();
        return;
      }
      if (event.key !== "Tab" || !controls || controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);
  const isDefaultScope = state.query.frontends.length === 1 && state.query.frontends[0] === "sillytavern" && state.query.kinds.length === 2 && state.query.kinds.includes("extension") && state.query.kinds.includes("preset");
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-projects-route", "aria-labelledby": "projects-heading", children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("h2", { id: "projects-heading", children: "Projects" }),
      isDefaultScope ? /* @__PURE__ */ u3("p", { children: "Showing SillyTavern extensions and presets. Clear filters to explore all Tavernary projects." }) : null
    ] }),
    /* @__PURE__ */ u3(
      SearchToolbar,
      {
        query: state.query,
        resultCount: state.projects.length,
        onQueryChange
      }
    ),
    /* @__PURE__ */ u3(
      "button",
      {
        ref: filterTrigger,
        type: "button",
        class: "tavernary-companion-filter-trigger",
        "aria-label": "Filters",
        "aria-expanded": filtersOpen,
        onClick: () => setFiltersOpen(true),
        children: "Filters"
      }
    ),
    /* @__PURE__ */ u3(ActiveFilterChips, { query: state.query, facets, onQueryChange }),
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-projects-route__workspace", children: [
      /* @__PURE__ */ u3(
        "div",
        {
          ref: filterSurface,
          role: "dialog",
          "aria-label": "Project filters",
          "aria-modal": filtersOpen || void 0,
          class: `tavernary-companion-filter-surface${filtersOpen ? " is-open" : ""}`,
          children: [
            /* @__PURE__ */ u3("button", { type: "button", class: "tavernary-companion-filter-close", onClick: closeFilters, children: "Close filters" }),
            /* @__PURE__ */ u3(FilterPanel, { query: state.query, facets, onQueryChange })
          ]
        }
      ),
      /* @__PURE__ */ u3(
        ProjectGrid,
        {
          projects: state.projects,
          onOpenProject,
          onProjectAction
        }
      )
    ] })
  ] });
}

// src/ui/shell/shell-header.tsx
function ShellHeader({
  onRequestClose,
  catalogSnapshot,
  catalogRefreshing,
  onRefreshCatalog
}) {
  return /* @__PURE__ */ u3("header", { class: "tavernary-companion-shell__header", children: [
    /* @__PURE__ */ u3("div", { children: [
      /* @__PURE__ */ u3("span", { class: "tavernary-companion-shell__eyebrow", children: "Tavernary" }),
      /* @__PURE__ */ u3("h1", { id: "tavernary-companion-heading", children: "Tavernary Companion" })
    ] }),
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-shell__utilities", children: [
      catalogSnapshot ? /* @__PURE__ */ u3(S, { children: [
        /* @__PURE__ */ u3(CatalogFreshness, { snapshot: catalogSnapshot, refreshing: catalogRefreshing }),
        onRefreshCatalog ? /* @__PURE__ */ u3("button", { type: "button", onClick: onRefreshCatalog, "aria-label": "Refresh catalog", children: "Refresh" }) : null
      ] }) : null,
      onRequestClose ? /* @__PURE__ */ u3("button", { type: "button", onClick: onRequestClose, "aria-label": "Close Tavernary Companion", children: "Close" }) : null
    ] })
  ] });
}

// src/ui/shell/route-tabs.tsx
var routes = [
  { id: "projects", label: "Projects" },
  { id: "kits", label: "Kits" },
  { id: "installed", label: "Installed" }
];
function RouteTabs({ route, onNavigate }) {
  return /* @__PURE__ */ u3("nav", { class: "tavernary-companion-shell__tabs", "aria-label": "Companion sections", children: /* @__PURE__ */ u3("div", { role: "tablist", children: routes.map((candidate) => /* @__PURE__ */ u3(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": candidate.id === route,
      tabIndex: candidate.id === route ? 0 : -1,
      onClick: () => onNavigate(candidate.id),
      children: candidate.label
    }
  )) }) });
}

// src/ui/shell/companion-shell.tsx
var noRefresh = () => void 0;
var noAction = () => void 0;
function CompanionShell({
  controller,
  projects = [],
  discovery,
  facets,
  onProjectAction,
  onRefreshInventory = noRefresh,
  inventoryRefreshing = false,
  onOpenExtensionManager,
  catalogSnapshot,
  catalogRefreshing = false,
  onRefreshCatalog = noRefresh,
  onUpdateCompanion = noAction,
  onUseCachedCatalog = noAction,
  onOpenTavernary = noAction,
  onRequestClose
}) {
  const [state, setState] = d2(controller.read());
  const [discoveryState, setDiscoveryState] = d2(discovery?.read() ?? null);
  h2(() => controller.subscribe(setState), [controller]);
  h2(() => {
    if (!discovery) return;
    setDiscoveryState(discovery.read());
    return discovery.subscribe(setDiscoveryState);
  }, [discovery]);
  h2(() => {
    const onPopState = () => restoreAfterBack(controller);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [controller]);
  const detail = state.detailStack.at(-1);
  return /* @__PURE__ */ u3(
    "section",
    {
      class: "tavernary-companion-shell",
      "aria-labelledby": "tavernary-companion-heading",
      "data-testid": "companion-shell",
      children: [
        /* @__PURE__ */ u3(
          ShellHeader,
          {
            onRequestClose,
            catalogSnapshot,
            catalogRefreshing,
            onRefreshCatalog: catalogSnapshot ? () => void onRefreshCatalog() : void 0
          }
        ),
        /* @__PURE__ */ u3(RouteTabs, { route: state.route, onNavigate: (route) => controller.navigate(route) }),
        /* @__PURE__ */ u3("main", { class: "tavernary-companion-shell__content", children: /* @__PURE__ */ u3(
          CatalogBoundary,
          {
            snapshot: catalogSnapshot,
            onRefresh: onRefreshCatalog,
            onUpdateCompanion,
            onUseCached: onUseCachedCatalog,
            onOpenTavernary,
            children: [
              /* @__PURE__ */ u3(
                "section",
                {
                  "aria-labelledby": "tavernary-companion-projects-heading",
                  hidden: state.route !== "projects" || Boolean(detail),
                  children: discovery && discoveryState ? /* @__PURE__ */ u3(
                    ProjectsRoute,
                    {
                      state: discoveryState,
                      facets: facets ?? discoveryState.facets,
                      onQueryChange: (query) => discovery.setQuery(query),
                      onOpenProject: (id) => controller.openDetail({ kind: "project", id, focusKey: `project-${id}` }),
                      onProjectAction: (id, action) => onProjectAction?.(id, action)
                    }
                  ) : /* @__PURE__ */ u3(S, { children: [
                    /* @__PURE__ */ u3("h2", { id: "tavernary-companion-projects-heading", children: "Projects" }),
                    projects.map((project) => {
                      const focusKey = `project-${project.id}`;
                      return /* @__PURE__ */ u3(
                        "button",
                        {
                          type: "button",
                          "data-focus-key": focusKey,
                          "aria-label": `View ${project.name}`,
                          onClick: () => controller.openDetail({ kind: "project", id: project.id, focusKey }),
                          children: project.name
                        }
                      );
                    })
                  ] })
                }
              ),
              /* @__PURE__ */ u3(
                "section",
                {
                  "aria-labelledby": "tavernary-companion-kits-heading",
                  hidden: state.route !== "kits" || Boolean(detail),
                  children: /* @__PURE__ */ u3("h2", { id: "tavernary-companion-kits-heading", children: "Kits" })
                }
              ),
              /* @__PURE__ */ u3(
                "section",
                {
                  "aria-labelledby": "tavernary-companion-installed-heading",
                  hidden: state.route !== "installed" || Boolean(detail),
                  children: discoveryState ? /* @__PURE__ */ u3(
                    InstalledRoute,
                    {
                      sections: discoveryState.installedSections,
                      refreshing: inventoryRefreshing,
                      onRefresh: onRefreshInventory,
                      onOpenProject: (id) => controller.openDetail({ kind: "project", id, focusKey: `installed-${id}` }),
                      onAction: (id, action) => onProjectAction?.(id, action),
                      onManage: onOpenExtensionManager
                    }
                  ) : /* @__PURE__ */ u3("h2", { id: "tavernary-companion-installed-heading", children: "Installed extensions" })
                }
              ),
              detail ? /* @__PURE__ */ u3("section", { "aria-label": `${detail.kind} detail`, children: [
                /* @__PURE__ */ u3("button", { type: "button", onClick: () => restoreAfterBack(controller), children: "Back" }),
                detail.kind === "project" && discoveryState?.projectDetails[detail.id] ? /* @__PURE__ */ u3(
                  ProjectDetail,
                  {
                    project: discoveryState.projectDetails[detail.id],
                    onAction: (action) => onProjectAction?.(detail.id, action)
                  }
                ) : /* @__PURE__ */ u3("h2", { children: projectName(projects, discoveryState, detail.id) })
              ] }) : null
            ]
          }
        ) })
      ]
    }
  );
}
function CatalogBoundary({
  snapshot,
  onRefresh,
  onUpdateCompanion,
  onUseCached,
  onOpenTavernary,
  children
}) {
  if (!snapshot) return /* @__PURE__ */ u3(S, { children });
  return /* @__PURE__ */ u3(
    CatalogStatePanel,
    {
      snapshot,
      onRefresh,
      onUpdateCompanion,
      onUseCached,
      onOpenTavernary,
      children
    }
  );
}
function restoreAfterBack(controller) {
  const result = controller.back();
  if (!result.handled || !result.focusKey) return;
  queueMicrotask(() => {
    const candidates = document.querySelectorAll("[data-focus-key]");
    for (const candidate of candidates) {
      if (candidate.dataset.focusKey === result.focusKey) {
        candidate.focus();
        return;
      }
    }
  });
}
function projectName(projects, discoveryState, id) {
  return projects.find((project) => project.id === id)?.name ?? discoveryState?.projects.find((project) => project.id === id)?.name ?? id;
}

// src/ui/shell/shell-state.ts
function createShellState(route) {
  return {
    route,
    detailStack: [],
    filterSurface: "closed",
    operationLayer: "closed"
  };
}
function reduceShellState(state, event) {
  switch (event.type) {
    case "navigate":
      return {
        ...state,
        route: event.route,
        detailStack: [],
        filterSurface: "closed"
      };
    case "open-detail":
      return { ...state, detailStack: [...state.detailStack, event.detail] };
    case "open-filter":
      return { ...state, filterSurface: event.surface };
    case "close-filter":
      return { ...state, filterSurface: "closed" };
    case "set-operation":
      return { ...state, operationLayer: event.layer };
    case "pop-detail":
      return { ...state, detailStack: state.detailStack.slice(0, -1) };
  }
}

// src/ui/shell/shell-controller.ts
var DefaultShellController = class {
  #persistRoute;
  #subscribers = /* @__PURE__ */ new Set();
  #state;
  constructor(options) {
    this.#state = createShellState(options.initialRoute);
    this.#persistRoute = options.persistRoute;
  }
  read() {
    return structuredClone(this.#state);
  }
  subscribe(subscriber) {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }
  navigate(route) {
    if (this.#state.route === route && this.#state.detailStack.length === 0) return;
    this.#dispatch({ type: "navigate", route });
    void this.#persistRoute?.(route);
  }
  openDetail(detail) {
    this.#dispatch({ type: "open-detail", detail: structuredClone(detail) });
  }
  openFilter(surface) {
    this.#dispatch({ type: "open-filter", surface });
  }
  setOperation(layer) {
    this.#dispatch({ type: "set-operation", layer });
  }
  back() {
    if (this.#state.operationLayer !== "closed") {
      this.#dispatch({ type: "set-operation", layer: "closed" });
      return { handled: true, focusKey: "operation-trigger" };
    }
    if (this.#state.filterSurface !== "closed") {
      this.#dispatch({ type: "close-filter" });
      return { handled: true, focusKey: "filter-trigger" };
    }
    const detail = this.#state.detailStack.at(-1);
    if (detail) {
      this.#dispatch({ type: "pop-detail" });
      return { handled: true, focusKey: detail.focusKey };
    }
    return { handled: false, focusKey: null };
  }
  #dispatch(event) {
    this.#state = reduceShellState(this.#state, event);
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
};
function createShellController(options) {
  return new DefaultShellController(options);
}

// src/ui/popup-host.tsx
function CompanionPopupHost({ store }) {
  const controller = createShellController({
    initialRoute: store?.read().preferences.route ?? "projects",
    persistRoute: store ? async (route) => {
      await store.update((draft) => {
        draft.preferences.route = route;
      });
    } : void 0
  });
  return /* @__PURE__ */ u3(CompanionShell, { controller });
}
function renderCompanionPopup(container, options = {}) {
  R(/* @__PURE__ */ u3(CompanionPopupHost, { ...options }), container);
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
    unmountPopup = renderCompanionPopup(content, { store: input.store });
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
      if (!disposed && button.isConnected) button.focus();
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
  const launcher = mountCompanionLauncher({ container: menu, host, store });
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

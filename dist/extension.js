// src/host/host-errors.ts
var HostOperationError = class extends Error {
  operation;
  status;
  details;
  constructor(operation, message2, options = {}) {
    super(message2, { cause: options.cause });
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
    operationReceipt: null,
    kitOperationJournal: null
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
    operationReceipt: cloneNullableRecord(value.operationReceipt),
    kitOperationJournal: cloneNullableRecord(value.kitOperationJournal)
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
      const result2 = await mutator(draft);
      const next = migrateProfileState(result2 ?? draft);
      const hadPrevious = Object.hasOwn(this.#dependencies.extensionSettings, PROFILE_NAMESPACE);
      const previous = this.#dependencies.extensionSettings[PROFILE_NAMESPACE];
      this.#dependencies.extensionSettings[PROFILE_NAMESPACE] = structuredClone(next);
      try {
        await this.#dependencies.saveSettingsDebounced();
      } catch (error) {
        if (hadPrevious) {
          this.#dependencies.extensionSettings[PROFILE_NAMESPACE] = previous;
        } else {
          delete this.#dependencies.extensionSettings[PROFILE_NAMESPACE];
        }
        throw error;
      }
      this.#state = structuredClone(next);
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
function q2(n2, t3) {
  return o2 = 8, T2(function() {
    return n2;
  }, t3);
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

// src/catalog/catalog-errors.ts
var CatalogClientError = class extends Error {
  code;
  constructor(code, message2, options) {
    super(message2, options);
    this.name = "CatalogClientError";
    this.code = code;
  }
};

// vendor/tavernary-core/src/install-contract.ts
var contractKeys = [
  "branch",
  "folderName",
  "kind",
  "manifestPath",
  "repositoryUrl"
].sort();
var safeFolderName = /^[A-Za-z0-9._-]+$/u;
var InstallContractValidationError = class extends Error {
  field;
  constructor(field, message2) {
    super(message2);
    this.name = "InstallContractValidationError";
    this.field = field;
  }
};
function parseInstallContract(value) {
  if (!isRecord2(value)) {
    throw new InstallContractValidationError(
      "contract",
      "Install contract must be an object."
    );
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== contractKeys.length || keys.some((key, index) => key !== contractKeys[index])) {
    throw new InstallContractValidationError(
      "contract",
      "Install contract keys do not match schema 7."
    );
  }
  if (value.kind !== "sillytavern-extension-git") {
    throw new InstallContractValidationError(
      "kind",
      "Install kind is unsupported."
    );
  }
  if (value.manifestPath !== "manifest.json") {
    throw new InstallContractValidationError(
      "manifestPath",
      "SillyTavern manifests must be at the repository root."
    );
  }
  const repositoryUrl = parseRepositoryUrl2(value.repositoryUrl);
  const branch = parseBranch(value.branch);
  const folderName = parseFolderName(value.folderName);
  return {
    kind: "sillytavern-extension-git",
    repositoryUrl,
    branch,
    manifestPath: "manifest.json",
    folderName
  };
}
function parseRepositoryUrl2(value) {
  if (typeof value !== "string" || containsControl(value)) {
    throw new InstallContractValidationError(
      "repositoryUrl",
      "Repository URL is invalid."
    );
  }
  if (/%(?:2f|5c)/iu.test(value)) {
    throw new InstallContractValidationError(
      "repositoryUrl",
      "Repository URL cannot contain encoded separators."
    );
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new InstallContractValidationError(
      "repositoryUrl",
      "Repository URL is invalid."
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new InstallContractValidationError(
      "repositoryUrl",
      "Repository URL must use HTTP or HTTPS."
    );
  }
  if (url.username || url.password) {
    throw new InstallContractValidationError(
      "repositoryUrl",
      "Repository URL cannot contain credentials."
    );
  }
  if (url.search || url.hash) {
    throw new InstallContractValidationError(
      "repositoryUrl",
      "Repository URL cannot contain a query or fragment."
    );
  }
  const rawPath = rawUrlPath(value);
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    throw new InstallContractValidationError(
      "repositoryUrl",
      "Repository URL path encoding is invalid."
    );
  }
  const segments = decodedPath.split("/").filter(Boolean);
  if (!url.hostname || decodedPath.includes("\\") || decodedPath.includes("//") || segments.length < 2 || segments.some((segment) => segment === "." || segment === "..") || !segments.at(-1)?.endsWith(".git")) {
    throw new InstallContractValidationError(
      "repositoryUrl",
      "Repository URL must identify a .git repository."
    );
  }
  return url.href;
}
function parseBranch(value) {
  if (value === null) return null;
  if (typeof value !== "string" || value.length === 0 || value.length > 255 || containsControl(value) || /[ ~^:?*\[\\]/u.test(value) || value.includes("..") || value.includes("@{") || value.includes("//") || value.startsWith("-") || value.startsWith("/") || value.endsWith("/") || value.endsWith(".")) {
    throw new InstallContractValidationError(
      "branch",
      "Branch name is invalid."
    );
  }
  return value;
}
function parseFolderName(value) {
  if (typeof value !== "string" || !safeFolderName.test(value) || value === "." || value === "..") {
    throw new InstallContractValidationError(
      "folderName",
      "Install folder name is unsafe."
    );
  }
  return value;
}
function rawUrlPath(value) {
  const match = /^[a-z]+:\/\/[^/]*(\/[^?#]*)/iu.exec(value);
  return match?.[1] ?? "";
}
function containsControl(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint >= 127 && codePoint <= 159;
  });
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// vendor/tavernary-core/src/catalog-schema.ts
var catalogKeys = [
  "generatedAt",
  "kits",
  "projects",
  "schemaVersion",
  "tagVocabulary"
].sort();
var CatalogValidationError = class extends Error {
  issues;
  constructor(issues) {
    super(`Catalog schema 7 validation failed with ${issues.length} issue(s).`);
    this.name = "CatalogValidationError";
    this.issues = structuredClone(issues);
  }
};
function parseCatalogV7(value) {
  const issues = [];
  if (!isRecord3(value)) {
    throw new CatalogValidationError([
      { path: "catalog", message: "Catalog must be an object." }
    ]);
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== catalogKeys.length || keys.some((key, index) => key !== catalogKeys[index])) {
    issues.push({
      path: "catalog",
      message: "Catalog top-level keys do not match schema 7."
    });
  }
  if (value.schemaVersion !== 7) {
    issues.push({
      path: "schemaVersion",
      message: "Expected schema version 7."
    });
  }
  if (typeof value.generatedAt !== "string" || !isIsoDate(value.generatedAt)) {
    issues.push({ path: "generatedAt", message: "Expected an ISO date-time." });
  }
  if (!Array.isArray(value.tagVocabulary)) {
    issues.push({ path: "tagVocabulary", message: "Expected an array." });
  }
  if (!Array.isArray(value.kits)) {
    issues.push({ path: "kits", message: "Expected an array." });
  }
  const projects = [];
  const projectIds = /* @__PURE__ */ new Set();
  if (!Array.isArray(value.projects)) {
    issues.push({ path: "projects", message: "Expected an array." });
  } else {
    value.projects.forEach((project, index) => {
      const path = `projects[${index}]`;
      if (!isRecord3(project)) {
        issues.push({ path, message: "Project must be an object." });
        return;
      }
      if (typeof project.id !== "string" || project.id.length === 0) {
        issues.push({ path: `${path}.id`, message: "Project ID is required." });
      } else if (projectIds.has(project.id)) {
        issues.push({
          path: `${path}.id`,
          message: "Project ID must be unique."
        });
      } else {
        projectIds.add(project.id);
      }
      if (!("install" in project)) {
        issues.push({
          path: `${path}.install`,
          message: "Install eligibility is required."
        });
      } else if (project.install !== null) {
        try {
          parseInstallContract(project.install);
        } catch (cause) {
          const field = cause instanceof InstallContractValidationError && cause.field !== "contract" ? `.${cause.field}` : "";
          issues.push({
            path: `${path}.install${field}`,
            message: cause instanceof Error ? cause.message : "Install contract is invalid."
          });
        }
      }
      projects.push(project);
    });
  }
  if (issues.length > 0) throw new CatalogValidationError(issues);
  return structuredClone({
    schemaVersion: 7,
    generatedAt: value.generatedAt,
    tagVocabulary: value.tagVocabulary,
    projects,
    kits: value.kits
  });
}
function isIsoDate(value) {
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime()) && timestamp.toISOString() === value;
}
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

// vendor/tavernary-core/src/preset-compatibility.ts
function matchesModelFamilies(selected, available) {
  return selected.length === 0 || selected.some((family) => available.includes(family));
}
function matchesCompletionFormats(selected, available) {
  return selected.length === 0 || selected.some((format) => available.includes(format));
}

// node_modules/minisearch/dist/es/index.js
var ENTRIES = "ENTRIES";
var KEYS = "KEYS";
var VALUES = "VALUES";
var LEAF = "";
var TreeIterator = class {
  constructor(set, type) {
    const node = set._tree;
    const keys = Array.from(node.keys());
    this.set = set;
    this._type = type;
    this._path = keys.length > 0 ? [{ node, keys }] : [];
  }
  next() {
    const value = this.dive();
    this.backtrack();
    return value;
  }
  dive() {
    if (this._path.length === 0) {
      return { done: true, value: void 0 };
    }
    const { node, keys } = last$1(this._path);
    if (last$1(keys) === LEAF) {
      return { done: false, value: this.result() };
    }
    const child = node.get(last$1(keys));
    this._path.push({ node: child, keys: Array.from(child.keys()) });
    return this.dive();
  }
  backtrack() {
    if (this._path.length === 0) {
      return;
    }
    const keys = last$1(this._path).keys;
    keys.pop();
    if (keys.length > 0) {
      return;
    }
    this._path.pop();
    this.backtrack();
  }
  key() {
    return this.set._prefix + this._path.map(({ keys }) => last$1(keys)).filter((key) => key !== LEAF).join("");
  }
  value() {
    return last$1(this._path).node.get(LEAF);
  }
  result() {
    switch (this._type) {
      case VALUES:
        return this.value();
      case KEYS:
        return this.key();
      default:
        return [this.key(), this.value()];
    }
  }
  [Symbol.iterator]() {
    return this;
  }
};
var last$1 = (array) => {
  return array[array.length - 1];
};
var fuzzySearch = (node, query, maxDistance) => {
  const results = /* @__PURE__ */ new Map();
  if (query === void 0)
    return results;
  const n2 = query.length + 1;
  const m3 = n2 + maxDistance;
  const matrix = new Uint8Array(m3 * n2).fill(maxDistance + 1);
  for (let j3 = 0; j3 < n2; ++j3)
    matrix[j3] = j3;
  for (let i3 = 1; i3 < m3; ++i3)
    matrix[i3 * n2] = i3;
  recurse(node, query, maxDistance, results, matrix, 1, n2, "");
  return results;
};
var recurse = (node, query, maxDistance, results, matrix, m3, n2, prefix) => {
  const offset = m3 * n2;
  key: for (const key of node.keys()) {
    if (key === LEAF) {
      const distance = matrix[offset - 1];
      if (distance <= maxDistance) {
        results.set(prefix, [node.get(key), distance]);
      }
    } else {
      let i3 = m3;
      for (let pos = 0; pos < key.length; ++pos, ++i3) {
        const char = key[pos];
        const thisRowOffset = n2 * i3;
        const prevRowOffset = thisRowOffset - n2;
        let minDistance = matrix[thisRowOffset];
        const jmin = Math.max(0, i3 - maxDistance - 1);
        const jmax = Math.min(n2 - 1, i3 + maxDistance);
        for (let j3 = jmin; j3 < jmax; ++j3) {
          const different = char !== query[j3];
          const rpl = matrix[prevRowOffset + j3] + +different;
          const del = matrix[prevRowOffset + j3 + 1] + 1;
          const ins = matrix[thisRowOffset + j3] + 1;
          const dist = matrix[thisRowOffset + j3 + 1] = Math.min(rpl, del, ins);
          if (dist < minDistance)
            minDistance = dist;
        }
        if (minDistance > maxDistance) {
          continue key;
        }
      }
      recurse(node.get(key), query, maxDistance, results, matrix, i3, n2, prefix + key);
    }
  }
};
var SearchableMap = class _SearchableMap {
  /**
   * The constructor is normally called without arguments, creating an empty
   * map. In order to create a {@link SearchableMap} from an iterable or from an
   * object, check {@link SearchableMap.from} and {@link
   * SearchableMap.fromObject}.
   *
   * The constructor arguments are for internal use, when creating derived
   * mutable views of a map at a prefix.
   */
  constructor(tree = /* @__PURE__ */ new Map(), prefix = "") {
    this._size = void 0;
    this._tree = tree;
    this._prefix = prefix;
  }
  /**
   * Creates and returns a mutable view of this {@link SearchableMap},
   * containing only entries that share the given prefix.
   *
   * ### Usage:
   *
   * ```javascript
   * let map = new SearchableMap()
   * map.set("unicorn", 1)
   * map.set("universe", 2)
   * map.set("university", 3)
   * map.set("unique", 4)
   * map.set("hello", 5)
   *
   * let uni = map.atPrefix("uni")
   * uni.get("unique") // => 4
   * uni.get("unicorn") // => 1
   * uni.get("hello") // => undefined
   *
   * let univer = map.atPrefix("univer")
   * univer.get("unique") // => undefined
   * univer.get("universe") // => 2
   * univer.get("university") // => 3
   * ```
   *
   * @param prefix  The prefix
   * @return A {@link SearchableMap} representing a mutable view of the original
   * Map at the given prefix
   */
  atPrefix(prefix) {
    if (!prefix.startsWith(this._prefix)) {
      throw new Error("Mismatched prefix");
    }
    const [node, path] = trackDown(this._tree, prefix.slice(this._prefix.length));
    if (node === void 0) {
      const [parentNode, key] = last(path);
      for (const k3 of parentNode.keys()) {
        if (k3 !== LEAF && k3.startsWith(key)) {
          const node2 = /* @__PURE__ */ new Map();
          node2.set(k3.slice(key.length), parentNode.get(k3));
          return new _SearchableMap(node2, prefix);
        }
      }
    }
    return new _SearchableMap(node, prefix);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/clear
   */
  clear() {
    this._size = void 0;
    this._tree.clear();
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/delete
   * @param key  Key to delete
   */
  delete(key) {
    this._size = void 0;
    return remove(this._tree, key);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/entries
   * @return An iterator iterating through `[key, value]` entries.
   */
  entries() {
    return new TreeIterator(this, ENTRIES);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
   * @param fn  Iteration function
   */
  forEach(fn) {
    for (const [key, value] of this) {
      fn(key, value, this);
    }
  }
  /**
   * Returns a Map of all the entries that have a key within the given edit
   * distance from the search key. The keys of the returned Map are the matching
   * keys, while the values are two-element arrays where the first element is
   * the value associated to the key, and the second is the edit distance of the
   * key to the search key.
   *
   * ### Usage:
   *
   * ```javascript
   * let map = new SearchableMap()
   * map.set('hello', 'world')
   * map.set('hell', 'yeah')
   * map.set('ciao', 'mondo')
   *
   * // Get all entries that match the key 'hallo' with a maximum edit distance of 2
   * map.fuzzyGet('hallo', 2)
   * // => Map(2) { 'hello' => ['world', 1], 'hell' => ['yeah', 2] }
   *
   * // In the example, the "hello" key has value "world" and edit distance of 1
   * // (change "e" to "a"), the key "hell" has value "yeah" and edit distance of 2
   * // (change "e" to "a", delete "o")
   * ```
   *
   * @param key  The search key
   * @param maxEditDistance  The maximum edit distance (Levenshtein)
   * @return A Map of the matching keys to their value and edit distance
   */
  fuzzyGet(key, maxEditDistance) {
    return fuzzySearch(this._tree, key, maxEditDistance);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/get
   * @param key  Key to get
   * @return Value associated to the key, or `undefined` if the key is not
   * found.
   */
  get(key) {
    const node = lookup(this._tree, key);
    return node !== void 0 ? node.get(LEAF) : void 0;
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/has
   * @param key  Key
   * @return True if the key is in the map, false otherwise
   */
  has(key) {
    const node = lookup(this._tree, key);
    return node !== void 0 && node.has(LEAF);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/keys
   * @return An `Iterable` iterating through keys
   */
  keys() {
    return new TreeIterator(this, KEYS);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/set
   * @param key  Key to set
   * @param value  Value to associate to the key
   * @return The {@link SearchableMap} itself, to allow chaining
   */
  set(key, value) {
    if (typeof key !== "string") {
      throw new Error("key must be a string");
    }
    this._size = void 0;
    const node = createPath(this._tree, key);
    node.set(LEAF, value);
    return this;
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/size
   */
  get size() {
    if (this._size) {
      return this._size;
    }
    this._size = 0;
    const iter = this.entries();
    while (!iter.next().done)
      this._size += 1;
    return this._size;
  }
  /**
   * Updates the value at the given key using the provided function. The function
   * is called with the current value at the key, and its return value is used as
   * the new value to be set.
   *
   * ### Example:
   *
   * ```javascript
   * // Increment the current value by one
   * searchableMap.update('somekey', (currentValue) => currentValue == null ? 0 : currentValue + 1)
   * ```
   *
   * If the value at the given key is or will be an object, it might not require
   * re-assignment. In that case it is better to use `fetch()`, because it is
   * faster.
   *
   * @param key  The key to update
   * @param fn  The function used to compute the new value from the current one
   * @return The {@link SearchableMap} itself, to allow chaining
   */
  update(key, fn) {
    if (typeof key !== "string") {
      throw new Error("key must be a string");
    }
    this._size = void 0;
    const node = createPath(this._tree, key);
    node.set(LEAF, fn(node.get(LEAF)));
    return this;
  }
  /**
   * Fetches the value of the given key. If the value does not exist, calls the
   * given function to create a new value, which is inserted at the given key
   * and subsequently returned.
   *
   * ### Example:
   *
   * ```javascript
   * const map = searchableMap.fetch('somekey', () => new Map())
   * map.set('foo', 'bar')
   * ```
   *
   * @param key  The key to update
   * @param initial  A function that creates a new value if the key does not exist
   * @return The existing or new value at the given key
   */
  fetch(key, initial) {
    if (typeof key !== "string") {
      throw new Error("key must be a string");
    }
    this._size = void 0;
    const node = createPath(this._tree, key);
    let value = node.get(LEAF);
    if (value === void 0) {
      node.set(LEAF, value = initial());
    }
    return value;
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/values
   * @return An `Iterable` iterating through values.
   */
  values() {
    return new TreeIterator(this, VALUES);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
   */
  [Symbol.iterator]() {
    return this.entries();
  }
  /**
   * Creates a {@link SearchableMap} from an `Iterable` of entries
   *
   * @param entries  Entries to be inserted in the {@link SearchableMap}
   * @return A new {@link SearchableMap} with the given entries
   */
  static from(entries) {
    const tree = new _SearchableMap();
    for (const [key, value] of entries) {
      tree.set(key, value);
    }
    return tree;
  }
  /**
   * Creates a {@link SearchableMap} from the iterable properties of a JavaScript object
   *
   * @param object  Object of entries for the {@link SearchableMap}
   * @return A new {@link SearchableMap} with the given entries
   */
  static fromObject(object) {
    return _SearchableMap.from(Object.entries(object));
  }
};
var trackDown = (tree, key, path = []) => {
  if (key.length === 0 || tree == null) {
    return [tree, path];
  }
  for (const k3 of tree.keys()) {
    if (k3 !== LEAF && key.startsWith(k3)) {
      path.push([tree, k3]);
      return trackDown(tree.get(k3), key.slice(k3.length), path);
    }
  }
  path.push([tree, key]);
  return trackDown(void 0, "", path);
};
var lookup = (tree, key) => {
  if (key.length === 0 || tree == null) {
    return tree;
  }
  for (const k3 of tree.keys()) {
    if (k3 !== LEAF && key.startsWith(k3)) {
      return lookup(tree.get(k3), key.slice(k3.length));
    }
  }
};
var createPath = (node, key) => {
  const keyLength = key.length;
  outer: for (let pos = 0; node && pos < keyLength; ) {
    for (const k3 of node.keys()) {
      if (k3 !== LEAF && key[pos] === k3[0]) {
        const len = Math.min(keyLength - pos, k3.length);
        let offset = 1;
        while (offset < len && key[pos + offset] === k3[offset])
          ++offset;
        const child2 = node.get(k3);
        if (offset === k3.length) {
          node = child2;
        } else {
          const intermediate = /* @__PURE__ */ new Map();
          intermediate.set(k3.slice(offset), child2);
          node.set(key.slice(pos, pos + offset), intermediate);
          node.delete(k3);
          node = intermediate;
        }
        pos += offset;
        continue outer;
      }
    }
    const child = /* @__PURE__ */ new Map();
    node.set(key.slice(pos), child);
    return child;
  }
  return node;
};
var remove = (tree, key) => {
  const [node, path] = trackDown(tree, key);
  if (node === void 0) {
    return;
  }
  node.delete(LEAF);
  if (node.size === 0) {
    cleanup(path);
  } else if (node.size === 1) {
    const [key2, value] = node.entries().next().value;
    merge(path, key2, value);
  }
};
var cleanup = (path) => {
  if (path.length === 0) {
    return;
  }
  const [node, key] = last(path);
  node.delete(key);
  if (node.size === 0) {
    cleanup(path.slice(0, -1));
  } else if (node.size === 1) {
    const [key2, value] = node.entries().next().value;
    if (key2 !== LEAF) {
      merge(path.slice(0, -1), key2, value);
    }
  }
};
var merge = (path, key, value) => {
  if (path.length === 0) {
    return;
  }
  const [node, nodeKey] = last(path);
  node.set(nodeKey + key, value);
  node.delete(nodeKey);
};
var last = (array) => {
  return array[array.length - 1];
};
var OR = "or";
var AND = "and";
var AND_NOT = "and_not";
var MiniSearch = class _MiniSearch {
  /**
   * @param options  Configuration options
   *
   * ### Examples:
   *
   * ```javascript
   * // Create a search engine that indexes the 'title' and 'text' fields of your
   * // documents:
   * const miniSearch = new MiniSearch({ fields: ['title', 'text'] })
   * ```
   *
   * ### ID Field:
   *
   * ```javascript
   * // Your documents are assumed to include a unique 'id' field, but if you want
   * // to use a different field for document identification, you can set the
   * // 'idField' option:
   * const miniSearch = new MiniSearch({ idField: 'key', fields: ['title', 'text'] })
   * ```
   *
   * ### Options and defaults:
   *
   * ```javascript
   * // The full set of options (here with their default value) is:
   * const miniSearch = new MiniSearch({
   *   // idField: field that uniquely identifies a document
   *   idField: 'id',
   *
   *   // extractField: function used to get the value of a field in a document.
   *   // By default, it assumes the document is a flat object with field names as
   *   // property keys and field values as string property values, but custom logic
   *   // can be implemented by setting this option to a custom extractor function.
   *   extractField: (document, fieldName) => document[fieldName],
   *
   *   // tokenize: function used to split fields into individual terms. By
   *   // default, it is also used to tokenize search queries, unless a specific
   *   // `tokenize` search option is supplied. When tokenizing an indexed field,
   *   // the field name is passed as the second argument.
   *   tokenize: (string, _fieldName) => string.split(SPACE_OR_PUNCTUATION),
   *
   *   // processTerm: function used to process each tokenized term before
   *   // indexing. It can be used for stemming and normalization. Return a falsy
   *   // value in order to discard a term. By default, it is also used to process
   *   // search queries, unless a specific `processTerm` option is supplied as a
   *   // search option. When processing a term from a indexed field, the field
   *   // name is passed as the second argument.
   *   processTerm: (term, _fieldName) => term.toLowerCase(),
   *
   *   // searchOptions: default search options, see the `search` method for
   *   // details
   *   searchOptions: undefined,
   *
   *   // fields: document fields to be indexed. Mandatory, but not set by default
   *   fields: undefined
   *
   *   // storeFields: document fields to be stored and returned as part of the
   *   // search results.
   *   storeFields: []
   * })
   * ```
   */
  constructor(options) {
    if ((options === null || options === void 0 ? void 0 : options.fields) == null) {
      throw new Error('MiniSearch: option "fields" must be provided');
    }
    const autoVacuum = options.autoVacuum == null || options.autoVacuum === true ? defaultAutoVacuumOptions : options.autoVacuum;
    this._options = {
      ...defaultOptions,
      ...options,
      autoVacuum,
      searchOptions: { ...defaultSearchOptions, ...options.searchOptions || {} },
      autoSuggestOptions: { ...defaultAutoSuggestOptions, ...options.autoSuggestOptions || {} }
    };
    this._index = new SearchableMap();
    this._documentCount = 0;
    this._documentIds = /* @__PURE__ */ new Map();
    this._idToShortId = /* @__PURE__ */ new Map();
    this._fieldIds = {};
    this._fieldLength = /* @__PURE__ */ new Map();
    this._avgFieldLength = [];
    this._nextId = 0;
    this._storedFields = /* @__PURE__ */ new Map();
    this._dirtCount = 0;
    this._currentVacuum = null;
    this._enqueuedVacuum = null;
    this._enqueuedVacuumConditions = defaultVacuumConditions;
    this.addFields(this._options.fields);
  }
  /**
   * Adds a document to the index
   *
   * @param document  The document to be indexed
   */
  add(document2) {
    const { extractField, stringifyField, tokenize, processTerm, fields, idField } = this._options;
    const id = extractField(document2, idField);
    if (id == null) {
      throw new Error(`MiniSearch: document does not have ID field "${idField}"`);
    }
    if (this._idToShortId.has(id)) {
      throw new Error(`MiniSearch: duplicate ID ${id}`);
    }
    const shortDocumentId = this.addDocumentId(id);
    this.saveStoredFields(shortDocumentId, document2);
    for (const field of fields) {
      const fieldValue = extractField(document2, field);
      if (fieldValue == null)
        continue;
      const tokens = tokenize(stringifyField(fieldValue, field), field);
      const fieldId = this._fieldIds[field];
      const uniqueTerms2 = new Set(tokens).size;
      this.addFieldLength(shortDocumentId, fieldId, this._documentCount - 1, uniqueTerms2);
      for (const term of tokens) {
        const processedTerm = processTerm(term, field);
        if (Array.isArray(processedTerm)) {
          for (const t3 of processedTerm) {
            this.addTerm(fieldId, shortDocumentId, t3);
          }
        } else if (processedTerm) {
          this.addTerm(fieldId, shortDocumentId, processedTerm);
        }
      }
    }
  }
  /**
   * Adds all the given documents to the index
   *
   * @param documents  An array of documents to be indexed
   */
  addAll(documents) {
    for (const document2 of documents)
      this.add(document2);
  }
  /**
   * Adds all the given documents to the index asynchronously.
   *
   * Returns a promise that resolves (to `undefined`) when the indexing is done.
   * This method is useful when index many documents, to avoid blocking the main
   * thread. The indexing is performed asynchronously and in chunks.
   *
   * @param documents  An array of documents to be indexed
   * @param options  Configuration options
   * @return A promise resolving to `undefined` when the indexing is done
   */
  addAllAsync(documents, options = {}) {
    const { chunkSize = 10 } = options;
    const acc = { chunk: [], promise: Promise.resolve() };
    const { chunk, promise } = documents.reduce(({ chunk: chunk2, promise: promise2 }, document2, i3) => {
      chunk2.push(document2);
      if ((i3 + 1) % chunkSize === 0) {
        return {
          chunk: [],
          promise: promise2.then(() => new Promise((resolve) => setTimeout(resolve, 0))).then(() => this.addAll(chunk2))
        };
      } else {
        return { chunk: chunk2, promise: promise2 };
      }
    }, acc);
    return promise.then(() => this.addAll(chunk));
  }
  /**
   * Removes the given document from the index.
   *
   * The document to remove must NOT have changed between indexing and removal,
   * otherwise the index will be corrupted.
   *
   * This method requires passing the full document to be removed (not just the
   * ID), and immediately removes the document from the inverted index, allowing
   * memory to be released. A convenient alternative is {@link
   * MiniSearch#discard}, which needs only the document ID, and has the same
   * visible effect, but delays cleaning up the index until the next vacuuming.
   *
   * @param document  The document to be removed
   */
  remove(document2) {
    const { tokenize, processTerm, extractField, stringifyField, fields, idField } = this._options;
    const id = extractField(document2, idField);
    if (id == null) {
      throw new Error(`MiniSearch: document does not have ID field "${idField}"`);
    }
    const shortId = this._idToShortId.get(id);
    if (shortId == null) {
      throw new Error(`MiniSearch: cannot remove document with ID ${id}: it is not in the index`);
    }
    for (const field of fields) {
      const fieldValue = extractField(document2, field);
      if (fieldValue == null)
        continue;
      const tokens = tokenize(stringifyField(fieldValue, field), field);
      const fieldId = this._fieldIds[field];
      const uniqueTerms2 = new Set(tokens).size;
      this.removeFieldLength(shortId, fieldId, this._documentCount, uniqueTerms2);
      for (const term of tokens) {
        const processedTerm = processTerm(term, field);
        if (Array.isArray(processedTerm)) {
          for (const t3 of processedTerm) {
            this.removeTerm(fieldId, shortId, t3);
          }
        } else if (processedTerm) {
          this.removeTerm(fieldId, shortId, processedTerm);
        }
      }
    }
    this._storedFields.delete(shortId);
    this._documentIds.delete(shortId);
    this._idToShortId.delete(id);
    this._fieldLength.delete(shortId);
    this._documentCount -= 1;
  }
  /**
   * Removes all the given documents from the index. If called with no arguments,
   * it removes _all_ documents from the index.
   *
   * @param documents  The documents to be removed. If this argument is omitted,
   * all documents are removed. Note that, for removing all documents, it is
   * more efficient to call this method with no arguments than to pass all
   * documents.
   */
  removeAll(documents) {
    if (documents) {
      for (const document2 of documents)
        this.remove(document2);
    } else if (arguments.length > 0) {
      throw new Error("Expected documents to be present. Omit the argument to remove all documents.");
    } else {
      this._index = new SearchableMap();
      this._documentCount = 0;
      this._documentIds = /* @__PURE__ */ new Map();
      this._idToShortId = /* @__PURE__ */ new Map();
      this._fieldLength = /* @__PURE__ */ new Map();
      this._avgFieldLength = [];
      this._storedFields = /* @__PURE__ */ new Map();
      this._nextId = 0;
    }
  }
  /**
   * Discards the document with the given ID, so it won't appear in search results
   *
   * It has the same visible effect of {@link MiniSearch.remove} (both cause the
   * document to stop appearing in searches), but a different effect on the
   * internal data structures:
   *
   *   - {@link MiniSearch#remove} requires passing the full document to be
   *   removed as argument, and removes it from the inverted index immediately.
   *
   *   - {@link MiniSearch#discard} instead only needs the document ID, and
   *   works by marking the current version of the document as discarded, so it
   *   is immediately ignored by searches. This is faster and more convenient
   *   than {@link MiniSearch#remove}, but the index is not immediately
   *   modified. To take care of that, vacuuming is performed after a certain
   *   number of documents are discarded, cleaning up the index and allowing
   *   memory to be released.
   *
   * After discarding a document, it is possible to re-add a new version, and
   * only the new version will appear in searches. In other words, discarding
   * and re-adding a document works exactly like removing and re-adding it. The
   * {@link MiniSearch.replace} method can also be used to replace a document
   * with a new version.
   *
   * #### Details about vacuuming
   *
   * Repetite calls to this method would leave obsolete document references in
   * the index, invisible to searches. Two mechanisms take care of cleaning up:
   * clean up during search, and vacuuming.
   *
   *   - Upon search, whenever a discarded ID is found (and ignored for the
   *   results), references to the discarded document are removed from the
   *   inverted index entries for the search terms. This ensures that subsequent
   *   searches for the same terms do not need to skip these obsolete references
   *   again.
   *
   *   - In addition, vacuuming is performed automatically by default (see the
   *   `autoVacuum` field in {@link Options}) after a certain number of
   *   documents are discarded. Vacuuming traverses all terms in the index,
   *   cleaning up all references to discarded documents. Vacuuming can also be
   *   triggered manually by calling {@link MiniSearch#vacuum}.
   *
   * @param id  The ID of the document to be discarded
   */
  discard(id) {
    const shortId = this._idToShortId.get(id);
    if (shortId == null) {
      throw new Error(`MiniSearch: cannot discard document with ID ${id}: it is not in the index`);
    }
    this._idToShortId.delete(id);
    this._documentIds.delete(shortId);
    this._storedFields.delete(shortId);
    (this._fieldLength.get(shortId) || []).forEach((fieldLength, fieldId) => {
      this.removeFieldLength(shortId, fieldId, this._documentCount, fieldLength);
    });
    this._fieldLength.delete(shortId);
    this._documentCount -= 1;
    this._dirtCount += 1;
    this.maybeAutoVacuum();
  }
  maybeAutoVacuum() {
    if (this._options.autoVacuum === false) {
      return;
    }
    const { minDirtFactor, minDirtCount, batchSize, batchWait } = this._options.autoVacuum;
    this.conditionalVacuum({ batchSize, batchWait }, { minDirtCount, minDirtFactor });
  }
  /**
   * Discards the documents with the given IDs, so they won't appear in search
   * results
   *
   * It is equivalent to calling {@link MiniSearch#discard} for all the given
   * IDs, but with the optimization of triggering at most one automatic
   * vacuuming at the end.
   *
   * Note: to remove all documents from the index, it is faster and more
   * convenient to call {@link MiniSearch.removeAll} with no argument, instead
   * of passing all IDs to this method.
   */
  discardAll(ids) {
    const autoVacuum = this._options.autoVacuum;
    try {
      this._options.autoVacuum = false;
      for (const id of ids) {
        this.discard(id);
      }
    } finally {
      this._options.autoVacuum = autoVacuum;
    }
    this.maybeAutoVacuum();
  }
  /**
   * It replaces an existing document with the given updated version
   *
   * It works by discarding the current version and adding the updated one, so
   * it is functionally equivalent to calling {@link MiniSearch#discard}
   * followed by {@link MiniSearch#add}. The ID of the updated document should
   * be the same as the original one.
   *
   * Since it uses {@link MiniSearch#discard} internally, this method relies on
   * vacuuming to clean up obsolete document references from the index, allowing
   * memory to be released (see {@link MiniSearch#discard}).
   *
   * @param updatedDocument  The updated document to replace the old version
   * with
   */
  replace(updatedDocument) {
    const { idField, extractField } = this._options;
    const id = extractField(updatedDocument, idField);
    this.discard(id);
    this.add(updatedDocument);
  }
  /**
   * Triggers a manual vacuuming, cleaning up references to discarded documents
   * from the inverted index
   *
   * Vacuuming is only useful for applications that use the {@link
   * MiniSearch#discard} or {@link MiniSearch#replace} methods.
   *
   * By default, vacuuming is performed automatically when needed (controlled by
   * the `autoVacuum` field in {@link Options}), so there is usually no need to
   * call this method, unless one wants to make sure to perform vacuuming at a
   * specific moment.
   *
   * Vacuuming traverses all terms in the inverted index in batches, and cleans
   * up references to discarded documents from the posting list, allowing memory
   * to be released.
   *
   * The method takes an optional object as argument with the following keys:
   *
   *   - `batchSize`: the size of each batch (1000 by default)
   *
   *   - `batchWait`: the number of milliseconds to wait between batches (10 by
   *   default)
   *
   * On large indexes, vacuuming could have a non-negligible cost: batching
   * avoids blocking the thread for long, diluting this cost so that it is not
   * negatively affecting the application. Nonetheless, this method should only
   * be called when necessary, and relying on automatic vacuuming is usually
   * better.
   *
   * It returns a promise that resolves (to undefined) when the clean up is
   * completed. If vacuuming is already ongoing at the time this method is
   * called, a new one is enqueued immediately after the ongoing one, and a
   * corresponding promise is returned. However, no more than one vacuuming is
   * enqueued on top of the ongoing one, even if this method is called more
   * times (enqueuing multiple ones would be useless).
   *
   * @param options  Configuration options for the batch size and delay. See
   * {@link VacuumOptions}.
   */
  vacuum(options = {}) {
    return this.conditionalVacuum(options);
  }
  conditionalVacuum(options, conditions) {
    if (this._currentVacuum) {
      this._enqueuedVacuumConditions = this._enqueuedVacuumConditions && conditions;
      if (this._enqueuedVacuum != null) {
        return this._enqueuedVacuum;
      }
      this._enqueuedVacuum = this._currentVacuum.then(() => {
        const conditions2 = this._enqueuedVacuumConditions;
        this._enqueuedVacuumConditions = defaultVacuumConditions;
        return this.performVacuuming(options, conditions2);
      });
      return this._enqueuedVacuum;
    }
    if (this.vacuumConditionsMet(conditions) === false) {
      return Promise.resolve();
    }
    this._currentVacuum = this.performVacuuming(options);
    return this._currentVacuum;
  }
  async performVacuuming(options, conditions) {
    const initialDirtCount = this._dirtCount;
    if (this.vacuumConditionsMet(conditions)) {
      const batchSize = options.batchSize || defaultVacuumOptions.batchSize;
      const batchWait = options.batchWait || defaultVacuumOptions.batchWait;
      let i3 = 1;
      for (const [term, fieldsData] of this._index) {
        for (const [fieldId, fieldIndex] of fieldsData) {
          for (const [shortId] of fieldIndex) {
            if (this._documentIds.has(shortId)) {
              continue;
            }
            if (fieldIndex.size <= 1) {
              fieldsData.delete(fieldId);
            } else {
              fieldIndex.delete(shortId);
            }
          }
        }
        if (this._index.get(term).size === 0) {
          this._index.delete(term);
        }
        if (i3 % batchSize === 0) {
          await new Promise((resolve) => setTimeout(resolve, batchWait));
        }
        i3 += 1;
      }
      this._dirtCount -= initialDirtCount;
    }
    await null;
    this._currentVacuum = this._enqueuedVacuum;
    this._enqueuedVacuum = null;
  }
  vacuumConditionsMet(conditions) {
    if (conditions == null) {
      return true;
    }
    let { minDirtCount, minDirtFactor } = conditions;
    minDirtCount = minDirtCount || defaultAutoVacuumOptions.minDirtCount;
    minDirtFactor = minDirtFactor || defaultAutoVacuumOptions.minDirtFactor;
    return this.dirtCount >= minDirtCount && this.dirtFactor >= minDirtFactor;
  }
  /**
   * Is `true` if a vacuuming operation is ongoing, `false` otherwise
   */
  get isVacuuming() {
    return this._currentVacuum != null;
  }
  /**
   * The number of documents discarded since the most recent vacuuming
   */
  get dirtCount() {
    return this._dirtCount;
  }
  /**
   * A number between 0 and 1 giving an indication about the proportion of
   * documents that are discarded, and can therefore be cleaned up by vacuuming.
   * A value close to 0 means that the index is relatively clean, while a higher
   * value means that the index is relatively dirty, and vacuuming could release
   * memory.
   */
  get dirtFactor() {
    return this._dirtCount / (1 + this._documentCount + this._dirtCount);
  }
  /**
   * Returns `true` if a document with the given ID is present in the index and
   * available for search, `false` otherwise
   *
   * @param id  The document ID
   */
  has(id) {
    return this._idToShortId.has(id);
  }
  /**
   * Returns the stored fields (as configured in the `storeFields` constructor
   * option) for the given document ID. Returns `undefined` if the document is
   * not present in the index.
   *
   * @param id  The document ID
   */
  getStoredFields(id) {
    const shortId = this._idToShortId.get(id);
    if (shortId == null) {
      return void 0;
    }
    return this._storedFields.get(shortId);
  }
  /**
   * Search for documents matching the given search query.
   *
   * The result is a list of scored document IDs matching the query, sorted by
   * descending score, and each including data about which terms were matched and
   * in which fields.
   *
   * ### Basic usage:
   *
   * ```javascript
   * // Search for "zen art motorcycle" with default options: terms have to match
   * // exactly, and individual terms are joined with OR
   * miniSearch.search('zen art motorcycle')
   * // => [ { id: 2, score: 2.77258, match: { ... } }, { id: 4, score: 1.38629, match: { ... } } ]
   * ```
   *
   * ### Restrict search to specific fields:
   *
   * ```javascript
   * // Search only in the 'title' field
   * miniSearch.search('zen', { fields: ['title'] })
   * ```
   *
   * ### Field boosting:
   *
   * ```javascript
   * // Boost a field
   * miniSearch.search('zen', { boost: { title: 2 } })
   * ```
   *
   * ### Prefix search:
   *
   * ```javascript
   * // Search for "moto" with prefix search (it will match documents
   * // containing terms that start with "moto" or "neuro")
   * miniSearch.search('moto neuro', { prefix: true })
   * ```
   *
   * ### Fuzzy search:
   *
   * ```javascript
   * // Search for "ismael" with fuzzy search (it will match documents containing
   * // terms similar to "ismael", with a maximum edit distance of 0.2 term.length
   * // (rounded to nearest integer)
   * miniSearch.search('ismael', { fuzzy: 0.2 })
   * ```
   *
   * ### Combining strategies:
   *
   * ```javascript
   * // Mix of exact match, prefix search, and fuzzy search
   * miniSearch.search('ismael mob', {
   *  prefix: true,
   *  fuzzy: 0.2
   * })
   * ```
   *
   * ### Advanced prefix and fuzzy search:
   *
   * ```javascript
   * // Perform fuzzy and prefix search depending on the search term. Here
   * // performing prefix and fuzzy search only on terms longer than 3 characters
   * miniSearch.search('ismael mob', {
   *  prefix: term => term.length > 3
   *  fuzzy: term => term.length > 3 ? 0.2 : null
   * })
   * ```
   *
   * ### Combine with AND:
   *
   * ```javascript
   * // Combine search terms with AND (to match only documents that contain both
   * // "motorcycle" and "art")
   * miniSearch.search('motorcycle art', { combineWith: 'AND' })
   * ```
   *
   * ### Combine with AND_NOT:
   *
   * There is also an AND_NOT combinator, that finds documents that match the
   * first term, but do not match any of the other terms. This combinator is
   * rarely useful with simple queries, and is meant to be used with advanced
   * query combinations (see later for more details).
   *
   * ### Filtering results:
   *
   * ```javascript
   * // Filter only results in the 'fiction' category (assuming that 'category'
   * // is a stored field)
   * miniSearch.search('motorcycle art', {
   *   filter: (result) => result.category === 'fiction'
   * })
   * ```
   *
   * ### Wildcard query
   *
   * Searching for an empty string (assuming the default tokenizer) returns no
   * results. Sometimes though, one needs to match all documents, like in a
   * "wildcard" search. This is possible by passing the special value
   * {@link MiniSearch.wildcard} as the query:
   *
   * ```javascript
   * // Return search results for all documents
   * miniSearch.search(MiniSearch.wildcard)
   * ```
   *
   * Note that search options such as `filter` and `boostDocument` are still
   * applied, influencing which results are returned, and their order:
   *
   * ```javascript
   * // Return search results for all documents in the 'fiction' category
   * miniSearch.search(MiniSearch.wildcard, {
   *   filter: (result) => result.category === 'fiction'
   * })
   * ```
   *
   * ### Advanced combination of queries:
   *
   * It is possible to combine different subqueries with OR, AND, and AND_NOT,
   * and even with different search options, by passing a query expression
   * tree object as the first argument, instead of a string.
   *
   * ```javascript
   * // Search for documents that contain "zen" and ("motorcycle" or "archery")
   * miniSearch.search({
   *   combineWith: 'AND',
   *   queries: [
   *     'zen',
   *     {
   *       combineWith: 'OR',
   *       queries: ['motorcycle', 'archery']
   *     }
   *   ]
   * })
   *
   * // Search for documents that contain ("apple" or "pear") but not "juice" and
   * // not "tree"
   * miniSearch.search({
   *   combineWith: 'AND_NOT',
   *   queries: [
   *     {
   *       combineWith: 'OR',
   *       queries: ['apple', 'pear']
   *     },
   *     'juice',
   *     'tree'
   *   ]
   * })
   * ```
   *
   * Each node in the expression tree can be either a string, or an object that
   * supports all {@link SearchOptions} fields, plus a `queries` array field for
   * subqueries.
   *
   * Note that, while this can become complicated to do by hand for complex or
   * deeply nested queries, it provides a formalized expression tree API for
   * external libraries that implement a parser for custom query languages.
   *
   * @param query  Search query
   * @param searchOptions  Search options. Each option, if not given, defaults to the corresponding value of `searchOptions` given to the constructor, or to the library default.
   */
  search(query, searchOptions = {}) {
    const { searchOptions: globalSearchOptions } = this._options;
    const searchOptionsWithDefaults = { ...globalSearchOptions, ...searchOptions };
    const rawResults = this.executeQuery(query, searchOptions);
    const results = [];
    for (const [docId, { score, terms, match }] of rawResults) {
      const quality = terms.length || 1;
      const result2 = {
        id: this._documentIds.get(docId),
        score: score * quality,
        terms: Object.keys(match),
        queryTerms: terms,
        match
      };
      Object.assign(result2, this._storedFields.get(docId));
      if (searchOptionsWithDefaults.filter == null || searchOptionsWithDefaults.filter(result2)) {
        results.push(result2);
      }
    }
    if (query === _MiniSearch.wildcard && searchOptionsWithDefaults.boostDocument == null) {
      return results;
    }
    results.sort(byScore);
    return results;
  }
  /**
   * Provide suggestions for the given search query
   *
   * The result is a list of suggested modified search queries, derived from the
   * given search query, each with a relevance score, sorted by descending score.
   *
   * By default, it uses the same options used for search, except that by
   * default it performs prefix search on the last term of the query, and
   * combine terms with `'AND'` (requiring all query terms to match). Custom
   * options can be passed as a second argument. Defaults can be changed upon
   * calling the {@link MiniSearch} constructor, by passing a
   * `autoSuggestOptions` option.
   *
   * ### Basic usage:
   *
   * ```javascript
   * // Get suggestions for 'neuro':
   * miniSearch.autoSuggest('neuro')
   * // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 0.46240 } ]
   * ```
   *
   * ### Multiple words:
   *
   * ```javascript
   * // Get suggestions for 'zen ar':
   * miniSearch.autoSuggest('zen ar')
   * // => [
   * //  { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
   * //  { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 }
   * // ]
   * ```
   *
   * ### Fuzzy suggestions:
   *
   * ```javascript
   * // Correct spelling mistakes using fuzzy search:
   * miniSearch.autoSuggest('neromancer', { fuzzy: 0.2 })
   * // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 1.03998 } ]
   * ```
   *
   * ### Filtering:
   *
   * ```javascript
   * // Get suggestions for 'zen ar', but only within the 'fiction' category
   * // (assuming that 'category' is a stored field):
   * miniSearch.autoSuggest('zen ar', {
   *   filter: (result) => result.category === 'fiction'
   * })
   * // => [
   * //  { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
   * //  { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 }
   * // ]
   * ```
   *
   * @param queryString  Query string to be expanded into suggestions
   * @param options  Search options. The supported options and default values
   * are the same as for the {@link MiniSearch#search} method, except that by
   * default prefix search is performed on the last term in the query, and terms
   * are combined with `'AND'`.
   * @return  A sorted array of suggestions sorted by relevance score.
   */
  autoSuggest(queryString, options = {}) {
    options = { ...this._options.autoSuggestOptions, ...options };
    const suggestions = /* @__PURE__ */ new Map();
    for (const { score, terms } of this.search(queryString, options)) {
      const phrase = terms.join(" ");
      const suggestion = suggestions.get(phrase);
      if (suggestion != null) {
        suggestion.score += score;
        suggestion.count += 1;
      } else {
        suggestions.set(phrase, { score, terms, count: 1 });
      }
    }
    const results = [];
    for (const [suggestion, { score, terms, count }] of suggestions) {
      results.push({ suggestion, terms, score: score / count });
    }
    results.sort(byScore);
    return results;
  }
  /**
   * Total number of documents available to search
   */
  get documentCount() {
    return this._documentCount;
  }
  /**
   * Number of terms in the index
   */
  get termCount() {
    return this._index.size;
  }
  /**
   * Deserializes a JSON index (serialized with `JSON.stringify(miniSearch)`)
   * and instantiates a MiniSearch instance. It should be given the same options
   * originally used when serializing the index.
   *
   * ### Usage:
   *
   * ```javascript
   * // If the index was serialized with:
   * let miniSearch = new MiniSearch({ fields: ['title', 'text'] })
   * miniSearch.addAll(documents)
   *
   * const json = JSON.stringify(miniSearch)
   * // It can later be deserialized like this:
   * miniSearch = MiniSearch.loadJSON(json, { fields: ['title', 'text'] })
   * ```
   *
   * @param json  JSON-serialized index
   * @param options  configuration options, same as the constructor
   * @return An instance of MiniSearch deserialized from the given JSON.
   */
  static loadJSON(json, options) {
    if (options == null) {
      throw new Error("MiniSearch: loadJSON should be given the same options used when serializing the index");
    }
    return this.loadJS(JSON.parse(json), options);
  }
  /**
   * Async equivalent of {@link MiniSearch.loadJSON}
   *
   * This function is an alternative to {@link MiniSearch.loadJSON} that returns
   * a promise, and loads the index in batches, leaving pauses between them to avoid
   * blocking the main thread. It tends to be slower than the synchronous
   * version, but does not block the main thread, so it can be a better choice
   * when deserializing very large indexes.
   *
   * @param json  JSON-serialized index
   * @param options  configuration options, same as the constructor
   * @return A Promise that will resolve to an instance of MiniSearch deserialized from the given JSON.
   */
  static async loadJSONAsync(json, options) {
    if (options == null) {
      throw new Error("MiniSearch: loadJSON should be given the same options used when serializing the index");
    }
    return this.loadJSAsync(JSON.parse(json), options);
  }
  /**
   * Returns the default value of an option. It will throw an error if no option
   * with the given name exists.
   *
   * @param optionName  Name of the option
   * @return The default value of the given option
   *
   * ### Usage:
   *
   * ```javascript
   * // Get default tokenizer
   * MiniSearch.getDefault('tokenize')
   *
   * // Get default term processor
   * MiniSearch.getDefault('processTerm')
   *
   * // Unknown options will throw an error
   * MiniSearch.getDefault('notExisting')
   * // => throws 'MiniSearch: unknown option "notExisting"'
   * ```
   */
  static getDefault(optionName) {
    if (defaultOptions.hasOwnProperty(optionName)) {
      return getOwnProperty(defaultOptions, optionName);
    } else {
      throw new Error(`MiniSearch: unknown option "${optionName}"`);
    }
  }
  /**
   * @ignore
   */
  static loadJS(js, options) {
    const { index, documentIds, fieldLength, storedFields, serializationVersion } = js;
    const miniSearch = this.instantiateMiniSearch(js, options);
    miniSearch._documentIds = objectToNumericMap(documentIds);
    miniSearch._fieldLength = objectToNumericMap(fieldLength);
    miniSearch._storedFields = objectToNumericMap(storedFields);
    for (const [shortId, id] of miniSearch._documentIds) {
      miniSearch._idToShortId.set(id, shortId);
    }
    for (const [term, data] of index) {
      const dataMap = /* @__PURE__ */ new Map();
      for (const fieldId of Object.keys(data)) {
        let indexEntry = data[fieldId];
        if (serializationVersion === 1) {
          indexEntry = indexEntry.ds;
        }
        dataMap.set(parseInt(fieldId, 10), objectToNumericMap(indexEntry));
      }
      miniSearch._index.set(term, dataMap);
    }
    return miniSearch;
  }
  /**
   * @ignore
   */
  static async loadJSAsync(js, options) {
    const { index, documentIds, fieldLength, storedFields, serializationVersion } = js;
    const miniSearch = this.instantiateMiniSearch(js, options);
    miniSearch._documentIds = await objectToNumericMapAsync(documentIds);
    miniSearch._fieldLength = await objectToNumericMapAsync(fieldLength);
    miniSearch._storedFields = await objectToNumericMapAsync(storedFields);
    for (const [shortId, id] of miniSearch._documentIds) {
      miniSearch._idToShortId.set(id, shortId);
    }
    let count = 0;
    for (const [term, data] of index) {
      const dataMap = /* @__PURE__ */ new Map();
      for (const fieldId of Object.keys(data)) {
        let indexEntry = data[fieldId];
        if (serializationVersion === 1) {
          indexEntry = indexEntry.ds;
        }
        dataMap.set(parseInt(fieldId, 10), await objectToNumericMapAsync(indexEntry));
      }
      if (++count % 1e3 === 0)
        await wait(0);
      miniSearch._index.set(term, dataMap);
    }
    return miniSearch;
  }
  /**
   * @ignore
   */
  static instantiateMiniSearch(js, options) {
    const { documentCount, nextId, fieldIds, averageFieldLength, dirtCount, serializationVersion } = js;
    if (serializationVersion !== 1 && serializationVersion !== 2) {
      throw new Error("MiniSearch: cannot deserialize an index created with an incompatible version");
    }
    const miniSearch = new _MiniSearch(options);
    miniSearch._documentCount = documentCount;
    miniSearch._nextId = nextId;
    miniSearch._idToShortId = /* @__PURE__ */ new Map();
    miniSearch._fieldIds = fieldIds;
    miniSearch._avgFieldLength = averageFieldLength;
    miniSearch._dirtCount = dirtCount || 0;
    miniSearch._index = new SearchableMap();
    return miniSearch;
  }
  /**
   * @ignore
   */
  executeQuery(query, searchOptions = {}) {
    if (query === _MiniSearch.wildcard) {
      return this.executeWildcardQuery(searchOptions);
    }
    if (typeof query !== "string") {
      const options2 = { ...searchOptions, ...query, queries: void 0 };
      const results2 = query.queries.map((subquery) => this.executeQuery(subquery, options2));
      return this.combineResults(results2, options2.combineWith);
    }
    const { tokenize, processTerm, searchOptions: globalSearchOptions } = this._options;
    const options = { tokenize, processTerm, ...globalSearchOptions, ...searchOptions };
    const { tokenize: searchTokenize, processTerm: searchProcessTerm } = options;
    const terms = searchTokenize(query).flatMap((term) => searchProcessTerm(term)).filter((term) => !!term);
    const queries = terms.map(termToQuerySpec(options));
    const results = queries.map((query2) => this.executeQuerySpec(query2, options));
    return this.combineResults(results, options.combineWith);
  }
  /**
   * @ignore
   */
  executeQuerySpec(query, searchOptions) {
    const options = { ...this._options.searchOptions, ...searchOptions };
    const boosts = (options.fields || this._options.fields).reduce((boosts2, field) => ({ ...boosts2, [field]: getOwnProperty(options.boost, field) || 1 }), {});
    const { boostDocument, weights, maxFuzzy, bm25: bm25params } = options;
    const { fuzzy: fuzzyWeight, prefix: prefixWeight } = { ...defaultSearchOptions.weights, ...weights };
    const data = this._index.get(query.term);
    const results = this.termResults(query.term, query.term, 1, query.termBoost, data, boosts, boostDocument, bm25params);
    let prefixMatches;
    let fuzzyMatches;
    if (query.prefix) {
      prefixMatches = this._index.atPrefix(query.term);
    }
    if (query.fuzzy) {
      const fuzzy = query.fuzzy === true ? 0.2 : query.fuzzy;
      const maxDistance = fuzzy < 1 ? Math.min(maxFuzzy, Math.round(query.term.length * fuzzy)) : fuzzy;
      if (maxDistance)
        fuzzyMatches = this._index.fuzzyGet(query.term, maxDistance);
    }
    if (prefixMatches) {
      for (const [term, data2] of prefixMatches) {
        const distance = term.length - query.term.length;
        if (!distance) {
          continue;
        }
        fuzzyMatches === null || fuzzyMatches === void 0 ? void 0 : fuzzyMatches.delete(term);
        const weight = prefixWeight * term.length / (term.length + 0.3 * distance);
        this.termResults(query.term, term, weight, query.termBoost, data2, boosts, boostDocument, bm25params, results);
      }
    }
    if (fuzzyMatches) {
      for (const term of fuzzyMatches.keys()) {
        const [data2, distance] = fuzzyMatches.get(term);
        if (!distance) {
          continue;
        }
        const weight = fuzzyWeight * term.length / (term.length + distance);
        this.termResults(query.term, term, weight, query.termBoost, data2, boosts, boostDocument, bm25params, results);
      }
    }
    return results;
  }
  /**
   * @ignore
   */
  executeWildcardQuery(searchOptions) {
    const results = /* @__PURE__ */ new Map();
    const options = { ...this._options.searchOptions, ...searchOptions };
    for (const [shortId, id] of this._documentIds) {
      const score = options.boostDocument ? options.boostDocument(id, "", this._storedFields.get(shortId)) : 1;
      results.set(shortId, {
        score,
        terms: [],
        match: {}
      });
    }
    return results;
  }
  /**
   * @ignore
   */
  combineResults(results, combineWith = OR) {
    if (results.length === 0) {
      return /* @__PURE__ */ new Map();
    }
    const operator = combineWith.toLowerCase();
    const combinator = combinators[operator];
    if (!combinator) {
      throw new Error(`Invalid combination operator: ${combineWith}`);
    }
    return results.reduce(combinator) || /* @__PURE__ */ new Map();
  }
  /**
   * Allows serialization of the index to JSON, to possibly store it and later
   * deserialize it with {@link MiniSearch.loadJSON}.
   *
   * Normally one does not directly call this method, but rather call the
   * standard JavaScript `JSON.stringify()` passing the {@link MiniSearch}
   * instance, and JavaScript will internally call this method. Upon
   * deserialization, one must pass to {@link MiniSearch.loadJSON} the same
   * options used to create the original instance that was serialized.
   *
   * ### Usage:
   *
   * ```javascript
   * // Serialize the index:
   * let miniSearch = new MiniSearch({ fields: ['title', 'text'] })
   * miniSearch.addAll(documents)
   * const json = JSON.stringify(miniSearch)
   *
   * // Later, to deserialize it:
   * miniSearch = MiniSearch.loadJSON(json, { fields: ['title', 'text'] })
   * ```
   *
   * @return A plain-object serializable representation of the search index.
   */
  toJSON() {
    const index = [];
    for (const [term, fieldIndex] of this._index) {
      const data = {};
      for (const [fieldId, freqs] of fieldIndex) {
        data[fieldId] = Object.fromEntries(freqs);
      }
      index.push([term, data]);
    }
    return {
      documentCount: this._documentCount,
      nextId: this._nextId,
      documentIds: Object.fromEntries(this._documentIds),
      fieldIds: this._fieldIds,
      fieldLength: Object.fromEntries(this._fieldLength),
      averageFieldLength: this._avgFieldLength,
      storedFields: Object.fromEntries(this._storedFields),
      dirtCount: this._dirtCount,
      index,
      serializationVersion: 2
    };
  }
  /**
   * @ignore
   */
  termResults(sourceTerm, derivedTerm, termWeight, termBoost, fieldTermData, fieldBoosts, boostDocumentFn, bm25params, results = /* @__PURE__ */ new Map()) {
    if (fieldTermData == null)
      return results;
    for (const field of Object.keys(fieldBoosts)) {
      const fieldBoost = fieldBoosts[field];
      const fieldId = this._fieldIds[field];
      const fieldTermFreqs = fieldTermData.get(fieldId);
      if (fieldTermFreqs == null)
        continue;
      let matchingFields = fieldTermFreqs.size;
      const avgFieldLength = this._avgFieldLength[fieldId];
      for (const docId of fieldTermFreqs.keys()) {
        if (!this._documentIds.has(docId)) {
          this.removeTerm(fieldId, docId, derivedTerm);
          matchingFields -= 1;
          continue;
        }
        const docBoost = boostDocumentFn ? boostDocumentFn(this._documentIds.get(docId), derivedTerm, this._storedFields.get(docId)) : 1;
        if (!docBoost)
          continue;
        const termFreq = fieldTermFreqs.get(docId);
        const fieldLength = this._fieldLength.get(docId)[fieldId];
        const rawScore = calcBM25Score(termFreq, matchingFields, this._documentCount, fieldLength, avgFieldLength, bm25params);
        const weightedScore = termWeight * termBoost * fieldBoost * docBoost * rawScore;
        const result2 = results.get(docId);
        if (result2) {
          result2.score += weightedScore;
          assignUniqueTerm(result2.terms, sourceTerm);
          const match = getOwnProperty(result2.match, derivedTerm);
          if (match) {
            match.push(field);
          } else {
            result2.match[derivedTerm] = [field];
          }
        } else {
          results.set(docId, {
            score: weightedScore,
            terms: [sourceTerm],
            match: { [derivedTerm]: [field] }
          });
        }
      }
    }
    return results;
  }
  /**
   * @ignore
   */
  addTerm(fieldId, documentId, term) {
    const indexData = this._index.fetch(term, createMap);
    let fieldIndex = indexData.get(fieldId);
    if (fieldIndex == null) {
      fieldIndex = /* @__PURE__ */ new Map();
      fieldIndex.set(documentId, 1);
      indexData.set(fieldId, fieldIndex);
    } else {
      const docs = fieldIndex.get(documentId);
      fieldIndex.set(documentId, (docs || 0) + 1);
    }
  }
  /**
   * @ignore
   */
  removeTerm(fieldId, documentId, term) {
    if (!this._index.has(term)) {
      this.warnDocumentChanged(documentId, fieldId, term);
      return;
    }
    const indexData = this._index.fetch(term, createMap);
    const fieldIndex = indexData.get(fieldId);
    if (fieldIndex == null || fieldIndex.get(documentId) == null) {
      this.warnDocumentChanged(documentId, fieldId, term);
    } else if (fieldIndex.get(documentId) <= 1) {
      if (fieldIndex.size <= 1) {
        indexData.delete(fieldId);
      } else {
        fieldIndex.delete(documentId);
      }
    } else {
      fieldIndex.set(documentId, fieldIndex.get(documentId) - 1);
    }
    if (this._index.get(term).size === 0) {
      this._index.delete(term);
    }
  }
  /**
   * @ignore
   */
  warnDocumentChanged(shortDocumentId, fieldId, term) {
    for (const fieldName of Object.keys(this._fieldIds)) {
      if (this._fieldIds[fieldName] === fieldId) {
        this._options.logger("warn", `MiniSearch: document with ID ${this._documentIds.get(shortDocumentId)} has changed before removal: term "${term}" was not present in field "${fieldName}". Removing a document after it has changed can corrupt the index!`, "version_conflict");
        return;
      }
    }
  }
  /**
   * @ignore
   */
  addDocumentId(documentId) {
    const shortDocumentId = this._nextId;
    this._idToShortId.set(documentId, shortDocumentId);
    this._documentIds.set(shortDocumentId, documentId);
    this._documentCount += 1;
    this._nextId += 1;
    return shortDocumentId;
  }
  /**
   * @ignore
   */
  addFields(fields) {
    for (let i3 = 0; i3 < fields.length; i3++) {
      this._fieldIds[fields[i3]] = i3;
    }
  }
  /**
   * @ignore
   */
  addFieldLength(documentId, fieldId, count, length) {
    let fieldLengths = this._fieldLength.get(documentId);
    if (fieldLengths == null)
      this._fieldLength.set(documentId, fieldLengths = []);
    fieldLengths[fieldId] = length;
    const averageFieldLength = this._avgFieldLength[fieldId] || 0;
    const totalFieldLength = averageFieldLength * count + length;
    this._avgFieldLength[fieldId] = totalFieldLength / (count + 1);
  }
  /**
   * @ignore
   */
  removeFieldLength(documentId, fieldId, count, length) {
    if (count === 1) {
      this._avgFieldLength[fieldId] = 0;
      return;
    }
    const totalFieldLength = this._avgFieldLength[fieldId] * count - length;
    this._avgFieldLength[fieldId] = totalFieldLength / (count - 1);
  }
  /**
   * @ignore
   */
  saveStoredFields(documentId, doc) {
    const { storeFields, extractField } = this._options;
    if (storeFields == null || storeFields.length === 0) {
      return;
    }
    let documentFields = this._storedFields.get(documentId);
    if (documentFields == null)
      this._storedFields.set(documentId, documentFields = {});
    for (const fieldName of storeFields) {
      const fieldValue = extractField(doc, fieldName);
      if (fieldValue !== void 0)
        documentFields[fieldName] = fieldValue;
    }
  }
};
MiniSearch.wildcard = Symbol("*");
var getOwnProperty = (object, property) => Object.prototype.hasOwnProperty.call(object, property) ? object[property] : void 0;
var combinators = {
  [OR]: (a3, b2) => {
    for (const docId of b2.keys()) {
      const existing = a3.get(docId);
      if (existing == null) {
        a3.set(docId, b2.get(docId));
      } else {
        const { score, terms, match } = b2.get(docId);
        existing.score = existing.score + score;
        existing.match = Object.assign(existing.match, match);
        assignUniqueTerms(existing.terms, terms);
      }
    }
    return a3;
  },
  [AND]: (a3, b2) => {
    const combined = /* @__PURE__ */ new Map();
    for (const docId of b2.keys()) {
      const existing = a3.get(docId);
      if (existing == null)
        continue;
      const { score, terms, match } = b2.get(docId);
      assignUniqueTerms(existing.terms, terms);
      combined.set(docId, {
        score: existing.score + score,
        terms: existing.terms,
        match: Object.assign(existing.match, match)
      });
    }
    return combined;
  },
  [AND_NOT]: (a3, b2) => {
    for (const docId of b2.keys())
      a3.delete(docId);
    return a3;
  }
};
var defaultBM25params = { k: 1.2, b: 0.7, d: 0.5 };
var calcBM25Score = (termFreq, matchingCount, totalCount, fieldLength, avgFieldLength, bm25params) => {
  const { k: k3, b: b2, d: d3 } = bm25params;
  const invDocFreq = Math.log(1 + (totalCount - matchingCount + 0.5) / (matchingCount + 0.5));
  return invDocFreq * (d3 + termFreq * (k3 + 1) / (termFreq + k3 * (1 - b2 + b2 * fieldLength / avgFieldLength)));
};
var termToQuerySpec = (options) => (term, i3, terms) => {
  const fuzzy = typeof options.fuzzy === "function" ? options.fuzzy(term, i3, terms) : options.fuzzy || false;
  const prefix = typeof options.prefix === "function" ? options.prefix(term, i3, terms) : options.prefix === true;
  const termBoost = typeof options.boostTerm === "function" ? options.boostTerm(term, i3, terms) : 1;
  return { term, fuzzy, prefix, termBoost };
};
var defaultOptions = {
  idField: "id",
  extractField: (document2, fieldName) => document2[fieldName],
  stringifyField: (fieldValue, fieldName) => fieldValue.toString(),
  tokenize: (text2) => text2.split(SPACE_OR_PUNCTUATION),
  processTerm: (term) => term.toLowerCase(),
  fields: void 0,
  searchOptions: void 0,
  storeFields: [],
  logger: (level, message2) => {
    if (typeof (console === null || console === void 0 ? void 0 : console[level]) === "function")
      console[level](message2);
  },
  autoVacuum: true
};
var defaultSearchOptions = {
  combineWith: OR,
  prefix: false,
  fuzzy: false,
  maxFuzzy: 6,
  boost: {},
  weights: { fuzzy: 0.45, prefix: 0.375 },
  bm25: defaultBM25params
};
var defaultAutoSuggestOptions = {
  combineWith: AND,
  prefix: (term, i3, terms) => i3 === terms.length - 1
};
var defaultVacuumOptions = { batchSize: 1e3, batchWait: 10 };
var defaultVacuumConditions = { minDirtFactor: 0.1, minDirtCount: 20 };
var defaultAutoVacuumOptions = { ...defaultVacuumOptions, ...defaultVacuumConditions };
var assignUniqueTerm = (target, term) => {
  if (!target.includes(term))
    target.push(term);
};
var assignUniqueTerms = (target, source) => {
  for (const term of source) {
    if (!target.includes(term))
      target.push(term);
  }
};
var byScore = ({ score: a3 }, { score: b2 }) => b2 - a3;
var createMap = () => /* @__PURE__ */ new Map();
var objectToNumericMap = (object) => {
  const map = /* @__PURE__ */ new Map();
  for (const key of Object.keys(object)) {
    map.set(parseInt(key, 10), object[key]);
  }
  return map;
};
var objectToNumericMapAsync = async (object) => {
  const map = /* @__PURE__ */ new Map();
  let count = 0;
  for (const key of Object.keys(object)) {
    map.set(parseInt(key, 10), object[key]);
    if (++count % 1e3 === 0) {
      await wait(0);
    }
  }
  return map;
};
var wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}]+/u;

// vendor/tavernary-core/src/search-normalization.ts
var FUNCTION_WORDS = /* @__PURE__ */ new Set([
  "a",
  "an",
  "and",
  "for",
  "of",
  "the",
  "to",
  "with"
]);
function separateCamelCase(value) {
  return value.replace(/([\p{Ll}\d])(\p{Lu})/gu, "$1 $2");
}
function normalizeSearchText(value) {
  return separateCamelCase(value).normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/gu, " ");
}
function searchTerms(value) {
  const terms = normalizeSearchText(value).split(" ").filter(Boolean);
  const meaningful = terms.filter((term) => !FUNCTION_WORDS.has(term));
  return meaningful.length > 0 ? meaningful : terms;
}
function searchDocumentTerms(value) {
  const normalizedTerms = normalizeSearchText(value).split(" ").filter(Boolean);
  const compactTerms = value.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().split(/[^\p{L}\p{N}]+/gu).filter(Boolean);
  return [.../* @__PURE__ */ new Set([...normalizedTerms, ...compactTerms])];
}
function searchClauses(value) {
  return value.split("+").map((clause) => searchTerms(clause).join(" ")).filter(Boolean);
}
function searchMeaning(value) {
  return searchClauses(value).join("+");
}
function allowedEditDistance(term) {
  if (term.length < 5) return 0;
  if (term.length < 8) return 1;
  return 2;
}

// vendor/tavernary-core/src/search-types.ts
var SEARCH_FIELD_NAMES = [
  "title",
  "aliases",
  "source",
  "summary",
  "kind",
  "primaryFunction",
  "tags",
  "frontends",
  "compatibility",
  "maintainers",
  "relationships"
];

// vendor/tavernary-core/src/project-search.ts
var FIELD_BOOST = {
  title: 12,
  aliases: 10,
  source: 8,
  summary: 4,
  kind: 5,
  primaryFunction: 5,
  tags: 5,
  frontends: 3,
  compatibility: 3,
  maintainers: 2,
  relationships: 2
};
var EVIDENCE_FIELD_PRIORITY = [
  "title",
  "aliases",
  "maintainers",
  "source",
  "summary",
  "kind",
  "primaryFunction",
  "tags",
  "frontends",
  "compatibility",
  "relationships"
];
function documentText(document2) {
  return SEARCH_FIELD_NAMES.flatMap((field) => document2[field]).join(" ");
}
function tokenSet(value) {
  return new Set(searchDocumentTerms(value));
}
function uniqueTerms(value) {
  return [...new Set(searchTerms(value))];
}
function authorityTier(document2, query) {
  const title = normalizeSearchText(document2.title.join(" "));
  if (title === query) return 5;
  if (document2.aliases.some((value) => normalizeSearchText(value) === query)) {
    return 4;
  }
  if (document2.source.some((value) => normalizeSearchText(value) === query)) {
    return 4;
  }
  if (title.includes(query)) return 3;
  if (uniqueTerms(query).every((term) => tokenSet(title).has(term))) return 2;
  return 0;
}
function proximityBonus(document2, query) {
  const titleTerms = normalizeSearchText(document2.title.join(" ")).split(" ").filter(Boolean);
  const positions = uniqueTerms(query).map((term) => titleTerms.indexOf(term));
  if (positions.length === 0 || positions.some((position) => position < 0)) {
    return 0;
  }
  const span = Math.max(...positions) - Math.min(...positions);
  const gaps = Math.max(0, span - (positions.length - 1));
  return Math.max(0, 99 - gaps);
}
function levenshteinDistance(left, right) {
  const previous = Array.from(
    { length: right.length + 1 },
    (_2, index) => index
  );
  const current = new Array(right.length + 1);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        substitution
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}
function fuzzyForTerm(term) {
  const edits = allowedEditDistance(term);
  return edits === 0 ? false : edits;
}
function prefixForTerm(term) {
  return term.length >= 3;
}
function bestTermMatch(result2, queryTerm) {
  if (result2.terms.includes(queryTerm)) {
    return { kind: "exact", matchedTerm: queryTerm, queryTerm };
  }
  const prefix = result2.terms.filter((term) => term.startsWith(queryTerm)).sort(
    (left, right) => left.length - right.length || left.localeCompare(right)
  ).at(0);
  if (prefix) return { kind: "prefix", matchedTerm: prefix, queryTerm };
  const distanceLimit = allowedEditDistance(queryTerm);
  if (distanceLimit === 0) return null;
  const fuzzy = result2.terms.map((term) => ({
    distance: levenshteinDistance(queryTerm, term),
    term
  })).filter(({ distance }) => distance <= distanceLimit).sort(
    (left, right) => left.distance - right.distance || left.term.localeCompare(right.term)
  ).at(0);
  return fuzzy ? { kind: "fuzzy", matchedTerm: fuzzy.term, queryTerm } : null;
}
function evidenceValue(document2, field, matchedTerm) {
  return document2[field].find((value) => tokenSet(value).has(matchedTerm)) ?? document2[field][0] ?? matchedTerm;
}
function evidenceForResult(document2, result2, query) {
  return uniqueTerms(query).flatMap((queryTerm) => {
    const match = bestTermMatch(result2, queryTerm);
    if (!match) return [];
    const field = EVIDENCE_FIELD_PRIORITY.find(
      (candidate) => result2.match[match.matchedTerm]?.includes(candidate)
    );
    if (!field) return [];
    return [
      {
        field,
        value: evidenceValue(document2, field, match.matchedTerm),
        ...match
      }
    ];
  });
}
function exactEvidence(document2, query) {
  return uniqueTerms(query).flatMap((term) => {
    const field = EVIDENCE_FIELD_PRIORITY.find(
      (candidate) => document2[candidate].some((value) => tokenSet(value).has(term))
    );
    if (!field) return [];
    return [
      {
        field,
        value: evidenceValue(document2, field, term),
        kind: "exact",
        queryTerm: term,
        matchedTerm: term
      }
    ];
  });
}
function matchScore(document2, fullQuery, exactnessTier, miniSearchScore) {
  return exactnessTier * 1e6 + authorityTier(document2, fullQuery) * 1e5 + proximityBonus(document2, fullQuery) * 1e3 + Math.min(miniSearchScore, 999);
}
function reportSearchFailure(message2, error) {
  console.error(message2, error);
}
function degradedFallback(documents, query) {
  return { ...exactAllTermSearch(documents, query), degraded: true };
}
function mergeMatches(matches) {
  const bestById = /* @__PURE__ */ new Map();
  for (const match of matches) {
    const current = bestById.get(match.id);
    if (!current || match.score > current.score) {
      bestById.set(match.id, match);
    }
  }
  return [...bestById.values()].sort(
    (left, right) => right.score - left.score || left.id.localeCompare(right.id)
  );
}
function conservativeCorrection(original, candidate) {
  const originalTerms = uniqueTerms(original);
  const candidateTerms = uniqueTerms(candidate);
  if (originalTerms.length !== candidateTerms.length) return false;
  return originalTerms.every((term, index) => {
    const candidateTerm = candidateTerms[index];
    return candidateTerm !== void 0 && levenshteinDistance(term, candidateTerm) <= allowedEditDistance(term);
  });
}
function correctionForQuery(miniSearch, query) {
  const exactOrPrefix = miniSearch.search(query, {
    combineWith: "AND",
    fuzzy: false,
    prefix: prefixForTerm
  });
  if (exactOrPrefix.length > 0) return null;
  const suggestions = miniSearch.autoSuggest(query, {
    combineWith: "AND",
    fuzzy: fuzzyForTerm,
    maxFuzzy: 2,
    prefix: prefixForTerm
  });
  for (const suggestion of suggestions) {
    const candidate = searchMeaning(suggestion.suggestion);
    if (candidate && candidate !== query && conservativeCorrection(query, candidate) && miniSearch.search(candidate).length > 0) {
      return candidate;
    }
  }
  return null;
}
function exactAllTermSearch(documents, query) {
  const clauses = searchClauses(query);
  const normalizedQuery = clauses.join("+");
  if (!normalizedQuery) {
    return {
      normalizedQuery,
      matches: [],
      correction: null,
      degraded: false
    };
  }
  const matches = mergeMatches(
    clauses.flatMap((clause) => {
      const terms = uniqueTerms(clause);
      const fullQuery = normalizeSearchText(clause);
      return documents.filter((document2) => {
        const tokens = tokenSet(documentText(document2));
        return terms.every((term) => tokens.has(term));
      }).map((document2) => ({
        id: document2.id,
        score: matchScore(document2, fullQuery, 3, 0),
        evidence: exactEvidence(document2, clause)
      }));
    })
  );
  return {
    normalizedQuery,
    matches,
    correction: null,
    degraded: false
  };
}
function createCatalogSearchIndex(documents) {
  const documentsById = new Map(
    documents.map((document2) => [document2.id, document2])
  );
  let miniSearch;
  try {
    miniSearch = new MiniSearch({
      fields: [...SEARCH_FIELD_NAMES],
      storeFields: ["id"],
      extractField: (document2, fieldName) => {
        const value = document2[fieldName];
        return Array.isArray(value) ? value.join(" ") : String(value ?? "");
      },
      tokenize: searchDocumentTerms,
      processTerm: (term) => term,
      searchOptions: {
        boost: FIELD_BOOST,
        combineWith: "AND",
        fuzzy: fuzzyForTerm,
        maxFuzzy: 2,
        prefix: prefixForTerm
      }
    });
    miniSearch.addAll(documents);
  } catch (error) {
    reportSearchFailure(
      "Catalog search initialization failed; using exact-token fallback.",
      error
    );
    return {
      search: (query) => degradedFallback(documents, query)
    };
  }
  return {
    search(query) {
      const clauses = searchClauses(query);
      const normalizedQuery = clauses.join("+");
      if (!normalizedQuery) {
        return {
          normalizedQuery,
          matches: [],
          correction: null,
          degraded: false
        };
      }
      try {
        const matches = mergeMatches(
          clauses.flatMap((clause) => {
            const fullQuery = normalizeSearchText(clause);
            const terms = uniqueTerms(clause);
            return miniSearch.search(clause).flatMap((result2) => {
              const document2 = documentsById.get(String(result2.id));
              if (!document2) return [];
              const termMatches = terms.map((term) => bestTermMatch(result2, term)).filter((match) => match !== null);
              if (termMatches.length !== terms.length) {
                return [];
              }
              const exactnessTier = termMatches.some(
                ({ kind }) => kind === "fuzzy"
              ) ? 1 : termMatches.some(({ kind }) => kind === "prefix") ? 2 : 3;
              return [
                {
                  id: document2.id,
                  score: matchScore(
                    document2,
                    fullQuery,
                    exactnessTier,
                    result2.score
                  ),
                  evidence: evidenceForResult(document2, result2, clause)
                }
              ];
            });
          })
        );
        const correctedClauses = clauses.map(
          (clause) => correctionForQuery(miniSearch, clause) ?? clause
        );
        const correction = correctedClauses.some(
          (clause, index) => clause !== clauses[index]
        ) ? correctedClauses.join("+") : null;
        return {
          normalizedQuery,
          matches,
          correction,
          degraded: false
        };
      } catch (error) {
        reportSearchFailure(
          "Catalog search query failed; using exact-token fallback.",
          error
        );
        return degradedFallback(documents, query);
      }
    }
  };
}

// vendor/tavernary-core/src/kit-selectors.ts
var collator = new Intl.Collator("en", { sensitivity: "base" });
function matchesAny(selected, values) {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}
function compareTitleAndId(left, right) {
  return collator.compare(left.title, right.title) || collator.compare(left.id, right.id);
}
function comparePublished(left, right) {
  return Date.parse(right.publishedAt) - Date.parse(left.publishedAt) || compareTitleAndId(left, right);
}
function kitComparator(sort, searchResults) {
  const scores = new Map(
    searchResults?.matches.map(({ id, score }) => [id, score]) ?? []
  );
  return (left, right) => {
    if (sort === "relevance") {
      return (scores.get(right.id) ?? 0) - (scores.get(left.id) ?? 0) || Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || compareTitleAndId(left, right);
    }
    if (sort === "alphabetical") {
      return compareTitleAndId(left, right);
    }
    if (sort === "newest") {
      return comparePublished(left, right);
    }
    if (sort === "updated") {
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || compareTitleAndId(left, right);
    }
    if (left.trendingScore === null && right.trendingScore === null) {
      return comparePublished(left, right);
    }
    if (left.trendingScore === null) {
      return 1;
    }
    if (right.trendingScore === null) {
      return -1;
    }
    return right.trendingScore - left.trendingScore || comparePublished(left, right);
  };
}
function selectKits(kits, query, search = "", searchResults) {
  const normalized = searchMeaning(search);
  const effectiveSearchResults = searchResults?.normalizedQuery === normalized ? searchResults : exactAllTermSearch(
    kits.map(({ id, search: fields }) => ({ id, ...fields })),
    search
  );
  const matchingKitIds = new Set(
    effectiveSearchResults.matches.map(({ id }) => id)
  );
  return kits.filter((kit) => !normalized || matchingKitIds.has(kit.id)).filter(
    (kit) => matchesAny(
      query.frontends,
      kit.frontends.map(({ id }) => id)
    )
  ).filter(
    (kit) => matchesModelFamilies(
      query.modelFamilies ?? [],
      kit.modelFamilies?.map(({ id }) => id) ?? []
    )
  ).filter(
    (kit) => matchesAny(
      query.purposes,
      kit.purposes.map(({ id }) => id)
    )
  ).filter(
    (kit) => !query.includesProjectId || kit.components.some(
      ({ projectId }) => projectId === query.includesProjectId
    )
  ).filter(
    (kit) => kit.components.length >= query.minProjects && kit.components.length <= query.maxProjects
  ).filter(
    (kit) => !query.allComponentsAvailable || kit.flaggedProjectCount === 0
  ).sort(kitComparator(query.sort, effectiveSearchResults));
}

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

// vendor/tavernary-core/src/catalog-tag-filter.ts
function matchesSelectedTags(selectedIds, projectTagIds, vocabulary) {
  if (selectedIds.length === 0) return true;
  const vocabularyById = new Map(vocabulary.map((tag) => [tag.id, tag]));
  const goals = /* @__PURE__ */ new Set();
  const traits = /* @__PURE__ */ new Set();
  for (const id of new Set(selectedIds)) {
    const definition = vocabularyById.get(id);
    if (!definition) return false;
    (definition.facet === "goal" ? goals : traits).add(id);
  }
  const projectTags = new Set(projectTagIds);
  return (goals.size === 0 || [...goals].some((id) => projectTags.has(id))) && (traits.size === 0 || [...traits].some((id) => projectTags.has(id)));
}

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
function isWithinDays(timestamp, now, days) {
  if (timestamp === null) {
    return false;
  }
  const age = new Date(now).getTime() - new Date(timestamp).getTime();
  return Number.isFinite(age) && age >= 0 && age <= days * DAY_MS;
}
function releaseTimestamp(project) {
  return project.latestReleaseAt ?? project.preset?.publishedAt ?? null;
}

// vendor/tavernary-core/src/catalog-license.ts
function licenseFilter(project) {
  if (project.license.status === "osi-approved") {
    return "open-source";
  }
  return project.license.status;
}

// vendor/tavernary-core/src/project-selectors.ts
var collator2 = new Intl.Collator("en", { sensitivity: "base" });
function matchesAny2(selected, values) {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}
function matchesDevelopment(project, selected, now) {
  return selected.length === 0 || selected.some((filter) => {
    if (filter === "active-month") {
      return isWithinDays(project.activity.latestSourceActivityAt, now, 30);
    }
    if (filter === "new-release") {
      return isWithinDays(releaseTimestamp(project), now, 30);
    }
    return project.activity.dormant;
  });
}
function matchesView(project, view, now) {
  if (view === "active") {
    return isWithinDays(project.activity.latestSourceActivityAt, now, 30);
  }
  if (view === "new") {
    return project.catalogCohort === "standard" && isWithinDays(project.catalogedAt, now, 30);
  }
  if (view === "released") {
    return isWithinDays(releaseTimestamp(project), now, 30);
  }
  return true;
}
function fallbackOrder(left, right) {
  const dateOrder = new Date(right.catalogedAt).getTime() - new Date(left.catalogedAt).getTime();
  return dateOrder || collator2.compare(left.name, right.name) || collator2.compare(left.id, right.id);
}
function nullableDescending(left, right, leftProject, rightProject) {
  if (left === null && right === null) {
    return fallbackOrder(leftProject, rightProject);
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return right - left || collator2.compare(leftProject.name, rightProject.name) || collator2.compare(leftProject.id, rightProject.id);
}
function activityRecency(project) {
  const sourceTime = project.activity.latestSourceActivityAt ? new Date(project.activity.latestSourceActivityAt).getTime() : Number.NEGATIVE_INFINITY;
  const releasedAt = releaseTimestamp(project);
  const releaseTime = releasedAt ? new Date(releasedAt).getTime() : Number.NEGATIVE_INFINITY;
  const recency = Math.max(sourceTime, releaseTime);
  return Number.isFinite(recency) ? recency : null;
}
function sortProjects(projects, sort, searchResults) {
  const scores = new Map(
    searchResults?.matches.map(({ id, score }) => [id, score]) ?? []
  );
  return projects.sort((left, right) => {
    if (sort === "relevance") {
      const scoreOrder = (scores.get(right.id) ?? 0) - (scores.get(left.id) ?? 0);
      if (scoreOrder !== 0) return scoreOrder;
      const leftRecency = activityRecency(left);
      const rightRecency = activityRecency(right);
      if (leftRecency === null && rightRecency !== null) return 1;
      if (leftRecency !== null && rightRecency === null) return -1;
      if (leftRecency !== null && rightRecency !== null && leftRecency !== rightRecency) {
        return rightRecency - leftRecency;
      }
      return collator2.compare(left.name, right.name) || collator2.compare(left.id, right.id);
    }
    if (sort === "alphabetical") {
      return collator2.compare(left.name, right.name) || collator2.compare(left.id, right.id);
    }
    if (sort === "date-added") {
      return fallbackOrder(left, right);
    }
    if (sort === "sustained") {
      const leftWeeks = left.activity.activeWeeks12;
      const rightWeeks = right.activity.activeWeeks12;
      if (leftWeeks === null && rightWeeks !== null) return 1;
      if (leftWeeks !== null && rightWeeks === null) return -1;
      if (leftWeeks !== null && rightWeeks !== null && leftWeeks !== rightWeeks) {
        return rightWeeks - leftWeeks;
      }
      const leftRecency = activityRecency(left);
      const rightRecency = activityRecency(right);
      if (leftRecency === null && rightRecency !== null) return 1;
      if (leftRecency !== null && rightRecency === null) return -1;
      if (leftRecency !== null && rightRecency !== null && leftRecency !== rightRecency) {
        return rightRecency - leftRecency;
      }
      return collator2.compare(left.name, right.name) || collator2.compare(left.id, right.id);
    }
    if (sort === "popularity") {
      return nullableDescending(
        left.community?.aggregate ?? null,
        right.community?.aggregate ?? null,
        left,
        right
      );
    }
    return nullableDescending(
      activityRecency(left),
      activityRecency(right),
      left,
      right
    );
  });
}
function selectProjects(projects, query, context, searchResults) {
  const search = searchMeaning(query.search);
  const effectiveSearchResults = searchResults?.normalizedQuery === search ? searchResults : exactAllTermSearch(
    projects.map(({ id, search: fields }) => ({ id, ...fields })),
    query.search
  );
  const matchingProjectIds = new Set(
    effectiveSearchResults.matches.map(({ id }) => id)
  );
  const tagVocabulary = context.tagVocabulary ?? [
    ...new Map(
      projects.flatMap(
        ({ tags }) => tags.map((tag) => [
          tag.id,
          { ...tag, aliases: [], applicable_kinds: [] }
        ])
      )
    ).values()
  ];
  const selected = projects.filter(
    (project) => (!search || matchingProjectIds.has(project.id)) && (!query.category || (query.category === "frontend" || query.category === "preset" ? project.kind === query.category : project.primaryFunction === query.category)) && matchesAny2(
      query.frontends,
      project.frontends.map(({ id }) => id)
    ) && matchesAny2(query.kinds, [project.kind]) && matchesSelectedTags(
      query.tags,
      project.tags.map(({ id }) => id),
      tagVocabulary
    ) && matchesModelFamilies(
      query.modelFamilies ?? [],
      project.preset?.modelFamilies?.map(({ id }) => id) ?? []
    ) && matchesCompletionFormats(
      query.completionFormats ?? [],
      project.preset?.completionFormats?.map(({ id }) => id) ?? []
    ) && matchesDevelopment(project, query.development, context.now) && matchesAny2(query.licenses, [licenseFilter(project)]) && matchesView(project, query.view, context.now)
  );
  return sortProjects(selected, query.sort, effectiveSearchResults);
}

// src/catalog/catalog-core.ts
var SUPPORTED_CATALOG_SCHEMA = 7;
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

// src/catalog/catalog-transport.ts
var CATALOG_URL = "https://tavernary.org/catalog/tavernary-catalog.json";
function fetchCatalog(fetchImpl, { etag, signal }) {
  return fetchImpl(CATALOG_URL, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
    headers: {
      Accept: "application/json",
      ...etag ? { "If-None-Match": etag } : {}
    },
    signal
  });
}

// src/catalog/catalog-client.ts
var OPEN_THROTTLE_MS = 15 * 60 * 1e3;
var FOCUS_RECHECK_MS = 60 * 60 * 1e3;
function elapsed(now, previous) {
  if (!previous) return Number.POSITIVE_INFINITY;
  const milliseconds = Date.parse(now) - Date.parse(previous);
  return Number.isFinite(milliseconds) && milliseconds >= 0 ? milliseconds : Number.POSITIVE_INFINITY;
}
function errorMessage(cause) {
  return cause instanceof Error ? cause.message : "Catalog refresh failed.";
}
async function webSha256(body) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
var DefaultCatalogClient = class {
  #cache;
  #fetch;
  #now;
  #sha256;
  #listeners = /* @__PURE__ */ new Set();
  #snapshot = {
    state: "empty-loading",
    canMutate: false,
    checkedAt: null
  };
  #catalog = null;
  #activeRecord = null;
  #lastCheckedAt = null;
  #opened = false;
  #opening = null;
  #refreshing = null;
  constructor(options) {
    this.#cache = options.cache;
    this.#fetch = options.fetch ?? fetch;
    this.#now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
    this.#sha256 = options.sha256 ?? webSha256;
  }
  open() {
    if (this.#opening) return this.#opening;
    this.#opening = this.#open();
    return this.#opening;
  }
  async #open() {
    if (this.#opened) return;
    this.#opened = true;
    const [activeRecord, metadata] = await Promise.all([
      this.#cache.readActive(),
      this.#cache.readMetadata()
    ]);
    this.#lastCheckedAt = metadata.lastCheckedAt;
    if (activeRecord) {
      try {
        this.#catalog = parseCatalogV7(JSON.parse(activeRecord.body));
        this.#activeRecord = activeRecord;
        this.#publish({
          state: "ready-stale",
          canMutate: true,
          checkedAt: this.#lastCheckedAt,
          catalog: this.#catalog
        });
      } catch {
        this.#catalog = null;
        this.#activeRecord = null;
      }
    }
    const now = this.#now();
    if (this.#catalog && elapsed(now, this.#lastCheckedAt) < OPEN_THROTTLE_MS) {
      this.#publish({
        state: "ready-current",
        canMutate: true,
        checkedAt: this.#lastCheckedAt,
        catalog: this.#catalog
      });
      return;
    }
    await this.refresh();
  }
  async refresh({ force = false } = {}) {
    if (this.#refreshing) return this.#refreshing;
    const now = this.#now();
    if (!force && elapsed(now, this.#lastCheckedAt) < OPEN_THROTTLE_MS) {
      return;
    }
    this.#refreshing = this.#performRefresh(now).finally(() => {
      this.#refreshing = null;
    });
    return this.#refreshing;
  }
  async onFocus() {
    const now = this.#now();
    if (elapsed(now, this.#lastCheckedAt) < FOCUS_RECHECK_MS) return;
    await this.refresh({ force: true });
  }
  read() {
    return this.#snapshot;
  }
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  async #performRefresh(checkedAt) {
    try {
      const response = await fetchCatalog(this.#fetch, {
        etag: this.#activeRecord?.etag ?? null
      });
      if (response.status === 304) {
        if (!this.#catalog) {
          throw new CatalogClientError("http", "Catalog returned 304 without a compatible cache.");
        }
        await this.#recordChecked(checkedAt);
        this.#publish({
          state: "ready-current",
          canMutate: true,
          checkedAt,
          catalog: this.#catalog
        });
        return;
      }
      if (!response.ok) {
        throw new CatalogClientError(
          "http",
          `Catalog request failed with status ${response.status}.`
        );
      }
      const contentType = response.headers.get("Content-Type") ?? "";
      if (!/(?:^|\s|;)application\/(?:[a-z0-9.-]+\+)?json(?:\s|;|$)/iu.test(contentType)) {
        throw new CatalogClientError("content-type", "Catalog response is not JSON.");
      }
      const body = await response.text();
      let value;
      try {
        value = JSON.parse(body);
      } catch (cause) {
        throw new CatalogClientError("invalid-json", "Catalog JSON is malformed.", {
          cause
        });
      }
      const remoteSchemaVersion = typeof value === "object" && value !== null && "schemaVersion" in value && Number.isInteger(value.schemaVersion) ? value.schemaVersion : null;
      if (remoteSchemaVersion !== SUPPORTED_CATALOG_SCHEMA) {
        if (remoteSchemaVersion === null) {
          throw new CatalogClientError("invalid-catalog", "Catalog schema version is missing.");
        }
        await this.#recordChecked(checkedAt);
        this.#publish(
          this.#catalog ? {
            state: "incompatible-with-cache",
            canMutate: false,
            checkedAt,
            catalog: this.#catalog,
            remoteSchemaVersion
          } : {
            state: "incompatible-empty",
            canMutate: false,
            checkedAt,
            remoteSchemaVersion
          }
        );
        return;
      }
      let catalog;
      try {
        catalog = parseCatalogV7(value);
      } catch (cause) {
        throw new CatalogClientError("invalid-catalog", "Catalog schema validation failed.", {
          cause
        });
      }
      const bodySha256 = await this.#sha256(body);
      const record2 = {
        id: `${catalog.generatedAt}:${bodySha256}`,
        schemaVersion: SUPPORTED_CATALOG_SCHEMA,
        generatedAt: catalog.generatedAt,
        etag: response.headers.get("ETag"),
        fetchedAt: checkedAt,
        bodySha256,
        body
      };
      await this.#cache.stage(record2);
      await this.#cache.activate(record2.id);
      await this.#recordChecked(checkedAt);
      this.#activeRecord = record2;
      this.#catalog = catalog;
      this.#publish({
        state: "ready-current",
        canMutate: true,
        checkedAt,
        catalog
      });
    } catch (cause) {
      await this.#recordChecked(checkedAt).catch(() => void 0);
      if (this.#snapshot.state === "incompatible-with-cache") return;
      const message2 = errorMessage(cause);
      this.#publish(
        this.#catalog ? {
          state: "ready-offline",
          canMutate: true,
          checkedAt,
          catalog: this.#catalog,
          error: message2
        } : {
          state: "error-empty",
          canMutate: false,
          checkedAt,
          error: message2
        }
      );
    }
  }
  async #recordChecked(checkedAt) {
    await this.#cache.recordCheck(checkedAt);
    this.#lastCheckedAt = checkedAt;
  }
  #publish(snapshot) {
    this.#snapshot = snapshot;
    for (const listener of this.#listeners) listener(snapshot);
  }
};
function createCatalogClient(options) {
  return new DefaultCatalogClient(options);
}

// src/catalog/installed-view-model.ts
function toInstalledSectionViewModel(inventory) {
  return [
    {
      id: "managed",
      title: "Managed by Companion",
      rows: inventory.managed.map(({ project, extension }) => ({
        id: project.id,
        name: project.name,
        detail: extension.folderName,
        enabled: extension.enabled,
        action: {
          kind: "uninstall",
          label: "Uninstall",
          reason: "Managed by Companion"
        }
      }))
    },
    {
      id: "external",
      title: "Installed outside Companion",
      rows: inventory.external.map(({ project, extension }) => ({
        id: project.id,
        name: project.name,
        detail: extension.folderName,
        enabled: extension.enabled,
        action: {
          kind: "uninstall",
          label: "Uninstall",
          reason: "Installed outside Companion"
        }
      }))
    },
    {
      id: "unknown",
      title: "Not found in current catalog",
      rows: inventory.unknown.map(({ extension }) => ({
        id: extension.internalName,
        name: typeof extension.manifest?.display_name === "string" ? extension.manifest.display_name : extension.folderName,
        detail: extension.internalName,
        enabled: extension.enabled,
        action: {
          kind: "manage-in-sillytavern",
          label: "Manage in SillyTavern",
          reason: "No unambiguous Tavernary project identity."
        }
      }))
    },
    {
      id: "attention",
      title: "Needs attention",
      rows: inventory.missingManaged.map(({ record: record2, project }) => ({
        id: record2.projectId,
        name: project?.name ?? record2.folderName,
        detail: "Managed record is missing from SillyTavern.",
        enabled: null,
        action: {
          kind: "manage-in-sillytavern",
          label: "Manage in SillyTavern",
          reason: "Reconcile the missing extension in SillyTavern."
        }
      }))
    }
  ];
}

// src/lifecycle/self-protection.ts
var COMPANION_PROJECT_ID = "mentallyquill-tavernary-companion";
var SelfProtectedProjectError = class extends Error {
  operation;
  constructor(operation) {
    super(`Tavernary Companion cannot ${operation} itself.`);
    this.name = "SelfProtectedProjectError";
    this.operation = operation;
  }
};
function assertNotCompanionProject(projectId, operation = "manage") {
  if (projectId === COMPANION_PROJECT_ID) throw new SelfProtectedProjectError(operation);
}

// src/inventory/managed-registry.ts
function folderIdentity(value) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}
var ManagedRegistry = class {
  #records;
  constructor(initial = {}) {
    this.#records = structuredClone(initial);
    delete this.#records[COMPANION_PROJECT_ID];
  }
  read() {
    return structuredClone(this.#records);
  }
  recordInstalled({
    projectId,
    expectedFolderName,
    extension,
    installedAt,
    installedBy
  }) {
    assertNotCompanionProject(projectId);
    if (folderIdentity(extension.folderName) !== folderIdentity(expectedFolderName)) {
      throw new Error("Installed extension does not match the rediscovered folder.");
    }
    const record2 = {
      projectId,
      internalName: extension.internalName,
      folderName: extension.folderName,
      installedAt,
      installedBy
    };
    this.#records[projectId] = structuredClone(record2);
    return structuredClone(record2);
  }
  remove(projectId) {
    if (!(projectId in this.#records)) return false;
    delete this.#records[projectId];
    return true;
  }
  pruneAbsent(hostExtensions) {
    const removed = [];
    for (const [projectId, record2] of Object.entries(this.#records)) {
      const present = hostExtensions.some(
        (extension) => extension.internalName === record2.internalName && folderIdentity(extension.folderName) === folderIdentity(record2.folderName)
      );
      if (!present) {
        delete this.#records[projectId];
        removed.push(projectId);
      }
    }
    return removed.sort();
  }
};
function normalizeManagedExtensionMap(value) {
  const result2 = {};
  for (const [projectId, candidate] of Object.entries(value)) {
    if (!isManagedRecord(candidate) || candidate.projectId !== projectId) continue;
    result2[projectId] = structuredClone(candidate);
  }
  delete result2[COMPANION_PROJECT_ID];
  return result2;
}
function isManagedRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record2 = value;
  return typeof record2.projectId === "string" && typeof record2.internalName === "string" && typeof record2.folderName === "string" && typeof record2.installedAt === "string" && (record2.installedBy === "individual" || record2.installedBy === "kit");
}

// src/catalog/project-view-model.ts
function installedOwnership(projectId, inventory) {
  if (inventory.managed.some(({ project }) => project.id === projectId)) {
    return "managed";
  }
  if (inventory.external.some(({ project }) => project.id === projectId)) {
    return "external";
  }
  return "absent";
}
function actionFor(project, context, ownership) {
  if (project.id === COMPANION_PROJECT_ID) {
    return {
      kind: "current-extension",
      label: "Current extension",
      reason: "Manage Tavernary Companion in SillyTavern."
    };
  }
  if (context.snapshot.state.startsWith("incompatible")) {
    return {
      kind: "update-required",
      label: "Update Companion",
      reason: "Catalog schema updated; update Companion to restore actions."
    };
  }
  if (ownership !== "absent") {
    return {
      kind: "uninstall",
      label: "Uninstall",
      reason: ownership === "managed" ? "Managed by Companion" : "Installed outside Companion"
    };
  }
  if (project.kind === "preset") {
    return {
      kind: "view-project",
      label: "View project",
      reason: "Preset installation is not available in V1"
    };
  }
  if (project.kind !== "extension" || !project.frontends.some(({ id }) => id === "sillytavern")) {
    return {
      kind: "view-project",
      label: "View project",
      reason: "Browse-only in Companion"
    };
  }
  try {
    if (!project.install) throw new Error("missing contract");
    parseInstallContract(project.install);
  } catch {
    return {
      kind: "view-project",
      label: "View project",
      reason: "Install contract unavailable"
    };
  }
  return { kind: "install", label: "Install", reason: null };
}
function toProjectCardViewModel(project, context) {
  const ownership = installedOwnership(project.id, context.inventory);
  return {
    id: project.id,
    name: project.name,
    summary: project.summary,
    kind: project.kind,
    frontends: project.frontends.map(({ label }) => label),
    primaryFunction: primaryFunctionLabel(project.primaryFunction),
    activity: {
      latestSourceActivityAt: project.activity.latestSourceActivityAt,
      activeWeeks12: project.activity.activeWeeks12,
      dormant: project.activity.dormant
    },
    tavernKeeper: project.tavernKeeper,
    installed: ownership !== "absent",
    ownership,
    action: actionFor(project, context, ownership)
  };
}
function primaryFunctionLabel(value) {
  const labels = {
    "memory-retrieval": "Memory & Retrieval",
    "generation-reasoning": "Generation & Reasoning",
    "character-worldbuilding": "Character & Worldbuilding",
    "rpg-systems": "RPG Systems & Suites",
    "interface-workflow": "Interface & Workflow",
    "developer-infrastructure": "Developer Infrastructure"
  };
  return labels[value] ?? value;
}
function toProjectDetailViewModel(project, context) {
  return {
    ...toProjectCardViewModel(project, context),
    canonicalUrl: project.canonicalUrl,
    primaryFunction: primaryFunctionLabel(project.primaryFunction),
    tags: project.tags.map(({ label }) => label),
    license: structuredClone(project.license),
    metadataStatus: project.metadataStatus,
    sourceStatus: project.sourceStatus,
    catalogedAt: project.catalogedAt,
    latestReleaseAt: project.latestReleaseAt,
    refreshedAt: project.refreshedAt,
    attribution: structuredClone(project.attribution),
    fork: structuredClone(project.fork),
    kitReferences: (context.kits ?? []).filter((kit) => kit.components.some(({ projectId }) => projectId === project.id)).map(({ id, title }) => ({ id, title }))
  };
}

// src/catalog/discovery-controller.ts
var DefaultDiscoveryController = class {
  #now;
  #createIndex;
  #snapshot;
  #inventory;
  #query = structuredClone(DEFAULT_COMPANION_QUERY);
  #indexedCatalog = null;
  #index = null;
  #state;
  #subscribers = /* @__PURE__ */ new Set();
  constructor(options) {
    this.#snapshot = options.snapshot;
    this.#inventory = structuredClone(options.inventory);
    this.#now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
    this.#createIndex = options.createIndex ?? createCatalogSearchIndex;
    this.#state = this.#compute();
  }
  read() {
    return structuredClone(this.#state);
  }
  subscribe(subscriber) {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }
  setQuery(query) {
    this.#query = structuredClone(query);
    this.#state = this.#compute();
    this.#notify();
  }
  setInventory(inventory) {
    this.#inventory = structuredClone(inventory);
    this.#state = this.#compute();
    this.#notify();
  }
  setSnapshot(snapshot) {
    this.#snapshot = snapshot;
    this.#state = this.#compute();
    this.#notify();
  }
  #compute() {
    const catalog = "catalog" in this.#snapshot ? this.#snapshot.catalog : null;
    let projects = [];
    let projectDetails = {};
    if (catalog) {
      if (catalog !== this.#indexedCatalog) {
        this.#indexedCatalog = catalog;
        this.#index = this.#createIndex(
          catalog.projects.map(({ id, search }) => ({ id, ...search }))
        );
      }
      const searchResults = this.#index?.search(this.#query.search);
      projects = selectProjects(
        [...catalog.projects],
        this.#query,
        { now: this.#now(), tagVocabulary: catalog.tagVocabulary },
        searchResults
      ).map(
        (project) => toProjectCardViewModel(project, {
          snapshot: this.#snapshot,
          inventory: this.#inventory
        })
      );
      projectDetails = Object.fromEntries(
        catalog.projects.map((project) => [
          project.id,
          toProjectDetailViewModel(project, {
            snapshot: this.#snapshot,
            inventory: this.#inventory,
            kits: catalog.kits
          })
        ])
      );
    }
    return {
      query: structuredClone(this.#query),
      catalogState: this.#snapshot.state,
      projects,
      projectDetails,
      installedSections: toInstalledSectionViewModel(this.#inventory),
      facets: catalog ? {
        frontends: [
          ...new Map(
            catalog.projects.flatMap(
              (project) => project.frontends.map(({ id, label }) => [id, { id, label }])
            )
          ).values()
        ].sort((left, right) => left.label.localeCompare(right.label)),
        tags: catalog.tagVocabulary.map(({ id, label }) => ({ id, label })).sort((left, right) => left.label.localeCompare(right.label))
      } : { frontends: [], tags: [] }
    };
  }
  #notify() {
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
};
function createDiscoveryController(options) {
  return new DefaultDiscoveryController(options);
}

// src/catalog/indexeddb-catalog-cache.ts
var DATABASE_NAME = "tavernary-companion";
var DATABASE_VERSION = 1;
var RECORDS_STORE = "catalog-records";
var META_STORE = "catalog-meta";
var ACTIVE_KEY = "activeCatalogRecordId";
var LAST_CHECKED_KEY = "lastCheckedAt";
var CORRUPTION_KEY = "corruption";
function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed.")),
      { once: true }
    );
  });
}
function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("IndexedDB transaction aborted.")),
      { once: true }
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB transaction failed.")),
      { once: true }
    );
  });
}
function openDatabase(factory, name) {
  const request = factory.open(name, DATABASE_VERSION);
  request.addEventListener("upgradeneeded", () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(RECORDS_STORE)) {
      database.createObjectStore(RECORDS_STORE, { keyPath: "id" });
    }
    if (!database.objectStoreNames.contains(META_STORE)) {
      database.createObjectStore(META_STORE, { keyPath: "key" });
    }
  });
  return requestResult(request);
}
function putMeta(store, key, value) {
  store.put({ key, value });
}
async function readMetaValue(store, key) {
  const record2 = await requestResult(store.get(key));
  return record2?.value ?? null;
}
var IndexedDbCatalogCache = class {
  #database;
  constructor(factory, databaseName) {
    this.#database = openDatabase(factory, databaseName);
  }
  async readActive() {
    const database = await this.#database;
    const transaction = database.transaction([RECORDS_STORE, META_STORE], "readonly");
    const id = await readMetaValue(transaction.objectStore(META_STORE), ACTIVE_KEY);
    const record2 = id ? await requestResult(transaction.objectStore(RECORDS_STORE).get(id)) : void 0;
    await transactionDone(transaction);
    if (!id) return null;
    if (!record2) {
      await this.#writeMeta(CORRUPTION_KEY, "missing-active-record");
      return null;
    }
    return structuredClone(record2);
  }
  async stage(record2) {
    const database = await this.#database;
    const transaction = database.transaction(RECORDS_STORE, "readwrite");
    transaction.objectStore(RECORDS_STORE).put(structuredClone(record2));
    await transactionDone(transaction);
  }
  async activate(id) {
    const database = await this.#database;
    const transaction = database.transaction([RECORDS_STORE, META_STORE], "readwrite");
    const records = transaction.objectStore(RECORDS_STORE);
    const metadata = transaction.objectStore(META_STORE);
    const staged = await requestResult(records.get(id));
    if (!staged) {
      transaction.abort();
      await transactionDone(transaction).catch(() => void 0);
      throw new Error("staged record is missing");
    }
    const previousId = await readMetaValue(metadata, ACTIVE_KEY);
    putMeta(metadata, ACTIVE_KEY, id);
    putMeta(metadata, CORRUPTION_KEY, null);
    const keep = /* @__PURE__ */ new Set([id, ...previousId ? [previousId] : []]);
    const keys = await requestResult(records.getAllKeys());
    for (const key of keys) {
      if (typeof key === "string" && !keep.has(key)) records.delete(key);
    }
    await transactionDone(transaction);
  }
  async recordCheck(lastCheckedAt) {
    await this.#writeMeta(LAST_CHECKED_KEY, lastCheckedAt);
  }
  async readMetadata() {
    const database = await this.#database;
    const transaction = database.transaction(META_STORE, "readonly");
    const store = transaction.objectStore(META_STORE);
    const [activeCatalogRecordId, lastCheckedAt, corruption] = await Promise.all([
      readMetaValue(store, ACTIVE_KEY),
      readMetaValue(store, LAST_CHECKED_KEY),
      readMetaValue(store, CORRUPTION_KEY)
    ]);
    await transactionDone(transaction);
    return {
      activeCatalogRecordId,
      lastCheckedAt,
      corruption: corruption === "missing-active-record" ? corruption : null
    };
  }
  async #writeMeta(key, value) {
    const database = await this.#database;
    const transaction = database.transaction(META_STORE, "readwrite");
    putMeta(transaction.objectStore(META_STORE), key, value);
    await transactionDone(transaction);
  }
};
function createIndexedDbCatalogCache({
  indexedDb = globalThis.indexedDB,
  databaseName = DATABASE_NAME
} = {}) {
  if (!indexedDb) throw new Error("IndexedDB is unavailable.");
  return new IndexedDbCatalogCache(indexedDb, databaseName);
}

// src/inventory/inventory-reconciler.ts
function folderIdentity2(value) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}
function reconcileInventory({
  projects,
  hostExtensions,
  managed
}) {
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const projectsByFolder = /* @__PURE__ */ new Map();
  for (const project of projects) {
    if (!project.install || project.kind !== "extension" || !project.frontends.some(({ id }) => id === "sillytavern")) {
      continue;
    }
    const identity = folderIdentity2(project.install.folderName);
    const matches = projectsByFolder.get(identity) ?? [];
    matches.push(project);
    projectsByFolder.set(identity, matches);
  }
  const snapshot = {
    managed: [],
    external: [],
    unknown: [],
    missingManaged: []
  };
  const representedManagedIds = /* @__PURE__ */ new Set();
  for (const extension of hostExtensions) {
    const matches = projectsByFolder.get(folderIdentity2(extension.folderName)) ?? [];
    if (matches.length !== 1) {
      snapshot.unknown.push({
        extension: structuredClone(extension),
        reason: matches.length > 1 ? "ambiguous-folder" : "folder-not-in-catalog"
      });
      continue;
    }
    const project = matches[0];
    const record2 = managed[project.id];
    if (project.id !== COMPANION_PROJECT_ID && record2 && record2.projectId === project.id && record2.internalName === extension.internalName && folderIdentity2(record2.folderName) === folderIdentity2(extension.folderName)) {
      snapshot.managed.push({
        project,
        extension: structuredClone(extension),
        record: structuredClone(record2)
      });
      representedManagedIds.add(project.id);
    } else {
      snapshot.external.push({ project, extension: structuredClone(extension) });
    }
  }
  for (const record2 of Object.values(managed).sort(
    (left, right) => left.projectId.localeCompare(right.projectId)
  )) {
    if (record2.projectId === COMPANION_PROJECT_ID || representedManagedIds.has(record2.projectId)) {
      continue;
    }
    snapshot.missingManaged.push({
      record: structuredClone(record2),
      project: projectsById.get(record2.projectId) ?? null
    });
  }
  return snapshot;
}

// src/trust/trust-copy.ts
var CURRENT_ASSESSMENT_WARNING = "TavernKeeper\u2019s latest assessment identified potential security concerns in this project. Extensions can run code inside SillyTavern. Responsibility for safety falls upon you. Review the scan and project before continuing.";
var STALE_ASSESSMENT_WARNING = "TavernKeeper\u2019s latest available assessment identified potential security concerns in this project. Extensions can run code inside SillyTavern. Responsibility for safety falls upon you. Review the scan and project before continuing. This assessment covers an older version of the project.";
var UNSANDBOXED_CODE_DISCLOSURE = "Third-party extensions run unsandboxed code inside SillyTavern. Companion installs only from Tavernary\u2019s validated install contract. TavernKeeper provides evidence, not a guarantee of safety. Responsibility for safety falls upon you.";

// src/trust/trust-policy.ts
function selectTrustPrompts({
  trustAcknowledgedAt,
  assessment
}) {
  const prompts = [];
  if (!trustAcknowledgedAt) {
    prompts.push({
      kind: "unsandboxed-disclosure",
      copy: UNSANDBOXED_CODE_DISCLOSURE
    });
  }
  if (assessment?.riskLevel === "material" || assessment?.riskLevel === "high") {
    const stale = assessment.freshness === "stale";
    prompts.push({
      kind: "assessment-warning",
      severity: assessment.riskLevel,
      stale,
      reportUrl: assessment.reportUrl,
      reviewDisabledReason: assessment.reportUrl ? null : "No TavernKeeper Scan Review link is available.",
      copy: stale ? STALE_ASSESSMENT_WARNING : CURRENT_ASSESSMENT_WARNING
    });
  }
  return prompts;
}

// src/lifecycle/lifecycle-policy.ts
function evaluateLifecycle({
  operation,
  project,
  context
}) {
  if (project?.id === COMPANION_PROJECT_ID) {
    return { kind: "rejected", reason: "self-protected" };
  }
  if (!project) return { kind: "rejected", reason: "project-not-found" };
  if (context.operationInProgress) {
    return { kind: "rejected", reason: "operation-in-progress" };
  }
  if (!context.snapshot.canMutate) {
    return { kind: "rejected", reason: "catalog-incompatible" };
  }
  if (!isActionableExtension(project)) {
    return { kind: "rejected", reason: "browse-only-project" };
  }
  const installed = installedEntry(
    project.id,
    context.inventory.managed,
    context.inventory.external
  );
  if (operation === "install") {
    if (installed) return { kind: "rejected", reason: "already-installed" };
    try {
      if (!project.install) throw new Error("Install contract is missing.");
      const contract = parseInstallContract(project.install);
      if (contract.folderName !== project.install.folderName) {
        return { kind: "rejected", reason: "invalid-install-contract" };
      }
      return { kind: "allowed", operation, contract };
    } catch {
      return { kind: "rejected", reason: "invalid-install-contract" };
    }
  }
  if (!installed) return { kind: "rejected", reason: "not-installed" };
  if (installed.entry.extension.type !== "local") {
    return { kind: "rejected", reason: "host-non-removable" };
  }
  return {
    kind: "allowed",
    operation,
    extension: structuredClone(installed.entry.extension),
    ownership: installed.ownership
  };
}
function isActionableExtension(project) {
  return Boolean(
    project?.kind === "extension" && project.frontends.some(({ id }) => id === "sillytavern")
  );
}
function installedEntry(projectId, managed, external) {
  const managedEntry = managed.find(({ project }) => project.id === projectId);
  if (managedEntry) return { ownership: "managed", entry: managedEntry };
  const externalEntry = external.find(({ project }) => project.id === projectId);
  return externalEntry ? { ownership: "external", entry: externalEntry } : null;
}

// src/lifecycle/operation-lock.ts
var OperationInProgressError = class extends Error {
  active;
  constructor(active) {
    super(`Lifecycle operation ${active.operationId} is already in progress.`);
    this.name = "OperationInProgressError";
    this.active = structuredClone(active);
  }
};
var OperationLock = class {
  #subscribers = /* @__PURE__ */ new Set();
  #active = null;
  read() {
    return this.#active ? structuredClone(this.#active) : null;
  }
  subscribe(subscriber) {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }
  async runExclusive(operationId, callback) {
    if (this.#active) throw new OperationInProgressError(this.#active);
    this.#active = { operationId, phase: "preflight" };
    this.#notify();
    try {
      return await callback({
        setPhase: (phase2) => {
          if (!this.#active || this.#active.operationId !== operationId) return;
          this.#active = { operationId, phase: phase2 };
          this.#notify();
        }
      });
    } finally {
      this.#active = null;
      this.#notify();
    }
  }
  #notify() {
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
};

// src/lifecycle/operation-receipt.ts
function createReceipt(input) {
  const order = [
    "requested",
    "host-accepted",
    "verified",
    "recorded"
  ];
  const completedIndex = input.completedThrough ? order.indexOf(input.completedThrough) : -1;
  return {
    id: input.id,
    kind: input.kind,
    projectId: input.projectId,
    projectName: input.projectName,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    status: input.status,
    safeError: input.safeError,
    reloadRequired: input.reloadRequired,
    steps: order.map((id, index) => ({
      id,
      status: id === input.failedAt ? "failed" : index <= completedIndex ? "succeeded" : input.status === "cancelled" || input.status === "rejected" ? "skipped" : "pending"
    }))
  };
}

// src/lifecycle/removal-impact.ts
function previewRemovalImpact({
  projectId,
  projectName: projectName2,
  ownership,
  installedKits,
  activeKitId,
  removable
}) {
  const references = kitReferences(projectId, installedKits);
  const activeKitAffected = references.some(({ id }) => id === activeKitId);
  const kitNames = references.map(({ title }) => title).join(", ");
  const consequence = references.length === 0 ? "" : ` ${kitNames} will become incomplete${activeKitAffected ? ", and the active Kit will show drift" : ""}.`;
  return {
    projectId,
    projectName: projectName2,
    ownership,
    ownershipLabel: {
      managed: "Managed by Companion",
      external: "Installed outside Companion",
      absent: "Not installed"
    }[ownership],
    installedKits: references,
    activeKitAffected,
    removable,
    confirmation: `Uninstall ${projectName2}?${consequence}`
  };
}
function markInstalledKitsIncomplete(installedKits, projectId) {
  const next = structuredClone(installedKits);
  for (const [kitId, candidate] of Object.entries(next)) {
    if (!kitProjectIds(candidate).includes(projectId) || !isRecord4(candidate)) continue;
    const missing = Array.isArray(candidate.missingProjectIds) ? candidate.missingProjectIds.filter((value) => typeof value === "string") : [];
    next[kitId] = {
      ...candidate,
      status: "incomplete",
      missingProjectIds: [.../* @__PURE__ */ new Set([...missing, projectId])].sort()
    };
  }
  return next;
}
function kitReferences(projectId, installedKits) {
  return Object.entries(installedKits).filter(([, candidate]) => kitProjectIds(candidate).includes(projectId)).map(([id, candidate]) => ({
    id,
    title: isRecord4(candidate) && typeof candidate.title === "string" ? candidate.title : id
  })).sort((left, right) => left.title.localeCompare(right.title));
}
function kitProjectIds(value) {
  if (!isRecord4(value)) return [];
  const ids = Array.isArray(value.projectIds) ? value.projectIds : Array.isArray(value.members) ? value.members : [];
  return ids.filter((candidate) => typeof candidate === "string");
}
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/lifecycle/lifecycle-coordinator.ts
var DefaultLifecycleCoordinator = class {
  lock;
  #host;
  #store;
  #getSnapshot;
  #confirm;
  #now;
  #createId;
  constructor(options) {
    this.#host = options.host;
    this.#store = options.store;
    this.#getSnapshot = options.getSnapshot;
    this.#confirm = options.confirm;
    this.#now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
    this.#createId = options.createId ?? (() => crypto.randomUUID());
    this.lock = options.lock ?? new OperationLock();
  }
  install(projectId) {
    return this.lock.runExclusive(`install:${projectId}`, async ({ setPhase }) => {
      const startedAt = this.#now();
      const id = this.#createId();
      const snapshot = this.#getSnapshot();
      const catalog = "catalog" in snapshot ? snapshot.catalog : null;
      const project = catalog?.projects.find((candidate) => candidate.id === projectId) ?? null;
      if (projectId === COMPANION_PROJECT_ID) {
        return this.#rejected({
          id,
          projectId,
          projectName: project?.name ?? projectId,
          startedAt
        });
      }
      setPhase("discovering");
      const before = await this.#host.discover();
      const registry = new ManagedRegistry(
        normalizeManagedExtensionMap(this.#store.read().managedExtensions)
      );
      const inventory = reconcileInventory({
        projects: catalog?.projects ?? [],
        hostExtensions: before,
        managed: registry.read()
      });
      const decision = evaluateLifecycle({
        operation: "install",
        project,
        context: { snapshot, inventory }
      });
      if (decision.kind !== "allowed" || decision.operation !== "install" || !project) {
        return this.#rejected({
          id,
          projectId,
          projectName: project?.name ?? projectId,
          startedAt
        });
      }
      const state = this.#store.read();
      const prompts = selectTrustPrompts({
        trustAcknowledgedAt: state.trustAcknowledgedAt,
        assessment: project.tavernKeeper ? {
          riskLevel: project.tavernKeeper.riskLevel,
          freshness: project.tavernKeeper.freshness,
          reportUrl: project.tavernKeeper.report?.reportUrl ?? null
        } : null
      });
      let disclosureAccepted = Boolean(state.trustAcknowledgedAt);
      setPhase("awaiting-confirmation");
      for (const prompt of prompts) {
        const approved = await this.#confirm(prompt, project);
        if (!approved) {
          const receipt2 = createReceipt({
            id,
            kind: "install",
            projectId,
            projectName: project.name,
            startedAt,
            finishedAt: this.#now(),
            status: "cancelled",
            safeError: null,
            reloadRequired: false
          });
          await this.#persistNonMutation(receipt2, disclosureAccepted ? this.#now() : null);
          return receipt2;
        }
        if (prompt.kind === "unsandboxed-disclosure") disclosureAccepted = true;
      }
      setPhase("host-request");
      try {
        await this.#host.install({
          repositoryUrl: decision.contract.repositoryUrl,
          branch: decision.contract.branch
        });
      } catch {
        const receipt2 = createReceipt({
          id,
          kind: "install",
          projectId,
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "failed",
          completedThrough: "requested",
          failedAt: "host-accepted",
          safeError: "SillyTavern did not complete the install request.",
          reloadRequired: false
        });
        await this.#persistNonMutation(receipt2, disclosureAccepted ? this.#now() : null);
        return receipt2;
      }
      setPhase("verifying");
      const after = await this.#host.discover();
      const installed = exactFolder(after, decision.contract.folderName);
      if (!installed) {
        const receipt2 = createReceipt({
          id,
          kind: "install",
          projectId,
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "verification-failed",
          completedThrough: "host-accepted",
          failedAt: "verified",
          safeError: "SillyTavern did not report the expected installed extension.",
          reloadRequired: false
        });
        await this.#persistNonMutation(receipt2, disclosureAccepted ? this.#now() : null);
        return receipt2;
      }
      registry.recordInstalled({
        projectId,
        expectedFolderName: decision.contract.folderName,
        extension: installed,
        installedAt: this.#now(),
        installedBy: "individual"
      });
      const receipt = createReceipt({
        id,
        kind: "install",
        projectId,
        projectName: project.name,
        startedAt,
        finishedAt: this.#now(),
        status: "succeeded",
        completedThrough: "recorded",
        safeError: null,
        reloadRequired: true
      });
      setPhase("recording");
      try {
        await this.#store.update((draft) => {
          draft.managedExtensions = registry.read();
          if (disclosureAccepted && !draft.trustAcknowledgedAt) {
            draft.trustAcknowledgedAt = this.#now();
          }
          draft.operationReceipt = structuredClone(receipt);
        });
        return receipt;
      } catch {
        return createReceipt({
          id,
          kind: "install",
          projectId,
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "installed-unrecorded",
          completedThrough: "verified",
          failedAt: "recorded",
          safeError: "The extension is installed, but Companion could not record ownership. Reopen Companion to reconcile it.",
          reloadRequired: true
        });
      }
    });
  }
  async previewRemoval(projectId) {
    const snapshot = this.#getSnapshot();
    const catalog = "catalog" in snapshot ? snapshot.catalog : null;
    const project = catalog?.projects.find((candidate) => candidate.id === projectId) ?? null;
    if (projectId === COMPANION_PROJECT_ID || !project) {
      return previewRemovalImpact({
        projectId,
        projectName: project?.name ?? projectId,
        ownership: "absent",
        installedKits: this.#store.read().installedKits,
        activeKitId: this.#store.read().activeKitId,
        removable: false
      });
    }
    const hostExtensions = await this.#host.discover();
    const inventory = reconcileInventory({
      projects: catalog?.projects ?? [],
      hostExtensions,
      managed: normalizeManagedExtensionMap(this.#store.read().managedExtensions)
    });
    const decision = evaluateLifecycle({
      operation: "remove",
      project,
      context: { snapshot, inventory }
    });
    const state = this.#store.read();
    const discoveredOwnership = inventory.managed.some(
      ({ project: candidate }) => candidate.id === projectId
    ) ? "managed" : inventory.external.some(({ project: candidate }) => candidate.id === projectId) ? "external" : "absent";
    return previewRemovalImpact({
      projectId,
      projectName: project.name,
      ownership: decision.kind === "allowed" && decision.operation === "remove" ? decision.ownership : discoveredOwnership,
      installedKits: state.installedKits,
      activeKitId: state.activeKitId,
      removable: decision.kind === "allowed" && decision.operation === "remove"
    });
  }
  remove(projectId) {
    return this.lock.runExclusive(`remove:${projectId}`, async ({ setPhase }) => {
      const startedAt = this.#now();
      const id = this.#createId();
      const snapshot = this.#getSnapshot();
      const catalog = "catalog" in snapshot ? snapshot.catalog : null;
      const project = catalog?.projects.find((candidate) => candidate.id === projectId) ?? null;
      if (projectId === COMPANION_PROJECT_ID) {
        return this.#rejectedRemoval({
          id,
          projectId,
          projectName: project?.name ?? projectId,
          startedAt
        });
      }
      setPhase("discovering");
      const before = await this.#host.discover();
      const registry = new ManagedRegistry(
        normalizeManagedExtensionMap(this.#store.read().managedExtensions)
      );
      const inventory = reconcileInventory({
        projects: catalog?.projects ?? [],
        hostExtensions: before,
        managed: registry.read()
      });
      const decision = evaluateLifecycle({
        operation: "remove",
        project,
        context: { snapshot, inventory }
      });
      if (decision.kind !== "allowed" || decision.operation !== "remove" || !project) {
        return this.#rejectedRemoval({
          id,
          projectId,
          projectName: project?.name ?? projectId,
          startedAt
        });
      }
      setPhase("host-request");
      try {
        await this.#host.remove({
          internalName: decision.extension.internalName,
          type: decision.extension.type
        });
      } catch {
        const receipt2 = createReceipt({
          id,
          kind: "remove",
          projectId,
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "failed",
          completedThrough: "requested",
          failedAt: "host-accepted",
          safeError: "SillyTavern did not complete the uninstall request.",
          reloadRequired: false
        });
        await this.#persistNonMutation(receipt2, null);
        return receipt2;
      }
      setPhase("verifying");
      const after = await this.#host.discover();
      const stillPresent = after.some(
        (extension) => extension.internalName === decision.extension.internalName && extension.type === decision.extension.type
      );
      if (stillPresent) {
        const receipt2 = createReceipt({
          id,
          kind: "remove",
          projectId,
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "verification-failed",
          completedThrough: "host-accepted",
          failedAt: "verified",
          safeError: "SillyTavern still reports the extension as installed.",
          reloadRequired: false
        });
        await this.#persistNonMutation(receipt2, null);
        return receipt2;
      }
      registry.remove(projectId);
      const receipt = createReceipt({
        id,
        kind: "remove",
        projectId,
        projectName: project.name,
        startedAt,
        finishedAt: this.#now(),
        status: "succeeded",
        completedThrough: "recorded",
        safeError: null,
        reloadRequired: true
      });
      setPhase("recording");
      try {
        await this.#store.update((draft) => {
          draft.managedExtensions = registry.read();
          draft.installedKits = markInstalledKitsIncomplete(draft.installedKits, projectId);
          draft.operationReceipt = structuredClone(receipt);
        });
        return receipt;
      } catch {
        return createReceipt({
          id,
          kind: "remove",
          projectId,
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "removed-unrecorded",
          completedThrough: "verified",
          failedAt: "recorded",
          safeError: "The extension was removed, but Companion could not update its records. Reopen Companion to reconcile it.",
          reloadRequired: true
        });
      }
    });
  }
  #rejected(input) {
    return createReceipt({
      ...input,
      kind: "install",
      finishedAt: this.#now(),
      status: "rejected",
      safeError: "This project is not eligible for installation.",
      reloadRequired: false
    });
  }
  #rejectedRemoval(input) {
    return createReceipt({
      ...input,
      kind: "remove",
      finishedAt: this.#now(),
      status: "rejected",
      safeError: "This installed project is not eligible for direct removal.",
      reloadRequired: false
    });
  }
  async #persistNonMutation(receipt, trustAcknowledgedAt) {
    await this.#store.update((draft) => {
      if (trustAcknowledgedAt && !draft.trustAcknowledgedAt) {
        draft.trustAcknowledgedAt = trustAcknowledgedAt;
      }
      draft.operationReceipt = structuredClone(receipt);
    }).catch(() => void 0);
  }
};
function exactFolder(extensions, folder) {
  const identity = folder.normalize("NFKC").toLocaleLowerCase("en-US");
  const matches = extensions.filter(
    (extension) => extension.folderName.normalize("NFKC").toLocaleLowerCase("en-US") === identity
  );
  return matches.length === 1 ? matches[0] : null;
}
function createLifecycleCoordinator(options) {
  return new DefaultLifecycleCoordinator(options);
}

// src/lifecycle/trust-prompt-broker.ts
var TrustPromptBroker = class {
  #subscribers = /* @__PURE__ */ new Set();
  #pending = null;
  #resolve = null;
  read() {
    return this.#pending ? structuredClone(this.#pending) : null;
  }
  subscribe(subscriber) {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }
  request(prompt, project) {
    if (this.#pending) throw new Error("A trust prompt is already pending.");
    this.#pending = { prompt: structuredClone(prompt), project: structuredClone(project) };
    this.#notify();
    return new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }
  respond(approved) {
    const resolve = this.#resolve;
    if (!resolve) return;
    this.#pending = null;
    this.#resolve = null;
    this.#notify();
    resolve(approved);
  }
  cancel() {
    this.respond(false);
  }
  #notify() {
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
};

// src/kits/kit-view-model.ts
function toPersonalKitCardViewModel(kit, status) {
  return {
    id: kit.id,
    title: kit.title,
    description: kit.description,
    origin: "personal",
    originLabel: "Personal Kit",
    componentCount: kit.projectIds.length,
    flaggedCount: 0,
    operationalStatus: statusLabel(status),
    primaryAction: actionFor2(status)
  };
}
function toPublishedKitCardViewModel(kit, status) {
  return {
    id: kit.id,
    title: kit.title,
    description: kit.description,
    origin: "published",
    originLabel: "Published Kit",
    componentCount: kit.components.length,
    flaggedCount: kit.flaggedProjectCount,
    operationalStatus: statusLabel(status),
    primaryAction: actionFor2(status)
  };
}
function toPersonalKitInspector(kit, projects, status) {
  const byId = new Map(projects.map((project) => [project.id, project]));
  return {
    ...toPersonalKitCardViewModel(kit, status),
    editable: true,
    components: kit.projectIds.map((projectId) => component(byId.get(projectId), projectId))
  };
}
function toPublishedKitInspector(kit, status) {
  return {
    ...toPublishedKitCardViewModel(kit, status),
    editable: false,
    components: kit.components.map(({ projectId, name, availability, canonicalUrl, project }) => ({
      projectId,
      name,
      group: availability === "available" ? groupFor(project) : "unavailable",
      available: availability === "available",
      assessment: project?.tavernKeeper?.riskLevel ?? null,
      canonicalUrl
    }))
  };
}
function component(project, id) {
  return {
    projectId: id,
    name: project?.name ?? id,
    group: project ? groupFor(project) : "unavailable",
    available: Boolean(project),
    assessment: project?.tavernKeeper?.riskLevel ?? null,
    canonicalUrl: project?.canonicalUrl ?? null
  };
}
function groupFor(project) {
  if (!project) return "unavailable";
  return project.kind === "extension" && project.install ? "managed" : "context";
}
function statusLabel(status) {
  return {
    saved: "Saved",
    installed: "Installed",
    active: "Active",
    incomplete: "Incomplete",
    drifted: "Drifted",
    changedOnTavernary: "Changed on Tavernary"
  }[status];
}
function actionFor2(status) {
  if (status === "saved") return { kind: "install", label: "Install Kit" };
  if (status === "installed") return { kind: "activate", label: "Activate" };
  if (status === "active") return { kind: "deactivate", label: "Deactivate" };
  if (status === "incomplete") return { kind: "retry", label: "Retry" };
  return { kind: "review", label: "Review" };
}

// src/kits/kit-discovery-controller.ts
var KitDiscoveryController = class {
  #listeners = /* @__PURE__ */ new Set();
  #catalog;
  #personal;
  #statuses;
  #segment = "published";
  #search = "";
  #query = structuredClone(DEFAULT_KIT_QUERY);
  constructor(input) {
    this.#catalog = input.catalog;
    this.#personal = structuredClone(input.personal);
    this.#statuses = input.statuses;
  }
  read() {
    const published = selectKits(this.#catalog.kits, this.#query, this.#search).map(
      (kit) => toPublishedKitCardViewModel(kit, this.#statuses.get(kit.id) ?? "saved")
    );
    const meaning = this.#search.trim().toLocaleLowerCase("en-US");
    const personal = this.#personal.filter(
      (kit) => !meaning || `${kit.title} ${kit.description} ${kit.projectIds.join(" ")}`.toLocaleLowerCase("en-US").includes(meaning)
    ).map((kit) => toPersonalKitCardViewModel(kit, this.#statuses.get(kit.id) ?? "saved"));
    return {
      segment: this.#segment,
      search: this.#search,
      query: structuredClone(this.#query),
      publishedCount: this.#catalog.kits.length,
      personalCount: this.#personal.length,
      visible: structuredClone(this.#segment === "published" ? published : personal)
    };
  }
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  setSegment(segment) {
    this.#segment = segment;
    this.#emit();
  }
  setSearch(search) {
    this.#search = search;
    this.#emit();
  }
  setQuery(query) {
    this.#query = structuredClone(query);
    this.#emit();
  }
  setData(input) {
    this.#catalog = input.catalog;
    this.#personal = structuredClone(input.personal);
    this.#statuses = input.statuses;
    this.#emit();
  }
  #emit() {
    const state = this.read();
    for (const listener of this.#listeners) listener(state);
  }
};
function createKitDiscoveryController(input) {
  return new KitDiscoveryController(input);
}

// src/kits/kit-activation-commit.ts
async function applyActivationMutations({
  host,
  enable,
  disable,
  resolveInternalName
}) {
  const failures = [];
  let changed = false;
  for (const [action, steps] of [
    ["enable", enable],
    ["disable", disable]
  ]) {
    for (const step2 of steps) {
      const internalName = resolveInternalName(step2.projectId, step2.internalName);
      if (!internalName) {
        failures.push({
          projectId: step2.projectId,
          action,
          error: "Managed extension identity is unavailable."
        });
        continue;
      }
      try {
        await host[action](internalName);
        changed = true;
      } catch (error) {
        failures.push({
          projectId: step2.projectId,
          action,
          error: error instanceof Error ? error.message : "Host mutation failed."
        });
      }
    }
  }
  return { changed, failures };
}

// src/kits/kit-operation-journal.ts
var KitOperationJournal = class {
  #profile;
  constructor(profile) {
    this.#profile = profile;
  }
  read() {
    const value = this.#profile.read().kitOperationJournal;
    return isJournal(value) ? structuredClone(value) : null;
  }
  async write(journal) {
    if (!isJournal(journal)) throw new Error("Invalid Kit operation journal.");
    await this.#profile.update((draft) => {
      draft.kitOperationJournal = structuredClone(journal);
    });
  }
  async clear() {
    await this.#profile.update((draft) => {
      draft.kitOperationJournal = null;
    });
  }
};
function isJournal(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const journal = value;
  return journal.formatVersion === 1 && typeof journal.operationId === "string" && typeof journal.planId === "string" && typeof journal.kitId === "string" && (journal.operation === "install" || journal.operation === "activate" || journal.operation === "deactivate" || journal.operation === "uninstall") && typeof journal.phase === "string" && typeof journal.startedAt === "string" && (journal.currentProjectId === null || typeof journal.currentProjectId === "string") && Array.isArray(journal.completedProjects) && Array.isArray(journal.requiredProjectIds) && (journal.preOperationActiveKitId === null || typeof journal.preOperationActiveKitId === "string");
}

// src/kits/kit-executor.ts
var KitExecutor = class {
  #host;
  #profile;
  #kits;
  #lock;
  #getCatalog;
  #getInventoryFingerprint;
  #now;
  #operationId;
  journal;
  constructor(deps) {
    this.#host = deps.host;
    this.#profile = deps.profile;
    this.#kits = deps.kits;
    this.#lock = deps.lock;
    this.#getCatalog = deps.getCatalog;
    this.#getInventoryFingerprint = deps.getInventoryFingerprint;
    this.#now = deps.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
    this.#operationId = deps.operationId ?? (() => crypto.randomUUID());
    this.journal = new KitOperationJournal(deps.profile);
  }
  async execute(plan, approval) {
    validateApproval(plan, approval);
    if (plan.blockingIssues.length) throw new Error("Kit plan has blocking issues.");
    if (await this.#getInventoryFingerprint() !== plan.inventoryFingerprint)
      throw new Error("Kit plan is stale. Review it again.");
    return this.#lock.runExclusive(`kit:${plan.id}`, async ({ setPhase }) => {
      const startedAt = this.#now();
      const previousActiveKitId = this.#kits.readActiveId();
      const journal = {
        formatVersion: 1,
        operationId: this.#operationId(),
        planId: plan.id,
        operation: plan.operation,
        kitId: plan.kitId,
        phase: "starting",
        startedAt,
        currentProjectId: null,
        completedProjects: [],
        preOperationActiveKitId: previousActiveKitId,
        requiredProjectIds: [...plan.requiredProjectIds]
      };
      await this.journal.write(journal);
      let receipt;
      try {
        if (plan.operation === "install" || plan.operation === "activate") {
          receipt = await this.#installOrActivate(plan, journal, previousActiveKitId, setPhase);
        } else if (plan.operation === "deactivate") {
          receipt = await this.#deactivate(plan, journal, previousActiveKitId, setPhase);
        } else {
          receipt = await this.#uninstall(plan, journal, previousActiveKitId, setPhase);
        }
      } catch (error) {
        receipt = this.#receipt(plan, journal, previousActiveKitId, "failed", [
          {
            projectId: journal.currentProjectId ?? plan.kitId,
            action: "context",
            status: "failed",
            message: error instanceof Error ? error.message : "Kit operation failed.",
            retryable: true
          }
        ]);
      }
      await this.#persistReceipt(receipt);
      await this.journal.clear();
      return receipt;
    });
  }
  async recoverInterrupted() {
    const journal = this.journal.read();
    if (!journal) return null;
    const extensions = await this.#host.discover();
    const catalog = this.#getCatalog();
    const present = presentProjectIds(catalog.projects, extensions);
    const results = journal.requiredProjectIds.map((projectId) => ({
      projectId,
      action: "context",
      status: present.has(projectId) ? "verified" : "failed",
      message: present.has(projectId) ? "Present after interruption." : "Missing after interruption.",
      retryable: !present.has(projectId)
    }));
    const receipt = {
      formatVersion: 1,
      kind: "kit-operation",
      id: journal.operationId,
      planId: journal.planId,
      operation: journal.operation,
      kitId: journal.kitId,
      startedAt: journal.startedAt,
      completedAt: this.#now(),
      outcome: "interrupted",
      previousActiveKitId: journal.preOperationActiveKitId,
      activeKitId: this.#kits.readActiveId(),
      projects: [...journal.completedProjects, ...results],
      keptForOtherKits: []
    };
    await this.#persistReceipt(receipt);
    await this.journal.clear();
    return receipt;
  }
  async #installOrActivate(plan, journal, previousActiveKitId, setPhase) {
    const catalog = this.#getCatalog();
    const byId = new Map(catalog.projects.map((project) => [project.id, project]));
    const results = [];
    let changed = false;
    for (const step2 of plan.install) {
      journal.currentProjectId = step2.projectId;
      journal.phase = "installing";
      setPhase(`installing:${step2.projectId}`);
      await this.journal.write(journal);
      const project = byId.get(step2.projectId);
      try {
        if (!project?.install || project.id === "mentallyquill-tavernary-companion")
          throw new Error("Install contract is unavailable.");
        await this.#host.install({
          repositoryUrl: project.install.repositoryUrl,
          branch: project.install.branch
        });
        changed = true;
        const extensions = await this.#host.discover();
        const extension = exactFolder2(extensions, project.install.folderName);
        if (!extension) throw new Error("Installed extension could not be verified.");
        await this.#recordManaged(project, extension);
        results.push(
          result(step2.projectId, "install", "verified", "Installed and verified.", false)
        );
      } catch (error) {
        results.push(result(step2.projectId, "install", "failed", message(error), true));
      }
      journal.completedProjects = structuredClone(results);
      await this.journal.write(journal);
    }
    const discovered = await this.#host.discover();
    const present = presentProjectIds(catalog.projects, discovered);
    const requiredActionable = plan.requiredProjectIds.filter((id) => {
      const project = byId.get(id);
      return project?.kind === "extension" && Boolean(project.install);
    });
    const missing = requiredActionable.filter((id) => !present.has(id));
    await this.#recordKitState(
      plan,
      requiredActionable.filter((id) => present.has(id)),
      missing,
      missing.length ? "incomplete" : "installed"
    );
    if (plan.operation === "activate" && missing.length) {
      if (changed) this.#host.reload();
      return this.#receipt(plan, journal, previousActiveKitId, "partial", results);
    }
    if (plan.operation === "activate") {
      journal.phase = "activating";
      setPhase("activating");
      await this.journal.write(journal);
      const records = normalizeManagedExtensionMap(this.#profile.read().managedExtensions);
      const mutations = await applyActivationMutations({
        host: this.#host,
        enable: plan.enable,
        disable: plan.disable,
        resolveInternalName: (projectId, planned) => planned ?? records[projectId]?.internalName ?? null
      });
      changed ||= mutations.changed;
      for (const failure of mutations.failures)
        results.push(result(failure.projectId, failure.action, "failed", failure.error, true));
      const verified = await this.#verifyEnabled(
        plan,
        normalizeManagedExtensionMap(this.#profile.read().managedExtensions)
      );
      if (mutations.failures.length || !verified) {
        await this.#markDrifted(plan.kitId);
        if (previousActiveKitId) await this.#markDrifted(previousActiveKitId);
        if (changed) this.#host.reload();
        return this.#receipt(plan, journal, previousActiveKitId, "failed", results);
      }
      await this.#kits.setActive(plan.kitId);
    }
    for (const step2 of plan.externalContext)
      results.push(
        result(step2.projectId, "context", "external", "External extension left unchanged.", false)
      );
    if (changed) this.#host.reload();
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      results.some(({ status }) => status === "failed") ? "partial" : "completed",
      results
    );
  }
  async #deactivate(plan, journal, previousActiveKitId, setPhase) {
    journal.phase = "deactivating";
    setPhase("deactivating");
    await this.journal.write(journal);
    const mutations = await applyActivationMutations({
      host: this.#host,
      enable: [],
      disable: plan.disable,
      resolveInternalName: (_id, planned) => planned
    });
    const results = plan.disable.map((step2) => {
      const failure = mutations.failures.find(({ projectId }) => projectId === step2.projectId);
      return result(
        step2.projectId,
        "disable",
        failure ? "failed" : "verified",
        failure?.error ?? "Disabled and verified.",
        Boolean(failure)
      );
    });
    if (mutations.failures.length) await this.#markDrifted(plan.kitId);
    else await this.#kits.setActive(null);
    if (mutations.changed) this.#host.reload();
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      mutations.failures.length ? "partial" : "completed",
      results
    );
  }
  async #uninstall(plan, journal, previousActiveKitId, setPhase) {
    const results = [];
    let changed = false;
    if (previousActiveKitId === plan.kitId && plan.disable.length) {
      const mutations = await applyActivationMutations({
        host: this.#host,
        enable: [],
        disable: plan.disable,
        resolveInternalName: (_id, planned) => planned
      });
      changed ||= mutations.changed;
      if (mutations.failures.length) {
        await this.#markDrifted(plan.kitId);
        for (const failure of mutations.failures)
          results.push(result(failure.projectId, "disable", "failed", failure.error, true));
        if (changed) this.#host.reload();
        return this.#receipt(plan, journal, previousActiveKitId, "failed", results);
      }
      await this.#kits.setActive(null);
    }
    for (const step2 of plan.remove) {
      journal.currentProjectId = step2.projectId;
      journal.phase = "removing";
      setPhase(`removing:${step2.projectId}`);
      await this.journal.write(journal);
      const records = normalizeManagedExtensionMap(this.#profile.read().managedExtensions);
      const record2 = records[step2.projectId];
      try {
        if (!record2) throw new Error("Managed identity is unavailable.");
        const extension = (await this.#host.discover()).find(
          (candidate) => candidate.internalName === record2.internalName && candidate.folderName.toLocaleLowerCase() === record2.folderName.toLocaleLowerCase()
        );
        if (!extension) throw new Error("Managed extension is already missing.");
        await this.#host.remove({ internalName: extension.internalName, type: extension.type });
        changed = true;
        const stillPresent = (await this.#host.discover()).some(
          (candidate) => candidate.internalName === extension.internalName && candidate.type === extension.type
        );
        if (stillPresent) throw new Error("Removal could not be verified.");
        await this.#profile.update((draft) => {
          delete draft.managedExtensions[step2.projectId];
        });
        results.push(result(step2.projectId, "remove", "verified", "Removed and verified.", false));
      } catch (error) {
        results.push(result(step2.projectId, "remove", "failed", message(error), true));
      }
      journal.completedProjects = structuredClone(results);
      await this.journal.write(journal);
    }
    for (const step2 of plan.keptForOtherKits)
      results.push(
        result(step2.projectId, "keep", "kept", "Kept for another installed Kit.", false)
      );
    const failed = results.some(({ status }) => status === "failed");
    if (failed) await this.#markDrifted(plan.kitId);
    else await this.#kits.removeInstalledState(plan.kitId);
    if (changed) this.#host.reload();
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      failed ? "partial" : "completed",
      results
    );
  }
  async #recordManaged(project, extension) {
    if (!project.install) throw new Error("Missing install contract.");
    await this.#profile.update((draft) => {
      const registry = new ManagedRegistry(normalizeManagedExtensionMap(draft.managedExtensions));
      registry.recordInstalled({
        projectId: project.id,
        expectedFolderName: project.install.folderName,
        extension,
        installedAt: this.#now(),
        installedBy: "kit"
      });
      draft.managedExtensions = registry.read();
    });
  }
  async #recordKitState(plan, installed, missing, status) {
    await this.#kits.recordInstalledState({
      kitId: plan.kitId,
      definitionFingerprint: await topologyHash(plan.requiredProjectIds),
      installedProjectIds: installed,
      missingProjectIds: missing,
      status,
      installedAt: this.#now(),
      lastVerifiedAt: this.#now()
    });
  }
  async #markDrifted(kitId) {
    const state = this.#kits.readInstalled(kitId);
    if (!state) return;
    await this.#kits.recordInstalledState({
      ...state,
      status: "drifted",
      lastVerifiedAt: this.#now()
    });
  }
  async #verifyEnabled(plan, records) {
    const extensions = await this.#host.discover();
    return plan.enable.every((step2) => {
      const name = step2.internalName ?? records[step2.projectId]?.internalName;
      return Boolean(
        name && extensions.find((extension) => extension.internalName === name)?.enabled
      );
    }) && plan.disable.every(
      (step2) => Boolean(
        extensions.find((extension) => extension.internalName === step2.internalName) && !extensions.find((extension) => extension.internalName === step2.internalName)?.enabled
      )
    );
  }
  #receipt(plan, journal, previousActiveKitId, outcome, projects) {
    return {
      formatVersion: 1,
      kind: "kit-operation",
      id: journal.operationId,
      planId: plan.id,
      operation: plan.operation,
      kitId: plan.kitId,
      startedAt: journal.startedAt,
      completedAt: this.#now(),
      outcome,
      previousActiveKitId,
      activeKitId: this.#kits.readActiveId(),
      projects,
      keptForOtherKits: plan.keptForOtherKits.map(({ projectId }) => projectId)
    };
  }
  async #persistReceipt(receipt) {
    await this.#profile.update((draft) => {
      draft.operationReceipt = structuredClone(receipt);
    });
  }
};
function createKitExecutor(deps) {
  return new KitExecutor(deps);
}
function validateApproval(plan, approval) {
  if (approval.planId !== plan.id || approval.inventoryFingerprint !== plan.inventoryFingerprint || approval.catalogGeneratedAt !== plan.catalogGeneratedAt)
    throw new Error("Kit approval does not match this plan.");
  const accepted = new Set(approval.acceptedWarningProjectIds);
  if (plan.warnings.some(({ projectId }) => !accepted.has(projectId)))
    throw new Error("Every project warning must be accepted.");
}
function exactFolder2(extensions, folderName) {
  const matches = extensions.filter(
    (extension) => extension.folderName.normalize("NFKC").toLocaleLowerCase("en-US") === folderName.normalize("NFKC").toLocaleLowerCase("en-US")
  );
  return matches.length === 1 ? matches[0] : null;
}
function presentProjectIds(projects, extensions) {
  return new Set(
    projects.filter((project) => project.install && exactFolder2(extensions, project.install.folderName)).map(({ id }) => id)
  );
}
function result(projectId, action, status, messageText, retryable) {
  return { projectId, action, status, message: messageText, retryable };
}
function message(error) {
  return error instanceof Error ? error.message : "Host operation failed.";
}
async function topologyHash(projectIds) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(projectIds))
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// src/kits/kit-plan.ts
function freezeKitPlan(plan) {
  for (const value of Object.values(plan)) {
    if (Array.isArray(value)) {
      for (const item of value) if (typeof item === "object" && item) Object.freeze(item);
      Object.freeze(value);
    }
  }
  return Object.freeze(plan);
}

// src/kits/kit-reference-index.ts
function buildKitReferenceIndex(installed) {
  const mutable = /* @__PURE__ */ new Map();
  for (const kit of installed) {
    for (const projectId of new Set(kit.installedProjectIds)) {
      const kitIds = mutable.get(projectId) ?? [];
      kitIds.push(kit.kitId);
      mutable.set(projectId, kitIds);
    }
  }
  return new Map(
    [...mutable].map(([projectId, kitIds]) => [projectId, Object.freeze(kitIds.sort())])
  );
}

// src/kits/kit-planner.ts
function planKitOperation(input) {
  const projectById = new Map(input.catalog.projects.map((project) => [project.id, project]));
  const managedById = new Map(input.inventory.managed.map((entry) => [entry.project.id, entry]));
  const externalById = new Map(input.inventory.external.map((entry) => [entry.project.id, entry]));
  const references = buildKitReferenceIndex(input.installedKits);
  const plan = {
    id: planId(input),
    operation: input.operation,
    kitId: input.kit.id,
    catalogGeneratedAt: input.catalog.generatedAt,
    inventoryFingerprint: inventoryFingerprint(input),
    requiredProjectIds: [...input.kit.projectIds],
    install: [],
    enable: [],
    disable: [],
    remove: [],
    alreadyManaged: [],
    externalContext: [],
    contextOnly: [],
    keptForOtherKits: [],
    warnings: [],
    blockingIssues: [],
    reloadRequired: false
  };
  if (!input.catalogCanMutate) {
    plan.blockingIssues.push({
      code: "catalog-incompatible",
      projectId: null,
      message: "Update Companion before changing Kits."
    });
  }
  for (const projectId of input.kit.projectIds) {
    const project = projectById.get(projectId);
    if (projectId === COMPANION_PROJECT_ID) {
      if (input.kit.origin === "published")
        plan.contextOnly.push(step(projectId, "Tavernary Companion", null));
      else
        plan.blockingIssues.push({
          code: "companion-member",
          projectId,
          message: "Companion cannot belong to a personal Kit."
        });
      continue;
    }
    if (!project) {
      plan.blockingIssues.push({
        code: "project-unavailable",
        projectId,
        message: `${projectId} is unavailable.`
      });
      continue;
    }
    if (!isActionable(project)) {
      plan.contextOnly.push(stepFor(project, null));
      if (project.kind === "extension")
        plan.blockingIssues.push({
          code: "invalid-install-contract",
          projectId,
          message: `${project.name} cannot be installed by Companion.`
        });
      continue;
    }
    addWarning(plan, project);
    const managedEntry = managedById.get(projectId);
    const externalEntry = externalById.get(projectId);
    if (externalEntry) {
      plan.externalContext.push(stepFor(project, externalEntry.extension.internalName));
      continue;
    }
    if (managedEntry) {
      plan.alreadyManaged.push(stepFor(project, managedEntry.extension.internalName));
    }
    if (input.operation === "install" || input.operation === "activate") {
      if (!managedEntry) plan.install.push(stepFor(project, null));
      if (input.operation === "activate" && (!managedEntry || !managedEntry.extension.enabled))
        plan.enable.push(stepFor(project, managedEntry?.extension.internalName ?? null));
    } else if (input.operation === "deactivate") {
      if (managedEntry?.extension.enabled)
        plan.disable.push(stepFor(project, managedEntry.extension.internalName));
    } else {
      if (!managedEntry) continue;
      const otherReferences = (references.get(projectId) ?? []).filter((id) => id !== input.kit.id);
      if (otherReferences.length)
        plan.keptForOtherKits.push(stepFor(project, managedEntry.extension.internalName));
      else plan.remove.push(stepFor(project, managedEntry.extension.internalName));
    }
  }
  if (input.operation === "activate" && input.activeKitId && input.activeKitId !== input.kit.id) {
    const previous = input.installedKits.find(({ kitId }) => kitId === input.activeKitId);
    for (const projectId of previous?.installedProjectIds ?? []) {
      if (input.kit.projectIds.includes(projectId)) continue;
      const entry = managedById.get(projectId);
      if (entry?.extension.enabled)
        plan.disable.push(stepFor(entry.project, entry.extension.internalName));
    }
  }
  if (input.operation === "uninstall" && input.activeKitId === input.kit.id) {
    for (const entry of input.inventory.managed) {
      if (input.kit.projectIds.includes(entry.project.id) && entry.extension.enabled) {
        plan.disable.push(stepFor(entry.project, entry.extension.internalName));
      }
    }
  }
  plan.reloadRequired = Boolean(
    plan.install.length || plan.enable.length || plan.disable.length || plan.remove.length
  );
  return freezeKitPlan(plan);
}
function inventoryFingerprint(input) {
  const payload = JSON.stringify({
    managed: input.inventory.managed.map(({ project, extension }) => [project.id, extension.internalName, extension.enabled]).sort(),
    external: input.inventory.external.map(({ project, extension }) => [project.id, extension.internalName, extension.enabled]).sort(),
    records: Object.keys(input.managed).sort(),
    installedKits: input.installedKits.map(({ kitId, installedProjectIds }) => [kitId, [...installedProjectIds].sort()]).sort(),
    activeKitId: input.activeKitId
  });
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1)
    hash = Math.imul(hash ^ payload.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function planId(input) {
  return `${input.operation}:${input.kit.id}:${input.catalog.generatedAt}:${inventoryFingerprint(input)}`;
}
function isActionable(project) {
  return project.kind === "extension" && project.frontends.some(({ id }) => id === "sillytavern") && project.install?.kind === "sillytavern-extension-git";
}
function step(projectId, projectName2, internalName) {
  return { projectId, projectName: projectName2, internalName };
}
function stepFor(project, internalName) {
  return step(project.id, project.name, internalName);
}
function addWarning(plan, project) {
  const assessment = project.tavernKeeper;
  if (assessment?.riskLevel !== "material" && assessment?.riskLevel !== "high") return;
  plan.warnings.push({
    projectId: project.id,
    projectName: project.name,
    severity: assessment.riskLevel,
    freshness: assessment.freshness,
    reportUrl: assessment.report?.reportUrl ?? null
  });
}

// src/kits/kit-validation.ts
var KIT_KEYS = [
  "formatVersion",
  "id",
  "title",
  "description",
  "targetFrontend",
  "projectIds",
  "createdAt",
  "updatedAt",
  "origin"
];
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
var SHA256 = /^[0-9a-f]{64}$/u;
function parsePersonalKit(value) {
  const input = record(value, "Kit must be an object.");
  exactKeys(input, KIT_KEYS, "Kit");
  if (input.formatVersion !== 1) throw new Error("Unsupported Kit format version.");
  if (typeof input.id !== "string" || !UUID.test(input.id)) throw new Error("Invalid Kit ID.");
  const title = text(input.title, "title").trim();
  if (!title) throw new Error("Kit title is required.");
  const description = text(input.description, "description").trim();
  if (input.targetFrontend !== "sillytavern") throw new Error("Kit must target SillyTavern.");
  if (!Array.isArray(input.projectIds)) throw new Error("Kit projectIds must be an array.");
  const projectIds = input.projectIds.map((id) => text(id, "project ID").trim());
  if (projectIds.some((id) => !id)) throw new Error("Kit project IDs cannot be empty.");
  if (new Set(projectIds).size !== projectIds.length) throw new Error("Duplicate Kit project ID.");
  if (projectIds.includes(COMPANION_PROJECT_ID))
    throw new Error("Companion cannot belong to a Kit.");
  const createdAt = iso(input.createdAt, "createdAt");
  const updatedAt = iso(input.updatedAt, "updatedAt");
  return {
    formatVersion: 1,
    id: input.id,
    title,
    description,
    targetFrontend: "sillytavern",
    projectIds,
    createdAt,
    updatedAt,
    origin: parseOrigin(input.origin)
  };
}
function parseInstalledKitState(value) {
  const input = record(value, "Installed Kit state must be an object.");
  exactKeys(
    input,
    [
      "kitId",
      "definitionFingerprint",
      "installedProjectIds",
      "missingProjectIds",
      "status",
      "installedAt",
      "lastVerifiedAt"
    ],
    "Installed Kit state"
  );
  const kitId = text(input.kitId, "kitId");
  const definitionFingerprint = text(input.definitionFingerprint, "fingerprint");
  if (!SHA256.test(definitionFingerprint)) throw new Error("Invalid Kit fingerprint.");
  const installedProjectIds = uniqueStrings(input.installedProjectIds, "installedProjectIds");
  const missingProjectIds = uniqueStrings(input.missingProjectIds, "missingProjectIds");
  if (input.status !== "installed" && input.status !== "incomplete" && input.status !== "drifted") {
    throw new Error("Invalid installed Kit status.");
  }
  return {
    kitId,
    definitionFingerprint,
    installedProjectIds,
    missingProjectIds,
    status: input.status,
    installedAt: iso(input.installedAt, "installedAt"),
    lastVerifiedAt: iso(input.lastVerifiedAt, "lastVerifiedAt")
  };
}
function parseOrigin(value) {
  const origin = record(value, "Kit origin must be an object.");
  if (origin.kind === "local") {
    exactKeys(origin, ["kind"], "Kit origin");
    return { kind: "local" };
  }
  if (origin.kind === "published-copy") {
    exactKeys(origin, ["kind", "tavernaryKitId"], "Kit origin");
    return {
      kind: "published-copy",
      tavernaryKitId: text(origin.tavernaryKitId, "tavernaryKitId")
    };
  }
  if (origin.kind === "imported") {
    exactKeys(origin, ["kind", "sourceId"], "Kit origin");
    return { kind: "imported", sourceId: text(origin.sourceId, "sourceId") };
  }
  throw new Error("Invalid Kit origin.");
}
function record(value, message2) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(message2);
  return value;
}
function exactKeys(value, expected, label) {
  const expectedSet = new Set(expected);
  if (Object.keys(value).some((key) => !expectedSet.has(key)))
    throw new Error(`${label} contains unknown fields.`);
  if (expected.some((key) => !Object.hasOwn(value, key)))
    throw new Error(`${label} is missing fields.`);
}
function text(value, label) {
  if (typeof value !== "string") throw new Error(`Invalid ${label}.`);
  return value;
}
function iso(value, label) {
  const result2 = text(value, label);
  if (!Number.isFinite(Date.parse(result2)) || new Date(result2).toISOString() !== result2)
    throw new Error(`Invalid ${label}.`);
  return result2;
}
function uniqueStrings(value, label) {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label}.`);
  const result2 = value.map((entry) => text(entry, label));
  if (new Set(result2).size !== result2.length) throw new Error(`Duplicate ${label}.`);
  return result2;
}

// src/kits/kit-portability.ts
var MAX_KIT_FILE_BYTES = 1024 * 1024;
function serializeKit(kit) {
  const parsed = parsePersonalKit(kit);
  return {
    text: `${JSON.stringify(parsed, null, 2)}
`,
    filename: `${slug(parsed.title)}.tavernary-kit.json`,
    mimeType: "application/json"
  };
}
function parseKitText(text2) {
  if (new TextEncoder().encode(text2).byteLength > MAX_KIT_FILE_BYTES)
    throw new Error("Kit file exceeds 1 MiB.");
  let value;
  try {
    value = JSON.parse(text2);
  } catch {
    throw new Error("Kit file is not valid JSON.");
  }
  return parsePersonalKit(value);
}
function prepareImportedKit(kit, existingIds, uuid = () => crypto.randomUUID(), now = () => (/* @__PURE__ */ new Date()).toISOString()) {
  if (!existingIds.has(kit.id)) return structuredClone(kit);
  const timestamp = now();
  return parsePersonalKit({
    ...kit,
    id: uuid(),
    createdAt: timestamp,
    updatedAt: timestamp,
    origin: { kind: "imported", sourceId: kit.id }
  });
}
function slug(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "kit";
}

// src/kits/kit-store.ts
var KitStore = class {
  #profile;
  #uuid;
  #now;
  constructor(profile, dependencies = {}) {
    this.#profile = profile;
    this.#uuid = dependencies.uuid ?? (() => crypto.randomUUID());
    this.#now = dependencies.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
  }
  readDefinitions() {
    return Object.values(this.#profile.read().personalKits).flatMap((value) => safeParse(parsePersonalKit, value)).sort((a3, b2) => a3.title.localeCompare(b2.title));
  }
  readDefinition(id) {
    return safeParse(parsePersonalKit, this.#profile.read().personalKits[id])[0] ?? null;
  }
  readInstalled(id) {
    return safeParse(parseInstalledKitState, this.#profile.read().installedKits[id])[0] ?? null;
  }
  readInstalledStates() {
    return Object.values(this.#profile.read().installedKits).flatMap(
      (value) => safeParse(parseInstalledKitState, value)
    );
  }
  readActiveId() {
    return this.#profile.read().activeKitId;
  }
  async create(input) {
    const now = this.#now();
    const kit = parsePersonalKit({
      formatVersion: 1,
      id: this.#uuid(),
      title: input.title,
      description: input.description ?? "",
      targetFrontend: "sillytavern",
      projectIds: input.projectIds,
      createdAt: now,
      updatedAt: now,
      origin: input.origin ?? { kind: "local" }
    });
    await this.#profile.update((draft) => {
      if (draft.personalKits[kit.id]) throw new Error("Kit ID already exists.");
      draft.personalKits[kit.id] = kit;
    });
    return structuredClone(kit);
  }
  async importDefinition(value) {
    const kit = parsePersonalKit(value);
    await this.#profile.update((draft) => {
      if (draft.personalKits[kit.id]) throw new Error("Kit ID already exists.");
      draft.personalKits[kit.id] = kit;
    });
    return structuredClone(kit);
  }
  async update(id, change) {
    const current = this.readDefinition(id);
    if (!current) throw new Error("Unknown personal Kit.");
    const next = parsePersonalKit({ ...current, ...change, updatedAt: this.#now() });
    await this.#profile.update((draft) => {
      draft.personalKits[id] = next;
    });
    return structuredClone(next);
  }
  async duplicate(id) {
    const source = this.readDefinition(id);
    if (!source) throw new Error("Unknown personal Kit.");
    return this.create({
      title: `${source.title} copy`,
      description: source.description,
      projectIds: source.projectIds,
      origin: { kind: "local" }
    });
  }
  async copyPublished(kit) {
    return this.create({
      title: `${kit.title} copy`,
      description: kit.description,
      projectIds: kit.components.map(({ projectId }) => projectId).filter((id) => id !== "mentallyquill-tavernary-companion"),
      origin: { kind: "published-copy", tavernaryKitId: kit.id }
    });
  }
  async removeDefinition(id) {
    if (!this.readDefinition(id)) return false;
    await this.#profile.update((draft) => {
      delete draft.personalKits[id];
    });
    return true;
  }
  async recordInstalledState(state) {
    const parsed = parseInstalledKitState(state);
    await this.#profile.update((draft) => {
      draft.installedKits[state.kitId] = parsed;
    });
    return structuredClone(parsed);
  }
  async reconcile(state) {
    return this.recordInstalledState(state);
  }
  async removeInstalledState(id) {
    await this.#profile.update((draft) => {
      delete draft.installedKits[id];
      if (draft.activeKitId === id) draft.activeKitId = null;
    });
  }
  async setActive(id) {
    if (id && !this.readInstalled(id)) throw new Error("Only an installed Kit can be active.");
    await this.#profile.update((draft) => {
      draft.activeKitId = id;
    });
  }
};
function safeParse(parser, value) {
  try {
    return [parser(value)];
  } catch {
    return [];
  }
}

// src/ui/kits/kit-export-action.ts
function exportKitFile(kit) {
  const file = serializeKit(kit);
  const url = URL.createObjectURL(new Blob([file.text], { type: file.mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// src/kits/kit-draft.ts
function createKitDraft(source) {
  return validateDraft({
    sourceId: source?.id ?? null,
    title: source?.title ?? "",
    description: source?.description ?? "",
    targetFrontend: "sillytavern",
    projectIds: [...source?.projectIds ?? []],
    dirty: false,
    issues: []
  });
}
function updateKitDraft(draft, change) {
  return validateDraft({
    ...draft,
    ...change,
    projectIds: change.projectIds ? [...change.projectIds] : draft.projectIds,
    dirty: true,
    issues: []
  });
}
function addDraftMember(draft, projectId) {
  if (projectId === COMPANION_PROJECT_ID || draft.projectIds.includes(projectId)) return draft;
  return updateKitDraft(draft, { projectIds: [...draft.projectIds, projectId] });
}
function moveDraftMember(draft, projectId, direction) {
  const index = draft.projectIds.indexOf(projectId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= draft.projectIds.length) return draft;
  const ids = [...draft.projectIds];
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return updateKitDraft(draft, { projectIds: ids });
}
function selectableKitProjects(projects) {
  return projects.filter(
    (project) => project.id !== COMPANION_PROJECT_ID && project.kind === "extension" && project.frontends.some(({ id }) => id === "sillytavern") && project.install
  );
}
function validateDraft(draft) {
  const issues = [];
  if (!draft.title.trim()) issues.push("Title is required.");
  if (draft.projectIds.includes(COMPANION_PROJECT_ID))
    issues.push("Companion cannot belong to a Kit.");
  if (new Set(draft.projectIds).size !== draft.projectIds.length)
    issues.push("Duplicate projects are not allowed.");
  return { ...draft, title: draft.title, description: draft.description, issues };
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

// src/ui/lifecycle/dialog-frame.tsx
function DialogFrame({
  label,
  className = "",
  onCancel,
  children
}) {
  const dialog = A2(null);
  h2(() => {
    const controls = dialog.current?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]'
    );
    controls?.[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !controls || controls.length === 0) return;
      const first = controls[0];
      const last2 = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last2.focus();
      } else if (!event.shiftKey && document.activeElement === last2) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);
  return /* @__PURE__ */ u3("div", { class: "tavernary-companion-dialog-backdrop", children: /* @__PURE__ */ u3(
    "div",
    {
      ref: dialog,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": label,
      class: `tavernary-companion-dialog ${className}`.trim(),
      children
    }
  ) });
}

// src/ui/kits/kit-member-picker.tsx
function KitMemberPicker({
  projects,
  selected,
  onAdd
}) {
  const options = selectableKitProjects(projects).filter(({ id }) => !selected.includes(id));
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-kit-member-picker", children: [
    /* @__PURE__ */ u3("h3", { children: "Add extensions" }),
    options.length ? /* @__PURE__ */ u3("ul", { children: options.map((project) => /* @__PURE__ */ u3("li", { children: [
      /* @__PURE__ */ u3("span", { children: project.name }),
      /* @__PURE__ */ u3("button", { type: "button", onClick: () => onAdd(project.id), children: "Add" })
    ] }, project.id)) }) : /* @__PURE__ */ u3("p", { children: "No eligible extensions remain." })
  ] });
}

// src/ui/kits/kit-member-row.tsx
function KitMemberRow({
  id,
  name,
  first,
  last: last2,
  onMove,
  onRemove
}) {
  return /* @__PURE__ */ u3("li", { "data-project-id": id, children: [
    /* @__PURE__ */ u3("span", { children: name }),
    /* @__PURE__ */ u3("div", { children: [
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          disabled: first,
          "aria-label": `Move ${name} up`,
          onClick: () => onMove(-1),
          children: "\u2191"
        }
      ),
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          disabled: last2,
          "aria-label": `Move ${name} down`,
          onClick: () => onMove(1),
          children: "\u2193"
        }
      ),
      /* @__PURE__ */ u3("button", { type: "button", "aria-label": `Remove ${name}`, onClick: onRemove, children: "Remove" })
    ] })
  ] });
}

// src/ui/kits/kit-editor.tsx
function KitEditor({
  source,
  projects,
  onSave,
  onCancel
}) {
  const [draft, setDraft] = d2(() => createKitDraft(source));
  const byId = T2(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  return /* @__PURE__ */ u3(DialogFrame, { label: source ? "Edit personal Kit" : "New personal Kit", onCancel, children: /* @__PURE__ */ u3(
    "form",
    {
      onSubmit: (event) => {
        event.preventDefault();
        if (!draft.issues.length) onSave(draft);
      },
      children: [
        /* @__PURE__ */ u3("label", { children: [
          "Title",
          /* @__PURE__ */ u3(
            "input",
            {
              value: draft.title,
              onInput: (event) => setDraft(updateKitDraft(draft, { title: event.currentTarget.value }))
            }
          )
        ] }),
        /* @__PURE__ */ u3("label", { children: [
          "Description",
          /* @__PURE__ */ u3(
            "textarea",
            {
              value: draft.description,
              onInput: (event) => setDraft(updateKitDraft(draft, { description: event.currentTarget.value }))
            }
          )
        ] }),
        /* @__PURE__ */ u3("p", { children: [
          "Frontend: ",
          /* @__PURE__ */ u3("strong", { children: "SillyTavern" })
        ] }),
        /* @__PURE__ */ u3("section", { children: [
          /* @__PURE__ */ u3("h3", { children: "Kit members" }),
          draft.projectIds.length ? /* @__PURE__ */ u3("ol", { children: draft.projectIds.map((id, index) => /* @__PURE__ */ u3(
            KitMemberRow,
            {
              id,
              name: byId.get(id)?.name ?? id,
              first: index === 0,
              last: index === draft.projectIds.length - 1,
              onMove: (direction) => setDraft(moveDraftMember(draft, id, direction)),
              onRemove: () => setDraft(
                updateKitDraft(draft, {
                  projectIds: draft.projectIds.filter((candidate) => candidate !== id)
                })
              )
            },
            id
          )) }) : /* @__PURE__ */ u3("p", { children: "No extensions selected yet." })
        ] }),
        /* @__PURE__ */ u3(
          KitMemberPicker,
          {
            projects,
            selected: draft.projectIds,
            onAdd: (id) => setDraft(addDraftMember(draft, id))
          }
        ),
        draft.issues.length ? /* @__PURE__ */ u3("ul", { role: "alert", children: draft.issues.map((issue) => /* @__PURE__ */ u3("li", { children: issue }, issue)) }) : null,
        /* @__PURE__ */ u3("footer", { children: [
          /* @__PURE__ */ u3("button", { type: "button", onClick: onCancel, children: "Cancel" }),
          /* @__PURE__ */ u3("button", { type: "submit", disabled: draft.issues.length > 0, children: "Save Kit" })
        ] })
      ]
    }
  ) });
}

// src/ui/kits/kit-import-dialog.tsx
function KitImportDialog({
  onCancel,
  onImport
}) {
  const [preview, setPreview] = d2(null);
  const [error, setError] = d2(null);
  const load = async (file) => {
    if (!file) return;
    try {
      setPreview(parseKitText(await file.text()));
      setError(null);
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : "Kit file is invalid.");
    }
  };
  return /* @__PURE__ */ u3(DialogFrame, { label: "Import personal Kit", onCancel, children: [
    /* @__PURE__ */ u3("h2", { children: "Import personal Kit" }),
    /* @__PURE__ */ u3("label", { children: [
      "Kit JSON file",
      /* @__PURE__ */ u3(
        "input",
        {
          type: "file",
          accept: ".json,application/json",
          onChange: (event) => void load(event.currentTarget.files?.[0])
        }
      )
    ] }),
    error ? /* @__PURE__ */ u3("p", { role: "alert", children: error }) : null,
    preview ? /* @__PURE__ */ u3("section", { children: [
      /* @__PURE__ */ u3("h3", { children: preview.title }),
      /* @__PURE__ */ u3("p", { children: preview.description }),
      /* @__PURE__ */ u3("dl", { children: [
        /* @__PURE__ */ u3("dt", { children: "Frontend" }),
        /* @__PURE__ */ u3("dd", { children: "SillyTavern" }),
        /* @__PURE__ */ u3("dt", { children: "Members" }),
        /* @__PURE__ */ u3("dd", { children: preview.projectIds.length }),
        /* @__PURE__ */ u3("dt", { children: "Origin" }),
        /* @__PURE__ */ u3("dd", { children: preview.origin.kind })
      ] })
    ] }) : null,
    /* @__PURE__ */ u3("footer", { children: [
      /* @__PURE__ */ u3("button", { type: "button", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ u3("button", { type: "button", disabled: !preview, onClick: () => preview && onImport(preview), children: "Import Kit" })
    ] })
  ] });
}

// src/ui/kits/kit-receipt.tsx
function KitReceipt({
  receipt,
  onDismiss,
  onRetry
}) {
  return /* @__PURE__ */ u3("article", { class: "tavernary-companion-kit-receipt", children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("h3", { children: receipt.operation === "activate" && receipt.outcome === "completed" ? "Managed Kit activated" : `Kit ${receipt.outcome}` }),
        receipt.previousActiveKitId && receipt.activeKitId === receipt.previousActiveKitId && receipt.outcome !== "completed" ? /* @__PURE__ */ u3("p", { children: [
          receipt.previousActiveKitId,
          " remains active."
        ] }) : null
      ] }),
      /* @__PURE__ */ u3("button", { type: "button", onClick: onDismiss, children: "Dismiss" })
    ] }),
    /* @__PURE__ */ u3("ul", { children: receipt.projects.map((project, index) => /* @__PURE__ */ u3("li", { children: [
      /* @__PURE__ */ u3("strong", { children: project.projectId }),
      /* @__PURE__ */ u3("span", { children: [
        project.action,
        " \xB7 ",
        project.status
      ] }),
      /* @__PURE__ */ u3("span", { children: project.message })
    ] }, `${project.projectId}-${project.action}-${index}`)) }),
    receipt.projects.some(({ retryable }) => retryable) ? /* @__PURE__ */ u3("button", { type: "button", onClick: onRetry, children: "Review retry" }) : null
  ] });
}

// src/ui/kits/kit-operation-tray.tsx
function KitOperationTray({
  active,
  receipt,
  onDismiss,
  onRetry
}) {
  if (active?.operationId.startsWith("kit:"))
    return /* @__PURE__ */ u3("aside", { class: "tavernary-companion-kit-operation-tray", role: "status", "aria-live": "polite", children: [
      /* @__PURE__ */ u3("span", { "aria-hidden": "true" }),
      " ",
      /* @__PURE__ */ u3("p", { children: phase(active.phase) })
    ] });
  if (receipt)
    return /* @__PURE__ */ u3("aside", { class: "tavernary-companion-kit-operation-tray", children: /* @__PURE__ */ u3(KitReceipt, { receipt, onDismiss, onRetry }) });
  return null;
}
function phase(value) {
  if (value.startsWith("installing:")) return `Installing ${value.slice(11)}\u2026`;
  if (value.startsWith("removing:")) return `Removing ${value.slice(9)}\u2026`;
  return {
    activating: "Activating managed extensions\u2026",
    deactivating: "Deactivating managed extensions\u2026",
    preflight: "Checking Kit plan\u2026"
  }[value] ?? "Applying Kit changes\u2026";
}

// src/ui/kits/kit-impact-summary.tsx
var groups = [
  { key: "install", title: "Install" },
  { key: "enable", title: "Enable" },
  { key: "disable", title: "Disable" },
  { key: "remove", title: "Remove" },
  { key: "alreadyManaged", title: "Already managed" },
  { key: "externalContext", title: "External, unchanged" },
  { key: "contextOnly", title: "Context only" },
  { key: "keptForOtherKits", title: "Kept for other Kits" }
];
function KitImpactSummary({ plan }) {
  return /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-impact", children: [
    groups.map(({ key, title }) => /* @__PURE__ */ u3(ImpactGroup, { title, steps: plan[key] }, key)),
    plan.blockingIssues.length ? /* @__PURE__ */ u3("section", { children: [
      /* @__PURE__ */ u3("h3", { children: "Cannot continue" }),
      /* @__PURE__ */ u3("ul", { children: plan.blockingIssues.map((issue, index) => /* @__PURE__ */ u3("li", { children: issue.message }, `${issue.code}-${index}`)) })
    ] }) : null
  ] });
}
function ImpactGroup({
  title,
  steps
}) {
  return steps.length ? /* @__PURE__ */ u3("section", { children: [
    /* @__PURE__ */ u3("h3", { children: title }),
    /* @__PURE__ */ u3("ul", { children: steps.map((step2) => /* @__PURE__ */ u3("li", { children: step2.projectName }, step2.projectId)) })
  ] }) : null;
}

// src/ui/kits/kit-warning-group.tsx
function KitWarningGroup({
  warnings,
  onReview
}) {
  if (!warnings.length) return null;
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-kit-warnings", role: "alert", children: [
    /* @__PURE__ */ u3("h3", { children: "Security concerns" }),
    /* @__PURE__ */ u3("p", { children: CURRENT_ASSESSMENT_WARNING }),
    /* @__PURE__ */ u3("ul", { children: warnings.map((warning) => /* @__PURE__ */ u3("li", { children: [
      /* @__PURE__ */ u3("span", { children: [
        /* @__PURE__ */ u3("strong", { children: warning.projectName }),
        " \xB7",
        " ",
        warning.severity === "high" ? "Immediate danger" : "Potential concern",
        warning.freshness === "stale" ? " \xB7 stale assessment" : ""
      ] }),
      warning.reportUrl ? /* @__PURE__ */ u3("button", { type: "button", onClick: () => onReview(warning.reportUrl), children: "Scan Review" }) : /* @__PURE__ */ u3("span", { children: "No scan link available" })
    ] }, warning.projectId)) })
  ] });
}

// src/ui/kits/kit-preflight-dialog.tsx
function KitPreflightDialog({
  plan,
  onCancel,
  onReview,
  onConfirm
}) {
  const confirm = plan.warnings.length ? "Install anyway" : {
    install: "Install Kit",
    activate: "Activate Kit",
    deactivate: "Deactivate Kit",
    uninstall: "Uninstall Kit"
  }[plan.operation];
  return /* @__PURE__ */ u3(DialogFrame, { label: `${confirm} review`, onCancel, children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("h2", { children: [
        "Review ",
        plan.operation,
        " changes"
      ] }),
      /* @__PURE__ */ u3("p", { children: "Companion changes only extensions it manages. External extensions remain untouched." })
    ] }),
    /* @__PURE__ */ u3(KitImpactSummary, { plan }),
    /* @__PURE__ */ u3(KitWarningGroup, { warnings: plan.warnings, onReview }),
    /* @__PURE__ */ u3("footer", { children: [
      /* @__PURE__ */ u3("button", { type: "button", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          disabled: plan.blockingIssues.length > 0,
          onClick: () => onConfirm({
            planId: plan.id,
            inventoryFingerprint: plan.inventoryFingerprint,
            catalogGeneratedAt: plan.catalogGeneratedAt,
            acceptedWarningProjectIds: plan.warnings.map(({ projectId }) => projectId)
          }),
          children: confirm
        }
      )
    ] })
  ] });
}

// src/ui/lifecycle/assessment-warning-dialog.tsx
function AssessmentWarningDialog({
  projectName: projectName2,
  prompt,
  onReview,
  onCancel,
  onConfirm
}) {
  const high = prompt.severity === "high";
  return /* @__PURE__ */ u3(
    DialogFrame,
    {
      label: `Security warning for ${projectName2}`,
      className: high ? "is-high" : "is-material",
      onCancel,
      children: [
        /* @__PURE__ */ u3("p", { class: "tavernary-companion-dialog__severity", children: high ? "Immediate danger" : "Material concern" }),
        /* @__PURE__ */ u3("h2", { children: [
          "Review before installing ",
          projectName2
        ] }),
        /* @__PURE__ */ u3("p", { children: prompt.copy }),
        prompt.reviewDisabledReason ? /* @__PURE__ */ u3("p", { children: prompt.reviewDisabledReason }) : null,
        /* @__PURE__ */ u3("div", { class: "tavernary-companion-dialog__actions", children: [
          /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              onClick: () => prompt.reportUrl && onReview(prompt.reportUrl),
              disabled: !prompt.reportUrl,
              children: "Scan Review"
            }
          ),
          /* @__PURE__ */ u3("button", { type: "button", onClick: onCancel, children: "Cancel" }),
          /* @__PURE__ */ u3("button", { type: "button", class: "is-danger", onClick: onConfirm, children: "Install anyway" })
        ] })
      ]
    }
  );
}

// src/ui/lifecycle/operation-receipt.tsx
function OperationReceipt({
  receipt,
  onDismiss
}) {
  const succeeded = receipt.status === "succeeded";
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-operation-receipt", "aria-label": "Operation receipt", children: [
    /* @__PURE__ */ u3("h3", { children: receiptHeading(receipt) }),
    receipt.safeError ? /* @__PURE__ */ u3("p", { children: receipt.safeError }) : null,
    receipt.reloadRequired ? /* @__PURE__ */ u3("p", { children: "Reload required" }) : null,
    /* @__PURE__ */ u3("ol", { children: receipt.steps.map((step2) => /* @__PURE__ */ u3("li", { "data-status": step2.status, children: [
      stepLabel(step2.id),
      ": ",
      step2.status
    ] })) }),
    /* @__PURE__ */ u3("p", { children: succeeded ? "Verified against SillyTavern." : "No unverified success was recorded." }),
    onDismiss ? /* @__PURE__ */ u3("button", { type: "button", onClick: onDismiss, children: "Dismiss" }) : null
  ] });
}
function receiptHeading(receipt) {
  if (receipt.status === "succeeded") {
    return `${receipt.projectName} ${receipt.kind === "install" ? "installed" : "removed"} and verified`;
  }
  if (receipt.status === "cancelled") return `${receipt.projectName} operation cancelled`;
  return `${receipt.projectName} ${receipt.kind} did not complete`;
}
function stepLabel(id) {
  return {
    requested: "Requested",
    "host-accepted": "Host accepted",
    verified: "Verified",
    recorded: "Recorded"
  }[id];
}

// src/ui/lifecycle/operation-tray.tsx
function OperationTray({
  active,
  receipt,
  error,
  onDismissReceipt,
  onDismissError
}) {
  if (error) {
    return /* @__PURE__ */ u3(
      "aside",
      {
        class: "tavernary-companion-operation-tray tavernary-companion-operation-tray--error",
        role: "alert",
        children: [
          /* @__PURE__ */ u3("p", { children: error }),
          /* @__PURE__ */ u3("button", { type: "button", onClick: onDismissError, children: "Dismiss" })
        ]
      }
    );
  }
  if (active) {
    return /* @__PURE__ */ u3("aside", { class: "tavernary-companion-operation-tray", role: "status", "aria-live": "polite", children: [
      /* @__PURE__ */ u3("span", { class: "tavernary-companion-operation-tray__indicator", "aria-hidden": "true" }),
      /* @__PURE__ */ u3("p", { children: phaseLabel(active.phase) })
    ] });
  }
  if (receipt) {
    return /* @__PURE__ */ u3("aside", { class: "tavernary-companion-operation-tray", children: /* @__PURE__ */ u3(OperationReceipt, { receipt, onDismiss: onDismissReceipt }) });
  }
  return null;
}
function phaseLabel(phase2) {
  return {
    preflight: "Checking project eligibility\u2026",
    discovering: "Reading installed extensions\u2026",
    "awaiting-confirmation": "Waiting for confirmation\u2026",
    "host-request": "SillyTavern is applying the change\u2026",
    verifying: "Verifying installed state\u2026",
    recording: "Recording verified state\u2026"
  }[phase2] ?? "Working\u2026";
}

// src/ui/lifecycle/removal-dialog.tsx
function RemovalDialog({
  impact,
  onCancel,
  onConfirm
}) {
  return /* @__PURE__ */ u3(DialogFrame, { label: `Uninstall ${impact.projectName}`, onCancel, children: [
    /* @__PURE__ */ u3("h2", { children: [
      "Uninstall ",
      impact.projectName,
      "?"
    ] }),
    /* @__PURE__ */ u3("p", { children: impact.ownershipLabel }),
    /* @__PURE__ */ u3("p", { children: impact.confirmation }),
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-dialog__actions", children: [
      /* @__PURE__ */ u3("button", { type: "button", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ u3("button", { type: "button", class: "is-danger", onClick: onConfirm, disabled: !impact.removable, children: "Uninstall" })
    ] })
  ] });
}

// src/ui/lifecycle/trust-disclosure-dialog.tsx
function TrustDisclosureDialog({
  prompt,
  onCancel,
  onConfirm
}) {
  return /* @__PURE__ */ u3(DialogFrame, { label: "Third-party extension disclosure", onCancel, children: [
    /* @__PURE__ */ u3("h2", { children: "Before installing extensions" }),
    /* @__PURE__ */ u3("p", { children: prompt.copy }),
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-dialog__actions", children: [
      /* @__PURE__ */ u3("button", { type: "button", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ u3("button", { type: "button", onClick: onConfirm, children: "I understand" })
    ] })
  ] });
}

// src/ui/installed/installed-section.tsx
function InstalledSection({
  section,
  onOpenProject,
  onAction,
  onManage,
  lifecycleDisabled
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
        onManage,
        lifecycleDisabled
      }
    )) })
  ] });
}
function InstalledRow({
  row,
  sectionId,
  onOpenProject,
  onAction,
  onManage,
  lifecycleDisabled
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
        disabled: !unknown && lifecycleDisabled,
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
  onManage,
  lifecycleDisabled
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
        onManage,
        lifecycleDisabled
      },
      section.id
    ))
  ] });
}

// src/ui/kits/kit-component-group.tsx
function KitComponentGroup({
  title,
  components
}) {
  if (!components.length) return null;
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-kit-components", children: [
    /* @__PURE__ */ u3("h3", { children: title }),
    /* @__PURE__ */ u3("ul", { children: components.map((component2) => /* @__PURE__ */ u3("li", { children: [
      /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("strong", { children: component2.name }),
        /* @__PURE__ */ u3("span", { children: [
          component2.available ? "Available" : "Unavailable",
          component2.assessment ? ` \xB7 ${component2.assessment} concern` : ""
        ] })
      ] }),
      component2.canonicalUrl ? /* @__PURE__ */ u3("a", { href: component2.canonicalUrl, target: "_blank", rel: "noreferrer", children: "Project" }) : null
    ] }, component2.projectId)) })
  ] });
}

// src/ui/kits/kit-inspector.tsx
var groups2 = [
  { id: "managed", title: "Managed/actionable extensions" },
  { id: "external", title: "External extensions" },
  { id: "context", title: "Context-only projects" },
  { id: "unavailable", title: "Unavailable or changed" }
];
function KitInspector({
  kit,
  disabled,
  onAction,
  onEdit,
  onCopy,
  onExport,
  onUninstall
}) {
  return /* @__PURE__ */ u3("article", { class: "tavernary-companion-kit-inspector", children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("p", { children: [
        kit.originLabel,
        " \xB7 ",
        kit.operationalStatus
      ] }),
      /* @__PURE__ */ u3("h2", { children: kit.title }),
      /* @__PURE__ */ u3("p", { children: kit.description })
    ] }),
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-inspector__actions", children: [
      /* @__PURE__ */ u3("button", { type: "button", disabled, onClick: () => onAction(kit.primaryAction), children: kit.primaryAction.label }),
      kit.editable ? /* @__PURE__ */ u3("button", { type: "button", onClick: onEdit, children: "Edit" }) : /* @__PURE__ */ u3("button", { type: "button", onClick: onCopy, children: "Copy to Personal Kits" }),
      kit.editable ? /* @__PURE__ */ u3("button", { type: "button", onClick: onExport, children: "Export" }) : null,
      kit.operationalStatus !== "Saved" ? /* @__PURE__ */ u3("button", { type: "button", disabled, onClick: onUninstall, children: "Uninstall Kit" }) : null
    ] }),
    groups2.map(({ id, title }) => /* @__PURE__ */ u3(
      KitComponentGroup,
      {
        title,
        components: kit.components.filter(({ group }) => group === id)
      },
      id
    ))
  ] });
}

// src/ui/kits/kit-card.tsx
function KitCard({
  kit,
  disabled,
  onOpen,
  onAction
}) {
  return /* @__PURE__ */ u3("article", { class: "tavernary-companion-kit-card", "data-kit-id": kit.id, children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("h3", { children: kit.title }),
      /* @__PURE__ */ u3("span", { children: kit.originLabel })
    ] }),
    /* @__PURE__ */ u3("p", { children: kit.description || "No description provided." }),
    /* @__PURE__ */ u3("dl", { children: [
      /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("dt", { children: "Components" }),
        /* @__PURE__ */ u3("dd", { children: kit.componentCount })
      ] }),
      /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("dt", { children: "Status" }),
        /* @__PURE__ */ u3("dd", { children: kit.operationalStatus })
      ] }),
      kit.flaggedCount ? /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("dt", { children: "Flagged" }),
        /* @__PURE__ */ u3("dd", { children: kit.flaggedCount })
      ] }) : null
    ] }),
    /* @__PURE__ */ u3("footer", { children: [
      /* @__PURE__ */ u3("button", { type: "button", "data-focus-key": `kit-${kit.id}`, onClick: onOpen, children: "Details" }),
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          class: "tavernary-companion-kit-card__primary",
          disabled,
          onClick: () => onAction(kit.primaryAction),
          children: kit.primaryAction.label
        }
      )
    ] })
  ] });
}

// src/ui/kits/kit-filter-panel.tsx
function KitFilterPanel({
  query,
  onChange
}) {
  const update = (change) => onChange({ ...query, ...change });
  return /* @__PURE__ */ u3("fieldset", { class: "tavernary-companion-kit-filters", children: [
    /* @__PURE__ */ u3("legend", { children: "Published Kit filters" }),
    /* @__PURE__ */ u3("label", { children: [
      "Frontend",
      " ",
      /* @__PURE__ */ u3(
        "input",
        {
          value: query.frontends.join(", "),
          onInput: (event) => update({ frontends: split(event.currentTarget.value) })
        }
      )
    ] }),
    /* @__PURE__ */ u3("label", { children: [
      "Purpose",
      " ",
      /* @__PURE__ */ u3(
        "input",
        {
          value: query.purposes.join(", "),
          onInput: (event) => update({ purposes: split(event.currentTarget.value) })
        }
      )
    ] }),
    /* @__PURE__ */ u3("label", { children: [
      "Model family",
      " ",
      /* @__PURE__ */ u3(
        "input",
        {
          value: (query.modelFamilies ?? []).join(", "),
          onInput: (event) => update({ modelFamilies: split(event.currentTarget.value) })
        }
      )
    ] }),
    /* @__PURE__ */ u3("label", { children: [
      "Includes project",
      " ",
      /* @__PURE__ */ u3(
        "input",
        {
          value: query.includesProjectId,
          onInput: (event) => update({ includesProjectId: event.currentTarget.value.trim() })
        }
      )
    ] }),
    /* @__PURE__ */ u3("label", { children: [
      "Minimum components",
      " ",
      /* @__PURE__ */ u3(
        "input",
        {
          type: "number",
          min: "0",
          max: "50",
          value: query.minProjects,
          onInput: (event) => update({ minProjects: event.currentTarget.valueAsNumber || 0 })
        }
      )
    ] }),
    /* @__PURE__ */ u3("label", { children: [
      "Maximum components",
      " ",
      /* @__PURE__ */ u3(
        "input",
        {
          type: "number",
          min: "1",
          max: "100",
          value: query.maxProjects,
          onInput: (event) => update({ maxProjects: event.currentTarget.valueAsNumber || 50 })
        }
      )
    ] }),
    /* @__PURE__ */ u3("label", { children: [
      /* @__PURE__ */ u3(
        "input",
        {
          type: "checkbox",
          checked: query.allComponentsAvailable,
          onChange: (event) => update({ allComponentsAvailable: event.currentTarget.checked })
        }
      ),
      " ",
      "All components available"
    ] }),
    /* @__PURE__ */ u3("label", { children: [
      "Sort",
      " ",
      /* @__PURE__ */ u3(
        "select",
        {
          value: query.sort,
          onChange: (event) => update({ sort: event.currentTarget.value }),
          children: [
            /* @__PURE__ */ u3("option", { value: "trending", children: "Trending" }),
            /* @__PURE__ */ u3("option", { value: "newest", children: "Newest" }),
            /* @__PURE__ */ u3("option", { value: "updated", children: "Recently updated" }),
            /* @__PURE__ */ u3("option", { value: "alphabetical", children: "Alphabetical" }),
            /* @__PURE__ */ u3("option", { value: "relevance", children: "Relevance" })
          ]
        }
      )
    ] })
  ] });
}
function split(value) {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

// src/ui/kits/kits-route.tsx
function KitsRoute({
  controller,
  lifecycleDisabled = false,
  onOpenKit,
  onAction,
  onNewKit,
  onImport
}) {
  const [state, setState] = d2(controller.read());
  h2(() => controller.subscribe(setState), [controller]);
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-kits-route", "aria-labelledby": "kits-heading", children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("h2", { id: "kits-heading", children: "Kits" }),
        /* @__PURE__ */ u3("p", { children: "Save, install, and switch extension collections." })
      ] }),
      /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("button", { type: "button", onClick: onNewKit, children: "New Kit" }),
        /* @__PURE__ */ u3("button", { type: "button", onClick: onImport, children: "Import" })
      ] })
    ] }),
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-segments", role: "tablist", "aria-label": "Kit sources", children: [
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": state.segment === "published",
          onClick: () => controller.setSegment("published"),
          children: [
            "Published ",
            /* @__PURE__ */ u3("span", { children: state.publishedCount })
          ]
        }
      ),
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": state.segment === "personal",
          onClick: () => controller.setSegment("personal"),
          children: [
            "Personal ",
            /* @__PURE__ */ u3("span", { children: state.personalCount })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ u3("label", { class: "tavernary-companion-kit-search", children: [
      "Search Kits",
      /* @__PURE__ */ u3(
        "input",
        {
          type: "search",
          value: state.search,
          onInput: (event) => controller.setSearch(event.currentTarget.value)
        }
      )
    ] }),
    state.segment === "published" ? /* @__PURE__ */ u3(KitFilterPanel, { query: state.query, onChange: (query) => controller.setQuery(query) }) : null,
    state.visible.length ? /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-grid", children: state.visible.map((kit) => /* @__PURE__ */ u3(
      KitCard,
      {
        kit,
        disabled: lifecycleDisabled,
        onOpen: () => onOpenKit(kit.id),
        onAction: (action) => onAction(kit.id, action)
      },
      `${kit.origin}-${kit.id}`
    )) }) : /* @__PURE__ */ u3("p", { children: "No Kits match the current view." })
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
  const elapsed2 = Math.max(0, Date.parse(now) - Date.parse(value));
  const minutes = Math.floor(elapsed2 / 6e4);
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
function ProjectDetail({
  project,
  onAction,
  onManageInSillyTavern,
  lifecycleDisabled = false
}) {
  const selfProtected = project.id === COMPANION_PROJECT_ID || project.action.kind === "current-extension";
  return /* @__PURE__ */ u3("article", { class: "tavernary-companion-project-detail", children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("p", { children: project.kind }),
      /* @__PURE__ */ u3("h2", { children: project.name }),
      /* @__PURE__ */ u3("p", { children: project.summary }),
      selfProtected ? /* @__PURE__ */ u3("button", { type: "button", onClick: onManageInSillyTavern, children: "Manage in SillyTavern" }) : /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          "aria-label": `${project.action.label} ${project.name}`,
          onClick: () => onAction(project.action),
          disabled: lifecycleDisabled,
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
function ProjectCard({
  project,
  onOpen,
  onAction,
  onManageInSillyTavern,
  lifecycleDisabled = false,
  kitSelectionActive = false,
  onAddToKit
}) {
  const selfProtected = project.id === COMPANION_PROJECT_ID || project.action.kind === "current-extension";
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
      kitSelectionActive && !selfProtected && project.kind === "extension" ? /* @__PURE__ */ u3("button", { type: "button", onClick: () => onAddToKit?.(project.id), children: "Add to Kit" }) : null,
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
      selfProtected ? /* @__PURE__ */ u3("button", { type: "button", onClick: onManageInSillyTavern, children: "Manage in SillyTavern" }) : /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          class: "tavernary-companion-project-card__primary",
          "data-testid": "project-primary-action",
          "aria-label": `${project.action.label} ${project.name}`,
          onClick: () => onAction(project.action),
          disabled: lifecycleDisabled,
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
  onProjectAction,
  onManageInSillyTavern,
  lifecycleDisabled
}) {
  if (projects.length === 0) {
    return /* @__PURE__ */ u3("p", { children: "No projects match the current filters." });
  }
  return /* @__PURE__ */ u3("div", { class: "tavernary-companion-project-grid", "aria-label": "Project results", children: projects.map((project) => /* @__PURE__ */ u3(
    ProjectCard,
    {
      project,
      onOpen: () => onOpenProject(project.id),
      onAction: (action) => onProjectAction(project.id, action),
      onManageInSillyTavern,
      lifecycleDisabled
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
  onProjectAction = () => void 0,
  onManageInSillyTavern,
  lifecycleDisabled
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
      const last2 = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last2.focus();
      } else if (!event.shiftKey && document.activeElement === last2) {
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
          onProjectAction,
          onManageInSillyTavern,
          lifecycleDisabled
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
  lifecycleDisabled = false,
  kitDiscovery,
  kitInspectors = {},
  onKitAction,
  onNewKit,
  onImportKit,
  onEditKit,
  onCopyKit,
  onExportKit,
  onUninstallKit,
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
                      onProjectAction: (id, action) => {
                        if (action.kind === "view-project") {
                          controller.openDetail({ kind: "project", id, focusKey: `project-${id}` });
                        } else {
                          onProjectAction?.(id, action);
                        }
                      },
                      onManageInSillyTavern: onOpenExtensionManager,
                      lifecycleDisabled
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
                  children: kitDiscovery ? /* @__PURE__ */ u3(
                    KitsRoute,
                    {
                      controller: kitDiscovery,
                      lifecycleDisabled,
                      onOpenKit: (id) => controller.openDetail({ kind: "kit", id, focusKey: `kit-${id}` }),
                      onAction: (id, action) => onKitAction?.(id, action),
                      onNewKit,
                      onImport: onImportKit
                    }
                  ) : /* @__PURE__ */ u3("h2", { id: "tavernary-companion-kits-heading", children: "Kits" })
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
                      onManage: onOpenExtensionManager,
                      lifecycleDisabled
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
                    onAction: (action) => onProjectAction?.(detail.id, action),
                    onManageInSillyTavern: onOpenExtensionManager,
                    lifecycleDisabled
                  }
                ) : detail.kind === "kit" && kitInspectors[detail.id] ? /* @__PURE__ */ u3(
                  KitInspector,
                  {
                    kit: kitInspectors[detail.id],
                    disabled: lifecycleDisabled,
                    onAction: (action) => onKitAction?.(detail.id, action),
                    onEdit: () => onEditKit?.(detail.id),
                    onCopy: () => onCopyKit?.(detail.id),
                    onExport: () => onExportKit?.(detail.id),
                    onUninstall: () => onUninstallKit?.(detail.id)
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
  const result2 = controller.back();
  if (!result2.handled || !result2.focusKey) return;
  queueMicrotask(() => {
    const candidates = document.querySelectorAll("[data-focus-key]");
    for (const candidate of candidates) {
      if (candidate.dataset.focusKey === result2.focusKey) {
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
var emptyInventory = { managed: [], external: [], unknown: [], missingManaged: [] };
function CompanionPopupHost({
  store,
  host,
  runtime: suppliedRuntime
}) {
  const shell = T2(
    () => createShellController({
      initialRoute: store?.read().preferences.route ?? "projects",
      persistRoute: store ? async (route) => {
        await store.update((draft) => {
          draft.preferences.route = route;
        });
      } : void 0
    }),
    [store]
  );
  const runtime = T2(
    () => suppliedRuntime ?? createPopupRuntime(store, host),
    [host, store, suppliedRuntime]
  );
  const [catalogSnapshot, setCatalogSnapshot] = d2(
    runtime?.catalog.read()
  );
  const [catalogRefreshing, setCatalogRefreshing] = d2(false);
  const [inventoryRefreshing, setInventoryRefreshing] = d2(false);
  const [activeOperation, setActiveOperation] = d2(
    runtime?.lifecycle.lock.read() ?? null
  );
  const [pendingPrompt, setPendingPrompt] = d2(
    runtime?.prompts.read() ?? null
  );
  const [removalImpact, setRemovalImpact] = d2(null);
  const [receipt, setReceipt] = d2(
    parseReceipt(store?.read().operationReceipt)
  );
  const [kitReceipt, setKitReceipt] = d2(
    parseKitReceipt(store?.read().operationReceipt)
  );
  const [pendingKitPlan, setPendingKitPlan] = d2(null);
  const [kitDisclosurePlan, setKitDisclosurePlan] = d2(null);
  const [kitEditorSource, setKitEditorSource] = d2(null);
  const [importingKit, setImportingKit] = d2(false);
  const [kitInspectors, setKitInspectors] = d2({});
  const [operationError, setOperationError] = d2(null);
  const syncKits = q2(() => {
    if (!runtime || !store) return;
    const snapshot = runtime.catalog.read();
    if (!("catalog" in snapshot)) return;
    const presentation = buildKitPresentation(
      snapshot.catalog,
      runtime.kits,
      runtime.kitContext.inventory
    );
    runtime.kitDiscovery.setData({
      catalog: snapshot.catalog,
      personal: runtime.kits.readDefinitions(),
      statuses: presentation.statuses
    });
    setKitInspectors(presentation.inspectors);
  }, [runtime, store]);
  const refreshInventory = q2(async () => {
    if (!runtime || !host || !store) return;
    setInventoryRefreshing(true);
    try {
      const extensions = await host.discover();
      const snapshot = runtime.catalog.read();
      const inventory = reconcileInventory({
        projects: "catalog" in snapshot ? snapshot.catalog.projects : [],
        hostExtensions: extensions,
        managed: normalizeManagedExtensionMap(store.read().managedExtensions)
      });
      runtime.kitContext.inventory = inventory;
      runtime.discovery.setInventory(inventory);
      syncKits();
    } finally {
      setInventoryRefreshing(false);
    }
  }, [host, runtime, store, syncKits]);
  const refreshCatalog = q2(async () => {
    if (!runtime) return;
    setCatalogRefreshing(true);
    try {
      await runtime.catalog.refresh({ force: true });
    } finally {
      setCatalogRefreshing(false);
    }
  }, [runtime]);
  h2(() => {
    if (!runtime) return;
    const unsubscribeCatalog = runtime.catalog.subscribe((snapshot) => {
      setCatalogSnapshot(snapshot);
      runtime.discovery.setSnapshot(snapshot);
      if ("catalog" in snapshot) void refreshInventory();
    });
    const unsubscribeLock = runtime.lifecycle.lock.subscribe(setActiveOperation);
    const unsubscribePrompts = runtime.prompts.subscribe(setPendingPrompt);
    const unsubscribeStore = store?.subscribe((state) => {
      setReceipt(parseReceipt(state.operationReceipt));
      setKitReceipt(parseKitReceipt(state.operationReceipt));
      syncKits();
    });
    const onFocus = () => void runtime.catalog.onFocus();
    window.addEventListener("focus", onFocus);
    setCatalogRefreshing(true);
    void runtime.catalog.open().finally(async () => {
      setCatalogRefreshing(false);
      if (runtime.kitExecutor.journal.read() && runtime.lifecycle.lock.read() === null) {
        await refreshInventory();
        setKitReceipt(await runtime.kitExecutor.recoverInterrupted());
        syncKits();
      }
    });
    return () => {
      unsubscribeCatalog();
      unsubscribeLock();
      unsubscribePrompts();
      unsubscribeStore?.();
      runtime.prompts.cancel();
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshInventory, runtime, store, syncKits]);
  const runAction = async (projectId, action) => {
    if (!runtime || !host) return;
    setOperationError(null);
    try {
      if (action.kind === "install") {
        const result2 = await runtime.lifecycle.install(projectId);
        setReceipt(result2);
        await refreshInventory();
      } else if (action.kind === "uninstall") {
        setRemovalImpact(await runtime.lifecycle.previewRemoval(projectId));
      } else if (action.kind === "update-required" || action.kind === "manage-in-sillytavern") {
        await host.openExtensionManager();
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "The operation could not finish.");
    }
  };
  const requestKitAction = (kitId, action) => {
    if (!runtime || !store) return;
    if (action !== "uninstall" && action.kind === "review") return;
    const snapshot = runtime.catalog.read();
    if (!("catalog" in snapshot)) return;
    const kit = resolveKit(runtime, snapshot.catalog, kitId);
    if (!kit) return;
    const operation = action === "uninstall" ? "uninstall" : action.kind === "activate" ? "activate" : action.kind === "deactivate" ? "deactivate" : "install";
    const plan = planKitOperation({
      operation,
      kit,
      catalog: snapshot.catalog,
      inventory: runtime.kitContext.inventory,
      managed: normalizeManagedExtensionMap(store.read().managedExtensions),
      installedKits: runtime.kits.readInstalledStates(),
      activeKitId: runtime.kits.readActiveId(),
      catalogCanMutate: snapshot.canMutate
    });
    if (!store.read().trustAcknowledgedAt && plan.install.length) setKitDisclosurePlan(plan);
    else setPendingKitPlan(plan);
  };
  const executeKitPlan = async (plan, approval) => {
    if (!runtime) return;
    setPendingKitPlan(null);
    setOperationError(null);
    try {
      const result2 = await runtime.kitExecutor.execute(plan, approval);
      setKitReceipt(result2);
      await refreshInventory();
      syncKits();
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "The Kit operation could not finish."
      );
    }
  };
  const saveKitDraft = async (draft) => {
    if (!runtime) return;
    if (draft.sourceId) {
      await runtime.kits.update(draft.sourceId, {
        title: draft.title,
        description: draft.description,
        projectIds: draft.projectIds
      });
    } else {
      await runtime.kits.create({
        title: draft.title,
        description: draft.description,
        projectIds: draft.projectIds
      });
    }
    setKitEditorSource(null);
    syncKits();
  };
  const runtimeCatalog = runtime?.catalog.read();
  const kitEditorProjects = runtimeCatalog && "catalog" in runtimeCatalog ? runtimeCatalog.catalog.projects : null;
  return /* @__PURE__ */ u3(S, { children: [
    /* @__PURE__ */ u3(
      CompanionShell,
      {
        controller: shell,
        discovery: runtime?.discovery,
        catalogSnapshot,
        catalogRefreshing,
        inventoryRefreshing,
        onRefreshCatalog: refreshCatalog,
        onRefreshInventory: refreshInventory,
        onProjectAction: (projectId, action) => void runAction(projectId, action),
        onOpenExtensionManager: () => void host?.openExtensionManager(),
        onUpdateCompanion: () => void host?.openExtensionManager(),
        onOpenTavernary: () => host?.openExternal("https://tavernary.org/"),
        lifecycleDisabled: activeOperation !== null,
        kitDiscovery: runtime?.kitDiscovery,
        kitInspectors,
        onKitAction: requestKitAction,
        onNewKit: () => setKitEditorSource("new"),
        onImportKit: () => setImportingKit(true),
        onEditKit: (id) => {
          const kit = runtime?.kits.readDefinition(id);
          if (kit) setKitEditorSource(kit);
        },
        onCopyKit: (id) => {
          const snapshot = runtime?.catalog.read();
          const kit = snapshot && "catalog" in snapshot ? snapshot.catalog.kits.find((item) => item.id === id) : null;
          if (kit) void runtime?.kits.copyPublished(kit).then(syncKits);
        },
        onExportKit: (id) => {
          const kit = runtime?.kits.readDefinition(id);
          if (kit) exportKitFile(kit);
        },
        onUninstallKit: (id) => requestKitAction(id, "uninstall")
      }
    ),
    kitEditorSource && kitEditorProjects ? /* @__PURE__ */ u3(
      KitEditor,
      {
        source: kitEditorSource === "new" ? void 0 : kitEditorSource,
        projects: kitEditorProjects,
        onCancel: () => setKitEditorSource(null),
        onSave: (draft) => void saveKitDraft(draft)
      }
    ) : null,
    importingKit && runtime ? /* @__PURE__ */ u3(
      KitImportDialog,
      {
        onCancel: () => setImportingKit(false),
        onImport: (kit) => {
          const prepared = prepareImportedKit(
            kit,
            new Set(runtime.kits.readDefinitions().map(({ id }) => id))
          );
          void runtime.kits.importDefinition(prepared).then(() => {
            setImportingKit(false);
            syncKits();
          });
        }
      }
    ) : null,
    kitDisclosurePlan ? /* @__PURE__ */ u3(
      TrustDisclosureDialog,
      {
        prompt: { kind: "unsandboxed-disclosure", copy: UNSANDBOXED_CODE_DISCLOSURE },
        onCancel: () => setKitDisclosurePlan(null),
        onConfirm: () => {
          const plan = kitDisclosurePlan;
          setKitDisclosurePlan(null);
          void store?.update((draft) => {
            draft.trustAcknowledgedAt = (/* @__PURE__ */ new Date()).toISOString();
          });
          setPendingKitPlan(plan);
        }
      }
    ) : null,
    pendingKitPlan ? /* @__PURE__ */ u3(
      KitPreflightDialog,
      {
        plan: pendingKitPlan,
        onCancel: () => setPendingKitPlan(null),
        onReview: (url) => host?.openExternal(url),
        onConfirm: (approval) => void executeKitPlan(pendingKitPlan, approval)
      }
    ) : null,
    pendingPrompt?.prompt.kind === "unsandboxed-disclosure" ? /* @__PURE__ */ u3(
      TrustDisclosureDialog,
      {
        prompt: pendingPrompt.prompt,
        onCancel: () => runtime?.prompts.respond(false),
        onConfirm: () => runtime?.prompts.respond(true)
      }
    ) : null,
    pendingPrompt?.prompt.kind === "assessment-warning" ? /* @__PURE__ */ u3(
      AssessmentWarningDialog,
      {
        projectName: pendingPrompt.project.name,
        prompt: pendingPrompt.prompt,
        onReview: (url) => host?.openExternal(url),
        onCancel: () => runtime?.prompts.respond(false),
        onConfirm: () => runtime?.prompts.respond(true)
      }
    ) : null,
    removalImpact ? /* @__PURE__ */ u3(
      RemovalDialog,
      {
        impact: removalImpact,
        onCancel: () => setRemovalImpact(null),
        onConfirm: () => {
          const projectId = removalImpact.projectId;
          setRemovalImpact(null);
          void runtime?.lifecycle.remove(projectId).then(async (result2) => {
            setReceipt(result2);
            await refreshInventory();
          });
        }
      }
    ) : null,
    /* @__PURE__ */ u3(
      OperationTray,
      {
        active: activeOperation?.operationId.startsWith("kit:") ? null : activeOperation,
        receipt,
        error: operationError,
        onDismissReceipt: () => setReceipt(null),
        onDismissError: () => setOperationError(null)
      }
    ),
    /* @__PURE__ */ u3(
      KitOperationTray,
      {
        active: activeOperation,
        receipt: kitReceipt,
        onDismiss: () => setKitReceipt(null),
        onRetry: () => {
          if (!kitReceipt) return;
          const action = kitReceipt.operation === "activate" ? { kind: "activate", label: "Activate" } : { kind: "retry", label: "Retry" };
          requestKitAction(kitReceipt.kitId, action);
        }
      }
    )
  ] });
}
function createPopupRuntime(store, host) {
  if (!store || !host || !globalThis.indexedDB) return null;
  const catalog = createCatalogClient({ cache: createIndexedDbCatalogCache() });
  const discovery = createDiscoveryController({
    snapshot: catalog.read(),
    inventory: emptyInventory
  });
  const kits = new KitStore(store);
  const kitContext = { inventory: emptyInventory };
  const kitDiscovery = createKitDiscoveryController({
    catalog: {
      schemaVersion: 7,
      generatedAt: (/* @__PURE__ */ new Date(0)).toISOString(),
      tagVocabulary: [],
      projects: [],
      kits: []
    },
    personal: kits.readDefinitions(),
    statuses: /* @__PURE__ */ new Map()
  });
  const prompts = new TrustPromptBroker();
  const lifecycle = createLifecycleCoordinator({
    host,
    store,
    getSnapshot: () => catalog.read(),
    confirm: (prompt, project) => prompts.request(prompt, project)
  });
  const lock = lifecycle.lock;
  const kitExecutor = createKitExecutor({
    host,
    profile: store,
    kits,
    lock,
    getCatalog: () => {
      const snapshot = catalog.read();
      if (!("catalog" in snapshot)) throw new Error("A compatible catalog is required.");
      return snapshot.catalog;
    },
    getInventoryFingerprint: () => inventoryFingerprint({
      inventory: kitContext.inventory,
      managed: normalizeManagedExtensionMap(store.read().managedExtensions),
      installedKits: kits.readInstalledStates(),
      activeKitId: kits.readActiveId()
    })
  });
  return { catalog, discovery, lifecycle, prompts, kits, kitDiscovery, kitExecutor, kitContext };
}
function parseReceipt(value) {
  if (!value || typeof value.id !== "string" || value.kind !== "install" && value.kind !== "remove" || typeof value.projectId !== "string" || typeof value.projectName !== "string" || !Array.isArray(value.steps)) {
    return null;
  }
  return structuredClone(value);
}
function parseKitReceipt(value) {
  if (!value || value.kind !== "kit-operation" || value.formatVersion !== 1 || typeof value.id !== "string" || typeof value.planId !== "string" || typeof value.kitId !== "string" || !Array.isArray(value.projects)) {
    return null;
  }
  return structuredClone(value);
}
function resolveKit(runtime, catalog, kitId) {
  const personal = runtime.kits.readDefinition(kitId);
  if (personal) return { id: personal.id, projectIds: personal.projectIds, origin: "personal" };
  const published = catalog.kits.find((kit) => kit.id === kitId);
  return published ? {
    id: published.id,
    projectIds: published.components.map(({ projectId }) => projectId),
    origin: "published"
  } : null;
}
function buildKitPresentation(catalog, kits, inventory) {
  const statuses = /* @__PURE__ */ new Map();
  const activeId = kits.readActiveId();
  for (const state of kits.readInstalledStates()) {
    statuses.set(
      state.kitId,
      activeId === state.kitId ? state.status === "drifted" ? "drifted" : "active" : state.status
    );
  }
  const inspectors = {};
  for (const kit of kits.readDefinitions()) {
    const status = statuses.get(kit.id) ?? "saved";
    inspectors[kit.id] = toPersonalKitInspector(kit, catalog.projects, status);
  }
  for (const kit of catalog.kits) {
    const status = statuses.get(kit.id) ?? "saved";
    inspectors[kit.id] = toPublishedKitInspector(kit, status);
  }
  void inventory;
  return { statuses, inspectors };
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
  const runtime = createPopupRuntime(input.store, input.host);
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
    unmountPopup = renderCompanionPopup(content, { store: input.store, host: input.host, runtime });
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

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/ajv/dist/compile/codegen/code.js
var require_code = __commonJS({
  "node_modules/ajv/dist/compile/codegen/code.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.regexpCode = exports.getEsmExportName = exports.getProperty = exports.safeStringify = exports.stringify = exports.strConcat = exports.addCodeArg = exports.str = exports._ = exports.nil = exports._Code = exports.Name = exports.IDENTIFIER = exports._CodeOrName = void 0;
    var _CodeOrName = class {
    };
    exports._CodeOrName = _CodeOrName;
    exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
    var Name = class extends _CodeOrName {
      constructor(s3) {
        super();
        if (!exports.IDENTIFIER.test(s3))
          throw new Error("CodeGen: name must be a valid identifier");
        this.str = s3;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        return false;
      }
      get names() {
        return { [this.str]: 1 };
      }
    };
    exports.Name = Name;
    var _Code = class extends _CodeOrName {
      constructor(code) {
        super();
        this._items = typeof code === "string" ? [code] : code;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        if (this._items.length > 1)
          return false;
        const item = this._items[0];
        return item === "" || item === '""';
      }
      get str() {
        var _a;
        return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s3, c3) => `${s3}${c3}`, "");
      }
      get names() {
        var _a;
        return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names, c3) => {
          if (c3 instanceof Name)
            names[c3.str] = (names[c3.str] || 0) + 1;
          return names;
        }, {});
      }
    };
    exports._Code = _Code;
    exports.nil = new _Code("");
    function _3(strs, ...args) {
      const code = [strs[0]];
      let i3 = 0;
      while (i3 < args.length) {
        addCodeArg(code, args[i3]);
        code.push(strs[++i3]);
      }
      return new _Code(code);
    }
    exports._ = _3;
    var plus = new _Code("+");
    function str(strs, ...args) {
      const expr = [safeStringify(strs[0])];
      let i3 = 0;
      while (i3 < args.length) {
        expr.push(plus);
        addCodeArg(expr, args[i3]);
        expr.push(plus, safeStringify(strs[++i3]));
      }
      optimize(expr);
      return new _Code(expr);
    }
    exports.str = str;
    function addCodeArg(code, arg) {
      if (arg instanceof _Code)
        code.push(...arg._items);
      else if (arg instanceof Name)
        code.push(arg);
      else
        code.push(interpolate(arg));
    }
    exports.addCodeArg = addCodeArg;
    function optimize(expr) {
      let i3 = 1;
      while (i3 < expr.length - 1) {
        if (expr[i3] === plus) {
          const res = mergeExprItems(expr[i3 - 1], expr[i3 + 1]);
          if (res !== void 0) {
            expr.splice(i3 - 1, 3, res);
            continue;
          }
          expr[i3++] = "+";
        }
        i3++;
      }
    }
    function mergeExprItems(a3, b2) {
      if (b2 === '""')
        return a3;
      if (a3 === '""')
        return b2;
      if (typeof a3 == "string") {
        if (b2 instanceof Name || a3[a3.length - 1] !== '"')
          return;
        if (typeof b2 != "string")
          return `${a3.slice(0, -1)}${b2}"`;
        if (b2[0] === '"')
          return a3.slice(0, -1) + b2.slice(1);
        return;
      }
      if (typeof b2 == "string" && b2[0] === '"' && !(a3 instanceof Name))
        return `"${a3}${b2.slice(1)}`;
      return;
    }
    function strConcat(c1, c22) {
      return c22.emptyStr() ? c1 : c1.emptyStr() ? c22 : str`${c1}${c22}`;
    }
    exports.strConcat = strConcat;
    function interpolate(x3) {
      return typeof x3 == "number" || typeof x3 == "boolean" || x3 === null ? x3 : safeStringify(Array.isArray(x3) ? x3.join(",") : x3);
    }
    function stringify(x3) {
      return new _Code(safeStringify(x3));
    }
    exports.stringify = stringify;
    function safeStringify(x3) {
      return JSON.stringify(x3).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    }
    exports.safeStringify = safeStringify;
    function getProperty(key) {
      return typeof key == "string" && exports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _3`[${key}]`;
    }
    exports.getProperty = getProperty;
    function getEsmExportName(key) {
      if (typeof key == "string" && exports.IDENTIFIER.test(key)) {
        return new _Code(`${key}`);
      }
      throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
    }
    exports.getEsmExportName = getEsmExportName;
    function regexpCode(rx) {
      return new _Code(rx.toString());
    }
    exports.regexpCode = regexpCode;
  }
});

// node_modules/ajv/dist/compile/codegen/scope.js
var require_scope = __commonJS({
  "node_modules/ajv/dist/compile/codegen/scope.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ValueScope = exports.ValueScopeName = exports.Scope = exports.varKinds = exports.UsedValueState = void 0;
    var code_1 = require_code();
    var ValueError = class extends Error {
      constructor(name) {
        super(`CodeGen: "code" for ${name} not defined`);
        this.value = name.value;
      }
    };
    var UsedValueState;
    (function(UsedValueState2) {
      UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
      UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
    })(UsedValueState || (exports.UsedValueState = UsedValueState = {}));
    exports.varKinds = {
      const: new code_1.Name("const"),
      let: new code_1.Name("let"),
      var: new code_1.Name("var")
    };
    var Scope = class {
      constructor({ prefixes, parent } = {}) {
        this._names = {};
        this._prefixes = prefixes;
        this._parent = parent;
      }
      toName(nameOrPrefix) {
        return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
      }
      name(prefix) {
        return new code_1.Name(this._newName(prefix));
      }
      _newName(prefix) {
        const ng = this._names[prefix] || this._nameGroup(prefix);
        return `${prefix}${ng.index++}`;
      }
      _nameGroup(prefix) {
        var _a, _b;
        if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
          throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
        }
        return this._names[prefix] = { prefix, index: 0 };
      }
    };
    exports.Scope = Scope;
    var ValueScopeName = class extends code_1.Name {
      constructor(prefix, nameStr) {
        super(nameStr);
        this.prefix = prefix;
      }
      setValue(value, { property, itemIndex }) {
        this.value = value;
        this.scopePath = (0, code_1._)`.${new code_1.Name(property)}[${itemIndex}]`;
      }
    };
    exports.ValueScopeName = ValueScopeName;
    var line = (0, code_1._)`\n`;
    var ValueScope = class extends Scope {
      constructor(opts) {
        super(opts);
        this._values = {};
        this._scope = opts.scope;
        this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
      }
      get() {
        return this._scope;
      }
      name(prefix) {
        return new ValueScopeName(prefix, this._newName(prefix));
      }
      value(nameOrPrefix, value) {
        var _a;
        if (value.ref === void 0)
          throw new Error("CodeGen: ref must be passed in value");
        const name = this.toName(nameOrPrefix);
        const { prefix } = name;
        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
        let vs = this._values[prefix];
        if (vs) {
          const _name = vs.get(valueKey);
          if (_name)
            return _name;
        } else {
          vs = this._values[prefix] = /* @__PURE__ */ new Map();
        }
        vs.set(valueKey, name);
        const s3 = this._scope[prefix] || (this._scope[prefix] = []);
        const itemIndex = s3.length;
        s3[itemIndex] = value.ref;
        name.setValue(value, { property: prefix, itemIndex });
        return name;
      }
      getValue(prefix, keyOrRef) {
        const vs = this._values[prefix];
        if (!vs)
          return;
        return vs.get(keyOrRef);
      }
      scopeRefs(scopeName, values = this._values) {
        return this._reduceValues(values, (name) => {
          if (name.scopePath === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return (0, code_1._)`${scopeName}${name.scopePath}`;
        });
      }
      scopeCode(values = this._values, usedValues, getCode) {
        return this._reduceValues(values, (name) => {
          if (name.value === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return name.value.code;
        }, usedValues, getCode);
      }
      _reduceValues(values, valueCode, usedValues = {}, getCode) {
        let code = code_1.nil;
        for (const prefix in values) {
          const vs = values[prefix];
          if (!vs)
            continue;
          const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
          vs.forEach((name) => {
            if (nameSet.has(name))
              return;
            nameSet.set(name, UsedValueState.Started);
            let c3 = valueCode(name);
            if (c3) {
              const def = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
              code = (0, code_1._)`${code}${def} ${name} = ${c3};${this.opts._n}`;
            } else if (c3 = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
              code = (0, code_1._)`${code}${c3}${this.opts._n}`;
            } else {
              throw new ValueError(name);
            }
            nameSet.set(name, UsedValueState.Completed);
          });
        }
        return code;
      }
    };
    exports.ValueScope = ValueScope;
  }
});

// node_modules/ajv/dist/compile/codegen/index.js
var require_codegen = __commonJS({
  "node_modules/ajv/dist/compile/codegen/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.or = exports.and = exports.not = exports.CodeGen = exports.operators = exports.varKinds = exports.ValueScopeName = exports.ValueScope = exports.Scope = exports.Name = exports.regexpCode = exports.stringify = exports.getProperty = exports.nil = exports.strConcat = exports.str = exports._ = void 0;
    var code_1 = require_code();
    var scope_1 = require_scope();
    var code_2 = require_code();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return code_2._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return code_2.str;
    } });
    Object.defineProperty(exports, "strConcat", { enumerable: true, get: function() {
      return code_2.strConcat;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return code_2.nil;
    } });
    Object.defineProperty(exports, "getProperty", { enumerable: true, get: function() {
      return code_2.getProperty;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return code_2.stringify;
    } });
    Object.defineProperty(exports, "regexpCode", { enumerable: true, get: function() {
      return code_2.regexpCode;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return code_2.Name;
    } });
    var scope_2 = require_scope();
    Object.defineProperty(exports, "Scope", { enumerable: true, get: function() {
      return scope_2.Scope;
    } });
    Object.defineProperty(exports, "ValueScope", { enumerable: true, get: function() {
      return scope_2.ValueScope;
    } });
    Object.defineProperty(exports, "ValueScopeName", { enumerable: true, get: function() {
      return scope_2.ValueScopeName;
    } });
    Object.defineProperty(exports, "varKinds", { enumerable: true, get: function() {
      return scope_2.varKinds;
    } });
    exports.operators = {
      GT: new code_1._Code(">"),
      GTE: new code_1._Code(">="),
      LT: new code_1._Code("<"),
      LTE: new code_1._Code("<="),
      EQ: new code_1._Code("==="),
      NEQ: new code_1._Code("!=="),
      NOT: new code_1._Code("!"),
      OR: new code_1._Code("||"),
      AND: new code_1._Code("&&"),
      ADD: new code_1._Code("+")
    };
    var Node2 = class {
      optimizeNodes() {
        return this;
      }
      optimizeNames(_names, _constants) {
        return this;
      }
    };
    var Def = class extends Node2 {
      constructor(varKind, name, rhs) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.rhs = rhs;
      }
      render({ es5, _n }) {
        const varKind = es5 ? scope_1.varKinds.var : this.varKind;
        const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
        return `${varKind} ${this.name}${rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (!names[this.name.str])
          return;
        if (this.rhs)
          this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
      }
    };
    var Assign = class extends Node2 {
      constructor(lhs, rhs, sideEffects) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
        this.sideEffects = sideEffects;
      }
      render({ _n }) {
        return `${this.lhs} = ${this.rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects)
          return;
        this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        const names = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
        return addExprNames(names, this.rhs);
      }
    };
    var AssignOp = class extends Assign {
      constructor(lhs, op, rhs, sideEffects) {
        super(lhs, rhs, sideEffects);
        this.op = op;
      }
      render({ _n }) {
        return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
      }
    };
    var Label = class extends Node2 {
      constructor(label2) {
        super();
        this.label = label2;
        this.names = {};
      }
      render({ _n }) {
        return `${this.label}:` + _n;
      }
    };
    var Break = class extends Node2 {
      constructor(label2) {
        super();
        this.label = label2;
        this.names = {};
      }
      render({ _n }) {
        const label2 = this.label ? ` ${this.label}` : "";
        return `break${label2};` + _n;
      }
    };
    var Throw = class extends Node2 {
      constructor(error) {
        super();
        this.error = error;
      }
      render({ _n }) {
        return `throw ${this.error};` + _n;
      }
      get names() {
        return this.error.names;
      }
    };
    var AnyCode = class extends Node2 {
      constructor(code) {
        super();
        this.code = code;
      }
      render({ _n }) {
        return `${this.code};` + _n;
      }
      optimizeNodes() {
        return `${this.code}` ? this : void 0;
      }
      optimizeNames(names, constants) {
        this.code = optimizeExpr(this.code, names, constants);
        return this;
      }
      get names() {
        return this.code instanceof code_1._CodeOrName ? this.code.names : {};
      }
    };
    var ParentNode = class extends Node2 {
      constructor(nodes = []) {
        super();
        this.nodes = nodes;
      }
      render(opts) {
        return this.nodes.reduce((code, n2) => code + n2.render(opts), "");
      }
      optimizeNodes() {
        const { nodes } = this;
        let i3 = nodes.length;
        while (i3--) {
          const n2 = nodes[i3].optimizeNodes();
          if (Array.isArray(n2))
            nodes.splice(i3, 1, ...n2);
          else if (n2)
            nodes[i3] = n2;
          else
            nodes.splice(i3, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      optimizeNames(names, constants) {
        const { nodes } = this;
        let i3 = nodes.length;
        while (i3--) {
          const n2 = nodes[i3];
          if (n2.optimizeNames(names, constants))
            continue;
          subtractNames(names, n2.names);
          nodes.splice(i3, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      get names() {
        return this.nodes.reduce((names, n2) => addNames(names, n2.names), {});
      }
    };
    var BlockNode = class extends ParentNode {
      render(opts) {
        return "{" + opts._n + super.render(opts) + "}" + opts._n;
      }
    };
    var Root = class extends ParentNode {
    };
    var Else = class extends BlockNode {
    };
    Else.kind = "else";
    var If = class _If extends BlockNode {
      constructor(condition, nodes) {
        super(nodes);
        this.condition = condition;
      }
      render(opts) {
        let code = `if(${this.condition})` + super.render(opts);
        if (this.else)
          code += "else " + this.else.render(opts);
        return code;
      }
      optimizeNodes() {
        super.optimizeNodes();
        const cond = this.condition;
        if (cond === true)
          return this.nodes;
        let e3 = this.else;
        if (e3) {
          const ns = e3.optimizeNodes();
          e3 = this.else = Array.isArray(ns) ? new Else(ns) : ns;
        }
        if (e3) {
          if (cond === false)
            return e3 instanceof _If ? e3 : e3.nodes;
          if (this.nodes.length)
            return this;
          return new _If(not(cond), e3 instanceof _If ? [e3] : e3.nodes);
        }
        if (cond === false || !this.nodes.length)
          return void 0;
        return this;
      }
      optimizeNames(names, constants) {
        var _a;
        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        if (!(super.optimizeNames(names, constants) || this.else))
          return;
        this.condition = optimizeExpr(this.condition, names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        addExprNames(names, this.condition);
        if (this.else)
          addNames(names, this.else.names);
        return names;
      }
    };
    If.kind = "if";
    var For = class extends BlockNode {
    };
    For.kind = "for";
    var ForLoop = class extends For {
      constructor(iteration) {
        super();
        this.iteration = iteration;
      }
      render(opts) {
        return `for(${this.iteration})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iteration = optimizeExpr(this.iteration, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iteration.names);
      }
    };
    var ForRange = class extends For {
      constructor(varKind, name, from, to) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.from = from;
        this.to = to;
      }
      render(opts) {
        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
        const { name, from, to } = this;
        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
      }
      get names() {
        const names = addExprNames(super.names, this.from);
        return addExprNames(names, this.to);
      }
    };
    var ForIter = class extends For {
      constructor(loop, varKind, name, iterable) {
        super();
        this.loop = loop;
        this.varKind = varKind;
        this.name = name;
        this.iterable = iterable;
      }
      render(opts) {
        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iterable = optimizeExpr(this.iterable, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iterable.names);
      }
    };
    var Func = class extends BlockNode {
      constructor(name, args, async) {
        super();
        this.name = name;
        this.args = args;
        this.async = async;
      }
      render(opts) {
        const _async = this.async ? "async " : "";
        return `${_async}function ${this.name}(${this.args})` + super.render(opts);
      }
    };
    Func.kind = "func";
    var Return = class extends ParentNode {
      render(opts) {
        return "return " + super.render(opts);
      }
    };
    Return.kind = "return";
    var Try = class extends BlockNode {
      render(opts) {
        let code = "try" + super.render(opts);
        if (this.catch)
          code += this.catch.render(opts);
        if (this.finally)
          code += this.finally.render(opts);
        return code;
      }
      optimizeNodes() {
        var _a, _b;
        super.optimizeNodes();
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
        return this;
      }
      optimizeNames(names, constants) {
        var _a, _b;
        super.optimizeNames(names, constants);
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        if (this.catch)
          addNames(names, this.catch.names);
        if (this.finally)
          addNames(names, this.finally.names);
        return names;
      }
    };
    var Catch = class extends BlockNode {
      constructor(error) {
        super();
        this.error = error;
      }
      render(opts) {
        return `catch(${this.error})` + super.render(opts);
      }
    };
    Catch.kind = "catch";
    var Finally = class extends BlockNode {
      render(opts) {
        return "finally" + super.render(opts);
      }
    };
    Finally.kind = "finally";
    var CodeGen = class {
      constructor(extScope, opts = {}) {
        this._values = {};
        this._blockStarts = [];
        this._constants = {};
        this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
        this._extScope = extScope;
        this._scope = new scope_1.Scope({ parent: extScope });
        this._nodes = [new Root()];
      }
      toString() {
        return this._root.render(this.opts);
      }
      // returns unique name in the internal scope
      name(prefix) {
        return this._scope.name(prefix);
      }
      // reserves unique name in the external scope
      scopeName(prefix) {
        return this._extScope.name(prefix);
      }
      // reserves unique name in the external scope and assigns value to it
      scopeValue(prefixOrName, value) {
        const name = this._extScope.value(prefixOrName, value);
        const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
        vs.add(name);
        return name;
      }
      getScopeValue(prefix, keyOrRef) {
        return this._extScope.getValue(prefix, keyOrRef);
      }
      // return code that assigns values in the external scope to the names that are used internally
      // (same names that were returned by gen.scopeName or gen.scopeValue)
      scopeRefs(scopeName) {
        return this._extScope.scopeRefs(scopeName, this._values);
      }
      scopeCode() {
        return this._extScope.scopeCode(this._values);
      }
      _def(varKind, nameOrPrefix, rhs, constant) {
        const name = this._scope.toName(nameOrPrefix);
        if (rhs !== void 0 && constant)
          this._constants[name.str] = rhs;
        this._leafNode(new Def(varKind, name, rhs));
        return name;
      }
      // `const` declaration (`var` in es5 mode)
      const(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
      }
      // `let` declaration with optional assignment (`var` in es5 mode)
      let(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
      }
      // `var` declaration with optional assignment
      var(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
      }
      // assignment code
      assign(lhs, rhs, sideEffects) {
        return this._leafNode(new Assign(lhs, rhs, sideEffects));
      }
      // `+=` code
      add(lhs, rhs) {
        return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
      }
      // appends passed SafeExpr to code or executes Block
      code(c3) {
        if (typeof c3 == "function")
          c3();
        else if (c3 !== code_1.nil)
          this._leafNode(new AnyCode(c3));
        return this;
      }
      // returns code for object literal for the passed argument list of key-value pairs
      object(...keyValues) {
        const code = ["{"];
        for (const [key, value] of keyValues) {
          if (code.length > 1)
            code.push(",");
          code.push(key);
          if (key !== value || this.opts.es5) {
            code.push(":");
            (0, code_1.addCodeArg)(code, value);
          }
        }
        code.push("}");
        return new code_1._Code(code);
      }
      // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
      if(condition, thenBody, elseBody) {
        this._blockNode(new If(condition));
        if (thenBody && elseBody) {
          this.code(thenBody).else().code(elseBody).endIf();
        } else if (thenBody) {
          this.code(thenBody).endIf();
        } else if (elseBody) {
          throw new Error('CodeGen: "else" body without "then" body');
        }
        return this;
      }
      // `else if` clause - invalid without `if` or after `else` clauses
      elseIf(condition) {
        return this._elseNode(new If(condition));
      }
      // `else` clause - only valid after `if` or `else if` clauses
      else() {
        return this._elseNode(new Else());
      }
      // end `if` statement (needed if gen.if was used only with condition)
      endIf() {
        return this._endBlockNode(If, Else);
      }
      _for(node, forBody) {
        this._blockNode(node);
        if (forBody)
          this.code(forBody).endFor();
        return this;
      }
      // a generic `for` clause (or statement if `forBody` is passed)
      for(iteration, forBody) {
        return this._for(new ForLoop(iteration), forBody);
      }
      // `for` statement for a range of values
      forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
      }
      // `for-of` statement (in es5 mode replace with a normal for loop)
      forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
        const name = this._scope.toName(nameOrPrefix);
        if (this.opts.es5) {
          const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
          return this.forRange("_i", 0, (0, code_1._)`${arr}.length`, (i3) => {
            this.var(name, (0, code_1._)`${arr}[${i3}]`);
            forBody(name);
          });
        }
        return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
      }
      // `for-in` statement.
      // With option `ownProperties` replaced with a `for-of` loop for object keys
      forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
        if (this.opts.ownProperties) {
          return this.forOf(nameOrPrefix, (0, code_1._)`Object.keys(${obj})`, forBody);
        }
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
      }
      // end `for` loop
      endFor() {
        return this._endBlockNode(For);
      }
      // `label` statement
      label(label2) {
        return this._leafNode(new Label(label2));
      }
      // `break` statement
      break(label2) {
        return this._leafNode(new Break(label2));
      }
      // `return` statement
      return(value) {
        const node = new Return();
        this._blockNode(node);
        this.code(value);
        if (node.nodes.length !== 1)
          throw new Error('CodeGen: "return" should have one node');
        return this._endBlockNode(Return);
      }
      // `try` statement
      try(tryBody, catchCode, finallyCode) {
        if (!catchCode && !finallyCode)
          throw new Error('CodeGen: "try" without "catch" and "finally"');
        const node = new Try();
        this._blockNode(node);
        this.code(tryBody);
        if (catchCode) {
          const error = this.name("e");
          this._currNode = node.catch = new Catch(error);
          catchCode(error);
        }
        if (finallyCode) {
          this._currNode = node.finally = new Finally();
          this.code(finallyCode);
        }
        return this._endBlockNode(Catch, Finally);
      }
      // `throw` statement
      throw(error) {
        return this._leafNode(new Throw(error));
      }
      // start self-balancing block
      block(body, nodeCount) {
        this._blockStarts.push(this._nodes.length);
        if (body)
          this.code(body).endBlock(nodeCount);
        return this;
      }
      // end the current self-balancing block
      endBlock(nodeCount) {
        const len = this._blockStarts.pop();
        if (len === void 0)
          throw new Error("CodeGen: not in self-balancing block");
        const toClose = this._nodes.length - len;
        if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
          throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
        }
        this._nodes.length = len;
        return this;
      }
      // `function` heading (or definition if funcBody is passed)
      func(name, args = code_1.nil, async, funcBody) {
        this._blockNode(new Func(name, args, async));
        if (funcBody)
          this.code(funcBody).endFunc();
        return this;
      }
      // end function definition
      endFunc() {
        return this._endBlockNode(Func);
      }
      optimize(n2 = 1) {
        while (n2-- > 0) {
          this._root.optimizeNodes();
          this._root.optimizeNames(this._root.names, this._constants);
        }
      }
      _leafNode(node) {
        this._currNode.nodes.push(node);
        return this;
      }
      _blockNode(node) {
        this._currNode.nodes.push(node);
        this._nodes.push(node);
      }
      _endBlockNode(N1, N2) {
        const n2 = this._currNode;
        if (n2 instanceof N1 || N2 && n2 instanceof N2) {
          this._nodes.pop();
          return this;
        }
        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
      }
      _elseNode(node) {
        const n2 = this._currNode;
        if (!(n2 instanceof If)) {
          throw new Error('CodeGen: "else" without "if"');
        }
        this._currNode = n2.else = node;
        return this;
      }
      get _root() {
        return this._nodes[0];
      }
      get _currNode() {
        const ns = this._nodes;
        return ns[ns.length - 1];
      }
      set _currNode(node) {
        const ns = this._nodes;
        ns[ns.length - 1] = node;
      }
    };
    exports.CodeGen = CodeGen;
    function addNames(names, from) {
      for (const n2 in from)
        names[n2] = (names[n2] || 0) + (from[n2] || 0);
      return names;
    }
    function addExprNames(names, from) {
      return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
    }
    function optimizeExpr(expr, names, constants) {
      if (expr instanceof code_1.Name)
        return replaceName(expr);
      if (!canOptimize(expr))
        return expr;
      return new code_1._Code(expr._items.reduce((items, c3) => {
        if (c3 instanceof code_1.Name)
          c3 = replaceName(c3);
        if (c3 instanceof code_1._Code)
          items.push(...c3._items);
        else
          items.push(c3);
        return items;
      }, []));
      function replaceName(n2) {
        const c3 = constants[n2.str];
        if (c3 === void 0 || names[n2.str] !== 1)
          return n2;
        delete names[n2.str];
        return c3;
      }
      function canOptimize(e3) {
        return e3 instanceof code_1._Code && e3._items.some((c3) => c3 instanceof code_1.Name && names[c3.str] === 1 && constants[c3.str] !== void 0);
      }
    }
    function subtractNames(names, from) {
      for (const n2 in from)
        names[n2] = (names[n2] || 0) - (from[n2] || 0);
    }
    function not(x3) {
      return typeof x3 == "boolean" || typeof x3 == "number" || x3 === null ? !x3 : (0, code_1._)`!${par(x3)}`;
    }
    exports.not = not;
    var andCode = mappend(exports.operators.AND);
    function and(...args) {
      return args.reduce(andCode);
    }
    exports.and = and;
    var orCode = mappend(exports.operators.OR);
    function or(...args) {
      return args.reduce(orCode);
    }
    exports.or = or;
    function mappend(op) {
      return (x3, y3) => x3 === code_1.nil ? y3 : y3 === code_1.nil ? x3 : (0, code_1._)`${par(x3)} ${op} ${par(y3)}`;
    }
    function par(x3) {
      return x3 instanceof code_1.Name ? x3 : (0, code_1._)`(${x3})`;
    }
  }
});

// node_modules/ajv/dist/compile/util.js
var require_util = __commonJS({
  "node_modules/ajv/dist/compile/util.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.checkStrictMode = exports.getErrorPath = exports.Type = exports.useFunc = exports.setEvaluated = exports.evaluatedPropsToName = exports.mergeEvaluated = exports.eachItem = exports.unescapeJsonPointer = exports.escapeJsonPointer = exports.escapeFragment = exports.unescapeFragment = exports.schemaRefOrVal = exports.schemaHasRulesButRef = exports.schemaHasRules = exports.checkUnknownRules = exports.alwaysValidSchema = exports.toHash = void 0;
    var codegen_1 = require_codegen();
    var code_1 = require_code();
    function toHash(arr) {
      const hash = {};
      for (const item of arr)
        hash[item] = true;
      return hash;
    }
    exports.toHash = toHash;
    function alwaysValidSchema(it, schema) {
      if (typeof schema == "boolean")
        return schema;
      if (Object.keys(schema).length === 0)
        return true;
      checkUnknownRules(it, schema);
      return !schemaHasRules(schema, it.self.RULES.all);
    }
    exports.alwaysValidSchema = alwaysValidSchema;
    function checkUnknownRules(it, schema = it.schema) {
      const { opts, self } = it;
      if (!opts.strictSchema)
        return;
      if (typeof schema === "boolean")
        return;
      const rules = self.RULES.keywords;
      for (const key in schema) {
        if (!rules[key])
          checkStrictMode(it, `unknown keyword: "${key}"`);
      }
    }
    exports.checkUnknownRules = checkUnknownRules;
    function schemaHasRules(schema, rules) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (rules[key])
          return true;
      return false;
    }
    exports.schemaHasRules = schemaHasRules;
    function schemaHasRulesButRef(schema, RULES) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (key !== "$ref" && RULES.all[key])
          return true;
      return false;
    }
    exports.schemaHasRulesButRef = schemaHasRulesButRef;
    function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
      if (!$data) {
        if (typeof schema == "number" || typeof schema == "boolean")
          return schema;
        if (typeof schema == "string")
          return (0, codegen_1._)`${schema}`;
      }
      return (0, codegen_1._)`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
    }
    exports.schemaRefOrVal = schemaRefOrVal;
    function unescapeFragment(str) {
      return unescapeJsonPointer(decodeURIComponent(str));
    }
    exports.unescapeFragment = unescapeFragment;
    function escapeFragment(str) {
      return encodeURIComponent(escapeJsonPointer(str));
    }
    exports.escapeFragment = escapeFragment;
    function escapeJsonPointer(str) {
      if (typeof str == "number")
        return `${str}`;
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
    exports.escapeJsonPointer = escapeJsonPointer;
    function unescapeJsonPointer(str) {
      return str.replace(/~1/g, "/").replace(/~0/g, "~");
    }
    exports.unescapeJsonPointer = unescapeJsonPointer;
    function eachItem(xs, f4) {
      if (Array.isArray(xs)) {
        for (const x3 of xs)
          f4(x3);
      } else {
        f4(xs);
      }
    }
    exports.eachItem = eachItem;
    function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
      return (gen, from, to, toName) => {
        const res = to === void 0 ? from : to instanceof codegen_1.Name ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1.Name ? (mergeToName(gen, to, from), from) : mergeValues(from, to);
        return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
      };
    }
    exports.mergeEvaluated = {
      props: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => {
          gen.if((0, codegen_1._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._)`${to} || {}`).code((0, codegen_1._)`Object.assign(${to}, ${from})`));
        }),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => {
          if (from === true) {
            gen.assign(to, true);
          } else {
            gen.assign(to, (0, codegen_1._)`${to} || {}`);
            setEvaluated(gen, to, from);
          }
        }),
        mergeValues: (from, to) => from === true ? true : { ...from, ...to },
        resultToName: evaluatedPropsToName
      }),
      items: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._)`${to} > ${from} ? ${to} : ${from}`)),
        mergeValues: (from, to) => from === true ? true : Math.max(from, to),
        resultToName: (gen, items) => gen.var("items", items)
      })
    };
    function evaluatedPropsToName(gen, ps) {
      if (ps === true)
        return gen.var("props", true);
      const props = gen.var("props", (0, codegen_1._)`{}`);
      if (ps !== void 0)
        setEvaluated(gen, props, ps);
      return props;
    }
    exports.evaluatedPropsToName = evaluatedPropsToName;
    function setEvaluated(gen, props, ps) {
      Object.keys(ps).forEach((p3) => gen.assign((0, codegen_1._)`${props}${(0, codegen_1.getProperty)(p3)}`, true));
    }
    exports.setEvaluated = setEvaluated;
    var snippets = {};
    function useFunc(gen, f4) {
      return gen.scopeValue("func", {
        ref: f4,
        code: snippets[f4.code] || (snippets[f4.code] = new code_1._Code(f4.code))
      });
    }
    exports.useFunc = useFunc;
    var Type;
    (function(Type2) {
      Type2[Type2["Num"] = 0] = "Num";
      Type2[Type2["Str"] = 1] = "Str";
    })(Type || (exports.Type = Type = {}));
    function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
      if (dataProp instanceof codegen_1.Name) {
        const isNumber = dataPropType === Type.Num;
        return jsPropertySyntax ? isNumber ? (0, codegen_1._)`"[" + ${dataProp} + "]"` : (0, codegen_1._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1._)`"/" + ${dataProp}` : (0, codegen_1._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
      }
      return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
    }
    exports.getErrorPath = getErrorPath;
    function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
      if (!mode)
        return;
      msg = `strict mode: ${msg}`;
      if (mode === true)
        throw new Error(msg);
      it.self.logger.warn(msg);
    }
    exports.checkStrictMode = checkStrictMode;
  }
});

// node_modules/ajv/dist/compile/names.js
var require_names = __commonJS({
  "node_modules/ajv/dist/compile/names.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var names = {
      // validation function arguments
      data: new codegen_1.Name("data"),
      // data passed to validation function
      // args passed from referencing schema
      valCxt: new codegen_1.Name("valCxt"),
      // validation/data context - should not be used directly, it is destructured to the names below
      instancePath: new codegen_1.Name("instancePath"),
      parentData: new codegen_1.Name("parentData"),
      parentDataProperty: new codegen_1.Name("parentDataProperty"),
      rootData: new codegen_1.Name("rootData"),
      // root data - same as the data passed to the first/top validation function
      dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
      // used to support recursiveRef and dynamicRef
      // function scoped variables
      vErrors: new codegen_1.Name("vErrors"),
      // null or array of validation errors
      errors: new codegen_1.Name("errors"),
      // counter of validation errors
      this: new codegen_1.Name("this"),
      // "globals"
      self: new codegen_1.Name("self"),
      scope: new codegen_1.Name("scope"),
      // JTD serialize/parse name for JSON string and position
      json: new codegen_1.Name("json"),
      jsonPos: new codegen_1.Name("jsonPos"),
      jsonLen: new codegen_1.Name("jsonLen"),
      jsonPart: new codegen_1.Name("jsonPart")
    };
    exports.default = names;
  }
});

// node_modules/ajv/dist/compile/errors.js
var require_errors = __commonJS({
  "node_modules/ajv/dist/compile/errors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extendErrors = exports.resetErrorsCount = exports.reportExtraError = exports.reportError = exports.keyword$DataError = exports.keywordError = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    exports.keywordError = {
      message: ({ keyword }) => (0, codegen_1.str)`must pass "${keyword}" keyword validation`
    };
    exports.keyword$DataError = {
      message: ({ keyword, schemaType }) => schemaType ? (0, codegen_1.str)`"${keyword}" keyword must be ${schemaType} ($data)` : (0, codegen_1.str)`"${keyword}" keyword is invalid ($data)`
    };
    function reportError(cxt, error = exports.keywordError, errorPaths, overrideAllErrors) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
        addError(gen, errObj);
      } else {
        returnErrors(it, (0, codegen_1._)`[${errObj}]`);
      }
    }
    exports.reportError = reportError;
    function reportExtraError(cxt, error = exports.keywordError, errorPaths) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      addError(gen, errObj);
      if (!(compositeRule || allErrors)) {
        returnErrors(it, names_1.default.vErrors);
      }
    }
    exports.reportExtraError = reportExtraError;
    function resetErrorsCount(gen, errsCount) {
      gen.assign(names_1.default.errors, errsCount);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._)`${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
    }
    exports.resetErrorsCount = resetErrorsCount;
    function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
      if (errsCount === void 0)
        throw new Error("ajv implementation error");
      const err = gen.name("err");
      gen.forRange("i", errsCount, names_1.default.errors, (i3) => {
        gen.const(err, (0, codegen_1._)`${names_1.default.vErrors}[${i3}]`);
        gen.if((0, codegen_1._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._)`${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
        gen.assign((0, codegen_1._)`${err}.schemaPath`, (0, codegen_1.str)`${it.errSchemaPath}/${keyword}`);
        if (it.opts.verbose) {
          gen.assign((0, codegen_1._)`${err}.schema`, schemaValue);
          gen.assign((0, codegen_1._)`${err}.data`, data);
        }
      });
    }
    exports.extendErrors = extendErrors;
    function addError(gen, errObj) {
      const err = gen.const("err", errObj);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._)`[${err}]`), (0, codegen_1._)`${names_1.default.vErrors}.push(${err})`);
      gen.code((0, codegen_1._)`${names_1.default.errors}++`);
    }
    function returnErrors(it, errs) {
      const { gen, validateName, schemaEnv } = it;
      if (schemaEnv.$async) {
        gen.throw((0, codegen_1._)`new ${it.ValidationError}(${errs})`);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, errs);
        gen.return(false);
      }
    }
    var E3 = {
      keyword: new codegen_1.Name("keyword"),
      schemaPath: new codegen_1.Name("schemaPath"),
      // also used in JTD errors
      params: new codegen_1.Name("params"),
      propertyName: new codegen_1.Name("propertyName"),
      message: new codegen_1.Name("message"),
      schema: new codegen_1.Name("schema"),
      parentSchema: new codegen_1.Name("parentSchema")
    };
    function errorObjectCode(cxt, error, errorPaths) {
      const { createErrors } = cxt.it;
      if (createErrors === false)
        return (0, codegen_1._)`{}`;
      return errorObject(cxt, error, errorPaths);
    }
    function errorObject(cxt, error, errorPaths = {}) {
      const { gen, it } = cxt;
      const keyValues = [
        errorInstancePath(it, errorPaths),
        errorSchemaPath(cxt, errorPaths)
      ];
      extraErrorProps(cxt, error, keyValues);
      return gen.object(...keyValues);
    }
    function errorInstancePath({ errorPath }, { instancePath }) {
      const instPath = instancePath ? (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}` : errorPath;
      return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
    }
    function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
      let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str)`${errSchemaPath}/${keyword}`;
      if (schemaPath) {
        schPath = (0, codegen_1.str)`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
      }
      return [E3.schemaPath, schPath];
    }
    function extraErrorProps(cxt, { params, message: message2 }, keyValues) {
      const { keyword, data, schemaValue, it } = cxt;
      const { opts, propertyName, topSchemaRef, schemaPath } = it;
      keyValues.push([E3.keyword, keyword], [E3.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._)`{}`]);
      if (opts.messages) {
        keyValues.push([E3.message, typeof message2 == "function" ? message2(cxt) : message2]);
      }
      if (opts.verbose) {
        keyValues.push([E3.schema, schemaValue], [E3.parentSchema, (0, codegen_1._)`${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
      }
      if (propertyName)
        keyValues.push([E3.propertyName, propertyName]);
    }
  }
});

// node_modules/ajv/dist/compile/validate/boolSchema.js
var require_boolSchema = __commonJS({
  "node_modules/ajv/dist/compile/validate/boolSchema.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.boolOrEmptySchema = exports.topBoolOrEmptySchema = void 0;
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var boolError = {
      message: "boolean schema is false"
    };
    function topBoolOrEmptySchema(it) {
      const { gen, schema, validateName } = it;
      if (schema === false) {
        falseSchemaError(it, false);
      } else if (typeof schema == "object" && schema.$async === true) {
        gen.return(names_1.default.data);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, null);
        gen.return(true);
      }
    }
    exports.topBoolOrEmptySchema = topBoolOrEmptySchema;
    function boolOrEmptySchema(it, valid) {
      const { gen, schema } = it;
      if (schema === false) {
        gen.var(valid, false);
        falseSchemaError(it);
      } else {
        gen.var(valid, true);
      }
    }
    exports.boolOrEmptySchema = boolOrEmptySchema;
    function falseSchemaError(it, overrideAllErrors) {
      const { gen, data } = it;
      const cxt = {
        gen,
        keyword: "false schema",
        data,
        schema: false,
        schemaCode: false,
        schemaValue: false,
        params: {},
        it
      };
      (0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
    }
  }
});

// node_modules/ajv/dist/compile/rules.js
var require_rules = __commonJS({
  "node_modules/ajv/dist/compile/rules.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getRules = exports.isJSONType = void 0;
    var _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
    var jsonTypes = new Set(_jsonTypes);
    function isJSONType(x3) {
      return typeof x3 == "string" && jsonTypes.has(x3);
    }
    exports.isJSONType = isJSONType;
    function getRules() {
      const groups3 = {
        number: { type: "number", rules: [] },
        string: { type: "string", rules: [] },
        array: { type: "array", rules: [] },
        object: { type: "object", rules: [] }
      };
      return {
        types: { ...groups3, integer: true, boolean: true, null: true },
        rules: [{ rules: [] }, groups3.number, groups3.string, groups3.array, groups3.object],
        post: { rules: [] },
        all: {},
        keywords: {}
      };
    }
    exports.getRules = getRules;
  }
});

// node_modules/ajv/dist/compile/validate/applicability.js
var require_applicability = __commonJS({
  "node_modules/ajv/dist/compile/validate/applicability.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.shouldUseRule = exports.shouldUseGroup = exports.schemaHasRulesForType = void 0;
    function schemaHasRulesForType({ schema, self }, type) {
      const group = self.RULES.types[type];
      return group && group !== true && shouldUseGroup(schema, group);
    }
    exports.schemaHasRulesForType = schemaHasRulesForType;
    function shouldUseGroup(schema, group) {
      return group.rules.some((rule) => shouldUseRule(schema, rule));
    }
    exports.shouldUseGroup = shouldUseGroup;
    function shouldUseRule(schema, rule) {
      var _a;
      return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
    }
    exports.shouldUseRule = shouldUseRule;
  }
});

// node_modules/ajv/dist/compile/validate/dataType.js
var require_dataType = __commonJS({
  "node_modules/ajv/dist/compile/validate/dataType.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reportTypeError = exports.checkDataTypes = exports.checkDataType = exports.coerceAndCheckDataType = exports.getJSONTypes = exports.getSchemaTypes = exports.DataType = void 0;
    var rules_1 = require_rules();
    var applicability_1 = require_applicability();
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var DataType;
    (function(DataType2) {
      DataType2[DataType2["Correct"] = 0] = "Correct";
      DataType2[DataType2["Wrong"] = 1] = "Wrong";
    })(DataType || (exports.DataType = DataType = {}));
    function getSchemaTypes(schema) {
      const types = getJSONTypes(schema.type);
      const hasNull = types.includes("null");
      if (hasNull) {
        if (schema.nullable === false)
          throw new Error("type: null contradicts nullable: false");
      } else {
        if (!types.length && schema.nullable !== void 0) {
          throw new Error('"nullable" cannot be used without "type"');
        }
        if (schema.nullable === true)
          types.push("null");
      }
      return types;
    }
    exports.getSchemaTypes = getSchemaTypes;
    function getJSONTypes(ts) {
      const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
      if (types.every(rules_1.isJSONType))
        return types;
      throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
    }
    exports.getJSONTypes = getJSONTypes;
    function coerceAndCheckDataType(it, types) {
      const { gen, data, opts } = it;
      const coerceTo = coerceToTypes(types, opts.coerceTypes);
      const checkTypes = types.length > 0 && !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types[0]));
      if (checkTypes) {
        const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
        gen.if(wrongType, () => {
          if (coerceTo.length)
            coerceData(it, types, coerceTo);
          else
            reportTypeError(it);
        });
      }
      return checkTypes;
    }
    exports.coerceAndCheckDataType = coerceAndCheckDataType;
    var COERCIBLE = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
    function coerceToTypes(types, coerceTypes) {
      return coerceTypes ? types.filter((t3) => COERCIBLE.has(t3) || coerceTypes === "array" && t3 === "array") : [];
    }
    function coerceData(it, types, coerceTo) {
      const { gen, data, opts } = it;
      const dataType = gen.let("dataType", (0, codegen_1._)`typeof ${data}`);
      const coerced = gen.let("coerced", (0, codegen_1._)`undefined`);
      if (opts.coerceTypes === "array") {
        gen.if((0, codegen_1._)`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1._)`${data}[0]`).assign(dataType, (0, codegen_1._)`typeof ${data}`).if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
      }
      gen.if((0, codegen_1._)`${coerced} !== undefined`);
      for (const t3 of coerceTo) {
        if (COERCIBLE.has(t3) || t3 === "array" && opts.coerceTypes === "array") {
          coerceSpecificType(t3);
        }
      }
      gen.else();
      reportTypeError(it);
      gen.endIf();
      gen.if((0, codegen_1._)`${coerced} !== undefined`, () => {
        gen.assign(data, coerced);
        assignParentData(it, coerced);
      });
      function coerceSpecificType(t3) {
        switch (t3) {
          case "string":
            gen.elseIf((0, codegen_1._)`${dataType} == "number" || ${dataType} == "boolean"`).assign(coerced, (0, codegen_1._)`"" + ${data}`).elseIf((0, codegen_1._)`${data} === null`).assign(coerced, (0, codegen_1._)`""`);
            return;
          case "number":
            gen.elseIf((0, codegen_1._)`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "integer":
            gen.elseIf((0, codegen_1._)`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "boolean":
            gen.elseIf((0, codegen_1._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
            return;
          case "null":
            gen.elseIf((0, codegen_1._)`${data} === "" || ${data} === 0 || ${data} === false`);
            gen.assign(coerced, null);
            return;
          case "array":
            gen.elseIf((0, codegen_1._)`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1._)`[${data}]`);
        }
      }
    }
    function assignParentData({ gen, parentData, parentDataProperty }, expr) {
      gen.if((0, codegen_1._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1._)`${parentData}[${parentDataProperty}]`, expr));
    }
    function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
      const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
      let cond;
      switch (dataType) {
        case "null":
          return (0, codegen_1._)`${data} ${EQ} null`;
        case "array":
          cond = (0, codegen_1._)`Array.isArray(${data})`;
          break;
        case "object":
          cond = (0, codegen_1._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
          break;
        case "integer":
          cond = numCond((0, codegen_1._)`!(${data} % 1) && !isNaN(${data})`);
          break;
        case "number":
          cond = numCond();
          break;
        default:
          return (0, codegen_1._)`typeof ${data} ${EQ} ${dataType}`;
      }
      return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
      function numCond(_cond = codegen_1.nil) {
        return (0, codegen_1.and)((0, codegen_1._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._)`isFinite(${data})` : codegen_1.nil);
      }
    }
    exports.checkDataType = checkDataType;
    function checkDataTypes(dataTypes, data, strictNums, correct) {
      if (dataTypes.length === 1) {
        return checkDataType(dataTypes[0], data, strictNums, correct);
      }
      let cond;
      const types = (0, util_1.toHash)(dataTypes);
      if (types.array && types.object) {
        const notObj = (0, codegen_1._)`typeof ${data} != "object"`;
        cond = types.null ? notObj : (0, codegen_1._)`!${data} || ${notObj}`;
        delete types.null;
        delete types.array;
        delete types.object;
      } else {
        cond = codegen_1.nil;
      }
      if (types.number)
        delete types.integer;
      for (const t3 in types)
        cond = (0, codegen_1.and)(cond, checkDataType(t3, data, strictNums, correct));
      return cond;
    }
    exports.checkDataTypes = checkDataTypes;
    var typeError = {
      message: ({ schema }) => `must be ${schema}`,
      params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._)`{type: ${schema}}` : (0, codegen_1._)`{type: ${schemaValue}}`
    };
    function reportTypeError(it) {
      const cxt = getTypeErrorContext(it);
      (0, errors_1.reportError)(cxt, typeError);
    }
    exports.reportTypeError = reportTypeError;
    function getTypeErrorContext(it) {
      const { gen, data, schema } = it;
      const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
      return {
        gen,
        keyword: "type",
        data,
        schema: schema.type,
        schemaCode,
        schemaValue: schemaCode,
        parentSchema: schema,
        params: {},
        it
      };
    }
  }
});

// node_modules/ajv/dist/compile/validate/defaults.js
var require_defaults = __commonJS({
  "node_modules/ajv/dist/compile/validate/defaults.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.assignDefaults = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function assignDefaults(it, ty) {
      const { properties, items } = it.schema;
      if (ty === "object" && properties) {
        for (const key in properties) {
          assignDefault(it, key, properties[key].default);
        }
      } else if (ty === "array" && Array.isArray(items)) {
        items.forEach((sch, i3) => assignDefault(it, i3, sch.default));
      }
    }
    exports.assignDefaults = assignDefaults;
    function assignDefault(it, prop, defaultValue) {
      const { gen, compositeRule, data, opts } = it;
      if (defaultValue === void 0)
        return;
      const childData = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(prop)}`;
      if (compositeRule) {
        (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
        return;
      }
      let condition = (0, codegen_1._)`${childData} === undefined`;
      if (opts.useDefaults === "empty") {
        condition = (0, codegen_1._)`${condition} || ${childData} === null || ${childData} === ""`;
      }
      gen.if(condition, (0, codegen_1._)`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
    }
  }
});

// node_modules/ajv/dist/vocabularies/code.js
var require_code2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/code.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateUnion = exports.validateArray = exports.usePattern = exports.callValidateCode = exports.schemaProperties = exports.allSchemaProperties = exports.noPropertyInData = exports.propertyInData = exports.isOwnProperty = exports.hasPropFunc = exports.reportMissingProp = exports.checkMissingProp = exports.checkReportMissingProp = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    var util_2 = require_util();
    function checkReportMissingProp(cxt, prop) {
      const { gen, data, it } = cxt;
      gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
        cxt.setParams({ missingProperty: (0, codegen_1._)`${prop}` }, true);
        cxt.error();
      });
    }
    exports.checkReportMissingProp = checkReportMissingProp;
    function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
      return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._)`${missing} = ${prop}`)));
    }
    exports.checkMissingProp = checkMissingProp;
    function reportMissingProp(cxt, missing) {
      cxt.setParams({ missingProperty: missing }, true);
      cxt.error();
    }
    exports.reportMissingProp = reportMissingProp;
    function hasPropFunc(gen) {
      return gen.scopeValue("func", {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ref: Object.prototype.hasOwnProperty,
        code: (0, codegen_1._)`Object.prototype.hasOwnProperty`
      });
    }
    exports.hasPropFunc = hasPropFunc;
    function isOwnProperty(gen, data, property) {
      return (0, codegen_1._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
    }
    exports.isOwnProperty = isOwnProperty;
    function propertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
      return ownProperties ? (0, codegen_1._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
    }
    exports.propertyInData = propertyInData;
    function noPropertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
      return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
    }
    exports.noPropertyInData = noPropertyInData;
    function allSchemaProperties(schemaMap) {
      return schemaMap ? Object.keys(schemaMap).filter((p3) => p3 !== "__proto__") : [];
    }
    exports.allSchemaProperties = allSchemaProperties;
    function schemaProperties(it, schemaMap) {
      return allSchemaProperties(schemaMap).filter((p3) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p3]));
    }
    exports.schemaProperties = schemaProperties;
    function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
      const dataAndSchema = passSchema ? (0, codegen_1._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
      const valCxt = [
        [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
        [names_1.default.parentData, it.parentData],
        [names_1.default.parentDataProperty, it.parentDataProperty],
        [names_1.default.rootData, names_1.default.rootData]
      ];
      if (it.opts.dynamicRef)
        valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
      const args = (0, codegen_1._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
      return context !== codegen_1.nil ? (0, codegen_1._)`${func}.call(${context}, ${args})` : (0, codegen_1._)`${func}(${args})`;
    }
    exports.callValidateCode = callValidateCode;
    var newRegExp = (0, codegen_1._)`new RegExp`;
    function usePattern({ gen, it: { opts } }, pattern) {
      const u4 = opts.unicodeRegExp ? "u" : "";
      const { regExp } = opts.code;
      const rx = regExp(pattern, u4);
      return gen.scopeValue("pattern", {
        key: rx.toString(),
        ref: rx,
        code: (0, codegen_1._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u4})`
      });
    }
    exports.usePattern = usePattern;
    function validateArray(cxt) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      if (it.allErrors) {
        const validArr = gen.let("valid", true);
        validateItems(() => gen.assign(validArr, false));
        return validArr;
      }
      gen.var(valid, true);
      validateItems(() => gen.break());
      return valid;
      function validateItems(notValid) {
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        gen.forRange("i", 0, len, (i3) => {
          cxt.subschema({
            keyword,
            dataProp: i3,
            dataPropType: util_1.Type.Num
          }, valid);
          gen.if((0, codegen_1.not)(valid), notValid);
        });
      }
    }
    exports.validateArray = validateArray;
    function validateUnion(cxt) {
      const { gen, schema, keyword, it } = cxt;
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const alwaysValid = schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch));
      if (alwaysValid && !it.opts.unevaluated)
        return;
      const valid = gen.let("valid", false);
      const schValid = gen.name("_valid");
      gen.block(() => schema.forEach((_sch, i3) => {
        const schCxt = cxt.subschema({
          keyword,
          schemaProp: i3,
          compositeRule: true
        }, schValid);
        gen.assign(valid, (0, codegen_1._)`${valid} || ${schValid}`);
        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
        if (!merged)
          gen.if((0, codegen_1.not)(valid));
      }));
      cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
    }
    exports.validateUnion = validateUnion;
  }
});

// node_modules/ajv/dist/compile/validate/keyword.js
var require_keyword = __commonJS({
  "node_modules/ajv/dist/compile/validate/keyword.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateKeywordUsage = exports.validSchemaType = exports.funcKeywordCode = exports.macroKeywordCode = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var code_1 = require_code2();
    var errors_1 = require_errors();
    function macroKeywordCode(cxt, def) {
      const { gen, keyword, schema, parentSchema, it } = cxt;
      const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
      const schemaRef = useKeyword(gen, keyword, macroSchema);
      if (it.opts.validateSchema !== false)
        it.self.validateSchema(macroSchema, true);
      const valid = gen.name("valid");
      cxt.subschema({
        schema: macroSchema,
        schemaPath: codegen_1.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
        topSchemaRef: schemaRef,
        compositeRule: true
      }, valid);
      cxt.pass(valid, () => cxt.error(true));
    }
    exports.macroKeywordCode = macroKeywordCode;
    function funcKeywordCode(cxt, def) {
      var _a;
      const { gen, keyword, schema, parentSchema, $data, it } = cxt;
      checkAsyncKeyword(it, def);
      const validate = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
      const validateRef = useKeyword(gen, keyword, validate);
      const valid = gen.let("valid");
      cxt.block$data(valid, validateKeyword);
      cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
      function validateKeyword() {
        if (def.errors === false) {
          assignValid();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => cxt.error());
        } else {
          const ruleErrs = def.async ? validateAsync() : validateSync();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => addErrs(cxt, ruleErrs));
        }
      }
      function validateAsync() {
        const ruleErrs = gen.let("ruleErrs", null);
        gen.try(() => assignValid((0, codegen_1._)`await `), (e3) => gen.assign(valid, false).if((0, codegen_1._)`${e3} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._)`${e3}.errors`), () => gen.throw(e3)));
        return ruleErrs;
      }
      function validateSync() {
        const validateErrs = (0, codegen_1._)`${validateRef}.errors`;
        gen.assign(validateErrs, null);
        assignValid(codegen_1.nil);
        return validateErrs;
      }
      function assignValid(_await = def.async ? (0, codegen_1._)`await ` : codegen_1.nil) {
        const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
        const passSchema = !("compile" in def && !$data || def.schema === false);
        gen.assign(valid, (0, codegen_1._)`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
      }
      function reportErrs(errors) {
        var _a2;
        gen.if((0, codegen_1.not)((_a2 = def.valid) !== null && _a2 !== void 0 ? _a2 : valid), errors);
      }
    }
    exports.funcKeywordCode = funcKeywordCode;
    function modifyData(cxt) {
      const { gen, data, it } = cxt;
      gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._)`${it.parentData}[${it.parentDataProperty}]`));
    }
    function addErrs(cxt, errs) {
      const { gen } = cxt;
      gen.if((0, codegen_1._)`Array.isArray(${errs})`, () => {
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`).assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
        (0, errors_1.extendErrors)(cxt);
      }, () => cxt.error());
    }
    function checkAsyncKeyword({ schemaEnv }, def) {
      if (def.async && !schemaEnv.$async)
        throw new Error("async keyword in sync schema");
    }
    function useKeyword(gen, keyword, result2) {
      if (result2 === void 0)
        throw new Error(`keyword "${keyword}" failed to compile`);
      return gen.scopeValue("keyword", typeof result2 == "function" ? { ref: result2 } : { ref: result2, code: (0, codegen_1.stringify)(result2) });
    }
    function validSchemaType(schema, schemaType, allowUndefined = false) {
      return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
    }
    exports.validSchemaType = validSchemaType;
    function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
      if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) {
        throw new Error("ajv implementation error");
      }
      const deps = def.dependencies;
      if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
        throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
      }
      if (def.validateSchema) {
        const valid = def.validateSchema(schema[keyword]);
        if (!valid) {
          const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def.validateSchema.errors);
          if (opts.validateSchema === "log")
            self.logger.error(msg);
          else
            throw new Error(msg);
        }
      }
    }
    exports.validateKeywordUsage = validateKeywordUsage;
  }
});

// node_modules/ajv/dist/compile/validate/subschema.js
var require_subschema = __commonJS({
  "node_modules/ajv/dist/compile/validate/subschema.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extendSubschemaMode = exports.extendSubschemaData = exports.getSubschema = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
      if (keyword !== void 0 && schema !== void 0) {
        throw new Error('both "keyword" and "schema" passed, only one allowed');
      }
      if (keyword !== void 0) {
        const sch = it.schema[keyword];
        return schemaProp === void 0 ? {
          schema: sch,
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}`
        } : {
          schema: sch[schemaProp],
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`
        };
      }
      if (schema !== void 0) {
        if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
          throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
        }
        return {
          schema,
          schemaPath,
          topSchemaRef,
          errSchemaPath
        };
      }
      throw new Error('either "keyword" or "schema" must be passed');
    }
    exports.getSubschema = getSubschema;
    function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
      if (data !== void 0 && dataProp !== void 0) {
        throw new Error('both "data" and "dataProp" passed, only one allowed');
      }
      const { gen } = it;
      if (dataProp !== void 0) {
        const { errorPath, dataPathArr, opts } = it;
        const nextData = gen.let("data", (0, codegen_1._)`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true);
        dataContextProps(nextData);
        subschema.errorPath = (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
        subschema.parentDataProperty = (0, codegen_1._)`${dataProp}`;
        subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
      }
      if (data !== void 0) {
        const nextData = data instanceof codegen_1.Name ? data : gen.let("data", data, true);
        dataContextProps(nextData);
        if (propertyName !== void 0)
          subschema.propertyName = propertyName;
      }
      if (dataTypes)
        subschema.dataTypes = dataTypes;
      function dataContextProps(_nextData) {
        subschema.data = _nextData;
        subschema.dataLevel = it.dataLevel + 1;
        subschema.dataTypes = [];
        it.definedProperties = /* @__PURE__ */ new Set();
        subschema.parentData = it.data;
        subschema.dataNames = [...it.dataNames, _nextData];
      }
    }
    exports.extendSubschemaData = extendSubschemaData;
    function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
      if (compositeRule !== void 0)
        subschema.compositeRule = compositeRule;
      if (createErrors !== void 0)
        subschema.createErrors = createErrors;
      if (allErrors !== void 0)
        subschema.allErrors = allErrors;
      subschema.jtdDiscriminator = jtdDiscriminator;
      subschema.jtdMetadata = jtdMetadata;
    }
    exports.extendSubschemaMode = extendSubschemaMode;
  }
});

// node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = __commonJS({
  "node_modules/fast-deep-equal/index.js"(exports, module) {
    "use strict";
    module.exports = function equal(a3, b2) {
      if (a3 === b2) return true;
      if (a3 && b2 && typeof a3 == "object" && typeof b2 == "object") {
        if (a3.constructor !== b2.constructor) return false;
        var length, i3, keys;
        if (Array.isArray(a3)) {
          length = a3.length;
          if (length != b2.length) return false;
          for (i3 = length; i3-- !== 0; )
            if (!equal(a3[i3], b2[i3])) return false;
          return true;
        }
        if (a3.constructor === RegExp) return a3.source === b2.source && a3.flags === b2.flags;
        if (a3.valueOf !== Object.prototype.valueOf) return a3.valueOf() === b2.valueOf();
        if (a3.toString !== Object.prototype.toString) return a3.toString() === b2.toString();
        keys = Object.keys(a3);
        length = keys.length;
        if (length !== Object.keys(b2).length) return false;
        for (i3 = length; i3-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b2, keys[i3])) return false;
        for (i3 = length; i3-- !== 0; ) {
          var key = keys[i3];
          if (!equal(a3[key], b2[key])) return false;
        }
        return true;
      }
      return a3 !== a3 && b2 !== b2;
    };
  }
});

// node_modules/json-schema-traverse/index.js
var require_json_schema_traverse = __commonJS({
  "node_modules/json-schema-traverse/index.js"(exports, module) {
    "use strict";
    var traverse = module.exports = function(schema, opts, cb) {
      if (typeof opts == "function") {
        cb = opts;
        opts = {};
      }
      cb = opts.cb || cb;
      var pre = typeof cb == "function" ? cb : cb.pre || function() {
      };
      var post = cb.post || function() {
      };
      _traverse(opts, pre, post, schema, "", schema);
    };
    traverse.keywords = {
      additionalItems: true,
      items: true,
      contains: true,
      additionalProperties: true,
      propertyNames: true,
      not: true,
      if: true,
      then: true,
      else: true
    };
    traverse.arrayKeywords = {
      items: true,
      allOf: true,
      anyOf: true,
      oneOf: true
    };
    traverse.propsKeywords = {
      $defs: true,
      definitions: true,
      properties: true,
      patternProperties: true,
      dependencies: true
    };
    traverse.skipKeywords = {
      default: true,
      enum: true,
      const: true,
      required: true,
      maximum: true,
      minimum: true,
      exclusiveMaximum: true,
      exclusiveMinimum: true,
      multipleOf: true,
      maxLength: true,
      minLength: true,
      pattern: true,
      format: true,
      maxItems: true,
      minItems: true,
      uniqueItems: true,
      maxProperties: true,
      minProperties: true
    };
    function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
      if (schema && typeof schema == "object" && !Array.isArray(schema)) {
        pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
        for (var key in schema) {
          var sch = schema[key];
          if (Array.isArray(sch)) {
            if (key in traverse.arrayKeywords) {
              for (var i3 = 0; i3 < sch.length; i3++)
                _traverse(opts, pre, post, sch[i3], jsonPtr + "/" + key + "/" + i3, rootSchema, jsonPtr, key, schema, i3);
            }
          } else if (key in traverse.propsKeywords) {
            if (sch && typeof sch == "object") {
              for (var prop in sch)
                _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
            }
          } else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) {
            _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
          }
        }
        post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      }
    }
    function escapeJsonPtr(str) {
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
  }
});

// node_modules/ajv/dist/compile/resolve.js
var require_resolve = __commonJS({
  "node_modules/ajv/dist/compile/resolve.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getSchemaRefs = exports.resolveUrl = exports.normalizeId = exports._getFullPath = exports.getFullPath = exports.inlineRef = void 0;
    var util_1 = require_util();
    var equal = require_fast_deep_equal();
    var traverse = require_json_schema_traverse();
    var SIMPLE_INLINED = /* @__PURE__ */ new Set([
      "type",
      "format",
      "pattern",
      "maxLength",
      "minLength",
      "maxProperties",
      "minProperties",
      "maxItems",
      "minItems",
      "maximum",
      "minimum",
      "uniqueItems",
      "multipleOf",
      "required",
      "enum",
      "const"
    ]);
    function inlineRef(schema, limit = true) {
      if (typeof schema == "boolean")
        return true;
      if (limit === true)
        return !hasRef(schema);
      if (!limit)
        return false;
      return countKeys(schema) <= limit;
    }
    exports.inlineRef = inlineRef;
    var REF_KEYWORDS = /* @__PURE__ */ new Set([
      "$ref",
      "$recursiveRef",
      "$recursiveAnchor",
      "$dynamicRef",
      "$dynamicAnchor"
    ]);
    function hasRef(schema) {
      for (const key in schema) {
        if (REF_KEYWORDS.has(key))
          return true;
        const sch = schema[key];
        if (Array.isArray(sch) && sch.some(hasRef))
          return true;
        if (typeof sch == "object" && hasRef(sch))
          return true;
      }
      return false;
    }
    function countKeys(schema) {
      let count = 0;
      for (const key in schema) {
        if (key === "$ref")
          return Infinity;
        count++;
        if (SIMPLE_INLINED.has(key))
          continue;
        if (typeof schema[key] == "object") {
          (0, util_1.eachItem)(schema[key], (sch) => count += countKeys(sch));
        }
        if (count === Infinity)
          return Infinity;
      }
      return count;
    }
    function getFullPath(resolver, id = "", normalize) {
      if (normalize !== false)
        id = normalizeId(id);
      const p3 = resolver.parse(id);
      return _getFullPath(resolver, p3);
    }
    exports.getFullPath = getFullPath;
    function _getFullPath(resolver, p3) {
      const serialized = resolver.serialize(p3);
      return serialized.split("#")[0] + "#";
    }
    exports._getFullPath = _getFullPath;
    var TRAILING_SLASH_HASH = /#\/?$/;
    function normalizeId(id) {
      return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
    }
    exports.normalizeId = normalizeId;
    function resolveUrl(resolver, baseId, id) {
      id = normalizeId(id);
      return resolver.resolve(baseId, id);
    }
    exports.resolveUrl = resolveUrl;
    var ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
    function getSchemaRefs(schema, baseId) {
      if (typeof schema == "boolean")
        return {};
      const { schemaId, uriResolver } = this.opts;
      const schId = normalizeId(schema[schemaId] || baseId);
      const baseIds = { "": schId };
      const pathPrefix = getFullPath(uriResolver, schId, false);
      const localRefs = {};
      const schemaRefs = /* @__PURE__ */ new Set();
      traverse(schema, { allKeys: true }, (sch, jsonPtr, _3, parentJsonPtr) => {
        if (parentJsonPtr === void 0)
          return;
        const fullPath = pathPrefix + jsonPtr;
        let innerBaseId = baseIds[parentJsonPtr];
        if (typeof sch[schemaId] == "string")
          innerBaseId = addRef.call(this, sch[schemaId]);
        addAnchor.call(this, sch.$anchor);
        addAnchor.call(this, sch.$dynamicAnchor);
        baseIds[jsonPtr] = innerBaseId;
        function addRef(ref) {
          const _resolve = this.opts.uriResolver.resolve;
          ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
          if (schemaRefs.has(ref))
            throw ambiguos(ref);
          schemaRefs.add(ref);
          let schOrRef = this.refs[ref];
          if (typeof schOrRef == "string")
            schOrRef = this.refs[schOrRef];
          if (typeof schOrRef == "object") {
            checkAmbiguosRef(sch, schOrRef.schema, ref);
          } else if (ref !== normalizeId(fullPath)) {
            if (ref[0] === "#") {
              checkAmbiguosRef(sch, localRefs[ref], ref);
              localRefs[ref] = sch;
            } else {
              this.refs[ref] = fullPath;
            }
          }
          return ref;
        }
        function addAnchor(anchor) {
          if (typeof anchor == "string") {
            if (!ANCHOR.test(anchor))
              throw new Error(`invalid anchor "${anchor}"`);
            addRef.call(this, `#${anchor}`);
          }
        }
      });
      return localRefs;
      function checkAmbiguosRef(sch1, sch2, ref) {
        if (sch2 !== void 0 && !equal(sch1, sch2))
          throw ambiguos(ref);
      }
      function ambiguos(ref) {
        return new Error(`reference "${ref}" resolves to more than one schema`);
      }
    }
    exports.getSchemaRefs = getSchemaRefs;
  }
});

// node_modules/ajv/dist/compile/validate/index.js
var require_validate = __commonJS({
  "node_modules/ajv/dist/compile/validate/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getData = exports.KeywordCxt = exports.validateFunctionCode = void 0;
    var boolSchema_1 = require_boolSchema();
    var dataType_1 = require_dataType();
    var applicability_1 = require_applicability();
    var dataType_2 = require_dataType();
    var defaults_1 = require_defaults();
    var keyword_1 = require_keyword();
    var subschema_1 = require_subschema();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var errors_1 = require_errors();
    function validateFunctionCode(it) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          topSchemaObjCode(it);
          return;
        }
      }
      validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
    }
    exports.validateFunctionCode = validateFunctionCode;
    function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
      if (opts.code.es5) {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
          gen.code((0, codegen_1._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
          destructureValCxtES5(gen, opts);
          gen.code(body);
        });
      } else {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
      }
    }
    function destructureValCxt(opts) {
      return (0, codegen_1._)`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._)`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
    }
    function destructureValCxtES5(gen, opts) {
      gen.if(names_1.default.valCxt, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.instancePath}`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentData}`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
        gen.var(names_1.default.rootData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.rootData}`);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
      }, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`""`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.rootData, names_1.default.data);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`{}`);
      });
    }
    function topSchemaObjCode(it) {
      const { schema, opts, gen } = it;
      validateFunction(it, () => {
        if (opts.$comment && schema.$comment)
          commentKeyword(it);
        checkNoDefault(it);
        gen.let(names_1.default.vErrors, null);
        gen.let(names_1.default.errors, 0);
        if (opts.unevaluated)
          resetEvaluated(it);
        typeAndKeywords(it);
        returnResults(it);
      });
      return;
    }
    function resetEvaluated(it) {
      const { gen, validateName } = it;
      it.evaluated = gen.const("evaluated", (0, codegen_1._)`${validateName}.evaluated`);
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._)`${it.evaluated}.props`, (0, codegen_1._)`undefined`));
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._)`${it.evaluated}.items`, (0, codegen_1._)`undefined`));
    }
    function funcSourceUrl(schema, opts) {
      const schId = typeof schema == "object" && schema[opts.schemaId];
      return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._)`/*# sourceURL=${schId} */` : codegen_1.nil;
    }
    function subschemaCode(it, valid) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          subSchemaObjCode(it, valid);
          return;
        }
      }
      (0, boolSchema_1.boolOrEmptySchema)(it, valid);
    }
    function schemaCxtHasRules({ schema, self }) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (self.RULES.all[key])
          return true;
      return false;
    }
    function isSchemaObj(it) {
      return typeof it.schema != "boolean";
    }
    function subSchemaObjCode(it, valid) {
      const { schema, gen, opts } = it;
      if (opts.$comment && schema.$comment)
        commentKeyword(it);
      updateContext(it);
      checkAsyncSchema(it);
      const errsCount = gen.const("_errs", names_1.default.errors);
      typeAndKeywords(it, errsCount);
      gen.var(valid, (0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
    }
    function checkKeywords(it) {
      (0, util_1.checkUnknownRules)(it);
      checkRefsAndKeywords(it);
    }
    function typeAndKeywords(it, errsCount) {
      if (it.opts.jtd)
        return schemaKeywords(it, [], false, errsCount);
      const types = (0, dataType_1.getSchemaTypes)(it.schema);
      const checkedTypes = (0, dataType_1.coerceAndCheckDataType)(it, types);
      schemaKeywords(it, types, !checkedTypes, errsCount);
    }
    function checkRefsAndKeywords(it) {
      const { schema, errSchemaPath, opts, self } = it;
      if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) {
        self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
      }
    }
    function checkNoDefault(it) {
      const { schema, opts } = it;
      if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
        (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
      }
    }
    function updateContext(it) {
      const schId = it.schema[it.opts.schemaId];
      if (schId)
        it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
    }
    function checkAsyncSchema(it) {
      if (it.schema.$async && !it.schemaEnv.$async)
        throw new Error("async schema in sync schema");
    }
    function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
      const msg = schema.$comment;
      if (opts.$comment === true) {
        gen.code((0, codegen_1._)`${names_1.default.self}.logger.log(${msg})`);
      } else if (typeof opts.$comment == "function") {
        const schemaPath = (0, codegen_1.str)`${errSchemaPath}/$comment`;
        const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
        gen.code((0, codegen_1._)`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
      }
    }
    function returnResults(it) {
      const { gen, schemaEnv, validateName, ValidationError, opts } = it;
      if (schemaEnv.$async) {
        gen.if((0, codegen_1._)`${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._)`new ${ValidationError}(${names_1.default.vErrors})`));
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, names_1.default.vErrors);
        if (opts.unevaluated)
          assignEvaluated(it);
        gen.return((0, codegen_1._)`${names_1.default.errors} === 0`);
      }
    }
    function assignEvaluated({ gen, evaluated, props, items }) {
      if (props instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.props`, props);
      if (items instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.items`, items);
    }
    function schemaKeywords(it, types, typeErrors, errsCount) {
      const { gen, schema, data, allErrors, opts, self } = it;
      const { RULES } = self;
      if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
        gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
        return;
      }
      if (!opts.jtd)
        checkStrictTypes(it, types);
      gen.block(() => {
        for (const group of RULES.rules)
          groupKeywords(group);
        groupKeywords(RULES.post);
      });
      function groupKeywords(group) {
        if (!(0, applicability_1.shouldUseGroup)(schema, group))
          return;
        if (group.type) {
          gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
          iterateKeywords(it, group);
          if (types.length === 1 && types[0] === group.type && typeErrors) {
            gen.else();
            (0, dataType_2.reportTypeError)(it);
          }
          gen.endIf();
        } else {
          iterateKeywords(it, group);
        }
        if (!allErrors)
          gen.if((0, codegen_1._)`${names_1.default.errors} === ${errsCount || 0}`);
      }
    }
    function iterateKeywords(it, group) {
      const { gen, schema, opts: { useDefaults } } = it;
      if (useDefaults)
        (0, defaults_1.assignDefaults)(it, group.type);
      gen.block(() => {
        for (const rule of group.rules) {
          if ((0, applicability_1.shouldUseRule)(schema, rule)) {
            keywordCode(it, rule.keyword, rule.definition, group.type);
          }
        }
      });
    }
    function checkStrictTypes(it, types) {
      if (it.schemaEnv.meta || !it.opts.strictTypes)
        return;
      checkContextTypes(it, types);
      if (!it.opts.allowUnionTypes)
        checkMultipleTypes(it, types);
      checkKeywordTypes(it, it.dataTypes);
    }
    function checkContextTypes(it, types) {
      if (!types.length)
        return;
      if (!it.dataTypes.length) {
        it.dataTypes = types;
        return;
      }
      types.forEach((t3) => {
        if (!includesType(it.dataTypes, t3)) {
          strictTypesError(it, `type "${t3}" not allowed by context "${it.dataTypes.join(",")}"`);
        }
      });
      narrowSchemaTypes(it, types);
    }
    function checkMultipleTypes(it, ts) {
      if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
        strictTypesError(it, "use allowUnionTypes to allow union type keyword");
      }
    }
    function checkKeywordTypes(it, ts) {
      const rules = it.self.RULES.all;
      for (const keyword in rules) {
        const rule = rules[keyword];
        if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
          const { type } = rule.definition;
          if (type.length && !type.some((t3) => hasApplicableType(ts, t3))) {
            strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
          }
        }
      }
    }
    function hasApplicableType(schTs, kwdT) {
      return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
    }
    function includesType(ts, t3) {
      return ts.includes(t3) || t3 === "integer" && ts.includes("number");
    }
    function narrowSchemaTypes(it, withTypes) {
      const ts = [];
      for (const t3 of it.dataTypes) {
        if (includesType(withTypes, t3))
          ts.push(t3);
        else if (withTypes.includes("integer") && t3 === "number")
          ts.push("integer");
      }
      it.dataTypes = ts;
    }
    function strictTypesError(it, msg) {
      const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
      msg += ` at "${schemaPath}" (strictTypes)`;
      (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
    }
    var KeywordCxt = class {
      constructor(it, def, keyword) {
        (0, keyword_1.validateKeywordUsage)(it, def, keyword);
        this.gen = it.gen;
        this.allErrors = it.allErrors;
        this.keyword = keyword;
        this.data = it.data;
        this.schema = it.schema[keyword];
        this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
        this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
        this.schemaType = def.schemaType;
        this.parentSchema = it.schema;
        this.params = {};
        this.it = it;
        this.def = def;
        if (this.$data) {
          this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
        } else {
          this.schemaCode = this.schemaValue;
          if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) {
            throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
          }
        }
        if ("code" in def ? def.trackErrors : def.errors !== false) {
          this.errsCount = it.gen.const("_errs", names_1.default.errors);
        }
      }
      result(condition, successAction, failAction) {
        this.failResult((0, codegen_1.not)(condition), successAction, failAction);
      }
      failResult(condition, successAction, failAction) {
        this.gen.if(condition);
        if (failAction)
          failAction();
        else
          this.error();
        if (successAction) {
          this.gen.else();
          successAction();
          if (this.allErrors)
            this.gen.endIf();
        } else {
          if (this.allErrors)
            this.gen.endIf();
          else
            this.gen.else();
        }
      }
      pass(condition, failAction) {
        this.failResult((0, codegen_1.not)(condition), void 0, failAction);
      }
      fail(condition) {
        if (condition === void 0) {
          this.error();
          if (!this.allErrors)
            this.gen.if(false);
          return;
        }
        this.gen.if(condition);
        this.error();
        if (this.allErrors)
          this.gen.endIf();
        else
          this.gen.else();
      }
      fail$data(condition) {
        if (!this.$data)
          return this.fail(condition);
        const { schemaCode } = this;
        this.fail((0, codegen_1._)`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
      }
      error(append, errorParams, errorPaths) {
        if (errorParams) {
          this.setParams(errorParams);
          this._error(append, errorPaths);
          this.setParams({});
          return;
        }
        this._error(append, errorPaths);
      }
      _error(append, errorPaths) {
        ;
        (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
      }
      $dataError() {
        (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
      }
      reset() {
        if (this.errsCount === void 0)
          throw new Error('add "trackErrors" to keyword definition');
        (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
      }
      ok(cond) {
        if (!this.allErrors)
          this.gen.if(cond);
      }
      setParams(obj, assign) {
        if (assign)
          Object.assign(this.params, obj);
        else
          this.params = obj;
      }
      block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
        this.gen.block(() => {
          this.check$data(valid, $dataValid);
          codeBlock();
        });
      }
      check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
        if (!this.$data)
          return;
        const { gen, schemaCode, schemaType, def } = this;
        gen.if((0, codegen_1.or)((0, codegen_1._)`${schemaCode} === undefined`, $dataValid));
        if (valid !== codegen_1.nil)
          gen.assign(valid, true);
        if (schemaType.length || def.validateSchema) {
          gen.elseIf(this.invalid$data());
          this.$dataError();
          if (valid !== codegen_1.nil)
            gen.assign(valid, false);
        }
        gen.else();
      }
      invalid$data() {
        const { gen, schemaCode, schemaType, def, it } = this;
        return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
        function wrong$DataType() {
          if (schemaType.length) {
            if (!(schemaCode instanceof codegen_1.Name))
              throw new Error("ajv implementation error");
            const st = Array.isArray(schemaType) ? schemaType : [schemaType];
            return (0, codegen_1._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
          }
          return codegen_1.nil;
        }
        function invalid$DataSchema() {
          if (def.validateSchema) {
            const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema });
            return (0, codegen_1._)`!${validateSchemaRef}(${schemaCode})`;
          }
          return codegen_1.nil;
        }
      }
      subschema(appl, valid) {
        const subschema = (0, subschema_1.getSubschema)(this.it, appl);
        (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
        (0, subschema_1.extendSubschemaMode)(subschema, appl);
        const nextContext = { ...this.it, ...subschema, items: void 0, props: void 0 };
        subschemaCode(nextContext, valid);
        return nextContext;
      }
      mergeEvaluated(schemaCxt, toName) {
        const { it, gen } = this;
        if (!it.opts.unevaluated)
          return;
        if (it.props !== true && schemaCxt.props !== void 0) {
          it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
        }
        if (it.items !== true && schemaCxt.items !== void 0) {
          it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
        }
      }
      mergeValidEvaluated(schemaCxt, valid) {
        const { it, gen } = this;
        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
          gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
          return true;
        }
      }
    };
    exports.KeywordCxt = KeywordCxt;
    function keywordCode(it, keyword, def, ruleType) {
      const cxt = new KeywordCxt(it, def, keyword);
      if ("code" in def) {
        def.code(cxt, ruleType);
      } else if (cxt.$data && def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      } else if ("macro" in def) {
        (0, keyword_1.macroKeywordCode)(cxt, def);
      } else if (def.compile || def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      }
    }
    var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
    var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
    function getData($data, { dataLevel, dataNames, dataPathArr }) {
      let jsonPointer;
      let data;
      if ($data === "")
        return names_1.default.rootData;
      if ($data[0] === "/") {
        if (!JSON_POINTER.test($data))
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        jsonPointer = $data;
        data = names_1.default.rootData;
      } else {
        const matches = RELATIVE_JSON_POINTER.exec($data);
        if (!matches)
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        const up = +matches[1];
        jsonPointer = matches[2];
        if (jsonPointer === "#") {
          if (up >= dataLevel)
            throw new Error(errorMsg("property/index", up));
          return dataPathArr[dataLevel - up];
        }
        if (up > dataLevel)
          throw new Error(errorMsg("data", up));
        data = dataNames[dataLevel - up];
        if (!jsonPointer)
          return data;
      }
      let expr = data;
      const segments = jsonPointer.split("/");
      for (const segment of segments) {
        if (segment) {
          data = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
          expr = (0, codegen_1._)`${expr} && ${data}`;
        }
      }
      return expr;
      function errorMsg(pointerType, up) {
        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
      }
    }
    exports.getData = getData;
  }
});

// node_modules/ajv/dist/runtime/validation_error.js
var require_validation_error = __commonJS({
  "node_modules/ajv/dist/runtime/validation_error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ValidationError = class extends Error {
      constructor(errors) {
        super("validation failed");
        this.errors = errors;
        this.ajv = this.validation = true;
      }
    };
    exports.default = ValidationError;
  }
});

// node_modules/ajv/dist/compile/ref_error.js
var require_ref_error = __commonJS({
  "node_modules/ajv/dist/compile/ref_error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var resolve_1 = require_resolve();
    var MissingRefError = class extends Error {
      constructor(resolver, baseId, ref, msg) {
        super(msg || `can't resolve reference ${ref} from id ${baseId}`);
        this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
        this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
      }
    };
    exports.default = MissingRefError;
  }
});

// node_modules/ajv/dist/compile/index.js
var require_compile = __commonJS({
  "node_modules/ajv/dist/compile/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resolveSchema = exports.getCompilingSchema = exports.resolveRef = exports.compileSchema = exports.SchemaEnv = void 0;
    var codegen_1 = require_codegen();
    var validation_error_1 = require_validation_error();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var validate_1 = require_validate();
    var SchemaEnv = class {
      constructor(env) {
        var _a;
        this.refs = {};
        this.dynamicAnchors = {};
        let schema;
        if (typeof env.schema == "object")
          schema = env.schema;
        this.schema = env.schema;
        this.schemaId = env.schemaId;
        this.root = env.root || this;
        this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
        this.schemaPath = env.schemaPath;
        this.localRefs = env.localRefs;
        this.meta = env.meta;
        this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
        this.refs = {};
      }
    };
    exports.SchemaEnv = SchemaEnv;
    function compileSchema(sch) {
      const _sch = getCompilingSchema.call(this, sch);
      if (_sch)
        return _sch;
      const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
      const { es5, lines } = this.opts.code;
      const { ownProperties } = this.opts;
      const gen = new codegen_1.CodeGen(this.scope, { es5, lines, ownProperties });
      let _ValidationError;
      if (sch.$async) {
        _ValidationError = gen.scopeValue("Error", {
          ref: validation_error_1.default,
          code: (0, codegen_1._)`require("ajv/dist/runtime/validation_error").default`
        });
      }
      const validateName = gen.scopeName("validate");
      sch.validateName = validateName;
      const schemaCxt = {
        gen,
        allErrors: this.opts.allErrors,
        data: names_1.default.data,
        parentData: names_1.default.parentData,
        parentDataProperty: names_1.default.parentDataProperty,
        dataNames: [names_1.default.data],
        dataPathArr: [codegen_1.nil],
        // TODO can its length be used as dataLevel if nil is removed?
        dataLevel: 0,
        dataTypes: [],
        definedProperties: /* @__PURE__ */ new Set(),
        topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: (0, codegen_1.stringify)(sch.schema) } : { ref: sch.schema }),
        validateName,
        ValidationError: _ValidationError,
        schema: sch.schema,
        schemaEnv: sch,
        rootId,
        baseId: sch.baseId || rootId,
        schemaPath: codegen_1.nil,
        errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: (0, codegen_1._)`""`,
        opts: this.opts,
        self: this
      };
      let sourceCode;
      try {
        this._compilations.add(sch);
        (0, validate_1.validateFunctionCode)(schemaCxt);
        gen.optimize(this.opts.code.optimize);
        const validateCode = gen.toString();
        sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
        if (this.opts.code.process)
          sourceCode = this.opts.code.process(sourceCode, sch);
        const makeValidate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode);
        const validate = makeValidate(this, this.scope.get());
        this.scope.value(validateName, { ref: validate });
        validate.errors = null;
        validate.schema = sch.schema;
        validate.schemaEnv = sch;
        if (sch.$async)
          validate.$async = true;
        if (this.opts.code.source === true) {
          validate.source = { validateName, validateCode, scopeValues: gen._values };
        }
        if (this.opts.unevaluated) {
          const { props, items } = schemaCxt;
          validate.evaluated = {
            props: props instanceof codegen_1.Name ? void 0 : props,
            items: items instanceof codegen_1.Name ? void 0 : items,
            dynamicProps: props instanceof codegen_1.Name,
            dynamicItems: items instanceof codegen_1.Name
          };
          if (validate.source)
            validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
        }
        sch.validate = validate;
        return sch;
      } catch (e3) {
        delete sch.validate;
        delete sch.validateName;
        if (sourceCode)
          this.logger.error("Error compiling schema, function code:", sourceCode);
        throw e3;
      } finally {
        this._compilations.delete(sch);
      }
    }
    exports.compileSchema = compileSchema;
    function resolveRef(root, baseId, ref) {
      var _a;
      ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
      const schOrFunc = root.refs[ref];
      if (schOrFunc)
        return schOrFunc;
      let _sch = resolve.call(this, root, ref);
      if (_sch === void 0) {
        const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref];
        const { schemaId } = this.opts;
        if (schema)
          _sch = new SchemaEnv({ schema, schemaId, root, baseId });
      }
      if (_sch === void 0)
        return;
      return root.refs[ref] = inlineOrCompile.call(this, _sch);
    }
    exports.resolveRef = resolveRef;
    function inlineOrCompile(sch) {
      if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
        return sch.schema;
      return sch.validate ? sch : compileSchema.call(this, sch);
    }
    function getCompilingSchema(schEnv) {
      for (const sch of this._compilations) {
        if (sameSchemaEnv(sch, schEnv))
          return sch;
      }
    }
    exports.getCompilingSchema = getCompilingSchema;
    function sameSchemaEnv(s1, s22) {
      return s1.schema === s22.schema && s1.root === s22.root && s1.baseId === s22.baseId;
    }
    function resolve(root, ref) {
      let sch;
      while (typeof (sch = this.refs[ref]) == "string")
        ref = sch;
      return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
    }
    function resolveSchema(root, ref) {
      const p3 = this.opts.uriResolver.parse(ref);
      const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p3);
      let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
      if (Object.keys(root.schema).length > 0 && refPath === baseId) {
        return getJsonPointer.call(this, p3, root);
      }
      const id = (0, resolve_1.normalizeId)(refPath);
      const schOrRef = this.refs[id] || this.schemas[id];
      if (typeof schOrRef == "string") {
        const sch = resolveSchema.call(this, root, schOrRef);
        if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
          return;
        return getJsonPointer.call(this, p3, sch);
      }
      if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
        return;
      if (!schOrRef.validate)
        compileSchema.call(this, schOrRef);
      if (id === (0, resolve_1.normalizeId)(ref)) {
        const { schema } = schOrRef;
        const { schemaId } = this.opts;
        const schId = schema[schemaId];
        if (schId)
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        return new SchemaEnv({ schema, schemaId, root, baseId });
      }
      return getJsonPointer.call(this, p3, schOrRef);
    }
    exports.resolveSchema = resolveSchema;
    var PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
      "properties",
      "patternProperties",
      "enum",
      "dependencies",
      "definitions"
    ]);
    function getJsonPointer(parsedRef, { baseId, schema, root }) {
      var _a;
      if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
        return;
      for (const part of parsedRef.fragment.slice(1).split("/")) {
        if (typeof schema === "boolean")
          return;
        const partSchema = schema[(0, util_1.unescapeFragment)(part)];
        if (partSchema === void 0)
          return;
        schema = partSchema;
        const schId = typeof schema === "object" && schema[this.opts.schemaId];
        if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        }
      }
      let env;
      if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
        const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
        env = resolveSchema.call(this, root, $ref);
      }
      const { schemaId } = this.opts;
      env = env || new SchemaEnv({ schema, schemaId, root, baseId });
      if (env.schema !== env.root.schema)
        return env;
      return void 0;
    }
  }
});

// node_modules/ajv/dist/refs/data.json
var require_data = __commonJS({
  "node_modules/ajv/dist/refs/data.json"(exports, module) {
    module.exports = {
      $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
      description: "Meta-schema for $data reference (JSON AnySchema extension proposal)",
      type: "object",
      required: ["$data"],
      properties: {
        $data: {
          type: "string",
          anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }]
        }
      },
      additionalProperties: false
    };
  }
});

// node_modules/fast-uri/lib/utils.js
var require_utils = __commonJS({
  "node_modules/fast-uri/lib/utils.js"(exports, module) {
    "use strict";
    var isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
    var isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
    var isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);
    var isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);
    var isPathCharacter = RegExp.prototype.test.bind(/^[\da-z\-._~!$&'()*+,;=:@/]$/iu);
    function stringArrayToHexStripped(input) {
      let acc = "";
      let code = 0;
      let i3 = 0;
      for (i3 = 0; i3 < input.length; i3++) {
        code = input[i3].charCodeAt(0);
        if (code === 48) {
          continue;
        }
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i3];
        break;
      }
      for (i3 += 1; i3 < input.length; i3++) {
        code = input[i3].charCodeAt(0);
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i3];
      }
      return acc;
    }
    var nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
    function consumeIsZone(buffer) {
      buffer.length = 0;
      return true;
    }
    function consumeHextets(buffer, address, output) {
      if (buffer.length) {
        const hex = stringArrayToHexStripped(buffer);
        if (hex !== "") {
          address.push(hex);
        } else {
          output.error = true;
          return false;
        }
        buffer.length = 0;
      }
      return true;
    }
    function getIPV6(input) {
      let tokenCount = 0;
      const output = { error: false, address: "", zone: "" };
      const address = [];
      const buffer = [];
      let endipv6Encountered = false;
      let endIpv6 = false;
      let consume = consumeHextets;
      for (let i3 = 0; i3 < input.length; i3++) {
        const cursor = input[i3];
        if (cursor === "[" || cursor === "]") {
          continue;
        }
        if (cursor === ":") {
          if (endipv6Encountered === true) {
            endIpv6 = true;
          }
          if (!consume(buffer, address, output)) {
            break;
          }
          if (++tokenCount > 7) {
            output.error = true;
            break;
          }
          if (i3 > 0 && input[i3 - 1] === ":") {
            endipv6Encountered = true;
          }
          address.push(":");
          continue;
        } else if (cursor === "%") {
          if (!consume(buffer, address, output)) {
            break;
          }
          consume = consumeIsZone;
        } else {
          buffer.push(cursor);
          continue;
        }
      }
      if (buffer.length) {
        if (consume === consumeIsZone) {
          output.zone = buffer.join("");
        } else if (endIpv6) {
          address.push(buffer.join(""));
        } else {
          address.push(stringArrayToHexStripped(buffer));
        }
      }
      output.address = address.join("");
      return output;
    }
    function normalizeIPv6(host) {
      if (findToken(host, ":") < 2) {
        return { host, isIPV6: false };
      }
      const ipv6 = getIPV6(host);
      if (!ipv6.error) {
        let newHost = ipv6.address;
        let escapedHost = ipv6.address;
        if (ipv6.zone) {
          newHost += "%" + ipv6.zone;
          escapedHost += "%25" + ipv6.zone;
        }
        return { host: newHost, isIPV6: true, escapedHost };
      } else {
        return { host, isIPV6: false };
      }
    }
    function findToken(str, token) {
      let ind = 0;
      for (let i3 = 0; i3 < str.length; i3++) {
        if (str[i3] === token) ind++;
      }
      return ind;
    }
    function removeDotSegments(path) {
      let input = path;
      const output = [];
      let nextSlash = -1;
      let len = 0;
      while (len = input.length) {
        if (len === 1) {
          if (input === ".") {
            break;
          } else if (input === "/") {
            output.push("/");
            break;
          } else {
            output.push(input);
            break;
          }
        } else if (len === 2) {
          if (input[0] === ".") {
            if (input[1] === ".") {
              break;
            } else if (input[1] === "/") {
              input = input.slice(2);
              continue;
            }
          } else if (input[0] === "/") {
            if (input[1] === "." || input[1] === "/") {
              output.push("/");
              break;
            }
          }
        } else if (len === 3) {
          if (input === "/..") {
            if (output.length !== 0) {
              output.pop();
            }
            output.push("/");
            break;
          }
        }
        if (input[0] === ".") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(3);
              continue;
            }
          } else if (input[1] === "/") {
            input = input.slice(2);
            continue;
          }
        } else if (input[0] === "/") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(2);
              continue;
            } else if (input[2] === ".") {
              if (input[3] === "/") {
                input = input.slice(3);
                if (output.length !== 0) {
                  output.pop();
                }
                continue;
              }
            }
          }
        }
        if ((nextSlash = input.indexOf("/", 1)) === -1) {
          output.push(input);
          break;
        } else {
          output.push(input.slice(0, nextSlash));
          input = input.slice(nextSlash);
        }
      }
      return output.join("");
    }
    var HOST_DELIMS = { "@": "%40", "/": "%2F", "?": "%3F", "#": "%23", ":": "%3A" };
    var HOST_DELIM_RE = /[@/?#:]/g;
    var HOST_DELIM_NO_COLON_RE = /[@/?#]/g;
    function reescapeHostDelimiters(host, isIP) {
      const re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
      re.lastIndex = 0;
      return host.replace(re, (ch) => HOST_DELIMS[ch]);
    }
    function normalizePercentEncoding(input, decodeUnreserved = false) {
      if (input.indexOf("%") === -1) {
        return input;
      }
      let output = "";
      for (let i3 = 0; i3 < input.length; i3++) {
        if (input[i3] === "%" && i3 + 2 < input.length) {
          const hex = input.slice(i3 + 1, i3 + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decodeUnreserved && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i3 += 2;
            continue;
          }
        }
        output += input[i3];
      }
      return output;
    }
    function normalizePathEncoding(input) {
      let output = "";
      for (let i3 = 0; i3 < input.length; i3++) {
        if (input[i3] === "%" && i3 + 2 < input.length) {
          const hex = input.slice(i3 + 1, i3 + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decoded !== "." && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i3 += 2;
            continue;
          }
        }
        if (isPathCharacter(input[i3])) {
          output += input[i3];
        } else {
          output += escape(input[i3]);
        }
      }
      return output;
    }
    function escapePreservingEscapes(input) {
      let output = "";
      for (let i3 = 0; i3 < input.length; i3++) {
        if (input[i3] === "%" && i3 + 2 < input.length) {
          const hex = input.slice(i3 + 1, i3 + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i3 += 2;
            continue;
          }
        }
        output += escape(input[i3]);
      }
      return output;
    }
    function recomposeAuthority(component2) {
      const uriTokens = [];
      if (component2.userinfo !== void 0) {
        uriTokens.push(component2.userinfo);
        uriTokens.push("@");
      }
      if (component2.host !== void 0) {
        let host = unescape(component2.host);
        if (!isIPv4(host)) {
          const ipV6res = normalizeIPv6(host);
          if (ipV6res.isIPV6 === true) {
            host = `[${ipV6res.escapedHost}]`;
          } else {
            host = reescapeHostDelimiters(host, false);
          }
        }
        uriTokens.push(host);
      }
      if (typeof component2.port === "number" || typeof component2.port === "string") {
        uriTokens.push(":");
        uriTokens.push(String(component2.port));
      }
      return uriTokens.length ? uriTokens.join("") : void 0;
    }
    module.exports = {
      nonSimpleDomain,
      recomposeAuthority,
      reescapeHostDelimiters,
      normalizePercentEncoding,
      normalizePathEncoding,
      escapePreservingEscapes,
      removeDotSegments,
      isIPv4,
      isUUID,
      normalizeIPv6,
      stringArrayToHexStripped
    };
  }
});

// node_modules/fast-uri/lib/schemes.js
var require_schemes = __commonJS({
  "node_modules/fast-uri/lib/schemes.js"(exports, module) {
    "use strict";
    var { isUUID } = require_utils();
    var URN_REG = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
    var supportedSchemeNames = (
      /** @type {const} */
      [
        "http",
        "https",
        "ws",
        "wss",
        "urn",
        "urn:uuid"
      ]
    );
    function isValidSchemeName(name) {
      return supportedSchemeNames.indexOf(
        /** @type {*} */
        name
      ) !== -1;
    }
    function wsIsSecure(wsComponent) {
      if (wsComponent.secure === true) {
        return true;
      } else if (wsComponent.secure === false) {
        return false;
      } else if (wsComponent.scheme) {
        return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") && (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") && (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S");
      } else {
        return false;
      }
    }
    function httpParse(component2) {
      if (!component2.host) {
        component2.error = component2.error || "HTTP URIs must have a host.";
      }
      return component2;
    }
    function httpSerialize(component2) {
      const secure = String(component2.scheme).toLowerCase() === "https";
      if (component2.port === (secure ? 443 : 80) || component2.port === "") {
        component2.port = void 0;
      }
      if (!component2.path) {
        component2.path = "/";
      }
      return component2;
    }
    function wsParse(wsComponent) {
      wsComponent.secure = wsIsSecure(wsComponent);
      wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
      wsComponent.path = void 0;
      wsComponent.query = void 0;
      return wsComponent;
    }
    function wsSerialize(wsComponent) {
      if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "") {
        wsComponent.port = void 0;
      }
      if (typeof wsComponent.secure === "boolean") {
        wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
        wsComponent.secure = void 0;
      }
      if (wsComponent.resourceName) {
        const [path, query] = wsComponent.resourceName.split("?");
        wsComponent.path = path && path !== "/" ? path : void 0;
        wsComponent.query = query;
        wsComponent.resourceName = void 0;
      }
      wsComponent.fragment = void 0;
      return wsComponent;
    }
    function urnParse(urnComponent, options) {
      if (!urnComponent.path) {
        urnComponent.error = "URN can not be parsed";
        return urnComponent;
      }
      const matches = urnComponent.path.match(URN_REG);
      if (matches) {
        const scheme = options.scheme || urnComponent.scheme || "urn";
        urnComponent.nid = matches[1].toLowerCase();
        urnComponent.nss = matches[2];
        const urnScheme = `${scheme}:${options.nid || urnComponent.nid}`;
        const schemeHandler = getSchemeHandler(urnScheme);
        urnComponent.path = void 0;
        if (schemeHandler) {
          urnComponent = schemeHandler.parse(urnComponent, options);
        }
      } else {
        urnComponent.error = urnComponent.error || "URN can not be parsed.";
      }
      return urnComponent;
    }
    function urnSerialize(urnComponent, options) {
      if (urnComponent.nid === void 0) {
        throw new Error("URN without nid cannot be serialized");
      }
      const scheme = options.scheme || urnComponent.scheme || "urn";
      const nid = urnComponent.nid.toLowerCase();
      const urnScheme = `${scheme}:${options.nid || nid}`;
      const schemeHandler = getSchemeHandler(urnScheme);
      if (schemeHandler) {
        urnComponent = schemeHandler.serialize(urnComponent, options);
      }
      const uriComponent = urnComponent;
      const nss = urnComponent.nss;
      uriComponent.path = `${nid || options.nid}:${nss}`;
      options.skipEscape = true;
      return uriComponent;
    }
    function urnuuidParse(urnComponent, options) {
      const uuidComponent = urnComponent;
      uuidComponent.uuid = uuidComponent.nss;
      uuidComponent.nss = void 0;
      if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) {
        uuidComponent.error = uuidComponent.error || "UUID is not valid.";
      }
      return uuidComponent;
    }
    function urnuuidSerialize(uuidComponent) {
      const urnComponent = uuidComponent;
      urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
      return urnComponent;
    }
    var http = (
      /** @type {SchemeHandler} */
      {
        scheme: "http",
        domainHost: true,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var https = (
      /** @type {SchemeHandler} */
      {
        scheme: "https",
        domainHost: http.domainHost,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var ws = (
      /** @type {SchemeHandler} */
      {
        scheme: "ws",
        domainHost: true,
        parse: wsParse,
        serialize: wsSerialize
      }
    );
    var wss = (
      /** @type {SchemeHandler} */
      {
        scheme: "wss",
        domainHost: ws.domainHost,
        parse: ws.parse,
        serialize: ws.serialize
      }
    );
    var urn = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn",
        parse: urnParse,
        serialize: urnSerialize,
        skipNormalize: true
      }
    );
    var urnuuid = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn:uuid",
        parse: urnuuidParse,
        serialize: urnuuidSerialize,
        skipNormalize: true
      }
    );
    var SCHEMES = (
      /** @type {Record<SchemeName, SchemeHandler>} */
      {
        http,
        https,
        ws,
        wss,
        urn,
        "urn:uuid": urnuuid
      }
    );
    Object.setPrototypeOf(SCHEMES, null);
    function getSchemeHandler(scheme) {
      return scheme && (SCHEMES[
        /** @type {SchemeName} */
        scheme
      ] || SCHEMES[
        /** @type {SchemeName} */
        scheme.toLowerCase()
      ]) || void 0;
    }
    module.exports = {
      wsIsSecure,
      SCHEMES,
      isValidSchemeName,
      getSchemeHandler
    };
  }
});

// node_modules/fast-uri/index.js
var require_fast_uri = __commonJS({
  "node_modules/fast-uri/index.js"(exports, module) {
    "use strict";
    var { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizePercentEncoding, normalizePathEncoding, escapePreservingEscapes, reescapeHostDelimiters, isIPv4, nonSimpleDomain } = require_utils();
    var { SCHEMES, getSchemeHandler } = require_schemes();
    function normalize(uri, options) {
      if (typeof uri === "string") {
        uri = /** @type {T} */
        normalizeString(uri, options);
      } else if (typeof uri === "object") {
        uri = /** @type {T} */
        parse(serialize(uri, options), options);
      }
      return uri;
    }
    function resolve(baseURI, relativeURI, options) {
      const schemelessOptions = options ? Object.assign({ scheme: "null" }, options) : { scheme: "null" };
      const { parsed: baseParsed, malformedAuthorityOrPort: baseMalformed } = parseWithStatus(baseURI, schemelessOptions);
      const { parsed: relativeParsed, malformedAuthorityOrPort: relativeMalformed } = parseWithStatus(relativeURI, schemelessOptions);
      if (baseMalformed || relativeMalformed) {
        throw new Error(baseParsed.error || relativeParsed.error || "URI is malformed.");
      }
      const resolved = resolveComponent(baseParsed, relativeParsed, schemelessOptions, true);
      schemelessOptions.skipEscape = true;
      return serialize(resolved, schemelessOptions);
    }
    function resolveComponent(base, relative, options, skipNormalization) {
      const target = {};
      if (!skipNormalization) {
        base = parse(serialize(base, options), options);
        relative = parse(serialize(relative, options), options);
      }
      options = options || {};
      if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
          target.userinfo = relative.userinfo;
          target.host = relative.host;
          target.port = relative.port;
          target.path = removeDotSegments(relative.path || "");
          target.query = relative.query;
        } else {
          if (!relative.path) {
            target.path = base.path;
            if (relative.query !== void 0) {
              target.query = relative.query;
            } else {
              target.query = base.query;
            }
          } else {
            if (relative.path[0] === "/") {
              target.path = removeDotSegments(relative.path);
            } else {
              if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) {
                target.path = "/" + relative.path;
              } else if (!base.path) {
                target.path = relative.path;
              } else {
                target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
              }
              target.path = removeDotSegments(target.path);
            }
            target.query = relative.query;
          }
          target.userinfo = base.userinfo;
          target.host = base.host;
          target.port = base.port;
        }
        target.scheme = base.scheme;
      }
      target.fragment = relative.fragment;
      return target;
    }
    function equal(uriA, uriB, options) {
      const normalizedA = normalizeComparableURI(uriA, options);
      const normalizedB = normalizeComparableURI(uriB, options);
      return normalizedA !== void 0 && normalizedB !== void 0 && normalizedA.toLowerCase() === normalizedB.toLowerCase();
    }
    function serialize(cmpts, opts) {
      const component2 = {
        host: cmpts.host,
        scheme: cmpts.scheme,
        userinfo: cmpts.userinfo,
        port: cmpts.port,
        path: cmpts.path,
        query: cmpts.query,
        nid: cmpts.nid,
        nss: cmpts.nss,
        uuid: cmpts.uuid,
        fragment: cmpts.fragment,
        reference: cmpts.reference,
        resourceName: cmpts.resourceName,
        secure: cmpts.secure,
        error: ""
      };
      const options = Object.assign({}, opts);
      const uriTokens = [];
      const schemeHandler = getSchemeHandler(options.scheme || component2.scheme);
      if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component2, options);
      if (component2.path !== void 0) {
        if (!options.skipEscape) {
          component2.path = escapePreservingEscapes(component2.path);
          if (component2.scheme !== void 0) {
            component2.path = component2.path.split("%3A").join(":");
          }
        } else {
          component2.path = normalizePercentEncoding(component2.path);
        }
      }
      if (options.reference !== "suffix" && component2.scheme) {
        uriTokens.push(component2.scheme, ":");
      }
      const authority = recomposeAuthority(component2);
      if (authority !== void 0) {
        if (options.reference !== "suffix") {
          uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (component2.path && component2.path[0] !== "/") {
          uriTokens.push("/");
        }
      }
      if (component2.path !== void 0) {
        let s3 = component2.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
          s3 = removeDotSegments(s3);
        }
        if (authority === void 0 && s3[0] === "/" && s3[1] === "/") {
          s3 = "/%2F" + s3.slice(2);
        }
        uriTokens.push(s3);
      }
      if (component2.query !== void 0) {
        uriTokens.push("?", component2.query);
      }
      if (component2.fragment !== void 0) {
        uriTokens.push("#", component2.fragment);
      }
      return uriTokens.join("");
    }
    var URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
    var AUTHORITY_PREFIX = /^(?:[^#/:?]+:)?\/\/([^/?#]*)/;
    var AUTHORITY_INTRODUCER_REGION = /^(?:[^#/:?]+:)?([/\\\t\n\r]*)/;
    function getParseError(parsed, matches) {
      if (matches[2] !== void 0 && parsed.path && parsed.path[0] !== "/") {
        return 'URI path must start with "/" when authority is present.';
      }
      if (typeof parsed.port === "number" && (parsed.port < 0 || parsed.port > 65535)) {
        return "URI port is malformed.";
      }
      return void 0;
    }
    function parseWithStatus(uri, opts) {
      const options = Object.assign({}, opts);
      const parsed = {
        scheme: void 0,
        userinfo: void 0,
        host: "",
        port: void 0,
        path: "",
        query: void 0,
        fragment: void 0
      };
      let malformedAuthorityOrPort = false;
      let isIP = false;
      if (options.reference === "suffix") {
        if (options.scheme) {
          uri = options.scheme + ":" + uri;
        } else {
          uri = "//" + uri;
        }
      }
      const authorityMatch = uri.match(AUTHORITY_PREFIX);
      if (authorityMatch !== null && authorityMatch[1].indexOf("\\") !== -1) {
        parsed.error = "URI authority must not contain a literal backslash.";
        malformedAuthorityOrPort = true;
      }
      const introducerMatch = uri.match(AUTHORITY_INTRODUCER_REGION);
      if (introducerMatch !== null) {
        const region = introducerMatch[1];
        const normalizedRegion = region.replace(/[\t\n\r]/g, "");
        if (normalizedRegion.length >= 2) {
          if (normalizedRegion.slice(0, 2) !== "//") {
            parsed.error = parsed.error || "URI authority must not contain a literal backslash.";
            malformedAuthorityOrPort = true;
          } else if (region.length !== normalizedRegion.length) {
            parsed.error = parsed.error || "URI authority introducer must not contain whitespace.";
            malformedAuthorityOrPort = true;
          }
        }
      }
      const matches = uri.match(URI_PARSE);
      if (matches) {
        parsed.scheme = matches[1];
        parsed.userinfo = matches[3];
        parsed.host = matches[4];
        parsed.port = parseInt(matches[5], 10);
        parsed.path = matches[6] || "";
        parsed.query = matches[7];
        parsed.fragment = matches[8];
        if (isNaN(parsed.port)) {
          parsed.port = matches[5];
        }
        const parseError = getParseError(parsed, matches);
        if (parseError !== void 0) {
          parsed.error = parsed.error || parseError;
          malformedAuthorityOrPort = true;
        }
        if (parsed.host) {
          const ipv4result = isIPv4(parsed.host);
          if (ipv4result === false) {
            const ipv6result = normalizeIPv6(parsed.host);
            parsed.host = ipv6result.host.toLowerCase();
            isIP = ipv6result.isIPV6;
          } else {
            isIP = true;
          }
        }
        if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) {
          parsed.reference = "same-document";
        } else if (parsed.scheme === void 0) {
          parsed.reference = "relative";
        } else if (parsed.fragment === void 0) {
          parsed.reference = "absolute";
        } else {
          parsed.reference = "uri";
        }
        if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) {
          parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
        }
        const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
        if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
          if (parsed.host && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
            try {
              parsed.host = new URL("http://" + parsed.host).hostname;
            } catch (e3) {
              parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e3;
            }
          }
        }
        if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
          if (uri.indexOf("%") !== -1) {
            if (parsed.scheme !== void 0) {
              parsed.scheme = unescape(parsed.scheme);
            }
            if (parsed.host !== void 0) {
              parsed.host = reescapeHostDelimiters(unescape(parsed.host), isIP);
            }
          }
          if (parsed.path) {
            parsed.path = normalizePathEncoding(parsed.path);
          }
          if (parsed.fragment) {
            try {
              parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment));
            } catch {
              parsed.error = parsed.error || "URI malformed";
            }
          }
        }
        if (schemeHandler && schemeHandler.parse) {
          schemeHandler.parse(parsed, options);
        }
      } else {
        parsed.error = parsed.error || "URI can not be parsed.";
      }
      return { parsed, malformedAuthorityOrPort };
    }
    function parse(uri, opts) {
      return parseWithStatus(uri, opts).parsed;
    }
    function normalizeString(uri, opts) {
      return normalizeStringWithStatus(uri, opts).normalized;
    }
    function normalizeStringWithStatus(uri, opts) {
      const { parsed, malformedAuthorityOrPort } = parseWithStatus(uri, opts);
      return {
        normalized: malformedAuthorityOrPort ? uri : serialize(parsed, opts),
        malformedAuthorityOrPort
      };
    }
    function normalizeComparableURI(uri, opts) {
      if (typeof uri === "string") {
        const { normalized, malformedAuthorityOrPort } = normalizeStringWithStatus(uri, opts);
        return malformedAuthorityOrPort ? void 0 : normalized;
      }
      if (typeof uri === "object") {
        return serialize(uri, opts);
      }
    }
    var fastUri = {
      SCHEMES,
      normalize,
      resolve,
      resolveComponent,
      equal,
      serialize,
      parse
    };
    module.exports = fastUri;
    module.exports.default = fastUri;
    module.exports.fastUri = fastUri;
  }
});

// node_modules/ajv/dist/runtime/uri.js
var require_uri = __commonJS({
  "node_modules/ajv/dist/runtime/uri.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var uri = require_fast_uri();
    uri.code = 'require("ajv/dist/runtime/uri").default';
    exports.default = uri;
  }
});

// node_modules/ajv/dist/core.js
var require_core = __commonJS({
  "node_modules/ajv/dist/core.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = void 0;
    var validate_1 = require_validate();
    Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    var ref_error_1 = require_ref_error();
    var rules_1 = require_rules();
    var compile_1 = require_compile();
    var codegen_2 = require_codegen();
    var resolve_1 = require_resolve();
    var dataType_1 = require_dataType();
    var util_1 = require_util();
    var $dataRefSchema = require_data();
    var uri_1 = require_uri();
    var defaultRegExp = (str, flags) => new RegExp(str, flags);
    defaultRegExp.code = "new RegExp";
    var META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
    var EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
      "validate",
      "serialize",
      "parse",
      "wrapper",
      "root",
      "schema",
      "keyword",
      "pattern",
      "formats",
      "validate$data",
      "func",
      "obj",
      "Error"
    ]);
    var removedOptions = {
      errorDataPath: "",
      format: "`validateFormats: false` can be used instead.",
      nullable: '"nullable" keyword is supported by default.',
      jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
      extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
      missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
      processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
      sourceCode: "Use option `code: {source: true}`",
      strictDefaults: "It is default now, see option `strict`.",
      strictKeywords: "It is default now, see option `strict`.",
      uniqueItems: '"uniqueItems" keyword is always validated.',
      unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
      cache: "Map is used as cache, schema object as key.",
      serialize: "Map is used as cache, schema object as key.",
      ajvErrors: "It is default now."
    };
    var deprecatedOptions = {
      ignoreKeywordsWithRef: "",
      jsPropertySyntax: "",
      unicode: '"minLength"/"maxLength" account for unicode characters by default.'
    };
    var MAX_EXPRESSION = 200;
    function requiredOptions(o3) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
      const s3 = o3.strict;
      const _optz = (_a = o3.code) === null || _a === void 0 ? void 0 : _a.optimize;
      const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
      const regExp = (_c = (_b = o3.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
      const uriResolver = (_d = o3.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
      return {
        strictSchema: (_f = (_e = o3.strictSchema) !== null && _e !== void 0 ? _e : s3) !== null && _f !== void 0 ? _f : true,
        strictNumbers: (_h = (_g = o3.strictNumbers) !== null && _g !== void 0 ? _g : s3) !== null && _h !== void 0 ? _h : true,
        strictTypes: (_k = (_j = o3.strictTypes) !== null && _j !== void 0 ? _j : s3) !== null && _k !== void 0 ? _k : "log",
        strictTuples: (_m = (_l = o3.strictTuples) !== null && _l !== void 0 ? _l : s3) !== null && _m !== void 0 ? _m : "log",
        strictRequired: (_p = (_o = o3.strictRequired) !== null && _o !== void 0 ? _o : s3) !== null && _p !== void 0 ? _p : false,
        code: o3.code ? { ...o3.code, optimize, regExp } : { optimize, regExp },
        loopRequired: (_q = o3.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
        loopEnum: (_r = o3.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
        meta: (_s = o3.meta) !== null && _s !== void 0 ? _s : true,
        messages: (_t = o3.messages) !== null && _t !== void 0 ? _t : true,
        inlineRefs: (_u = o3.inlineRefs) !== null && _u !== void 0 ? _u : true,
        schemaId: (_v = o3.schemaId) !== null && _v !== void 0 ? _v : "$id",
        addUsedSchema: (_w = o3.addUsedSchema) !== null && _w !== void 0 ? _w : true,
        validateSchema: (_x = o3.validateSchema) !== null && _x !== void 0 ? _x : true,
        validateFormats: (_y = o3.validateFormats) !== null && _y !== void 0 ? _y : true,
        unicodeRegExp: (_z = o3.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
        int32range: (_0 = o3.int32range) !== null && _0 !== void 0 ? _0 : true,
        uriResolver
      };
    }
    var Ajv2 = class {
      constructor(opts = {}) {
        this.schemas = {};
        this.refs = {};
        this.formats = /* @__PURE__ */ Object.create(null);
        this._compilations = /* @__PURE__ */ new Set();
        this._loading = {};
        this._cache = /* @__PURE__ */ new Map();
        opts = this.opts = { ...opts, ...requiredOptions(opts) };
        const { es5, lines } = this.opts.code;
        this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
        this.logger = getLogger(opts.logger);
        const formatOpt = opts.validateFormats;
        opts.validateFormats = false;
        this.RULES = (0, rules_1.getRules)();
        checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
        checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
        this._metaOpts = getMetaSchemaOptions.call(this);
        if (opts.formats)
          addInitialFormats.call(this);
        this._addVocabularies();
        this._addDefaultMetaSchema();
        if (opts.keywords)
          addInitialKeywords.call(this, opts.keywords);
        if (typeof opts.meta == "object")
          this.addMetaSchema(opts.meta);
        addInitialSchemas.call(this);
        opts.validateFormats = formatOpt;
      }
      _addVocabularies() {
        this.addKeyword("$async");
      }
      _addDefaultMetaSchema() {
        const { $data, meta, schemaId } = this.opts;
        let _dataRefSchema = $dataRefSchema;
        if (schemaId === "id") {
          _dataRefSchema = { ...$dataRefSchema };
          _dataRefSchema.id = _dataRefSchema.$id;
          delete _dataRefSchema.$id;
        }
        if (meta && $data)
          this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
      }
      defaultMeta() {
        const { meta, schemaId } = this.opts;
        return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
      }
      validate(schemaKeyRef, data) {
        let v3;
        if (typeof schemaKeyRef == "string") {
          v3 = this.getSchema(schemaKeyRef);
          if (!v3)
            throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
        } else {
          v3 = this.compile(schemaKeyRef);
        }
        const valid = v3(data);
        if (!("$async" in v3))
          this.errors = v3.errors;
        return valid;
      }
      compile(schema, _meta) {
        const sch = this._addSchema(schema, _meta);
        return sch.validate || this._compileSchemaEnv(sch);
      }
      compileAsync(schema, meta) {
        if (typeof this.opts.loadSchema != "function") {
          throw new Error("options.loadSchema should be a function");
        }
        const { loadSchema } = this.opts;
        return runCompileAsync.call(this, schema, meta);
        async function runCompileAsync(_schema, _meta) {
          await loadMetaSchema.call(this, _schema.$schema);
          const sch = this._addSchema(_schema, _meta);
          return sch.validate || _compileAsync.call(this, sch);
        }
        async function loadMetaSchema($ref) {
          if ($ref && !this.getSchema($ref)) {
            await runCompileAsync.call(this, { $ref }, true);
          }
        }
        async function _compileAsync(sch) {
          try {
            return this._compileSchemaEnv(sch);
          } catch (e3) {
            if (!(e3 instanceof ref_error_1.default))
              throw e3;
            checkLoaded.call(this, e3);
            await loadMissingSchema.call(this, e3.missingSchema);
            return _compileAsync.call(this, sch);
          }
        }
        function checkLoaded({ missingSchema: ref, missingRef }) {
          if (this.refs[ref]) {
            throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
          }
        }
        async function loadMissingSchema(ref) {
          const _schema = await _loadSchema.call(this, ref);
          if (!this.refs[ref])
            await loadMetaSchema.call(this, _schema.$schema);
          if (!this.refs[ref])
            this.addSchema(_schema, ref, meta);
        }
        async function _loadSchema(ref) {
          const p3 = this._loading[ref];
          if (p3)
            return p3;
          try {
            return await (this._loading[ref] = loadSchema(ref));
          } finally {
            delete this._loading[ref];
          }
        }
      }
      // Adds schema to the instance
      addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
        if (Array.isArray(schema)) {
          for (const sch of schema)
            this.addSchema(sch, void 0, _meta, _validateSchema);
          return this;
        }
        let id;
        if (typeof schema === "object") {
          const { schemaId } = this.opts;
          id = schema[schemaId];
          if (id !== void 0 && typeof id != "string") {
            throw new Error(`schema ${schemaId} must be string`);
          }
        }
        key = (0, resolve_1.normalizeId)(key || id);
        this._checkUnique(key);
        this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
        return this;
      }
      // Add schema that will be used to validate other schemas
      // options in META_IGNORE_OPTIONS are alway set to false
      addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
        this.addSchema(schema, key, true, _validateSchema);
        return this;
      }
      //  Validate schema against its meta-schema
      validateSchema(schema, throwOrLogError) {
        if (typeof schema == "boolean")
          return true;
        let $schema;
        $schema = schema.$schema;
        if ($schema !== void 0 && typeof $schema != "string") {
          throw new Error("$schema must be a string");
        }
        $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
        if (!$schema) {
          this.logger.warn("meta-schema not available");
          this.errors = null;
          return true;
        }
        const valid = this.validate($schema, schema);
        if (!valid && throwOrLogError) {
          const message2 = "schema is invalid: " + this.errorsText();
          if (this.opts.validateSchema === "log")
            this.logger.error(message2);
          else
            throw new Error(message2);
        }
        return valid;
      }
      // Get compiled schema by `key` or `ref`.
      // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
      getSchema(keyRef) {
        let sch;
        while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
          keyRef = sch;
        if (sch === void 0) {
          const { schemaId } = this.opts;
          const root = new compile_1.SchemaEnv({ schema: {}, schemaId });
          sch = compile_1.resolveSchema.call(this, root, keyRef);
          if (!sch)
            return;
          this.refs[keyRef] = sch;
        }
        return sch.validate || this._compileSchemaEnv(sch);
      }
      // Remove cached schema(s).
      // If no parameter is passed all schemas but meta-schemas are removed.
      // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
      // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
      removeSchema(schemaKeyRef) {
        if (schemaKeyRef instanceof RegExp) {
          this._removeAllSchemas(this.schemas, schemaKeyRef);
          this._removeAllSchemas(this.refs, schemaKeyRef);
          return this;
        }
        switch (typeof schemaKeyRef) {
          case "undefined":
            this._removeAllSchemas(this.schemas);
            this._removeAllSchemas(this.refs);
            this._cache.clear();
            return this;
          case "string": {
            const sch = getSchEnv.call(this, schemaKeyRef);
            if (typeof sch == "object")
              this._cache.delete(sch.schema);
            delete this.schemas[schemaKeyRef];
            delete this.refs[schemaKeyRef];
            return this;
          }
          case "object": {
            const cacheKey = schemaKeyRef;
            this._cache.delete(cacheKey);
            let id = schemaKeyRef[this.opts.schemaId];
            if (id) {
              id = (0, resolve_1.normalizeId)(id);
              delete this.schemas[id];
              delete this.refs[id];
            }
            return this;
          }
          default:
            throw new Error("ajv.removeSchema: invalid parameter");
        }
      }
      // add "vocabulary" - a collection of keywords
      addVocabulary(definitions) {
        for (const def of definitions)
          this.addKeyword(def);
        return this;
      }
      addKeyword(kwdOrDef, def) {
        let keyword;
        if (typeof kwdOrDef == "string") {
          keyword = kwdOrDef;
          if (typeof def == "object") {
            this.logger.warn("these parameters are deprecated, see docs for addKeyword");
            def.keyword = keyword;
          }
        } else if (typeof kwdOrDef == "object" && def === void 0) {
          def = kwdOrDef;
          keyword = def.keyword;
          if (Array.isArray(keyword) && !keyword.length) {
            throw new Error("addKeywords: keyword must be string or non-empty array");
          }
        } else {
          throw new Error("invalid addKeywords parameters");
        }
        checkKeyword.call(this, keyword, def);
        if (!def) {
          (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
          return this;
        }
        keywordMetaschema.call(this, def);
        const definition = {
          ...def,
          type: (0, dataType_1.getJSONTypes)(def.type),
          schemaType: (0, dataType_1.getJSONTypes)(def.schemaType)
        };
        (0, util_1.eachItem)(keyword, definition.type.length === 0 ? (k3) => addRule.call(this, k3, definition) : (k3) => definition.type.forEach((t3) => addRule.call(this, k3, definition, t3)));
        return this;
      }
      getKeyword(keyword) {
        const rule = this.RULES.all[keyword];
        return typeof rule == "object" ? rule.definition : !!rule;
      }
      // Remove keyword
      removeKeyword(keyword) {
        const { RULES } = this;
        delete RULES.keywords[keyword];
        delete RULES.all[keyword];
        for (const group of RULES.rules) {
          const i3 = group.rules.findIndex((rule) => rule.keyword === keyword);
          if (i3 >= 0)
            group.rules.splice(i3, 1);
        }
        return this;
      }
      // Add format
      addFormat(name, format) {
        if (typeof format == "string")
          format = new RegExp(format);
        this.formats[name] = format;
        return this;
      }
      errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
        if (!errors || errors.length === 0)
          return "No errors";
        return errors.map((e3) => `${dataVar}${e3.instancePath} ${e3.message}`).reduce((text2, msg) => text2 + separator + msg);
      }
      $dataMetaSchema(metaSchema, keywordsJsonPointers) {
        const rules = this.RULES.all;
        metaSchema = JSON.parse(JSON.stringify(metaSchema));
        for (const jsonPointer of keywordsJsonPointers) {
          const segments = jsonPointer.split("/").slice(1);
          let keywords = metaSchema;
          for (const seg of segments)
            keywords = keywords[seg];
          for (const key in rules) {
            const rule = rules[key];
            if (typeof rule != "object")
              continue;
            const { $data } = rule.definition;
            const schema = keywords[key];
            if ($data && schema)
              keywords[key] = schemaOrData(schema);
          }
        }
        return metaSchema;
      }
      _removeAllSchemas(schemas, regex) {
        for (const keyRef in schemas) {
          const sch = schemas[keyRef];
          if (!regex || regex.test(keyRef)) {
            if (typeof sch == "string") {
              delete schemas[keyRef];
            } else if (sch && !sch.meta) {
              this._cache.delete(sch.schema);
              delete schemas[keyRef];
            }
          }
        }
      }
      _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
        let id;
        const { schemaId } = this.opts;
        if (typeof schema == "object") {
          id = schema[schemaId];
        } else {
          if (this.opts.jtd)
            throw new Error("schema must be object");
          else if (typeof schema != "boolean")
            throw new Error("schema must be object or boolean");
        }
        let sch = this._cache.get(schema);
        if (sch !== void 0)
          return sch;
        baseId = (0, resolve_1.normalizeId)(id || baseId);
        const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
        sch = new compile_1.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
        this._cache.set(sch.schema, sch);
        if (addSchema && !baseId.startsWith("#")) {
          if (baseId)
            this._checkUnique(baseId);
          this.refs[baseId] = sch;
        }
        if (validateSchema)
          this.validateSchema(schema, true);
        return sch;
      }
      _checkUnique(id) {
        if (this.schemas[id] || this.refs[id]) {
          throw new Error(`schema with key or id "${id}" already exists`);
        }
      }
      _compileSchemaEnv(sch) {
        if (sch.meta)
          this._compileMetaSchema(sch);
        else
          compile_1.compileSchema.call(this, sch);
        if (!sch.validate)
          throw new Error("ajv implementation error");
        return sch.validate;
      }
      _compileMetaSchema(sch) {
        const currentOpts = this.opts;
        this.opts = this._metaOpts;
        try {
          compile_1.compileSchema.call(this, sch);
        } finally {
          this.opts = currentOpts;
        }
      }
    };
    Ajv2.ValidationError = validation_error_1.default;
    Ajv2.MissingRefError = ref_error_1.default;
    exports.default = Ajv2;
    function checkOptions(checkOpts, options, msg, log = "error") {
      for (const key in checkOpts) {
        const opt = key;
        if (opt in options)
          this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
      }
    }
    function getSchEnv(keyRef) {
      keyRef = (0, resolve_1.normalizeId)(keyRef);
      return this.schemas[keyRef] || this.refs[keyRef];
    }
    function addInitialSchemas() {
      const optsSchemas = this.opts.schemas;
      if (!optsSchemas)
        return;
      if (Array.isArray(optsSchemas))
        this.addSchema(optsSchemas);
      else
        for (const key in optsSchemas)
          this.addSchema(optsSchemas[key], key);
    }
    function addInitialFormats() {
      for (const name in this.opts.formats) {
        const format = this.opts.formats[name];
        if (format)
          this.addFormat(name, format);
      }
    }
    function addInitialKeywords(defs) {
      if (Array.isArray(defs)) {
        this.addVocabulary(defs);
        return;
      }
      this.logger.warn("keywords option as map is deprecated, pass array");
      for (const keyword in defs) {
        const def = defs[keyword];
        if (!def.keyword)
          def.keyword = keyword;
        this.addKeyword(def);
      }
    }
    function getMetaSchemaOptions() {
      const metaOpts = { ...this.opts };
      for (const opt of META_IGNORE_OPTIONS)
        delete metaOpts[opt];
      return metaOpts;
    }
    var noLogs = { log() {
    }, warn() {
    }, error() {
    } };
    function getLogger(logger) {
      if (logger === false)
        return noLogs;
      if (logger === void 0)
        return console;
      if (logger.log && logger.warn && logger.error)
        return logger;
      throw new Error("logger must implement log, warn and error methods");
    }
    var KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
    function checkKeyword(keyword, def) {
      const { RULES } = this;
      (0, util_1.eachItem)(keyword, (kwd) => {
        if (RULES.keywords[kwd])
          throw new Error(`Keyword ${kwd} is already defined`);
        if (!KEYWORD_NAME.test(kwd))
          throw new Error(`Keyword ${kwd} has invalid name`);
      });
      if (!def)
        return;
      if (def.$data && !("code" in def || "validate" in def)) {
        throw new Error('$data keyword must have "code" or "validate" function');
      }
    }
    function addRule(keyword, definition, dataType) {
      var _a;
      const post = definition === null || definition === void 0 ? void 0 : definition.post;
      if (dataType && post)
        throw new Error('keyword with "post" flag cannot have "type"');
      const { RULES } = this;
      let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t3 }) => t3 === dataType);
      if (!ruleGroup) {
        ruleGroup = { type: dataType, rules: [] };
        RULES.rules.push(ruleGroup);
      }
      RULES.keywords[keyword] = true;
      if (!definition)
        return;
      const rule = {
        keyword,
        definition: {
          ...definition,
          type: (0, dataType_1.getJSONTypes)(definition.type),
          schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType)
        }
      };
      if (definition.before)
        addBeforeRule.call(this, ruleGroup, rule, definition.before);
      else
        ruleGroup.rules.push(rule);
      RULES.all[keyword] = rule;
      (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
    }
    function addBeforeRule(ruleGroup, rule, before) {
      const i3 = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
      if (i3 >= 0) {
        ruleGroup.rules.splice(i3, 0, rule);
      } else {
        ruleGroup.rules.push(rule);
        this.logger.warn(`rule ${before} is not defined`);
      }
    }
    function keywordMetaschema(def) {
      let { metaSchema } = def;
      if (metaSchema === void 0)
        return;
      if (def.$data && this.opts.$data)
        metaSchema = schemaOrData(metaSchema);
      def.validateSchema = this.compile(metaSchema, true);
    }
    var $dataRef = {
      $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
    };
    function schemaOrData(schema) {
      return { anyOf: [schema, $dataRef] };
    }
  }
});

// node_modules/ajv/dist/vocabularies/core/id.js
var require_id = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/id.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var def = {
      keyword: "id",
      code() {
        throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/core/ref.js
var require_ref = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/ref.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.callRef = exports.getValidate = void 0;
    var ref_error_1 = require_ref_error();
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var compile_1 = require_compile();
    var util_1 = require_util();
    var def = {
      keyword: "$ref",
      schemaType: "string",
      code(cxt) {
        const { gen, schema: $ref, it } = cxt;
        const { baseId, schemaEnv: env, validateName, opts, self } = it;
        const { root } = env;
        if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
          return callRootRef();
        const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
        if (schOrEnv === void 0)
          throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
        if (schOrEnv instanceof compile_1.SchemaEnv)
          return callValidate(schOrEnv);
        return inlineRefSchema(schOrEnv);
        function callRootRef() {
          if (env === root)
            return callRef(cxt, validateName, env, env.$async);
          const rootName = gen.scopeValue("root", { ref: root });
          return callRef(cxt, (0, codegen_1._)`${rootName}.validate`, root, root.$async);
        }
        function callValidate(sch) {
          const v3 = getValidate(cxt, sch);
          callRef(cxt, v3, sch, sch.$async);
        }
        function inlineRefSchema(sch) {
          const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1.stringify)(sch) } : { ref: sch });
          const valid = gen.name("valid");
          const schCxt = cxt.subschema({
            schema: sch,
            dataTypes: [],
            schemaPath: codegen_1.nil,
            topSchemaRef: schName,
            errSchemaPath: $ref
          }, valid);
          cxt.mergeEvaluated(schCxt);
          cxt.ok(valid);
        }
      }
    };
    function getValidate(cxt, sch) {
      const { gen } = cxt;
      return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
    }
    exports.getValidate = getValidate;
    function callRef(cxt, v3, sch, $async) {
      const { gen, it } = cxt;
      const { allErrors, schemaEnv: env, opts } = it;
      const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
      if ($async)
        callAsyncRef();
      else
        callSyncRef();
      function callAsyncRef() {
        if (!env.$async)
          throw new Error("async schema referenced by sync schema");
        const valid = gen.let("valid");
        gen.try(() => {
          gen.code((0, codegen_1._)`await ${(0, code_1.callValidateCode)(cxt, v3, passCxt)}`);
          addEvaluatedFrom(v3);
          if (!allErrors)
            gen.assign(valid, true);
        }, (e3) => {
          gen.if((0, codegen_1._)`!(${e3} instanceof ${it.ValidationError})`, () => gen.throw(e3));
          addErrorsFrom(e3);
          if (!allErrors)
            gen.assign(valid, false);
        });
        cxt.ok(valid);
      }
      function callSyncRef() {
        cxt.result((0, code_1.callValidateCode)(cxt, v3, passCxt), () => addEvaluatedFrom(v3), () => addErrorsFrom(v3));
      }
      function addErrorsFrom(source) {
        const errs = (0, codegen_1._)`${source}.errors`;
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`);
        gen.assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
      }
      function addEvaluatedFrom(source) {
        var _a;
        if (!it.opts.unevaluated)
          return;
        const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
        if (it.props !== true) {
          if (schEvaluated && !schEvaluated.dynamicProps) {
            if (schEvaluated.props !== void 0) {
              it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
            }
          } else {
            const props = gen.var("props", (0, codegen_1._)`${source}.evaluated.props`);
            it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
          }
        }
        if (it.items !== true) {
          if (schEvaluated && !schEvaluated.dynamicItems) {
            if (schEvaluated.items !== void 0) {
              it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
            }
          } else {
            const items = gen.var("items", (0, codegen_1._)`${source}.evaluated.items`);
            it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
          }
        }
      }
    }
    exports.callRef = callRef;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/core/index.js
var require_core2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var id_1 = require_id();
    var ref_1 = require_ref();
    var core = [
      "$schema",
      "$id",
      "$defs",
      "$vocabulary",
      { keyword: "$comment" },
      "definitions",
      id_1.default,
      ref_1.default
    ];
    exports.default = core;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitNumber.js
var require_limitNumber = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitNumber.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`must be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    var def = {
      keyword: Object.keys(KWDs),
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        cxt.fail$data((0, codegen_1._)`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/multipleOf.js
var require_multipleOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/multipleOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must be multiple of ${schemaCode}`,
      params: ({ schemaCode }) => (0, codegen_1._)`{multipleOf: ${schemaCode}}`
    };
    var def = {
      keyword: "multipleOf",
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, schemaCode, it } = cxt;
        const prec = it.opts.multipleOfPrecision;
        const res = gen.let("res");
        const invalid = prec ? (0, codegen_1._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1._)`${res} !== parseInt(${res})`;
        cxt.fail$data((0, codegen_1._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/ajv/dist/runtime/ucs2length.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function ucs2length(str) {
      const len = str.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    exports.default = ucs2length;
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitLength.js
var require_limitLength = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitLength.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var ucs2length_1 = require_ucs2length();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxLength" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} characters`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxLength", "minLength"],
      type: "string",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode, it } = cxt;
        const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
        const len = it.opts.unicode === false ? (0, codegen_1._)`${data}.length` : (0, codegen_1._)`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
        cxt.fail$data((0, codegen_1._)`${len} ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/pattern.js
var require_pattern = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/pattern.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var util_1 = require_util();
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match pattern "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{pattern: ${schemaCode}}`
    };
    var def = {
      keyword: "pattern",
      type: "string",
      schemaType: "string",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const u4 = it.opts.unicodeRegExp ? "u" : "";
        if ($data) {
          const { regExp } = it.opts.code;
          const regExpCode = regExp.code === "new RegExp" ? (0, codegen_1._)`new RegExp` : (0, util_1.useFunc)(gen, regExp);
          const valid = gen.let("valid");
          gen.try(() => gen.assign(valid, (0, codegen_1._)`${regExpCode}(${schemaCode}, ${u4}).test(${data})`), () => gen.assign(valid, false));
          cxt.fail$data((0, codegen_1._)`!${valid}`);
        } else {
          const regExp = (0, code_1.usePattern)(cxt, schema);
          cxt.fail$data((0, codegen_1._)`!${regExp}.test(${data})`);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitProperties.js
var require_limitProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxProperties" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} properties`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxProperties", "minProperties"],
      type: "object",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`Object.keys(${data}).length ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/required.js
var require_required = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/required.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { missingProperty } }) => (0, codegen_1.str)`must have required property '${missingProperty}'`,
      params: ({ params: { missingProperty } }) => (0, codegen_1._)`{missingProperty: ${missingProperty}}`
    };
    var def = {
      keyword: "required",
      type: "object",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, schema, schemaCode, data, $data, it } = cxt;
        const { opts } = it;
        if (!$data && schema.length === 0)
          return;
        const useLoop = schema.length >= opts.loopRequired;
        if (it.allErrors)
          allErrorsMode();
        else
          exitOnErrorMode();
        if (opts.strictRequired) {
          const props = cxt.parentSchema.properties;
          const { definedProperties } = cxt.it;
          for (const requiredKey of schema) {
            if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
              const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
              const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
              (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
            }
          }
        }
        function allErrorsMode() {
          if (useLoop || $data) {
            cxt.block$data(codegen_1.nil, loopAllRequired);
          } else {
            for (const prop of schema) {
              (0, code_1.checkReportMissingProp)(cxt, prop);
            }
          }
        }
        function exitOnErrorMode() {
          const missing = gen.let("missing");
          if (useLoop || $data) {
            const valid = gen.let("valid", true);
            cxt.block$data(valid, () => loopUntilMissing(missing, valid));
            cxt.ok(valid);
          } else {
            gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
            (0, code_1.reportMissingProp)(cxt, missing);
            gen.else();
          }
        }
        function loopAllRequired() {
          gen.forOf("prop", schemaCode, (prop) => {
            cxt.setParams({ missingProperty: prop });
            gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
          });
        }
        function loopUntilMissing(missing, valid) {
          cxt.setParams({ missingProperty: missing });
          gen.forOf(missing, schemaCode, () => {
            gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
            gen.if((0, codegen_1.not)(valid), () => {
              cxt.error();
              gen.break();
            });
          }, codegen_1.nil);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitItems.js
var require_limitItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxItems" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} items`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxItems", "minItems"],
      type: "array",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`${data}.length ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/runtime/equal.js
var require_equal = __commonJS({
  "node_modules/ajv/dist/runtime/equal.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var equal = require_fast_deep_equal();
    equal.code = 'require("ajv/dist/runtime/equal").default';
    exports.default = equal;
  }
});

// node_modules/ajv/dist/vocabularies/validation/uniqueItems.js
var require_uniqueItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/uniqueItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dataType_1 = require_dataType();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: ({ params: { i: i3, j: j4 } }) => (0, codegen_1.str)`must NOT have duplicate items (items ## ${j4} and ${i3} are identical)`,
      params: ({ params: { i: i3, j: j4 } }) => (0, codegen_1._)`{i: ${i3}, j: ${j4}}`
    };
    var def = {
      keyword: "uniqueItems",
      type: "array",
      schemaType: "boolean",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
        if (!$data && !schema)
          return;
        const valid = gen.let("valid");
        const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
        cxt.block$data(valid, validateUniqueItems, (0, codegen_1._)`${schemaCode} === false`);
        cxt.ok(valid);
        function validateUniqueItems() {
          const i3 = gen.let("i", (0, codegen_1._)`${data}.length`);
          const j4 = gen.let("j");
          cxt.setParams({ i: i3, j: j4 });
          gen.assign(valid, true);
          gen.if((0, codegen_1._)`${i3} > 1`, () => (canOptimize() ? loopN : loopN2)(i3, j4));
        }
        function canOptimize() {
          return itemTypes.length > 0 && !itemTypes.some((t3) => t3 === "object" || t3 === "array");
        }
        function loopN(i3, j4) {
          const item = gen.name("item");
          const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
          const indices = gen.const("indices", (0, codegen_1._)`{}`);
          gen.for((0, codegen_1._)`;${i3}--;`, () => {
            gen.let(item, (0, codegen_1._)`${data}[${i3}]`);
            gen.if(wrongType, (0, codegen_1._)`continue`);
            if (itemTypes.length > 1)
              gen.if((0, codegen_1._)`typeof ${item} == "string"`, (0, codegen_1._)`${item} += "_"`);
            gen.if((0, codegen_1._)`typeof ${indices}[${item}] == "number"`, () => {
              gen.assign(j4, (0, codegen_1._)`${indices}[${item}]`);
              cxt.error();
              gen.assign(valid, false).break();
            }).code((0, codegen_1._)`${indices}[${item}] = ${i3}`);
          });
        }
        function loopN2(i3, j4) {
          const eql = (0, util_1.useFunc)(gen, equal_1.default);
          const outer = gen.name("outer");
          gen.label(outer).for((0, codegen_1._)`;${i3}--;`, () => gen.for((0, codegen_1._)`${j4} = ${i3}; ${j4}--;`, () => gen.if((0, codegen_1._)`${eql}(${data}[${i3}], ${data}[${j4}])`, () => {
            cxt.error();
            gen.assign(valid, false).break(outer);
          })));
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/const.js
var require_const = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/const.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to constant",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValue: ${schemaCode}}`
    };
    var def = {
      keyword: "const",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schemaCode, schema } = cxt;
        if ($data || schema && typeof schema == "object") {
          cxt.fail$data((0, codegen_1._)`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
        } else {
          cxt.fail((0, codegen_1._)`${schema} !== ${data}`);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/enum.js
var require_enum = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/enum.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValues: ${schemaCode}}`
    };
    var def = {
      keyword: "enum",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        if (!$data && schema.length === 0)
          throw new Error("enum must have non-empty array");
        const useLoop = schema.length >= it.opts.loopEnum;
        let eql;
        const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1.useFunc)(gen, equal_1.default);
        let valid;
        if (useLoop || $data) {
          valid = gen.let("valid");
          cxt.block$data(valid, loopEnum);
        } else {
          if (!Array.isArray(schema))
            throw new Error("ajv implementation error");
          const vSchema = gen.const("vSchema", schemaCode);
          valid = (0, codegen_1.or)(...schema.map((_x, i3) => equalCode(vSchema, i3)));
        }
        cxt.pass(valid);
        function loopEnum() {
          gen.assign(valid, false);
          gen.forOf("v", schemaCode, (v3) => gen.if((0, codegen_1._)`${getEql()}(${data}, ${v3})`, () => gen.assign(valid, true).break()));
        }
        function equalCode(vSchema, i3) {
          const sch = schema[i3];
          return typeof sch === "object" && sch !== null ? (0, codegen_1._)`${getEql()}(${data}, ${vSchema}[${i3}])` : (0, codegen_1._)`${data} === ${sch}`;
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/index.js
var require_validation = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var limitNumber_1 = require_limitNumber();
    var multipleOf_1 = require_multipleOf();
    var limitLength_1 = require_limitLength();
    var pattern_1 = require_pattern();
    var limitProperties_1 = require_limitProperties();
    var required_1 = require_required();
    var limitItems_1 = require_limitItems();
    var uniqueItems_1 = require_uniqueItems();
    var const_1 = require_const();
    var enum_1 = require_enum();
    var validation = [
      // number
      limitNumber_1.default,
      multipleOf_1.default,
      // string
      limitLength_1.default,
      pattern_1.default,
      // object
      limitProperties_1.default,
      required_1.default,
      // array
      limitItems_1.default,
      uniqueItems_1.default,
      // any
      { keyword: "type", schemaType: ["string", "array"] },
      { keyword: "nullable", schemaType: "boolean" },
      const_1.default,
      enum_1.default
    ];
    exports.default = validation;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/additionalItems.js
var require_additionalItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/additionalItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateAdditionalItems = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "additionalItems",
      type: "array",
      schemaType: ["boolean", "object"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { parentSchema, it } = cxt;
        const { items } = parentSchema;
        if (!Array.isArray(items)) {
          (0, util_1.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
          return;
        }
        validateAdditionalItems(cxt, items);
      }
    };
    function validateAdditionalItems(cxt, items) {
      const { gen, schema, data, keyword, it } = cxt;
      it.items = true;
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      if (schema === false) {
        cxt.setParams({ len: items.length });
        cxt.pass((0, codegen_1._)`${len} <= ${items.length}`);
      } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
        const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items.length}`);
        gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
        cxt.ok(valid);
      }
      function validateItems(valid) {
        gen.forRange("i", items.length, len, (i3) => {
          cxt.subschema({ keyword, dataProp: i3, dataPropType: util_1.Type.Num }, valid);
          if (!it.allErrors)
            gen.if((0, codegen_1.not)(valid), () => gen.break());
        });
      }
    }
    exports.validateAdditionalItems = validateAdditionalItems;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/items.js
var require_items = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/items.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateTuple = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "array", "boolean"],
      before: "uniqueItems",
      code(cxt) {
        const { schema, it } = cxt;
        if (Array.isArray(schema))
          return validateTuple(cxt, "additionalItems", schema);
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    function validateTuple(cxt, extraItems, schArr = cxt.schema) {
      const { gen, parentSchema, data, keyword, it } = cxt;
      checkStrictTuple(parentSchema);
      if (it.opts.unevaluated && schArr.length && it.items !== true) {
        it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
      }
      const valid = gen.name("valid");
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      schArr.forEach((sch, i3) => {
        if ((0, util_1.alwaysValidSchema)(it, sch))
          return;
        gen.if((0, codegen_1._)`${len} > ${i3}`, () => cxt.subschema({
          keyword,
          schemaProp: i3,
          dataProp: i3
        }, valid));
        cxt.ok(valid);
      });
      function checkStrictTuple(sch) {
        const { opts, errSchemaPath } = it;
        const l3 = schArr.length;
        const fullTuple = l3 === sch.minItems && (l3 === sch.maxItems || sch[extraItems] === false);
        if (opts.strictTuples && !fullTuple) {
          const msg = `"${keyword}" is ${l3}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
          (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
        }
      }
    }
    exports.validateTuple = validateTuple;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/prefixItems.js
var require_prefixItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/prefixItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var items_1 = require_items();
    var def = {
      keyword: "prefixItems",
      type: "array",
      schemaType: ["array"],
      before: "uniqueItems",
      code: (cxt) => (0, items_1.validateTuple)(cxt, "items")
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/items2020.js
var require_items2020 = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/items2020.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var additionalItems_1 = require_additionalItems();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { schema, parentSchema, it } = cxt;
        const { prefixItems } = parentSchema;
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        if (prefixItems)
          (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems);
        else
          cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/contains.js
var require_contains = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/contains.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1.str)`must contain at least ${min} valid item(s)` : (0, codegen_1.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
      params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1._)`{minContains: ${min}}` : (0, codegen_1._)`{minContains: ${min}, maxContains: ${max}}`
    };
    var def = {
      keyword: "contains",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        let min;
        let max;
        const { minContains, maxContains } = parentSchema;
        if (it.opts.next) {
          min = minContains === void 0 ? 1 : minContains;
          max = maxContains;
        } else {
          min = 1;
        }
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        cxt.setParams({ min, max });
        if (max === void 0 && min === 0) {
          (0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
          return;
        }
        if (max !== void 0 && min > max) {
          (0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
          cxt.fail();
          return;
        }
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          let cond = (0, codegen_1._)`${len} >= ${min}`;
          if (max !== void 0)
            cond = (0, codegen_1._)`${cond} && ${len} <= ${max}`;
          cxt.pass(cond);
          return;
        }
        it.items = true;
        const valid = gen.name("valid");
        if (max === void 0 && min === 1) {
          validateItems(valid, () => gen.if(valid, () => gen.break()));
        } else if (min === 0) {
          gen.let(valid, true);
          if (max !== void 0)
            gen.if((0, codegen_1._)`${data}.length > 0`, validateItemsWithCount);
        } else {
          gen.let(valid, false);
          validateItemsWithCount();
        }
        cxt.result(valid, () => cxt.reset());
        function validateItemsWithCount() {
          const schValid = gen.name("_valid");
          const count = gen.let("count", 0);
          validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
        }
        function validateItems(_valid, block) {
          gen.forRange("i", 0, len, (i3) => {
            cxt.subschema({
              keyword: "contains",
              dataProp: i3,
              dataPropType: util_1.Type.Num,
              compositeRule: true
            }, _valid);
            block();
          });
        }
        function checkLimits(count) {
          gen.code((0, codegen_1._)`${count}++`);
          if (max === void 0) {
            gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true).break());
          } else {
            gen.if((0, codegen_1._)`${count} > ${max}`, () => gen.assign(valid, false).break());
            if (min === 1)
              gen.assign(valid, true);
            else
              gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true));
          }
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/dependencies.js
var require_dependencies = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/dependencies.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateSchemaDeps = exports.validatePropertyDeps = exports.error = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    exports.error = {
      message: ({ params: { property, depsCount, deps } }) => {
        const property_ies = depsCount === 1 ? "property" : "properties";
        return (0, codegen_1.str)`must have ${property_ies} ${deps} when property ${property} is present`;
      },
      params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
      // TODO change to reference
    };
    var def = {
      keyword: "dependencies",
      type: "object",
      schemaType: "object",
      error: exports.error,
      code(cxt) {
        const [propDeps, schDeps] = splitDependencies(cxt);
        validatePropertyDeps(cxt, propDeps);
        validateSchemaDeps(cxt, schDeps);
      }
    };
    function splitDependencies({ schema }) {
      const propertyDeps = {};
      const schemaDeps = {};
      for (const key in schema) {
        if (key === "__proto__")
          continue;
        const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
        deps[key] = schema[key];
      }
      return [propertyDeps, schemaDeps];
    }
    function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
      const { gen, data, it } = cxt;
      if (Object.keys(propertyDeps).length === 0)
        return;
      const missing = gen.let("missing");
      for (const prop in propertyDeps) {
        const deps = propertyDeps[prop];
        if (deps.length === 0)
          continue;
        const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
        cxt.setParams({
          property: prop,
          depsCount: deps.length,
          deps: deps.join(", ")
        });
        if (it.allErrors) {
          gen.if(hasProperty, () => {
            for (const depProp of deps) {
              (0, code_1.checkReportMissingProp)(cxt, depProp);
            }
          });
        } else {
          gen.if((0, codegen_1._)`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
          (0, code_1.reportMissingProp)(cxt, missing);
          gen.else();
        }
      }
    }
    exports.validatePropertyDeps = validatePropertyDeps;
    function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      for (const prop in schemaDeps) {
        if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop]))
          continue;
        gen.if(
          (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties),
          () => {
            const schCxt = cxt.subschema({ keyword, schemaProp: prop }, valid);
            cxt.mergeValidEvaluated(schCxt, valid);
          },
          () => gen.var(valid, true)
          // TODO var
        );
        cxt.ok(valid);
      }
    }
    exports.validateSchemaDeps = validateSchemaDeps;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/propertyNames.js
var require_propertyNames = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/propertyNames.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "property name must be valid",
      params: ({ params }) => (0, codegen_1._)`{propertyName: ${params.propertyName}}`
    };
    var def = {
      keyword: "propertyNames",
      type: "object",
      schemaType: ["object", "boolean"],
      error,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        const valid = gen.name("valid");
        gen.forIn("key", data, (key) => {
          cxt.setParams({ propertyName: key });
          cxt.subschema({
            keyword: "propertyNames",
            data: key,
            dataTypes: ["string"],
            propertyName: key,
            compositeRule: true
          }, valid);
          gen.if((0, codegen_1.not)(valid), () => {
            cxt.error(true);
            if (!it.allErrors)
              gen.break();
          });
        });
        cxt.ok(valid);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js
var require_additionalProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var util_1 = require_util();
    var error = {
      message: "must NOT have additional properties",
      params: ({ params }) => (0, codegen_1._)`{additionalProperty: ${params.additionalProperty}}`
    };
    var def = {
      keyword: "additionalProperties",
      type: ["object"],
      schemaType: ["boolean", "object"],
      allowUndefined: true,
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, opts } = it;
        it.props = true;
        if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema))
          return;
        const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
        const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
        checkAdditionalProperties();
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function checkAdditionalProperties() {
          gen.forIn("key", data, (key) => {
            if (!props.length && !patProps.length)
              additionalPropertyCode(key);
            else
              gen.if(isAdditional(key), () => additionalPropertyCode(key));
          });
        }
        function isAdditional(key) {
          let definedProp;
          if (props.length > 8) {
            const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
            definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
          } else if (props.length) {
            definedProp = (0, codegen_1.or)(...props.map((p3) => (0, codegen_1._)`${key} === ${p3}`));
          } else {
            definedProp = codegen_1.nil;
          }
          if (patProps.length) {
            definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p3) => (0, codegen_1._)`${(0, code_1.usePattern)(cxt, p3)}.test(${key})`));
          }
          return (0, codegen_1.not)(definedProp);
        }
        function deleteAdditional(key) {
          gen.code((0, codegen_1._)`delete ${data}[${key}]`);
        }
        function additionalPropertyCode(key) {
          if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
            deleteAdditional(key);
            return;
          }
          if (schema === false) {
            cxt.setParams({ additionalProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            if (opts.removeAdditional === "failing") {
              applyAdditionalSchema(key, valid, false);
              gen.if((0, codegen_1.not)(valid), () => {
                cxt.reset();
                deleteAdditional(key);
              });
            } else {
              applyAdditionalSchema(key, valid);
              if (!allErrors)
                gen.if((0, codegen_1.not)(valid), () => gen.break());
            }
          }
        }
        function applyAdditionalSchema(key, valid, errors) {
          const subschema = {
            keyword: "additionalProperties",
            dataProp: key,
            dataPropType: util_1.Type.Str
          };
          if (errors === false) {
            Object.assign(subschema, {
              compositeRule: true,
              createErrors: false,
              allErrors: false
            });
          }
          cxt.subschema(subschema, valid);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/properties.js
var require_properties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/properties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var validate_1 = require_validate();
    var code_1 = require_code2();
    var util_1 = require_util();
    var additionalProperties_1 = require_additionalProperties();
    var def = {
      keyword: "properties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
          additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
        }
        const allProps = (0, code_1.allSchemaProperties)(schema);
        for (const prop of allProps) {
          it.definedProperties.add(prop);
        }
        if (it.opts.unevaluated && allProps.length && it.props !== true) {
          it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
        }
        const properties = allProps.filter((p3) => !(0, util_1.alwaysValidSchema)(it, schema[p3]));
        if (properties.length === 0)
          return;
        const valid = gen.name("valid");
        for (const prop of properties) {
          if (hasDefault(prop)) {
            applyPropertySchema(prop);
          } else {
            gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
            applyPropertySchema(prop);
            if (!it.allErrors)
              gen.else().var(valid, true);
            gen.endIf();
          }
          cxt.it.definedProperties.add(prop);
          cxt.ok(valid);
        }
        function hasDefault(prop) {
          return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
        }
        function applyPropertySchema(prop) {
          cxt.subschema({
            keyword: "properties",
            schemaProp: prop,
            dataProp: prop
          }, valid);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/patternProperties.js
var require_patternProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/patternProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var util_2 = require_util();
    var def = {
      keyword: "patternProperties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, data, parentSchema, it } = cxt;
        const { opts } = it;
        const patterns = (0, code_1.allSchemaProperties)(schema);
        const alwaysValidPatterns = patterns.filter((p3) => (0, util_1.alwaysValidSchema)(it, schema[p3]));
        if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) {
          return;
        }
        const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
        const valid = gen.name("valid");
        if (it.props !== true && !(it.props instanceof codegen_1.Name)) {
          it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
        }
        const { props } = it;
        validatePatternProperties();
        function validatePatternProperties() {
          for (const pat of patterns) {
            if (checkProperties)
              checkMatchingProperties(pat);
            if (it.allErrors) {
              validateProperties(pat);
            } else {
              gen.var(valid, true);
              validateProperties(pat);
              gen.if(valid);
            }
          }
        }
        function checkMatchingProperties(pat) {
          for (const prop in checkProperties) {
            if (new RegExp(pat).test(prop)) {
              (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
            }
          }
        }
        function validateProperties(pat) {
          gen.forIn("key", data, (key) => {
            gen.if((0, codegen_1._)`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
              const alwaysValid = alwaysValidPatterns.includes(pat);
              if (!alwaysValid) {
                cxt.subschema({
                  keyword: "patternProperties",
                  schemaProp: pat,
                  dataProp: key,
                  dataPropType: util_2.Type.Str
                }, valid);
              }
              if (it.opts.unevaluated && props !== true) {
                gen.assign((0, codegen_1._)`${props}[${key}]`, true);
              } else if (!alwaysValid && !it.allErrors) {
                gen.if((0, codegen_1.not)(valid), () => gen.break());
              }
            });
          });
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/not.js
var require_not = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/not.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "not",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      code(cxt) {
        const { gen, schema, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          cxt.fail();
          return;
        }
        const valid = gen.name("valid");
        cxt.subschema({
          keyword: "not",
          compositeRule: true,
          createErrors: false,
          allErrors: false
        }, valid);
        cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
      },
      error: { message: "must NOT be valid" }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/anyOf.js
var require_anyOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/anyOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var def = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: true,
      code: code_1.validateUnion,
      error: { message: "must match a schema in anyOf" }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/oneOf.js
var require_oneOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/oneOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "must match exactly one schema in oneOf",
      params: ({ params }) => (0, codegen_1._)`{passingSchemas: ${params.passing}}`
    };
    var def = {
      keyword: "oneOf",
      schemaType: "array",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        if (it.opts.discriminator && parentSchema.discriminator)
          return;
        const schArr = schema;
        const valid = gen.let("valid", false);
        const passing = gen.let("passing", null);
        const schValid = gen.name("_valid");
        cxt.setParams({ passing });
        gen.block(validateOneOf);
        cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
        function validateOneOf() {
          schArr.forEach((sch, i3) => {
            let schCxt;
            if ((0, util_1.alwaysValidSchema)(it, sch)) {
              gen.var(schValid, true);
            } else {
              schCxt = cxt.subschema({
                keyword: "oneOf",
                schemaProp: i3,
                compositeRule: true
              }, schValid);
            }
            if (i3 > 0) {
              gen.if((0, codegen_1._)`${schValid} && ${valid}`).assign(valid, false).assign(passing, (0, codegen_1._)`[${passing}, ${i3}]`).else();
            }
            gen.if(schValid, () => {
              gen.assign(valid, true);
              gen.assign(passing, i3);
              if (schCxt)
                cxt.mergeEvaluated(schCxt, codegen_1.Name);
            });
          });
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/allOf.js
var require_allOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/allOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "allOf",
      schemaType: "array",
      code(cxt) {
        const { gen, schema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        const valid = gen.name("valid");
        schema.forEach((sch, i3) => {
          if ((0, util_1.alwaysValidSchema)(it, sch))
            return;
          const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i3 }, valid);
          cxt.ok(valid);
          cxt.mergeEvaluated(schCxt);
        });
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/if.js
var require_if = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/if.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params }) => (0, codegen_1.str)`must match "${params.ifClause}" schema`,
      params: ({ params }) => (0, codegen_1._)`{failingKeyword: ${params.ifClause}}`
    };
    var def = {
      keyword: "if",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, parentSchema, it } = cxt;
        if (parentSchema.then === void 0 && parentSchema.else === void 0) {
          (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
        }
        const hasThen = hasSchema(it, "then");
        const hasElse = hasSchema(it, "else");
        if (!hasThen && !hasElse)
          return;
        const valid = gen.let("valid", true);
        const schValid = gen.name("_valid");
        validateIf();
        cxt.reset();
        if (hasThen && hasElse) {
          const ifClause = gen.let("ifClause");
          cxt.setParams({ ifClause });
          gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
        } else if (hasThen) {
          gen.if(schValid, validateClause("then"));
        } else {
          gen.if((0, codegen_1.not)(schValid), validateClause("else"));
        }
        cxt.pass(valid, () => cxt.error(true));
        function validateIf() {
          const schCxt = cxt.subschema({
            keyword: "if",
            compositeRule: true,
            createErrors: false,
            allErrors: false
          }, schValid);
          cxt.mergeEvaluated(schCxt);
        }
        function validateClause(keyword, ifClause) {
          return () => {
            const schCxt = cxt.subschema({ keyword }, schValid);
            gen.assign(valid, schValid);
            cxt.mergeValidEvaluated(schCxt, valid);
            if (ifClause)
              gen.assign(ifClause, (0, codegen_1._)`${keyword}`);
            else
              cxt.setParams({ ifClause: keyword });
          };
        }
      }
    };
    function hasSchema(it, keyword) {
      const schema = it.schema[keyword];
      return schema !== void 0 && !(0, util_1.alwaysValidSchema)(it, schema);
    }
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/thenElse.js
var require_thenElse = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/thenElse.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: ["then", "else"],
      schemaType: ["object", "boolean"],
      code({ keyword, parentSchema, it }) {
        if (parentSchema.if === void 0)
          (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/index.js
var require_applicator = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var additionalItems_1 = require_additionalItems();
    var prefixItems_1 = require_prefixItems();
    var items_1 = require_items();
    var items2020_1 = require_items2020();
    var contains_1 = require_contains();
    var dependencies_1 = require_dependencies();
    var propertyNames_1 = require_propertyNames();
    var additionalProperties_1 = require_additionalProperties();
    var properties_1 = require_properties();
    var patternProperties_1 = require_patternProperties();
    var not_1 = require_not();
    var anyOf_1 = require_anyOf();
    var oneOf_1 = require_oneOf();
    var allOf_1 = require_allOf();
    var if_1 = require_if();
    var thenElse_1 = require_thenElse();
    function getApplicator(draft2020 = false) {
      const applicator = [
        // any
        not_1.default,
        anyOf_1.default,
        oneOf_1.default,
        allOf_1.default,
        if_1.default,
        thenElse_1.default,
        // object
        propertyNames_1.default,
        additionalProperties_1.default,
        dependencies_1.default,
        properties_1.default,
        patternProperties_1.default
      ];
      if (draft2020)
        applicator.push(prefixItems_1.default, items2020_1.default);
      else
        applicator.push(additionalItems_1.default, items_1.default);
      applicator.push(contains_1.default);
      return applicator;
    }
    exports.default = getApplicator;
  }
});

// node_modules/ajv/dist/vocabularies/format/format.js
var require_format = __commonJS({
  "node_modules/ajv/dist/vocabularies/format/format.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match format "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{format: ${schemaCode}}`
    };
    var def = {
      keyword: "format",
      type: ["number", "string"],
      schemaType: "string",
      $data: true,
      error,
      code(cxt, ruleType) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const { opts, errSchemaPath, schemaEnv, self } = it;
        if (!opts.validateFormats)
          return;
        if ($data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fDef = gen.const("fDef", (0, codegen_1._)`${fmts}[${schemaCode}]`);
          const fType = gen.let("fType");
          const format = gen.let("format");
          gen.if((0, codegen_1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._)`${fDef}.type || "string"`).assign(format, (0, codegen_1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._)`"string"`).assign(format, fDef));
          cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
          function unknownFmt() {
            if (opts.strictSchema === false)
              return codegen_1.nil;
            return (0, codegen_1._)`${schemaCode} && !${format}`;
          }
          function invalidFmt() {
            const callFormat = schemaEnv.$async ? (0, codegen_1._)`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))` : (0, codegen_1._)`${format}(${data})`;
            const validData = (0, codegen_1._)`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
            return (0, codegen_1._)`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
          }
        }
        function validateFormat() {
          const formatDef = self.formats[schema];
          if (!formatDef) {
            unknownFormat();
            return;
          }
          if (formatDef === true)
            return;
          const [fmtType, format, fmtRef] = getFormat(formatDef);
          if (fmtType === ruleType)
            cxt.pass(validCondition());
          function unknownFormat() {
            if (opts.strictSchema === false) {
              self.logger.warn(unknownMsg());
              return;
            }
            throw new Error(unknownMsg());
            function unknownMsg() {
              return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
            }
          }
          function getFormat(fmtDef) {
            const code = fmtDef instanceof RegExp ? (0, codegen_1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}` : void 0;
            const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code });
            if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
              return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1._)`${fmt}.validate`];
            }
            return ["string", fmtDef, fmt];
          }
          function validCondition() {
            if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
              if (!schemaEnv.$async)
                throw new Error("async format in sync schema");
              return (0, codegen_1._)`await ${fmtRef}(${data})`;
            }
            return typeof format == "function" ? (0, codegen_1._)`${fmtRef}(${data})` : (0, codegen_1._)`${fmtRef}.test(${data})`;
          }
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/format/index.js
var require_format2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/format/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var format_1 = require_format();
    var format = [format_1.default];
    exports.default = format;
  }
});

// node_modules/ajv/dist/vocabularies/metadata.js
var require_metadata = __commonJS({
  "node_modules/ajv/dist/vocabularies/metadata.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.contentVocabulary = exports.metadataVocabulary = void 0;
    exports.metadataVocabulary = [
      "title",
      "description",
      "default",
      "deprecated",
      "readOnly",
      "writeOnly",
      "examples"
    ];
    exports.contentVocabulary = [
      "contentMediaType",
      "contentEncoding",
      "contentSchema"
    ];
  }
});

// node_modules/ajv/dist/vocabularies/draft7.js
var require_draft7 = __commonJS({
  "node_modules/ajv/dist/vocabularies/draft7.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var core_1 = require_core2();
    var validation_1 = require_validation();
    var applicator_1 = require_applicator();
    var format_1 = require_format2();
    var metadata_1 = require_metadata();
    var draft7Vocabularies = [
      core_1.default,
      validation_1.default,
      (0, applicator_1.default)(),
      format_1.default,
      metadata_1.metadataVocabulary,
      metadata_1.contentVocabulary
    ];
    exports.default = draft7Vocabularies;
  }
});

// node_modules/ajv/dist/vocabularies/discriminator/types.js
var require_types = __commonJS({
  "node_modules/ajv/dist/vocabularies/discriminator/types.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DiscrError = void 0;
    var DiscrError;
    (function(DiscrError2) {
      DiscrError2["Tag"] = "tag";
      DiscrError2["Mapping"] = "mapping";
    })(DiscrError || (exports.DiscrError = DiscrError = {}));
  }
});

// node_modules/ajv/dist/vocabularies/discriminator/index.js
var require_discriminator = __commonJS({
  "node_modules/ajv/dist/vocabularies/discriminator/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var types_1 = require_types();
    var compile_1 = require_compile();
    var ref_error_1 = require_ref_error();
    var util_1 = require_util();
    var error = {
      message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
      params: ({ params: { discrError, tag: tag2, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag2}}`
    };
    var def = {
      keyword: "discriminator",
      type: "object",
      schemaType: "object",
      error,
      code(cxt) {
        const { gen, data, schema, parentSchema, it } = cxt;
        const { oneOf } = parentSchema;
        if (!it.opts.discriminator) {
          throw new Error("discriminator: requires discriminator option");
        }
        const tagName = schema.propertyName;
        if (typeof tagName != "string")
          throw new Error("discriminator: requires propertyName");
        if (schema.mapping)
          throw new Error("discriminator: mapping is not supported");
        if (!oneOf)
          throw new Error("discriminator: requires oneOf keyword");
        const valid = gen.let("valid", false);
        const tag2 = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
        gen.if((0, codegen_1._)`typeof ${tag2} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag: tag2, tagName }));
        cxt.ok(valid);
        function validateMapping() {
          const mapping = getMapping();
          gen.if(false);
          for (const tagValue in mapping) {
            gen.elseIf((0, codegen_1._)`${tag2} === ${tagValue}`);
            gen.assign(valid, applyTagSchema(mapping[tagValue]));
          }
          gen.else();
          cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag: tag2, tagName });
          gen.endIf();
        }
        function applyTagSchema(schemaProp) {
          const _valid = gen.name("valid");
          const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
          cxt.mergeEvaluated(schCxt, codegen_1.Name);
          return _valid;
        }
        function getMapping() {
          var _a;
          const oneOfMapping = {};
          const topRequired = hasRequired(parentSchema);
          let tagRequired = true;
          for (let i3 = 0; i3 < oneOf.length; i3++) {
            let sch = oneOf[i3];
            if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
              const ref = sch.$ref;
              sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
              if (sch instanceof compile_1.SchemaEnv)
                sch = sch.schema;
              if (sch === void 0)
                throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
            }
            const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
            if (typeof propSch != "object") {
              throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
            }
            tagRequired = tagRequired && (topRequired || hasRequired(sch));
            addMappings(propSch, i3);
          }
          if (!tagRequired)
            throw new Error(`discriminator: "${tagName}" must be required`);
          return oneOfMapping;
          function hasRequired({ required }) {
            return Array.isArray(required) && required.includes(tagName);
          }
          function addMappings(sch, i3) {
            if (sch.const) {
              addMapping(sch.const, i3);
            } else if (sch.enum) {
              for (const tagValue of sch.enum) {
                addMapping(tagValue, i3);
              }
            } else {
              throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
            }
          }
          function addMapping(tagValue, i3) {
            if (typeof tagValue != "string" || tagValue in oneOfMapping) {
              throw new Error(`discriminator: "${tagName}" values must be unique strings`);
            }
            oneOfMapping[tagValue] = i3;
          }
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/refs/json-schema-draft-07.json
var require_json_schema_draft_07 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-draft-07.json"(exports, module) {
    module.exports = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "http://json-schema.org/draft-07/schema#",
      title: "Core schema meta-schema",
      definitions: {
        schemaArray: {
          type: "array",
          minItems: 1,
          items: { $ref: "#" }
        },
        nonNegativeInteger: {
          type: "integer",
          minimum: 0
        },
        nonNegativeIntegerDefault0: {
          allOf: [{ $ref: "#/definitions/nonNegativeInteger" }, { default: 0 }]
        },
        simpleTypes: {
          enum: ["array", "boolean", "integer", "null", "number", "object", "string"]
        },
        stringArray: {
          type: "array",
          items: { type: "string" },
          uniqueItems: true,
          default: []
        }
      },
      type: ["object", "boolean"],
      properties: {
        $id: {
          type: "string",
          format: "uri-reference"
        },
        $schema: {
          type: "string",
          format: "uri"
        },
        $ref: {
          type: "string",
          format: "uri-reference"
        },
        $comment: {
          type: "string"
        },
        title: {
          type: "string"
        },
        description: {
          type: "string"
        },
        default: true,
        readOnly: {
          type: "boolean",
          default: false
        },
        examples: {
          type: "array",
          items: true
        },
        multipleOf: {
          type: "number",
          exclusiveMinimum: 0
        },
        maximum: {
          type: "number"
        },
        exclusiveMaximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        exclusiveMinimum: {
          type: "number"
        },
        maxLength: { $ref: "#/definitions/nonNegativeInteger" },
        minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        pattern: {
          type: "string",
          format: "regex"
        },
        additionalItems: { $ref: "#" },
        items: {
          anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }],
          default: true
        },
        maxItems: { $ref: "#/definitions/nonNegativeInteger" },
        minItems: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        uniqueItems: {
          type: "boolean",
          default: false
        },
        contains: { $ref: "#" },
        maxProperties: { $ref: "#/definitions/nonNegativeInteger" },
        minProperties: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        required: { $ref: "#/definitions/stringArray" },
        additionalProperties: { $ref: "#" },
        definitions: {
          type: "object",
          additionalProperties: { $ref: "#" },
          default: {}
        },
        properties: {
          type: "object",
          additionalProperties: { $ref: "#" },
          default: {}
        },
        patternProperties: {
          type: "object",
          additionalProperties: { $ref: "#" },
          propertyNames: { format: "regex" },
          default: {}
        },
        dependencies: {
          type: "object",
          additionalProperties: {
            anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }]
          }
        },
        propertyNames: { $ref: "#" },
        const: true,
        enum: {
          type: "array",
          items: true,
          minItems: 1,
          uniqueItems: true
        },
        type: {
          anyOf: [
            { $ref: "#/definitions/simpleTypes" },
            {
              type: "array",
              items: { $ref: "#/definitions/simpleTypes" },
              minItems: 1,
              uniqueItems: true
            }
          ]
        },
        format: { type: "string" },
        contentMediaType: { type: "string" },
        contentEncoding: { type: "string" },
        if: { $ref: "#" },
        then: { $ref: "#" },
        else: { $ref: "#" },
        allOf: { $ref: "#/definitions/schemaArray" },
        anyOf: { $ref: "#/definitions/schemaArray" },
        oneOf: { $ref: "#/definitions/schemaArray" },
        not: { $ref: "#" }
      },
      default: true
    };
  }
});

// node_modules/ajv/dist/ajv.js
var require_ajv = __commonJS({
  "node_modules/ajv/dist/ajv.js"(exports, module) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MissingRefError = exports.ValidationError = exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = exports.Ajv = void 0;
    var core_1 = require_core();
    var draft7_1 = require_draft7();
    var discriminator_1 = require_discriminator();
    var draft7MetaSchema = require_json_schema_draft_07();
    var META_SUPPORT_DATA = ["/properties"];
    var META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
    var Ajv2 = class extends core_1.default {
      _addVocabularies() {
        super._addVocabularies();
        draft7_1.default.forEach((v3) => this.addVocabulary(v3));
        if (this.opts.discriminator)
          this.addKeyword(discriminator_1.default);
      }
      _addDefaultMetaSchema() {
        super._addDefaultMetaSchema();
        if (!this.opts.meta)
          return;
        const metaSchema = this.opts.$data ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA) : draft7MetaSchema;
        this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
      }
      defaultMeta() {
        return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
      }
    };
    exports.Ajv = Ajv2;
    module.exports = exports = Ajv2;
    module.exports.Ajv = Ajv2;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = Ajv2;
    var validate_1 = require_validate();
    Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function() {
      return validation_error_1.default;
    } });
    var ref_error_1 = require_ref_error();
    Object.defineProperty(exports, "MissingRefError", { enumerable: true, get: function() {
      return ref_error_1.default;
    } });
  }
});

// node_modules/ajv-formats/dist/formats.js
var require_formats = __commonJS({
  "node_modules/ajv-formats/dist/formats.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatNames = exports.fastFormats = exports.fullFormats = void 0;
    function fmtDef(validate, compare) {
      return { validate, compare };
    }
    exports.fullFormats = {
      // date: http://tools.ietf.org/html/rfc3339#section-5.6
      date: fmtDef(date, compareDate),
      // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
      time: fmtDef(getTime(true), compareTime),
      "date-time": fmtDef(getDateTime(true), compareDateTime),
      "iso-time": fmtDef(getTime(), compareIsoTime),
      "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
      // duration: https://tools.ietf.org/html/rfc3339#appendix-A
      duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
      uri,
      "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
      // uri-template: https://tools.ietf.org/html/rfc6570
      "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
      // For the source: https://gist.github.com/dperini/729294
      // For test cases: https://mathiasbynens.be/demo/url-regex
      url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
      email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
      hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
      // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
      ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
      ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
      regex,
      // uuid: http://tools.ietf.org/html/rfc4122
      uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
      // JSON-pointer: https://tools.ietf.org/html/rfc6901
      // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
      "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
      "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
      // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
      "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
      // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
      // byte: https://github.com/miguelmota/is-base64
      byte,
      // signed 32 bit integer
      int32: { type: "number", validate: validateInt32 },
      // signed 64 bit integer
      int64: { type: "number", validate: validateInt64 },
      // C-type float
      float: { type: "number", validate: validateNumber },
      // C-type double
      double: { type: "number", validate: validateNumber },
      // hint to the UI to hide input strings
      password: true,
      // unchecked string payload
      binary: true
    };
    exports.fastFormats = {
      ...exports.fullFormats,
      date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
      time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
      "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
      "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
      "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
      // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
      uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
      "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
      // email (sources from jsen validator):
      // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
      // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
      email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
    };
    exports.formatNames = Object.keys(exports.fullFormats);
    function isLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }
    var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
    var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function date(str) {
      const matches = DATE.exec(str);
      if (!matches)
        return false;
      const year = +matches[1];
      const month = +matches[2];
      const day = +matches[3];
      return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
    }
    function compareDate(d1, d22) {
      if (!(d1 && d22))
        return void 0;
      if (d1 > d22)
        return 1;
      if (d1 < d22)
        return -1;
      return 0;
    }
    var TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
    function getTime(strictTimeZone) {
      return function time(str) {
        const matches = TIME.exec(str);
        if (!matches)
          return false;
        const hr = +matches[1];
        const min = +matches[2];
        const sec = +matches[3];
        const tz = matches[4];
        const tzSign = matches[5] === "-" ? -1 : 1;
        const tzH = +(matches[6] || 0);
        const tzM = +(matches[7] || 0);
        if (tzH > 23 || tzM > 59 || strictTimeZone && !tz)
          return false;
        if (hr <= 23 && min <= 59 && sec < 60)
          return true;
        const utcMin = min - tzM * tzSign;
        const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
        return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
      };
    }
    function compareTime(s1, s22) {
      if (!(s1 && s22))
        return void 0;
      const t1 = (/* @__PURE__ */ new Date("2020-01-01T" + s1)).valueOf();
      const t22 = (/* @__PURE__ */ new Date("2020-01-01T" + s22)).valueOf();
      if (!(t1 && t22))
        return void 0;
      return t1 - t22;
    }
    function compareIsoTime(t1, t22) {
      if (!(t1 && t22))
        return void 0;
      const a1 = TIME.exec(t1);
      const a22 = TIME.exec(t22);
      if (!(a1 && a22))
        return void 0;
      t1 = a1[1] + a1[2] + a1[3];
      t22 = a22[1] + a22[2] + a22[3];
      if (t1 > t22)
        return 1;
      if (t1 < t22)
        return -1;
      return 0;
    }
    var DATE_TIME_SEPARATOR = /t|\s/i;
    function getDateTime(strictTimeZone) {
      const time = getTime(strictTimeZone);
      return function date_time(str) {
        const dateTime = str.split(DATE_TIME_SEPARATOR);
        return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
      };
    }
    function compareDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const d1 = new Date(dt1).valueOf();
      const d22 = new Date(dt2).valueOf();
      if (!(d1 && d22))
        return void 0;
      return d1 - d22;
    }
    function compareIsoDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
      const [d22, t22] = dt2.split(DATE_TIME_SEPARATOR);
      const res = compareDate(d1, d22);
      if (res === void 0)
        return void 0;
      return res || compareTime(t1, t22);
    }
    var NOT_URI_FRAGMENT = /\/|:/;
    var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
    function uri(str) {
      return NOT_URI_FRAGMENT.test(str) && URI.test(str);
    }
    var BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
    function byte(str) {
      BYTE.lastIndex = 0;
      return BYTE.test(str);
    }
    var MIN_INT32 = -(2 ** 31);
    var MAX_INT32 = 2 ** 31 - 1;
    function validateInt32(value) {
      return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
    }
    function validateInt64(value) {
      return Number.isInteger(value);
    }
    function validateNumber() {
      return true;
    }
    var Z_ANCHOR = /[^\\]\\Z/;
    function regex(str) {
      if (Z_ANCHOR.test(str))
        return false;
      try {
        new RegExp(str);
        return true;
      } catch (e3) {
        return false;
      }
    }
  }
});

// node_modules/ajv-formats/dist/limit.js
var require_limit = __commonJS({
  "node_modules/ajv-formats/dist/limit.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatLimitDefinition = void 0;
    var ajv_1 = require_ajv();
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      formatMaximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      formatMinimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      formatExclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      formatExclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`should be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    exports.formatLimitDefinition = {
      keyword: Object.keys(KWDs),
      type: "string",
      schemaType: "string",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, schemaCode, keyword, it } = cxt;
        const { opts, self } = it;
        if (!opts.validateFormats)
          return;
        const fCxt = new ajv_1.KeywordCxt(it, self.RULES.all.format.definition, "format");
        if (fCxt.$data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fmt = gen.const("fmt", (0, codegen_1._)`${fmts}[${fCxt.schemaCode}]`);
          cxt.fail$data((0, codegen_1.or)((0, codegen_1._)`typeof ${fmt} != "object"`, (0, codegen_1._)`${fmt} instanceof RegExp`, (0, codegen_1._)`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
        }
        function validateFormat() {
          const format = fCxt.schema;
          const fmtDef = self.formats[format];
          if (!fmtDef || fmtDef === true)
            return;
          if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") {
            throw new Error(`"${keyword}": format "${format}" does not define "compare" function`);
          }
          const fmt = gen.scopeValue("formats", {
            key: format,
            ref: fmtDef,
            code: opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(format)}` : void 0
          });
          cxt.fail$data(compareCode(fmt));
        }
        function compareCode(fmt) {
          return (0, codegen_1._)`${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
        }
      },
      dependencies: ["format"]
    };
    var formatLimitPlugin = (ajv2) => {
      ajv2.addKeyword(exports.formatLimitDefinition);
      return ajv2;
    };
    exports.default = formatLimitPlugin;
  }
});

// node_modules/ajv-formats/dist/index.js
var require_dist = __commonJS({
  "node_modules/ajv-formats/dist/index.js"(exports, module) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var formats_1 = require_formats();
    var limit_1 = require_limit();
    var codegen_1 = require_codegen();
    var fullName = new codegen_1.Name("fullFormats");
    var fastName = new codegen_1.Name("fastFormats");
    var formatsPlugin = (ajv2, opts = { keywords: true }) => {
      if (Array.isArray(opts)) {
        addFormats2(ajv2, opts, formats_1.fullFormats, fullName);
        return ajv2;
      }
      const [formats, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
      const list2 = opts.formats || formats_1.formatNames;
      addFormats2(ajv2, list2, formats, exportName);
      if (opts.keywords)
        (0, limit_1.default)(ajv2);
      return ajv2;
    };
    formatsPlugin.get = (name, mode = "full") => {
      const formats = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
      const f4 = formats[name];
      if (!f4)
        throw new Error(`Unknown format "${name}"`);
      return f4;
    };
    function addFormats2(ajv2, list2, fs, exportName) {
      var _a;
      var _b;
      (_a = (_b = ajv2.opts.code).formats) !== null && _a !== void 0 ? _a : _b.formats = (0, codegen_1._)`require("ajv-formats/dist/formats").${exportName}`;
      for (const f4 of list2)
        ajv2.addFormat(f4, fs[f4]);
    }
    module.exports = exports = formatsPlugin;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = formatsPlugin;
  }
});

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
var HostRevisionUnavailableError = class extends Error {
  revision;
  constructor(revision, options = {}) {
    super("The selected extension commit is unavailable.", options);
    this.name = "HostRevisionUnavailableError";
    this.revision = revision;
  }
};

// src/host/sillytavern-host.ts
var SillyTavernHostAdapter = class {
  #dependencies;
  #removedExtensions = /* @__PURE__ */ new Set();
  #installCapabilities = null;
  #updateInspectionSupported = null;
  #updateSupportProbe = null;
  constructor(dependencies) {
    this.#dependencies = dependencies;
  }
  async discover() {
    const types = this.#dependencies.getExtensionTypes();
    const disabled = new Set(this.#dependencies.getDisabledExtensions());
    return this.#dependencies.getExtensionNames().filter((internalName) => types[internalName] === "local" || types[internalName] === "global").filter(
      (internalName) => !this.#removedExtensions.has(
        extensionIdentity(internalName, types[internalName])
      )
    ).map((internalName) => {
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
  async getInstallCapabilities() {
    if (!this.#installCapabilities) {
      const request = this.#requestInstallCapabilities();
      const cached = request.catch((error) => {
        if (this.#installCapabilities === cached) this.#installCapabilities = null;
        throw error;
      });
      this.#installCapabilities = cached;
    }
    return structuredClone(await this.#installCapabilities);
  }
  async readExtensionRepositoryUrl(input) {
    let response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/version", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global"
        })
      });
    } catch (cause) {
      throw new HostOperationError(
        "discover",
        "SillyTavern could not read the installed extension repository.",
        { cause }
      );
    }
    if (!response.ok) {
      throw await responseError(
        "discover",
        "SillyTavern could not read the installed extension repository.",
        response
      );
    }
    const body = await readJsonObject(response, "discover");
    if (body.remoteUrl === "" || body.remoteUrl === null) return null;
    if (typeof body.remoteUrl !== "string") {
      throw new HostOperationError(
        "discover",
        "SillyTavern returned invalid installed extension repository evidence."
      );
    }
    return parseRepositoryUrl(body.remoteUrl, "discover");
  }
  async #requestInstallCapabilities() {
    let response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/capabilities", {
        method: "GET",
        headers: this.#dependencies.getRequestHeaders()
      });
    } catch (cause) {
      throw new HostOperationError(
        "capabilities",
        "SillyTavern could not reach the extension service.",
        { cause }
      );
    }
    if (response.status === 404) return legacyInstallCapabilities();
    if (!response.ok) {
      throw await responseError(
        "capabilities",
        "SillyTavern could not report extension install capabilities.",
        response
      );
    }
    const body = await readJsonObject(response, "capabilities");
    const capabilities = {
      pinnedCommitInstall: body.pinnedCommitInstall,
      remoteRevisionLookup: body.remoteRevisionLookup,
      localRevisionLookup: body.localRevisionLookup
    };
    if (!Object.values(capabilities).every((value) => typeof value === "boolean")) {
      throw new HostOperationError(
        "capabilities",
        "SillyTavern returned invalid extension install capabilities."
      );
    }
    return capabilities;
  }
  async resolveRemoteRevision(input) {
    const repositoryUrl = parseRepositoryUrl(input.repositoryUrl, "resolveRevision");
    let response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/resolve", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({ repositoryUrl, branch: input.branch })
      });
    } catch (cause) {
      throw new HostOperationError(
        "resolveRevision",
        "SillyTavern could not reach the extension service.",
        { cause }
      );
    }
    if (!response.ok) {
      throw await responseError(
        "resolveRevision",
        "SillyTavern could not resolve the extension revision.",
        response
      );
    }
    const body = await readJsonObject(response, "resolveRevision");
    return { sha: parseCommitSha(body.sha, "resolveRevision") };
  }
  async install(input) {
    const repositoryUrl = parseRepositoryUrl(input.repositoryUrl, "install");
    const commitSha = input.commitSha !== null && input.commitSha !== void 0 ? parseCommitSha(input.commitSha, "install") : void 0;
    if (commitSha) {
      const capabilities = await this.getInstallCapabilities();
      if (!capabilities.pinnedCommitInstall) {
        throw new HostOperationError(
          "install",
          "SillyTavern does not advertise pinned commit installs."
        );
      }
    }
    let installed;
    try {
      installed = await this.#dependencies.installExtension(
        repositoryUrl,
        false,
        input.branch ?? "",
        commitSha
      );
    } catch (cause) {
      if (commitSha && isExplicitUnavailableCommitError(cause)) {
        throw new HostRevisionUnavailableError(commitSha, { cause });
      }
      throw cause;
    }
    if (!installed) {
      throw new HostOperationError("install", "SillyTavern could not install the extension.");
    }
    await this.#reconcileRemovedExtensions();
    await this.discover();
  }
  async readLocalRevision(input) {
    let response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/version", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global"
        })
      });
    } catch (cause) {
      throw new HostOperationError(
        "readRevision",
        "SillyTavern could not reach the extension service.",
        { cause }
      );
    }
    if (!response.ok) {
      throw await responseError(
        "readRevision",
        "SillyTavern could not read the installed extension revision.",
        response
      );
    }
    const body = await readJsonObject(response, "readRevision");
    if (body.currentCommitHash === "" || body.currentCommitHash === null) return null;
    return parseCommitSha(body.currentCommitHash, "readRevision");
  }
  async inspectUpdate(input) {
    if (this.#updateInspectionSupported === false)
      return this.#requestNativeUpdateInspection(input);
    if (this.#updateInspectionSupported === true) {
      return this.#requestUpdateInspection(input);
    }
    if (this.#updateSupportProbe) {
      await this.#updateSupportProbe;
      if (this.#updateInspectionSupported === false)
        return this.#requestNativeUpdateInspection(input);
      return this.#requestUpdateInspection(input);
    }
    const probe = this.#requestUpdateInspection(input).then(
      (inspection) => {
        this.#updateInspectionSupported = true;
        return inspection;
      },
      async (error) => {
        if (isUnsupportedUpdateInspectionError(error)) {
          this.#updateInspectionSupported = false;
          return this.#requestNativeUpdateInspection(input);
        }
        throw error;
      }
    );
    this.#updateSupportProbe = probe;
    try {
      return await probe;
    } finally {
      if (this.#updateSupportProbe === probe) this.#updateSupportProbe = null;
    }
  }
  async #requestNativeUpdateInspection(input) {
    let response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/version", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global"
        })
      });
    } catch (cause) {
      throw new HostOperationError(
        "inspectUpdate",
        "SillyTavern could not reach the native extension update service.",
        { cause }
      );
    }
    if (!response.ok) {
      throw await responseError(
        "inspectUpdate",
        "SillyTavern could not check this extension for updates.",
        response
      );
    }
    const body = await readJsonObject(response, "inspectUpdate");
    if (typeof body.currentBranchName !== "string" || typeof body.isUpToDate !== "boolean" || typeof body.remoteUrl !== "string") {
      throw new HostOperationError(
        "inspectUpdate",
        "SillyTavern returned invalid native extension update evidence."
      );
    }
    return {
      installedSha: parseCommitSha(body.currentCommitHash, "inspectUpdate"),
      newestSha: null,
      remoteUrl: body.remoteUrl,
      branch: body.currentBranchName,
      worktreeClean: null,
      branchMatches: input.branch === null || input.branch === body.currentBranchName,
      exactUpdateSupported: false,
      newestRelationship: body.isUpToDate ? "equal" : "behind",
      candidateRelationships: {}
    };
  }
  async #requestUpdateInspection(input) {
    const repositoryUrl = parseRepositoryUrl(input.repositoryUrl, "inspectUpdate");
    const candidateShas = input.candidateShas.map((sha) => parseCommitSha(sha, "inspectUpdate"));
    let response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/update-status", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global",
          repositoryUrl,
          branch: input.branch,
          candidateShas
        })
      });
    } catch (cause) {
      throw new HostOperationError(
        "inspectUpdate",
        "SillyTavern could not reach the extension update service.",
        { cause }
      );
    }
    if (response.status === 404) {
      throw unsupportedUpdateInspectionError();
    }
    if (!response.ok) {
      throw await responseError(
        "inspectUpdate",
        "SillyTavern could not check extension updates.",
        response
      );
    }
    const body = await readJsonObject(response, "inspectUpdate");
    const relationships = parseCandidateRelationships(body.candidateRelationships);
    if (typeof body.remoteUrl !== "string" || typeof body.branch !== "string" || typeof body.worktreeClean !== "boolean" || typeof body.branchMatches !== "boolean" || typeof body.exactUpdateSupported !== "boolean") {
      throw new HostOperationError(
        "inspectUpdate",
        "SillyTavern returned invalid extension update evidence."
      );
    }
    return {
      installedSha: parseCommitSha(body.installedSha, "inspectUpdate"),
      newestSha: parseCommitSha(body.newestSha, "inspectUpdate"),
      remoteUrl: body.remoteUrl,
      branch: body.branch,
      worktreeClean: body.worktreeClean,
      branchMatches: body.branchMatches,
      exactUpdateSupported: body.exactUpdateSupported,
      newestRelationship: parseRevisionRelationship(body.newestRelationship),
      candidateRelationships: relationships
    };
  }
  async applyUpdate(input) {
    const repositoryUrl = parseRepositoryUrl(input.repositoryUrl, "update");
    const expectedCurrentSha = parseCommitSha(input.expectedCurrentSha, "update");
    const targetSha = input.targetSha === null ? null : parseCommitSha(input.targetSha, "update");
    let response;
    try {
      response = targetSha ? await this.#dependencies.fetch("/api/extensions/update-to", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global",
          repositoryUrl,
          branch: input.branch,
          expectedCurrentSha,
          targetSha
        })
      }) : await this.#dependencies.fetch("/api/extensions/update", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global"
        })
      });
    } catch (cause) {
      throw new HostOperationError(
        "update",
        "SillyTavern could not reach the extension update service.",
        { cause }
      );
    }
    if (!response.ok) {
      throw await responseError("update", "SillyTavern could not update the extension.", response);
    }
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
    this.#removedExtensions.add(extensionIdentity(input.internalName, input.type));
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
  async #reconcileRemovedExtensions() {
    if (this.#removedExtensions.size === 0) return;
    let records = null;
    try {
      const response = await this.#dependencies.fetch("/api/extensions/discover", {
        method: "GET",
        headers: this.#dependencies.getRequestHeaders()
      });
      if (response.ok) records = await response.json();
    } catch {
    }
    if (Array.isArray(records)) {
      for (const record2 of records) {
        if (!record2 || typeof record2 !== "object") continue;
        const { name, type } = record2;
        if (typeof name === "string" && (type === "local" || type === "global")) {
          this.#removedExtensions.delete(extensionIdentity(name, type));
        }
      }
      return;
    }
    const types = this.#dependencies.getExtensionTypes();
    for (const internalName of this.#dependencies.getExtensionNames()) {
      const type = types[internalName];
      if (type === "local" || type === "global") {
        this.#removedExtensions.delete(extensionIdentity(internalName, type));
      }
    }
  }
};
function unsupportedUpdateInspectionError() {
  return new HostOperationError(
    "inspectUpdate",
    "This version of SillyTavern cannot check updates safely.",
    { status: 404 }
  );
}
function isUnsupportedUpdateInspectionError(error) {
  return error instanceof HostOperationError && error.operation === "inspectUpdate" && error.status === 404;
}
function extensionIdentity(internalName, type) {
  return `${type}:${internalName}`;
}
function legacyInstallCapabilities() {
  return {
    pinnedCommitInstall: false,
    remoteRevisionLookup: false,
    localRevisionLookup: true
  };
}
async function responseError(operation, message2, response) {
  return new HostOperationError(operation, message2, {
    status: response.status,
    details: sanitizeResponseDetails(await response.text())
  });
}
async function readJsonObject(response, operation) {
  try {
    const body = await response.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body;
    }
  } catch {
  }
  throw new HostOperationError(operation, "SillyTavern returned an invalid extension response.");
}
function parseCommitSha(value, operation) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/i.test(value)) {
    throw new HostOperationError(operation, "SillyTavern did not return a valid commit SHA.");
  }
  return value.toLowerCase();
}
function isExplicitUnavailableCommitError(cause) {
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "COMMIT_UNAVAILABLE";
}
function parseRepositoryUrl(input, operation) {
  let url;
  try {
    url = new URL(input);
  } catch (cause) {
    throw new HostOperationError(
      operation,
      "Extension repositories require an HTTP or HTTPS URL.",
      {
        cause
      }
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HostOperationError(operation, "Extension repositories require an HTTP or HTTPS URL.");
  }
  return url.href;
}
function parseRevisionRelationship(value) {
  if (value === "equal" || value === "behind" || value === "ahead" || value === "diverged") {
    return value;
  }
  throw new HostOperationError(
    "inspectUpdate",
    "SillyTavern returned invalid extension update evidence."
  );
}
function parseCandidateRelationships(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HostOperationError(
      "inspectUpdate",
      "SillyTavern returned invalid extension update evidence."
    );
  }
  return Object.fromEntries(
    Object.entries(value).map(([sha, relationship]) => [
      parseCommitSha(sha, "inspectUpdate"),
      parseRevisionRelationship(relationship)
    ])
  );
}
function sanitizeResponseDetails(input) {
  return Array.from(input).filter((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint >= 32 && (codePoint < 127 || codePoint > 159);
  }).join("").trim().slice(0, 500);
}

// src/host/runtime-host.ts
var EXTENSION_MODULE_PATH = "/scripts/extensions.js";
var SCRIPT_MODULE_PATH = "/script.js";
async function resolveImmediateSettingsSave(context, loadScriptModule = async () => import(
  /* @vite-ignore */
  SCRIPT_MODULE_PATH
)) {
  const module = context.saveSettings ? null : await loadScriptModule();
  const moduleSave = module && typeof module === "object" && "saveSettings" in module ? module.saveSettings : null;
  const saveSettings = context.saveSettings ?? moduleSave;
  if (typeof saveSettings !== "function") {
    throw new Error("SillyTavern is missing the immediate settings save API.");
  }
  return async () => {
    await saveSettings();
  };
}
async function createSillyTavernRuntimeHost(context, loadExtensionModule = async () => await import(
  /* @vite-ignore */
  EXTENSION_MODULE_PATH
)) {
  const extensionModule = await loadExtensionModule();
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
    installExtension: (url, global, branch, commitSha) => extensionModule.installExtension(url, global, branch, commitSha),
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
  let removeBackdropDismissal = () => void 0;
  const popup = new Popup(content, context.POPUP_TYPE.DISPLAY, "", {
    wide: options.wide ?? true,
    large: options.large ?? true,
    transparent: options.transparent ?? false,
    allowVerticalScrolling: options.allowVerticalScrolling ?? false,
    onOpen: (openedPopup) => {
      if (!options.dismissOnBackdrop) return;
      const onPointerDown = (event) => {
        if (event.target === openedPopup.dlg) void openedPopup.complete(null);
      };
      openedPopup.dlg.addEventListener("pointerdown", onPointerDown);
      removeBackdropDismissal = () => openedPopup.dlg.removeEventListener("pointerdown", onPointerDown);
    },
    onClose: () => removeBackdropDismissal()
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
  constructor(formatVersion2) {
    super(`Profile state format ${formatVersion2} is newer than this Companion supports.`);
    this.name = "UnsupportedProfileStateError";
    this.formatVersion = formatVersion2;
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
        await this.#dependencies.saveSettings();
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
  var s3, h3, p3, v3, y3, _3, g4 = t3 && t3.__k || w, m3 = l3.length;
  for (f4 = T(u4, l3, g4, f4, m3), s3 = 0; s3 < m3; s3++) null != (p3 = u4.__k[s3]) && (h3 = -1 != p3.__i && g4[p3.__i] || d, p3.__i = s3, _3 = q(n2, p3, h3, i3, r3, o3, e3, f4, c3, a3), v3 = p3.__e, p3.ref && h3.ref != p3.ref && (h3.ref && J(h3.ref, null, p3), a3.push(p3.ref, p3.__c || v3, p3)), null == y3 && null != v3 && (y3 = v3), 4 & p3.__u ? (f4 = j(p3, f4, n2), h3.__e && (h3.__e = null)) : "function" == typeof p3.type && void 0 !== _3 ? f4 = _3 : v3 && (f4 = v3.nextSibling), p3.__u &= -7);
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
function F(n2, l3) {
  return l3 = l3 || [], null == n2 || "boolean" == typeof n2 || (g(n2) ? n2.some(function(n3) {
    F(n3, l3);
  }) : l3.push(n2)), l3;
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
  var s3, h3, p3, v3, y3, d3, _3, k3, x3, M3, I2, P4, A4, H3, T4, j4, F3 = u4.type;
  if (void 0 !== u4.constructor) return null;
  128 & t3.__u && (c3 = !!(32 & t3.__u), o3 = [f4 = u4.__e = t3.__e]), (s3 = l.__b) && s3(u4);
  n: if ("function" == typeof F3) {
    h3 = e3.length;
    try {
      if (x3 = u4.props, M3 = F3.prototype && F3.prototype.render, I2 = (s3 = F3.contextType) && i3[s3.__c], P4 = s3 ? I2 ? I2.props.value : s3.__ : i3, t3.__c ? k3 = (p3 = u4.__c = t3.__c).__ = p3.__E : (M3 ? u4.__c = p3 = new F3(x3, P4) : (u4.__c = p3 = new C(x3, P4), p3.constructor = F3, p3.render = Q), I2 && I2.sub(p3), p3.state || (p3.state = {}), p3.__n = i3, v3 = p3.__d = true, p3.__h = [], p3._sb = []), M3 && null == p3.__s && (p3.__s = p3.state), M3 && null != F3.getDerivedStateFromProps && (p3.__s == p3.state && (p3.__s = m({}, p3.__s)), m(p3.__s, F3.getDerivedStateFromProps(x3, p3.__s))), y3 = p3.props, d3 = p3.state, p3.__v = u4, v3) M3 && null == F3.getDerivedStateFromProps && null != p3.componentWillMount && p3.componentWillMount(), M3 && null != p3.componentDidMount && p3.__h.push(p3.componentDidMount);
      else {
        if (M3 && null == F3.getDerivedStateFromProps && x3 !== y3 && null != p3.componentWillReceiveProps && p3.componentWillReceiveProps(x3, P4), u4.__v == t3.__v || !p3.__e && null != p3.shouldComponentUpdate && false === p3.shouldComponentUpdate(x3, p3.__s, P4)) {
          u4.__v != t3.__v && (p3.props = x3, p3.state = p3.__s, p3.__d = false), u4.__e = t3.__e, u4.__k = t3.__k, u4.__k.some(function(n3) {
            n3 && (n3.__ = u4);
          }), w.push.apply(p3.__h, p3._sb), p3._sb = [], p3.__h.length && e3.push(p3), f4 = $(t3);
          break n;
        }
        null != p3.componentWillUpdate && p3.componentWillUpdate(x3, p3.__s, P4), M3 && null != p3.componentDidUpdate && p3.__h.push(function() {
          p3.componentDidUpdate(y3, d3, _3);
        });
      }
      if (p3.context = P4, p3.props = x3, p3.__P = n2, p3.__e = false, A4 = l.__r, H3 = 0, M3) p3.state = p3.__s, p3.__d = false, A4 && A4(u4), s3 = p3.render(p3.props, p3.state, p3.context), w.push.apply(p3.__h, p3._sb), p3._sb = [];
      else do {
        p3.__d = false, A4 && A4(u4), s3 = p3.render(p3.props, p3.state, p3.context), p3.state = p3.__s;
      } while (p3.__d && ++H3 < 25);
      p3.state = p3.__s, null != p3.getChildContext && (i3 = m(m({}, i3), p3.getChildContext())), M3 && !v3 && null != p3.getSnapshotBeforeUpdate && (_3 = p3.getSnapshotBeforeUpdate(y3, d3)), T4 = null != s3 && s3.type === S && null == s3.key ? E(s3.props.children) : s3, f4 = L(n2, g(T4) ? T4 : [T4], u4, t3, i3, r3, o3, e3, f4, c3, a3), p3.base = u4.__e, u4.__u &= -161, p3.__h.length && e3.push(p3), k3 && (p3.__E = p3.__ = null);
    } catch (n3) {
      if (e3.length = h3, u4.__v = null, c3 || null != o3) {
        if (n3.then) {
          for (u4.__u |= c3 ? 160 : 128; f4 && 8 == f4.nodeType && f4.nextSibling; ) f4 = f4.nextSibling;
          null != o3 && (o3[o3.indexOf(f4)] = null), u4.__e = f4;
        } else if (null != o3) for (j4 = o3.length; j4--; ) b(o3[j4]);
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
  var s3, h3, p3, v3, y3, w3, _3, m3 = i3.props || d, k3 = t3.props, x3 = t3.type;
  if ("svg" == x3 ? o3 = "http://www.w3.org/2000/svg" : "math" == x3 ? o3 = "http://www.w3.org/1998/Math/MathML" : o3 || (o3 = "http://www.w3.org/1999/xhtml"), null != e3) {
    for (s3 = 0; s3 < e3.length; s3++) if ((y3 = e3[s3]) && "setAttribute" in y3 == !!x3 && (x3 ? y3.localName == x3 : 3 == y3.nodeType)) {
      u4 = y3, e3[s3] = null;
      break;
    }
  }
  if (null == u4) {
    if (null == x3) return document.createTextNode(k3);
    u4 = document.createElementNS(o3, x3, k3.is && k3), c3 && (l.__m && l.__m(t3, e3), c3 = false), e3 = null;
  }
  if (null == x3) m3 === k3 || c3 && u4.data == k3 || (u4.data = k3);
  else {
    if (e3 = "textarea" == x3 && null != k3.defaultValue ? null : e3 && n.call(u4.childNodes), !c3 && null != e3) for (m3 = {}, s3 = 0; s3 < u4.attributes.length; s3++) m3[(y3 = u4.attributes[s3]).name] = y3.value;
    for (s3 in m3) y3 = m3[s3], "dangerouslySetInnerHTML" == s3 ? p3 = y3 : "children" == s3 || s3 in k3 || "value" == s3 && "defaultValue" in k3 || "checked" == s3 && "defaultChecked" in k3 || N(u4, s3, null, y3, o3);
    for (s3 in k3) y3 = k3[s3], "children" == s3 ? v3 = y3 : "dangerouslySetInnerHTML" == s3 ? h3 = y3 : "value" == s3 ? w3 = y3 : "checked" == s3 ? _3 = y3 : c3 && "function" != typeof y3 || m3[s3] === y3 || N(u4, s3, y3, m3[s3], o3);
    if (h3) c3 || p3 && (h3.__html == p3.__html || h3.__html == u4.innerHTML) || (u4.innerHTML = h3.__html), t3.__k = [];
    else if (p3 && (u4.innerHTML = ""), L("template" == t3.type ? u4.content : u4, g(v3) ? v3 : [v3], t3, i3, r3, "foreignObject" == x3 ? "http://www.w3.org/1999/xhtml" : o3, e3, f4, e3 ? e3[0] : i3.__k && $(i3, 0), c3, a3), null != e3) for (s3 = e3.length; s3--; ) b(e3[s3]);
    c3 && "textarea" != x3 || (s3 = "value", "progress" == x3 && null == w3 ? u4.removeAttribute("value") : null != w3 && (w3 !== u4[s3] || "progress" == x3 && !w3 || "option" == x3 && w3 != m3[s3]) && N(u4, s3, w3, m3[s3], o3), s3 = "checked", null != _3 && _3 != u4[s3] && N(u4, s3, _3, m3[s3], o3));
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
function _2(n2, u4) {
  var i3 = s2(t2++, 4);
  !c2.__s && C2(i3.__H, u4) && (i3.__ = n2, i3.u = u4, r2.__h.push(i3));
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
function g2() {
  var n2 = s2(t2++, 11);
  if (!n2.__) {
    for (var u4 = r2.__v; null !== u4 && !u4.__m && null !== u4.__; ) u4 = u4.__;
    var i3 = u4.__m || (u4.__m = [0, 0]);
    n2.__ = "P" + i3[0] + "-" + i3[1]++;
  }
  return n2.__;
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

// vendor/tavernary-core/src/catalog-schema.ts
var import_ajv = __toESM(require_ajv(), 1);
var import_ajv_formats = __toESM(require_dist(), 1);

// vendor/tavernary-core/src/catalog-v7-schema.ts
var string = { type: "string" };
var nonemptyString = { type: "string", minLength: 1 };
var nullableString = {
  anyOf: [{ type: "string" }, { type: "null" }]
};
var nullableDateTime = {
  anyOf: [{ type: "string", format: "date-time" }, { type: "null" }]
};
var nullableNonnegativeInteger = {
  anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }]
};
var nullableNonnegativeNumber = {
  anyOf: [{ type: "number", minimum: 0 }, { type: "null" }]
};
var safeHttpUrl = {
  type: "string",
  format: "safe-http-url"
};
var nullableSafeHttpUrl = {
  anyOf: [safeHttpUrl, { type: "null" }]
};
var nullableSafeNavigationUrl = {
  anyOf: [{ type: "string", format: "safe-navigation-url" }, { type: "null" }]
};
var label = {
  type: "object",
  additionalProperties: false,
  required: ["description", "id", "label"],
  properties: {
    id: nonemptyString,
    label: nonemptyString,
    description: string
  }
};
var tag = {
  type: "object",
  additionalProperties: false,
  required: ["description", "facet", "id", "label"],
  properties: {
    ...label.properties,
    facet: { enum: ["goal", "trait"] }
  }
};
var searchFields = {
  type: "object",
  additionalProperties: false,
  required: [
    "aliases",
    "compatibility",
    "frontends",
    "kind",
    "maintainers",
    "primaryFunction",
    "relationships",
    "source",
    "summary",
    "tags",
    "title"
  ],
  properties: Object.fromEntries(
    [
      "aliases",
      "compatibility",
      "frontends",
      "kind",
      "maintainers",
      "primaryFunction",
      "relationships",
      "source",
      "summary",
      "tags",
      "title"
    ].map((field) => [
      field,
      { type: "array", items: string, uniqueItems: true }
    ])
  )
};
var account = {
  type: "object",
  additionalProperties: false,
  required: ["login", "provider"],
  properties: {
    provider: { enum: ["github", "codeberg"] },
    login: nonemptyString
  }
};
var contributor = {
  type: "object",
  additionalProperties: false,
  required: ["botOrAi", "login", "provider"],
  properties: {
    ...account.properties,
    botOrAi: { type: "boolean" }
  }
};
var report = {
  type: "object",
  additionalProperties: false,
  required: [
    "assessedAt",
    "assessmentSource",
    "citedFindingIds",
    "contextualReviewPolicyVersion",
    "dangerBasis",
    "headline",
    "highDanger",
    "maliciousEvidence",
    "materialConcerns",
    "minorCautions",
    "reportId",
    "reportUrl",
    "riskLevel",
    "scannedAt",
    "scannedSha",
    "scannerPolicyVersion",
    "summary",
    "synthesisModel",
    "synthesisPolicyVersion",
    "technicalHistoryUrl",
    "treeUrl"
  ],
  properties: {
    reportId: nonemptyString,
    riskLevel: { enum: ["low", "material", "high"] },
    headline: string,
    summary: string,
    minorCautions: { type: "integer", minimum: 0 },
    materialConcerns: { type: "integer", minimum: 0 },
    highDanger: { type: "integer", minimum: 0 },
    maliciousEvidence: string,
    citedFindingIds: {
      type: "array",
      items: nonemptyString,
      uniqueItems: true
    },
    scannedSha: { type: "string", pattern: "^[0-9a-f]{40}$" },
    treeUrl: safeHttpUrl,
    scannedAt: { type: "string", format: "date-time" },
    assessedAt: { type: "string", format: "date-time" },
    scannerPolicyVersion: nonemptyString,
    contextualReviewPolicyVersion: nonemptyString,
    synthesisPolicyVersion: nonemptyString,
    synthesisModel: nonemptyString,
    dangerBasis: {
      enum: [
        "none",
        "malicious_or_compromised",
        "critical_exploitable_vulnerability",
        "mixed"
      ]
    },
    assessmentSource: {
      enum: ["model", "deterministic_fallback", "deterministic_regrade"]
    },
    reportUrl: safeHttpUrl,
    technicalHistoryUrl: nullableSafeHttpUrl
  }
};
var project = {
  type: "object",
  additionalProperties: false,
  required: [
    "activity",
    "attribution",
    "canonicalUrl",
    "catalogCohort",
    "catalogedAt",
    "community",
    "fork",
    "frontends",
    "id",
    "install",
    "kind",
    "latestReleaseAt",
    "license",
    "metadataStatus",
    "name",
    "preset",
    "primaryFunction",
    "refreshedAt",
    "repositorySizeKb",
    "search",
    "sourceStatus",
    "staleSince",
    "summary",
    "tags",
    "tavernKeeper"
  ],
  properties: {
    id: nonemptyString,
    name: nonemptyString,
    kind: { enum: ["frontend", "extension", "preset"] },
    metadataStatus: { enum: ["provisional", "curated"] },
    sourceStatus: { enum: ["pending", "healthy", "stale", "manual"] },
    primaryFunction: nonemptyString,
    summary: string,
    canonicalUrl: safeHttpUrl,
    catalogedAt: { type: "string", format: "date-time" },
    catalogCohort: { enum: ["seed", "standard"] },
    frontends: { type: "array", items: label },
    tags: { type: "array", items: tag },
    search: searchFields,
    tavernKeeper: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: [
            "currentSha",
            "freshness",
            "history",
            "historyUrl",
            "report",
            "riskLevel",
            "state"
          ],
          properties: {
            state: {
              enum: ["teal", "orange", "red", "gray", "unsupported"]
            },
            riskLevel: {
              anyOf: [{ enum: ["low", "material", "high"] }, { type: "null" }]
            },
            freshness: {
              enum: [
                "current",
                "stale",
                "unavailable",
                "unassessed",
                "unsupported"
              ]
            },
            currentSha: {
              anyOf: [
                { type: "string", pattern: "^[0-9a-f]{40}$" },
                { type: "null" }
              ]
            },
            report: { anyOf: [report, { type: "null" }] },
            history: { type: "array", items: report },
            historyUrl: nullableSafeNavigationUrl
          }
        }
      ]
    },
    fork: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["parentName", "parentProjectId", "parentUrl", "status"],
          properties: {
            parentName: nonemptyString,
            parentProjectId: nullableString,
            parentUrl: nullableSafeHttpUrl,
            status: {
              enum: ["published", "repository", "not-listed", "unavailable"]
            }
          }
        }
      ]
    },
    attribution: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: [
            "contributors",
            "humanContributorCount",
            "owner",
            "status"
          ],
          properties: {
            owner: account,
            contributors: { type: "array", items: contributor },
            humanContributorCount: { type: "integer", minimum: 0 },
            status: { enum: ["current", "partial", "stale", "pending"] }
          }
        }
      ]
    },
    activity: {
      type: "object",
      additionalProperties: false,
      required: [
        "activeWeeks12",
        "dormant",
        "evidenceStatus",
        "latestSourceActivityAt",
        "weeklyActivity"
      ],
      properties: {
        latestSourceActivityAt: nullableDateTime,
        activeWeeks12: nullableNonnegativeInteger,
        weeklyActivity: {
          anyOf: [
            {
              type: "array",
              items: { type: "boolean" },
              minItems: 12,
              maxItems: 12
            },
            { type: "null" }
          ]
        },
        evidenceStatus: {
          anyOf: [
            { enum: ["provisional", "complete", "degraded"] },
            { type: "null" }
          ]
        },
        dormant: { type: "boolean" }
      }
    },
    latestReleaseAt: nullableDateTime,
    community: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["aggregate", "forks", "stars", "watchers"],
          properties: {
            stars: { type: "integer", minimum: 0 },
            forks: { type: "integer", minimum: 0 },
            watchers: { type: "integer", minimum: 0 },
            aggregate: { type: "integer", minimum: 0 }
          }
        }
      ]
    },
    repositorySizeKb: nullableNonnegativeInteger,
    license: {
      type: "object",
      additionalProperties: false,
      required: ["label", "status", "tooltip"],
      properties: {
        status: {
          enum: ["osi-approved", "proprietary", "missing", "pending"]
        },
        label: nonemptyString,
        tooltip: string
      }
    },
    preset: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: [
            "artifactSizeBytes",
            "completionFormats",
            "modelFamilies",
            "publishedAt",
            "version"
          ],
          properties: {
            version: nullableString,
            publishedAt: nullableDateTime,
            artifactSizeBytes: nullableNonnegativeInteger,
            modelFamilies: { type: "array", items: label },
            completionFormats: { type: "array", items: label }
          }
        }
      ]
    },
    refreshedAt: nullableDateTime,
    staleSince: nullableDateTime,
    install: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: [
            "branch",
            "folderName",
            "kind",
            "manifestPath",
            "repositoryUrl"
          ],
          properties: {
            kind: { const: "sillytavern-extension-git" },
            repositoryUrl: string,
            branch: nullableString,
            manifestPath: { const: "manifest.json" },
            folderName: string
          }
        }
      ]
    }
  }
};
var kit = {
  type: "object",
  additionalProperties: false,
  required: [
    "author",
    "components",
    "description",
    "flaggedProjectCount",
    "frontends",
    "id",
    "modelFamilies",
    "publishedAt",
    "purposes",
    "search",
    "sourceIssueNumber",
    "sourceIssueUrl",
    "supportRefreshedAt",
    "supportStale",
    "supporterCount",
    "title",
    "trendingScore",
    "updatedAt"
  ],
  properties: {
    id: nonemptyString,
    title: nonemptyString,
    description: string,
    author: {
      type: "object",
      additionalProperties: false,
      required: ["githubUserId", "login"],
      properties: {
        githubUserId: { type: "integer", minimum: 1 },
        login: nonemptyString
      }
    },
    sourceIssueNumber: { type: "integer", minimum: 1 },
    sourceIssueUrl: safeHttpUrl,
    publishedAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    frontends: { type: "array", items: label },
    purposes: { type: "array", items: label },
    modelFamilies: { type: "array", items: label },
    components: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "availability",
          "canonicalUrl",
          "kind",
          "name",
          "primaryFunction",
          "project",
          "projectId",
          "unavailableReason"
        ],
        properties: {
          projectId: nonemptyString,
          name: nonemptyString,
          kind: { enum: ["frontend", "extension", "preset"] },
          primaryFunction: nonemptyString,
          availability: { enum: ["available", "flagged"] },
          unavailableReason: nullableString,
          canonicalUrl: nullableSafeHttpUrl,
          project: {
            anyOf: [{ $ref: "#/$defs/project" }, { type: "null" }]
          }
        }
      }
    },
    supporterCount: nullableNonnegativeInteger,
    trendingScore: nullableNonnegativeNumber,
    supportRefreshedAt: nullableDateTime,
    supportStale: { type: "boolean" },
    flaggedProjectCount: { type: "integer", minimum: 0 },
    search: searchFields
  }
};
var catalogV7Schema = {
  $id: "https://tavernary.org/schemas/catalog-v7.json",
  type: "object",
  additionalProperties: false,
  required: [
    "generatedAt",
    "kits",
    "projects",
    "schemaVersion",
    "tagVocabulary"
  ],
  properties: {
    schemaVersion: { const: 7 },
    generatedAt: { type: "string", format: "date-time" },
    tagVocabulary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "aliases",
          "applicable_kinds",
          "description",
          "facet",
          "id",
          "label"
        ],
        properties: {
          ...tag.properties,
          aliases: { type: "array", items: string, uniqueItems: true },
          applicable_kinds: {
            type: "array",
            items: { enum: ["frontend", "extension", "preset"] },
            uniqueItems: true
          }
        }
      }
    },
    projects: { type: "array", items: { $ref: "#/$defs/project" } },
    kits: { type: "array", items: { $ref: "#/$defs/kit" } }
  },
  $defs: { project, kit }
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
  const decodedPath = decodeRepositoryPath(rawUrlPath(value));
  const segments = decodedPath.split("/").filter(Boolean);
  if (!url.hostname || decodedPath.includes("\\") || decodedPath.includes("//") || segments.length < 2 || segments.some((segment) => segment === "." || segment === "..") || !segments.at(-1)?.endsWith(".git")) {
    throw new InstallContractValidationError(
      "repositoryUrl",
      "Repository URL must identify a .git repository."
    );
  }
  return url.href;
}
function decodeRepositoryPath(rawPath) {
  let current = rawPath;
  for (let depth = 0; depth < 8; depth += 1) {
    if (/%(?:2f|5c)/iu.test(current)) {
      throw new InstallContractValidationError(
        "repositoryUrl",
        "Repository URL cannot contain encoded separators."
      );
    }
    let next;
    try {
      next = decodeURIComponent(current);
    } catch {
      throw new InstallContractValidationError(
        "repositoryUrl",
        "Repository URL path encoding is invalid."
      );
    }
    if (containsControl(next)) {
      throw new InstallContractValidationError(
        "repositoryUrl",
        "Repository URL path contains control characters."
      );
    }
    if (next === current) return next;
    current = next;
  }
  throw new InstallContractValidationError(
    "repositoryUrl",
    "Repository URL path encoding is excessive."
  );
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
var ajv = new import_ajv.default({ allErrors: true, strict: false });
(0, import_ajv_formats.default)(ajv);
ajv.addFormat("safe-http-url", {
  type: "string",
  validate: (value) => isSafeHttpUrl(value)
});
ajv.addFormat("safe-navigation-url", {
  type: "string",
  validate: (value) => isSafeNavigationUrl(value)
});
var validateCatalog = ajv.compile(catalogV7Schema);
var CatalogValidationError = class extends Error {
  issues;
  constructor(issues) {
    super(`Catalog schema 7 validation failed with ${issues.length} issue(s).`);
    this.name = "CatalogValidationError";
    this.issues = structuredClone(issues);
  }
};
function parseCatalogV7(value) {
  if (!validateCatalog(value)) {
    throw new CatalogValidationError(
      (validateCatalog.errors ?? []).map(schemaIssue)
    );
  }
  const issues = [];
  const projects = value.projects;
  const projectIds = /* @__PURE__ */ new Set();
  projects.forEach((project2, index) => {
    const path = `projects[${index}]`;
    if (projectIds.has(project2.id)) {
      issues.push({
        path: `${path}.id`,
        message: "Project ID must be unique."
      });
    } else {
      projectIds.add(project2.id);
    }
    if (project2.install !== null) {
      try {
        parseInstallContract(project2.install);
      } catch (cause) {
        const field = cause instanceof InstallContractValidationError && cause.field !== "contract" ? `.${cause.field}` : "";
        issues.push({
          path: `${path}.install${field}`,
          message: cause instanceof Error ? cause.message : "Install contract is invalid."
        });
      }
    }
  });
  const kitIds = /* @__PURE__ */ new Set();
  value.kits.forEach((kit2, index) => {
    if (kitIds.has(kit2.id)) {
      issues.push({
        path: `kits[${index}].id`,
        message: "Kit ID must be unique."
      });
    }
    kitIds.add(kit2.id);
  });
  const tagIds = /* @__PURE__ */ new Set();
  value.tagVocabulary.forEach((tag2, index) => {
    if (tagIds.has(tag2.id)) {
      issues.push({
        path: `tagVocabulary[${index}].id`,
        message: "Tag ID must be unique."
      });
    }
    tagIds.add(tag2.id);
  });
  if (issues.length > 0) throw new CatalogValidationError(issues);
  return structuredClone(value);
}
function schemaIssue(error) {
  let path = pointerToPath(error.instancePath);
  if (error.keyword === "required") {
    const missing = String(error.params.missingProperty ?? "");
    path = path === "catalog" ? missing : `${path}.${missing}`;
  } else if (error.keyword === "additionalProperties") {
    const unexpected = String(error.params.additionalProperty ?? "");
    path = path === "catalog" ? unexpected : `${path}.${unexpected}`;
  }
  return { path, message: error.message ?? "Value is invalid." };
}
function pointerToPath(pointer) {
  if (pointer.length === 0) return "catalog";
  return pointer.split("/").slice(1).reduce((path, rawSegment) => {
    const segment = rawSegment.replace(/~1/gu, "/").replace(/~0/gu, "~");
    if (/^\d+$/u.test(segment)) return `${path}[${segment}]`;
    return path.length === 0 ? segment : `${path}.${segment}`;
  }, "");
}
function isSafeHttpUrl(value) {
  if (hasControl(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.username.length === 0 && url.password.length === 0 && url.hostname.length > 0;
  } catch {
    return false;
  }
}
function isSafeNavigationUrl(value) {
  if (isSafeHttpUrl(value)) return true;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || hasControl(value)) {
    return false;
  }
  try {
    const base = new URL("https://tavernary.invalid/");
    return new URL(value, base).origin === base.origin;
  } catch {
    return false;
  }
}
function hasControl(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint >= 127 && codePoint <= 159;
  });
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
  for (let j4 = 0; j4 < n2; ++j4)
    matrix[j4] = j4;
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
        for (let j4 = jmin; j4 < jmax; ++j4) {
          const different = char !== query[j4];
          const rpl = matrix[prevRowOffset + j4] + +different;
          const del = matrix[prevRowOffset + j4 + 1] + 1;
          const ins = matrix[thisRowOffset + j4] + 1;
          const dist = matrix[thisRowOffset + j4 + 1] = Math.min(rpl, del, ins);
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
  forEach(fn2) {
    for (const [key, value] of this) {
      fn2(key, value, this);
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
  update(key, fn2) {
    if (typeof key !== "string") {
      throw new Error("key must be a string");
    }
    this._size = void 0;
    const node = createPath(this._tree, key);
    node.set(LEAF, fn2(node.get(LEAF)));
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
    (_3, index) => index
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
  return kits.filter((kit2) => !normalized || matchingKitIds.has(kit2.id)).filter(
    (kit2) => matchesAny(
      query.frontends,
      kit2.frontends.map(({ id }) => id)
    )
  ).filter(
    (kit2) => matchesModelFamilies(
      query.modelFamilies ?? [],
      kit2.modelFamilies?.map(({ id }) => id) ?? []
    )
  ).filter(
    (kit2) => matchesAny(
      query.purposes,
      kit2.purposes.map(({ id }) => id)
    )
  ).filter(
    (kit2) => !query.includesProjectId || kit2.components.some(
      ({ projectId }) => projectId === query.includesProjectId
    )
  ).filter(
    (kit2) => kit2.components.length >= query.minProjects && kit2.components.length <= query.maxProjects
  ).filter(
    (kit2) => !query.allComponentsAvailable || kit2.flaggedProjectCount === 0
  ).sort(kitComparator(query.sort, effectiveSearchResults));
}
function countKitsForFilter(kits, query, group, value, search = "") {
  const candidateQuery = {
    ...query,
    [group]: [value]
  };
  return selectKits(kits, candidateQuery, search).length;
}

// vendor/tavernary-core/src/catalog-tag-filter.ts
function matchesSelectedTags(selectedIds, projectTagIds, vocabulary) {
  if (selectedIds.length === 0) return true;
  const vocabularyById = new Map(vocabulary.map((tag2) => [tag2.id, tag2]));
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

// vendor/tavernary-core/src/activity.ts
var DAY_MS = 24 * 60 * 60 * 1e3;
function isWithinDays(timestamp, now, days) {
  if (timestamp === null) {
    return false;
  }
  const age = new Date(now).getTime() - new Date(timestamp).getTime();
  return Number.isFinite(age) && age >= 0 && age <= days * DAY_MS;
}
function releaseTimestamp(project2) {
  return project2.latestReleaseAt ?? project2.preset?.publishedAt ?? null;
}

// vendor/tavernary-core/src/catalog-license.ts
function licenseFilter(project2) {
  if (project2.license.status === "osi-approved") {
    return "open-source";
  }
  return project2.license.status;
}

// vendor/tavernary-core/src/project-selectors.ts
var collator2 = new Intl.Collator("en", { sensitivity: "base" });
function matchesAny2(selected, values) {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}
function matchesDevelopment(project2, selected, now) {
  return selected.length === 0 || selected.some((filter) => {
    if (filter === "active-month") {
      return isWithinDays(project2.activity.latestSourceActivityAt, now, 30);
    }
    if (filter === "new-release") {
      return isWithinDays(releaseTimestamp(project2), now, 30);
    }
    return project2.activity.dormant;
  });
}
function matchesView(project2, view, now) {
  if (view === "active") {
    return isWithinDays(project2.activity.latestSourceActivityAt, now, 30);
  }
  if (view === "new") {
    return project2.catalogCohort === "standard" && isWithinDays(project2.catalogedAt, now, 30);
  }
  if (view === "released") {
    return isWithinDays(releaseTimestamp(project2), now, 30);
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
function activityRecency(project2) {
  const sourceTime = project2.activity.latestSourceActivityAt ? new Date(project2.activity.latestSourceActivityAt).getTime() : Number.NEGATIVE_INFINITY;
  const releasedAt = releaseTimestamp(project2);
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
        ({ tags }) => tags.map((tag2) => [
          tag2.id,
          { ...tag2, aliases: [], applicable_kinds: [] }
        ])
      )
    ).values()
  ];
  const selected = projects.filter(
    (project2) => (!search || matchingProjectIds.has(project2.id)) && (!query.category || (query.category === "frontend" || query.category === "preset" ? project2.kind === query.category : project2.primaryFunction === query.category)) && matchesAny2(
      query.frontends,
      project2.frontends.map(({ id }) => id)
    ) && matchesAny2(query.kinds, [project2.kind]) && matchesSelectedTags(
      query.tags,
      project2.tags.map(({ id }) => id),
      tagVocabulary
    ) && matchesModelFamilies(
      query.modelFamilies ?? [],
      project2.preset?.modelFamilies?.map(({ id }) => id) ?? []
    ) && matchesCompletionFormats(
      query.completionFormats ?? [],
      project2.preset?.completionFormats?.map(({ id }) => id) ?? []
    ) && matchesDevelopment(project2, query.development, context.now) && matchesAny2(query.licenses, [licenseFilter(project2)]) && matchesView(project2, query.view, context.now)
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
function fetchCatalog(fetchImpl, { signal } = {}) {
  return fetchImpl(CATALOG_URL, {
    method: "GET",
    cache: "no-cache",
    credentials: "omit",
    headers: {
      Accept: "application/json"
    },
    signal
  });
}

// src/integrity/sha256.ts
var INITIAL_HASH = [
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
];
var ROUND_CONSTANTS = [
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
];
function rotateRight(value, amount) {
  return value >>> amount | value << 32 - amount;
}
function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const message2 = new Uint8Array(paddedLength);
  message2.set(bytes);
  message2[bytes.length] = 128;
  const bitLength = bytes.length * 8;
  const messageView = new DataView(message2.buffer);
  messageView.setUint32(paddedLength - 8, Math.floor(bitLength / 4294967296), false);
  messageView.setUint32(paddedLength - 4, bitLength >>> 0, false);
  const hash = Array.from(INITIAL_HASH);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < message2.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = messageView.getUint32(offset + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const prior = words[index - 15];
      const recent = words[index - 2];
      const sigma0 = rotateRight(prior, 7) ^ rotateRight(prior, 18) ^ prior >>> 3;
      const sigma1 = rotateRight(recent, 17) ^ rotateRight(recent, 19) ^ recent >>> 10;
      words[index] = words[index - 16] + sigma0 + words[index - 7] + sigma1 >>> 0;
    }
    let [a3, b2, c3, d3, e3, f4, g4, h3] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e3, 6) ^ rotateRight(e3, 11) ^ rotateRight(e3, 25);
      const choice = e3 & f4 ^ ~e3 & g4;
      const temp1 = h3 + sum1 + choice + ROUND_CONSTANTS[index] + words[index] >>> 0;
      const sum0 = rotateRight(a3, 2) ^ rotateRight(a3, 13) ^ rotateRight(a3, 22);
      const majority = a3 & b2 ^ a3 & c3 ^ b2 & c3;
      const temp2 = sum0 + majority >>> 0;
      h3 = g4;
      g4 = f4;
      f4 = e3;
      e3 = d3 + temp1 >>> 0;
      d3 = c3;
      c3 = b2;
      b2 = a3;
      a3 = temp1 + temp2 >>> 0;
    }
    hash[0] = hash[0] + a3 >>> 0;
    hash[1] = hash[1] + b2 >>> 0;
    hash[2] = hash[2] + c3 >>> 0;
    hash[3] = hash[3] + d3 >>> 0;
    hash[4] = hash[4] + e3 >>> 0;
    hash[5] = hash[5] + f4 >>> 0;
    hash[6] = hash[6] + g4 >>> 0;
    hash[7] = hash[7] + h3 >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, "0")).join("");
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
async function stableSha256(body) {
  return sha256Hex(body);
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
  #lastCheckedAt = null;
  #opened = false;
  #opening = null;
  #refreshing = null;
  constructor(options) {
    this.#cache = options.cache;
    this.#fetch = options.fetch ?? fetch;
    this.#now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
    this.#sha256 = options.sha256 ?? stableSha256;
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
        const bodySha256 = await this.#sha256(activeRecord.body);
        if (bodySha256 !== activeRecord.bodySha256) {
          throw new Error("Cached catalog digest does not match its body.");
        }
        this.#catalog = parseCatalogV7(JSON.parse(activeRecord.body));
        this.#publish({
          state: "ready-stale",
          canMutate: true,
          checkedAt: this.#lastCheckedAt,
          catalog: this.#catalog
        });
      } catch {
        this.#catalog = null;
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
      const response = await fetchCatalog(this.#fetch);
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

// src/catalog/installed-view-model.ts
function toInstalledSectionViewModel(inventory) {
  return [
    {
      id: "managed",
      title: "Managed by Companion",
      rows: inventory.managed.map(({ project: project2, extension }) => ({
        id: project2.id,
        name: project2.name,
        detail: extension.folderName,
        internalName: extension.internalName,
        canonicalUrl: project2.canonicalUrl,
        enabled: extension.enabled,
        toggleable: canToggle(project2.id, extension.internalName),
        action: installedAction(extension.type, "Managed by Companion"),
        ...selectionEligibility(project2.id, extension.internalName, extension.type)
      }))
    },
    {
      id: "external",
      title: "Installed outside Companion",
      rows: inventory.external.map(({ project: project2, extension }) => ({
        id: project2.id,
        name: project2.name,
        detail: extension.folderName,
        internalName: extension.internalName,
        canonicalUrl: project2.canonicalUrl,
        enabled: extension.enabled,
        toggleable: canToggle(project2.id, extension.internalName),
        action: installedAction(extension.type, "Installed outside Companion"),
        ...selectionEligibility(project2.id, extension.internalName, extension.type)
      }))
    },
    {
      id: "ambiguous",
      title: "Multiple matches in current catalog",
      rows: unknownRows(
        inventory.unknown.filter(({ reason }) => reason === "ambiguous-folder"),
        "Multiple Tavernary projects use this extension folder, and Companion could not verify which repository is installed."
      )
    },
    {
      id: "unknown",
      title: "Not found in current catalog",
      rows: unknownRows(
        inventory.unknown.filter(({ reason }) => reason === "folder-not-in-catalog"),
        "No Tavernary project uses this extension folder."
      )
    },
    {
      id: "attention",
      title: "Previously managed",
      rows: inventory.missingManaged.map(({ record: record2, project: project2 }) => ({
        id: record2.projectId,
        name: project2?.name ?? record2.folderName,
        detail: "Previously managed by Companion, but no longer installed in this SillyTavern profile.",
        internalName: record2.internalName,
        canonicalUrl: project2?.canonicalUrl ?? null,
        enabled: null,
        toggleable: false,
        action: {
          kind: "manage-in-sillytavern",
          label: "Manage in SillyTavern",
          reason: "Reconcile the missing extension in SillyTavern."
        },
        selectionEligible: false,
        selectionDisabledReason: "This extension is no longer installed."
      }))
    }
  ];
}
function unknownRows(entries, reason) {
  return entries.map(({ extension }) => ({
    id: extension.internalName,
    name: typeof extension.manifest?.display_name === "string" ? extension.manifest.display_name : extension.folderName,
    detail: extension.internalName,
    internalName: extension.internalName,
    canonicalUrl: null,
    enabled: extension.enabled,
    toggleable: canToggle(extension.internalName, extension.internalName),
    action: {
      kind: "manage-in-sillytavern",
      label: "Manage in SillyTavern",
      reason
    },
    selectionEligible: false,
    selectionDisabledReason: "No unambiguous Tavernary project identity."
  }));
}
function selectionEligibility(projectId, internalName, extensionType) {
  if (!canToggle(projectId, internalName)) {
    return {
      selectionEligible: false,
      selectionDisabledReason: "Tavernary Companion cannot manage itself."
    };
  }
  if (extensionType === "global") {
    return {
      selectionEligible: false,
      selectionDisabledReason: "Global extensions are managed by SillyTavern."
    };
  }
  return { selectionEligible: true, selectionDisabledReason: null };
}
function canToggle(projectId, internalName) {
  return projectId !== COMPANION_PROJECT_ID && !/(?:^|[/_-])tavernary[ _-]?companion(?:$|[/_-])/iu.test(internalName);
}
function installedAction(extensionType, uninstallReason) {
  return extensionType === "global" ? {
    kind: "manage-in-sillytavern",
    label: "Manage in SillyTavern",
    reason: "Global extensions are managed by SillyTavern."
  } : { kind: "uninstall", label: "Uninstall", reason: uninstallReason };
}

// src/lifecycle/install-target.ts
var legacyInstallProvenance = () => ({
  targetKind: "legacy-unknown",
  requestedSha: null,
  installedSha: null,
  catalogGeneratedAt: null,
  tavernKeeperReportId: null
});
function isFullCommitSha(value) {
  return /^[0-9a-f]{40}$/i.test(value);
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
    installedBy,
    provenance
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
      installedBy,
      provenance: structuredClone(provenance)
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
    result2[projectId] = {
      ...structuredClone(candidate),
      provenance: hasOwn(candidate, "provenance") ? structuredClone(candidate.provenance) : legacyInstallProvenance()
    };
  }
  delete result2[COMPANION_PROJECT_ID];
  return result2;
}
function isManagedRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record2 = value;
  return typeof record2.projectId === "string" && typeof record2.internalName === "string" && typeof record2.folderName === "string" && typeof record2.installedAt === "string" && (record2.installedBy === "individual" || record2.installedBy === "kit") && (!hasOwn(record2, "provenance") || isManagedInstallProvenance(record2.provenance));
}
function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
function isManagedInstallProvenance(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const provenance = value;
  if (provenance.targetKind === "legacy-unknown") {
    return provenance.requestedSha === null && provenance.installedSha === null && provenance.catalogGeneratedAt === null && provenance.tavernKeeperReportId === null;
  }
  return (provenance.targetKind === "checked" || provenance.targetKind === "newest") && (typeof provenance.requestedSha === "string" || provenance.requestedSha === null) && (typeof provenance.installedSha === "string" || provenance.installedSha === null) && typeof provenance.catalogGeneratedAt === "string" && (typeof provenance.tavernKeeperReportId === "string" || provenance.tavernKeeperReportId === null);
}

// src/catalog/project-view-model.ts
function installedState(projectId, inventory) {
  const managed = inventory.managed.find(({ project: project2 }) => project2.id === projectId);
  if (managed) {
    return { ownership: "managed", removable: managed.extension.type === "local" };
  }
  const external = inventory.external.find(({ project: project2 }) => project2.id === projectId);
  if (external) {
    return { ownership: "external", removable: external.extension.type === "local" };
  }
  return { ownership: "absent", removable: false };
}
function actionFor(project2, context, installed) {
  if (project2.id === COMPANION_PROJECT_ID) {
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
  if (installed.ownership !== "absent" && !installed.removable) {
    return {
      kind: "manage-in-sillytavern",
      label: "Manage in SillyTavern",
      reason: "Global extensions are managed by SillyTavern."
    };
  }
  if (installed.ownership !== "absent") {
    return {
      kind: "uninstall",
      label: "Uninstall",
      reason: installed.ownership === "managed" ? "Managed by Companion" : "Installed outside Companion"
    };
  }
  if (project2.kind === "preset") {
    return {
      kind: "view-project",
      label: "View project",
      reason: "Preset installation is not available in V1"
    };
  }
  if (project2.kind !== "extension" || !project2.frontends.some(({ id }) => id === "sillytavern")) {
    return {
      kind: "view-project",
      label: "View project",
      reason: "Browse-only in Companion"
    };
  }
  try {
    if (!project2.install) throw new Error("missing contract");
    parseInstallContract(project2.install);
  } catch {
    return {
      kind: "view-project",
      label: "View project",
      reason: "Install contract unavailable"
    };
  }
  return { kind: "install", label: "Install", reason: null };
}
function toProjectCardViewModel(project2, context) {
  const installed = installedState(project2.id, context.inventory);
  const now = context.now ?? project2.refreshedAt ?? project2.catalogedAt;
  const primaryFunction = primaryFunctionLabel(project2.primaryFunction);
  const latestSourceActivityLabel = relativeTime(project2.activity.latestSourceActivityAt, now);
  const repositorySizeLabel = formatRepositorySize(project2.repositorySizeKb);
  const presetVersion = project2.preset?.version ? formatVersion(project2.preset.version) : null;
  const presetPublishedAt = project2.preset?.publishedAt ?? null;
  const presetSize = formatFileSize(project2.preset?.artifactSizeBytes ?? null);
  return {
    id: project2.id,
    name: project2.name,
    displayName: projectDisplayName(project2.name),
    canonicalUrl: project2.canonicalUrl,
    summary: project2.summary,
    kind: project2.kind,
    frontends: project2.frontends.map(({ label: label2 }) => label2),
    tags: project2.tags.map(({ label: label2 }) => label2),
    tagChips: project2.tags.map(({ label: label2, facet }) => ({ label: label2, facet })),
    licenseLabel: project2.license.label,
    licenseStatus: project2.license.status,
    attributionLabel: project2.attribution ? attributionByline(project2.attribution) : null,
    primaryFunctionId: project2.primaryFunction,
    primaryFunction,
    activity: {
      latestSourceActivityAt: project2.activity.latestSourceActivityAt,
      latestSourceActivityLabel,
      latestSourceActivityFreshness: freshnessPercent(project2.activity.latestSourceActivityAt, now),
      activeWeeks12: project2.activity.activeWeeks12,
      weeklyActivity: project2.activity.weeklyActivity,
      evidenceStatus: project2.activity.evidenceStatus ?? "degraded",
      dormant: project2.activity.dormant
    },
    communityAggregate: project2.community?.aggregate ?? null,
    repositorySizeLabel,
    preset: project2.preset ? {
      versionLabel: presetVersion,
      publishedLabel: project2.preset.publishedAt ? `Published ${relativeTime(project2.preset.publishedAt, now)}` : null,
      sizeLabel: presetSize,
      modelFamilies: project2.preset.modelFamilies.map(({ label: label2 }) => label2),
      completionFormats: project2.preset.completionFormats.map(({ label: label2 }) => label2)
    } : null,
    tooltips: {
      type: typeTooltip(primaryFunction, project2.kind),
      activity: activityTooltip(project2),
      latestSourceActivity: latestSourceActivityTooltip(project2, latestSourceActivityLabel),
      community: project2.community ? `${project2.community.aggregate} total: ${project2.community.stars} stars, ${project2.community.forks} forks, ${project2.community.watchers} watchers` : null,
      repositorySize: repositorySizeLabel ? `${repositorySizeLabel.replace(" repo", "")} repository` : null,
      attribution: project2.attribution ? attributionTooltip(project2.attribution) : null,
      license: licenseTooltip(project2),
      frontends: project2.frontends.map(({ description }) => description),
      tags: project2.tags.map(({ description }) => description),
      preset: project2.preset ? {
        version: presetVersion ? `Preset version ${presetVersion}` : null,
        published: presetPublishedAt ? `Published ${formatDate(presetPublishedAt)}` : null,
        size: presetSize,
        modelFamilies: project2.preset.modelFamilies.map(({ description }) => description),
        completionFormats: project2.preset.completionFormats.map(
          ({ description }) => description
        )
      } : null
    },
    tavernKeeper: project2.tavernKeeper,
    installed: installed.ownership !== "absent",
    ownership: installed.ownership,
    kitSelectable: project2.id !== COMPANION_PROJECT_ID && project2.kind === "extension" && project2.frontends.some(({ id }) => id === "sillytavern") && Boolean(project2.install),
    action: actionFor(project2, context, installed)
  };
}
function typeTooltip(primaryFunction, kind) {
  if (kind === "frontend" && primaryFunction.toLocaleLowerCase().startsWith("frontend")) {
    return "Frontend";
  }
  return `${primaryFunction} ${{
    frontend: "Frontend",
    extension: "Extension",
    preset: "System Preset"
  }[kind]}`;
}
function licenseTooltip(project2) {
  if (project2.license.status === "osi-approved") {
    return `${project2.license.label} is OSI-approved`;
  }
  if (project2.license.status === "proprietary") return "Proprietary license";
  if (project2.license.status === "pending") return "License pending verification";
  return "No license detected";
}
function activityTooltip(project2) {
  const activeWeeks = project2.activity.activeWeeks12;
  if (activeWeeks === null || project2.activity.weeklyActivity === null)
    return "Activity unavailable";
  const summary = project2.activity.evidenceStatus === "provisional" ? `Approximate activity in ${activeWeeks} of the last 12 weeks; baseline pending` : `Source activity in ${activeWeeks} of the last 12 weeks`;
  return project2.activity.evidenceStatus === "degraded" ? `${summary}; activity evidence is incomplete` : summary;
}
function latestSourceActivityTooltip(project2, relative) {
  if (project2.activity.latestSourceActivityAt && relative) {
    return `Last source activity ${formatDate(project2.activity.latestSourceActivityAt)} (${relative})`;
  }
  if (project2.activity.activeWeeks12 === null || project2.activity.weeklyActivity === null) {
    return null;
  }
  if (project2.activity.evidenceStatus === "complete") {
    return "No source activity in the last 12 weeks";
  }
  if (project2.activity.evidenceStatus === "provisional") {
    return "Source activity baseline pending";
  }
  return "Source activity evidence incomplete";
}
function attributionByline(attribution) {
  const count = attribution.humanContributorCount;
  if (count === 0) return `by ${attribution.owner.login}`;
  return `by ${attribution.owner.login}, plus ${count} ${count === 1 ? "contributor" : "contributors"}`;
}
function attributionTooltip(attribution) {
  const provider = attribution.owner.provider === "github" ? "GitHub" : "Codeberg";
  const parts = [`${provider} owner: ${attribution.owner.login}`];
  const humans = attribution.contributors.filter(({ botOrAi }) => !botOrAi).map(({ login }) => login);
  const botsOrAi = attribution.contributors.filter(({ botOrAi }) => botOrAi).map(({ login }) => login);
  if (attribution.status === "pending") {
    parts.push("Contributor data pending");
  } else {
    if (humans.length > 0) parts.push(`Contributors: ${humans.join(", ")}`);
    if (botsOrAi.length > 0) parts.push(`Bots/AI: ${botsOrAi.join(", ")}`);
    if (attribution.status === "stale") parts.push("Contributor data stale");
    else if (attribution.status === "partial") parts.push("Contributor history still scanning");
  }
  return parts.join(" \xB7 ");
}
function projectDisplayName(name) {
  const withoutPrefix = name.replace(/^sillytavern[\s_-]+/i, "");
  return withoutPrefix || name;
}
function relativeTime(timestamp, now) {
  if (!timestamp) return null;
  const days = daysSince(timestamp, now);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
function daysSince(timestamp, now) {
  const dayMs = 24 * 60 * 60 * 1e3;
  return Math.max(0, Math.floor((new Date(now).getTime() - new Date(timestamp).getTime()) / dayMs));
}
function freshnessPercent(timestamp, now) {
  if (!timestamp) return 0;
  return Math.max(0, Math.min(100, 100 - daysSince(timestamp, now) / 30 * 100));
}
function formatRepositorySize(kilobytes) {
  if (kilobytes === null) return null;
  return kilobytes >= 1024 ? `${(kilobytes / 1024).toFixed(1)} MB repo` : `${kilobytes} KB repo`;
}
function formatFileSize(bytes) {
  if (bytes === null) return null;
  return bytes >= 1024 ? `${Math.round(bytes / 1024)} KB file` : `${bytes} B file`;
}
function formatVersion(version) {
  return /^\d+(?:\.\d+)*$/.test(version) ? `v${version}` : version;
}
function formatDate(timestamp) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(new Date(timestamp));
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
    const now = catalog ? this.#now() : "";
    let projects = [];
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
        { now, tagVocabulary: catalog.tagVocabulary },
        searchResults
      ).map(
        (project2) => toProjectCardViewModel(project2, {
          snapshot: this.#snapshot,
          inventory: this.#inventory,
          now
        })
      );
    }
    return {
      query: structuredClone(this.#query),
      catalogState: this.#snapshot.state,
      projects,
      installedSections: toInstalledSectionViewModel(this.#inventory),
      facets: catalog ? {
        frontends: orderFrontendOptionsByPopularity(
          countedLabels(catalog.projects.map(({ frontends }) => frontends)),
          catalog.projects
        ),
        tags: catalog.tagVocabulary.map(({ id, label: label2, description, facet }) => ({
          id,
          label: label2,
          description,
          facet,
          count: catalog.projects.filter(
            (project2) => project2.tags.some((tag2) => tag2.id === id)
          ).length
        })).sort((left, right) => left.label.localeCompare(right.label)),
        modelFamilies: countedLabels(
          catalog.projects.map(({ preset }) => preset?.modelFamilies ?? [])
        ),
        completionFormats: countedLabels(
          catalog.projects.map(({ preset }) => preset?.completionFormats ?? [])
        ),
        kinds: [
          { id: "frontend", label: "Frontend" },
          { id: "extension", label: "Extension" },
          { id: "preset", label: "System Preset" }
        ].map((option) => ({
          ...option,
          count: catalog.projects.filter((project2) => project2.kind === option.id).length
        })),
        development: [
          {
            id: "active-month",
            label: "Active this month",
            count: catalog.projects.filter(
              (project2) => isWithinDays2(project2.activity.latestSourceActivityAt, now, 30)
            ).length
          },
          {
            id: "new-release",
            label: "Recently released",
            count: catalog.projects.filter(
              (project2) => isWithinDays2(
                project2.latestReleaseAt ?? project2.preset?.publishedAt ?? null,
                now,
                30
              )
            ).length
          },
          {
            id: "dormant",
            label: "Dormant",
            count: catalog.projects.filter((project2) => project2.activity.dormant).length
          }
        ],
        licenses: [
          { id: "open-source", label: "Open source", status: "osi-approved" },
          { id: "proprietary", label: "Proprietary", status: "proprietary" },
          { id: "pending", label: "Pending verification", status: "pending" },
          { id: "missing", label: "Missing license", status: "missing" }
        ].map(({ status, ...option }) => ({
          ...option,
          count: catalog.projects.filter((project2) => project2.license.status === status).length
        }))
      } : {
        frontends: [],
        tags: [],
        modelFamilies: [],
        completionFormats: [],
        kinds: [],
        development: [],
        licenses: []
      }
    };
  }
  #notify() {
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
};
function isWithinDays2(timestamp, now, days) {
  if (!timestamp) return false;
  const age = Date.parse(now) - Date.parse(timestamp);
  return Number.isFinite(age) && age >= 0 && age <= days * 24 * 60 * 60 * 1e3;
}
function countedLabels(projectLabels) {
  const options = /* @__PURE__ */ new Map();
  for (const labels of projectLabels) {
    const seen = /* @__PURE__ */ new Set();
    for (const { id, label: label2 } of labels) {
      if (seen.has(id)) continue;
      seen.add(id);
      const current = options.get(id);
      options.set(id, { id, label: label2, count: (current?.count ?? 0) + 1 });
    }
  }
  return [...options.values()].sort((left, right) => left.label.localeCompare(right.label));
}
function orderFrontendOptionsByPopularity(options, projects) {
  const scores = /* @__PURE__ */ new Map();
  for (const project2 of projects) {
    if (project2.kind !== "frontend" || project2.community === null) continue;
    for (const frontend of project2.frontends) {
      const current = scores.get(frontend.id);
      if (current === void 0 || project2.community.aggregate > current) {
        scores.set(frontend.id, project2.community.aggregate);
      }
    }
  }
  return [...options].sort((left, right) => {
    const leftScore = scores.get(left.id);
    const rightScore = scores.get(right.id);
    if (leftScore !== void 0 && rightScore !== void 0) {
      const scoreOrder = rightScore - leftScore;
      if (scoreOrder !== 0) return scoreOrder;
    } else if (leftScore !== void 0) {
      return -1;
    } else if (rightScore !== void 0) {
      return 1;
    }
    return left.label.localeCompare(right.label) || left.id.localeCompare(right.id);
  });
}
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

// src/updates/update-targets.ts
function bindUpdateSelection({
  project: project2,
  catalogGeneratedAt,
  internalName,
  installedSha,
  target
}) {
  if (!project2.install) throw new Error("This project cannot be updated.");
  return {
    target: structuredClone(target),
    binding: {
      projectId: project2.id,
      catalogGeneratedAt,
      internalName,
      installedSha,
      repositoryUrl: project2.install.repositoryUrl,
      branch: project2.install.branch,
      requestedSha: target.requestedSha
    }
  };
}
function matchesUpdateBinding(selection, current) {
  return selection.binding.requestedSha === selection.target.requestedSha && selection.binding.installedSha === current.installedSha && selection.binding.catalogGeneratedAt === current.catalogGeneratedAt && selection.binding.projectId === current.project.id && selection.binding.internalName === current.internalName && current.project.install !== null && sameRepositoryUrl(selection.binding.repositoryUrl, current.project.install.repositoryUrl) && selection.binding.branch === current.project.install.branch;
}
function deriveUpdateAvailability({
  project: project2,
  inspection
}) {
  if (!project2.install || !sameRepositoryUrl(project2.install.repositoryUrl, inspection.remoteUrl)) {
    return {
      kind: "attention",
      reason: "This extension was installed from a different repository than Tavernary lists. Review it in SillyTavern or reinstall the Tavernary version."
    };
  }
  if (inspection.worktreeClean === false) {
    return {
      kind: "attention",
      reason: "This extension has local file changes, so Companion won\u2019t overwrite them. Review those changes, then check again."
    };
  }
  if (!inspection.branchMatches) {
    const expectedBranch = project2.install.branch ?? "the repository\u2019s default branch";
    return {
      kind: "attention",
      reason: `This extension is on the ${inspection.branch} branch, but Tavernary tracks ${expectedBranch}. Switch branches in SillyTavern, then check again.`
    };
  }
  if (inspection.newestRelationship === "diverged") {
    return {
      kind: "attention",
      reason: "This extension and the Tavernary version each contain different commits, so Companion won\u2019t merge them. Resolve the branch in SillyTavern, then check again."
    };
  }
  if (inspection.newestRelationship === "ahead") {
    return {
      kind: "attention",
      reason: "This extension contains commits that aren\u2019t in the Tavernary version, so Companion won\u2019t replace them. Review it in SillyTavern, then check again."
    };
  }
  const targets = [];
  const report2 = project2.tavernKeeper?.report;
  if (report2 && inspection.exactUpdateSupported && inspection.candidateRelationships[report2.scannedSha.toLowerCase()] === "behind") {
    targets.push({
      kind: "checked",
      requestedSha: report2.scannedSha.toLowerCase(),
      checkedAt: report2.scannedAt,
      reportId: report2.reportId,
      reportUrl: report2.reportUrl
    });
  }
  if (inspection.newestRelationship === "behind" && !targets.some(
    ({ requestedSha }) => inspection.newestSha !== null && requestedSha === inspection.newestSha.toLowerCase()
  )) {
    targets.push({
      kind: "newest",
      requestedSha: inspection.exactUpdateSupported && inspection.newestSha ? inspection.newestSha.toLowerCase() : null,
      resolvedAt: inspection.exactUpdateSupported ? (/* @__PURE__ */ new Date()).toISOString() : null
    });
  }
  const alreadyScanned = report2 && inspection.candidateRelationships[report2.scannedSha.toLowerCase()] === "equal";
  return targets.length === 0 ? inspection.exactUpdateSupported ? { kind: "current" } : { kind: "current", native: true } : {
    kind: "available",
    notice: alreadyScanned ? "You already have the latest scanned version." : null,
    targets
  };
}
function sameRepositoryUrl(left, right) {
  return repositoryIdentity(left) !== null && repositoryIdentity(left) === repositoryIdentity(right);
}
function repositoryIdentity(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const path = url.pathname.replace(/\/+$/u, "").replace(/\.git$/iu, "");
  if (!path) return null;
  return `${url.protocol}//${url.host.toLowerCase()}${path}`;
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
  const projectsById = new Map(projects.map((project2) => [project2.id, project2]));
  const projectsByFolder = /* @__PURE__ */ new Map();
  for (const project2 of projects) {
    if (!project2.install || project2.kind !== "extension" || !project2.frontends.some(({ id }) => id === "sillytavern")) {
      continue;
    }
    const identity = folderIdentity2(project2.install.folderName);
    const matches = projectsByFolder.get(identity) ?? [];
    matches.push(project2);
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
    let matches = projectsByFolder.get(folderIdentity2(extension.folderName)) ?? [];
    const repositoryUrl = extension.repositoryUrl;
    if (matches.length > 1 && repositoryUrl) {
      const repositoryMatches = matches.filter(
        (project3) => project3.install && sameRepositoryUrl(project3.install.repositoryUrl, repositoryUrl)
      );
      if (repositoryMatches.length === 1) matches = repositoryMatches;
    }
    if (matches.length !== 1) {
      snapshot.unknown.push({
        extension: structuredClone(extension),
        reason: matches.length > 1 ? "ambiguous-folder" : "folder-not-in-catalog"
      });
      continue;
    }
    const project2 = matches[0];
    const record2 = managed[project2.id];
    if (project2.id !== COMPANION_PROJECT_ID && record2 && record2.projectId === project2.id && record2.internalName === extension.internalName && folderIdentity2(record2.folderName) === folderIdentity2(extension.folderName)) {
      snapshot.managed.push({
        project: project2,
        extension: structuredClone(extension),
        record: structuredClone(record2)
      });
      representedManagedIds.add(project2.id);
    } else {
      snapshot.external.push({ project: project2, extension: structuredClone(extension) });
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
async function reconcileHostInventory({
  projects,
  host,
  managed,
  hostExtensions
}) {
  const extensions = hostExtensions ? hostExtensions.map((extension) => structuredClone(extension)) : await host.discover();
  const initial = reconcileInventory({ projects, hostExtensions: extensions, managed });
  const ambiguousIdentities = new Set(
    initial.unknown.filter(({ reason }) => reason === "ambiguous-folder").map(({ extension }) => extensionIdentity2(extension))
  );
  if (ambiguousIdentities.size === 0) return initial;
  const enriched = await Promise.all(
    extensions.map(async (extension) => {
      if (!ambiguousIdentities.has(extensionIdentity2(extension))) return extension;
      try {
        const repositoryUrl = await host.readExtensionRepositoryUrl({
          internalName: extension.internalName,
          type: extension.type
        });
        return repositoryUrl ? { ...extension, repositoryUrl } : extension;
      } catch {
        return extension;
      }
    })
  );
  return reconcileInventory({ projects, hostExtensions: enriched, managed });
}
function extensionIdentity2(extension) {
  return `${extension.type}:${extension.internalName}`;
}

// src/inventory/missing-managed-record.ts
async function forgetMissingManagedRecord({
  projectId,
  inventory,
  store
}) {
  const missing = inventory.missingManaged.find(({ record: record2 }) => record2.projectId === projectId);
  if (!missing) return false;
  const current = normalizeManagedExtensionMap(store.read().managedExtensions)[projectId];
  if (!current || current.internalName !== missing.record.internalName || current.folderName !== missing.record.folderName || current.installedAt !== missing.record.installedAt) {
    return false;
  }
  let removed = false;
  await store.update((draft) => {
    const registry = new ManagedRegistry(normalizeManagedExtensionMap(draft.managedExtensions));
    const latest = registry.read()[projectId];
    if (!latest || latest.internalName !== missing.record.internalName || latest.folderName !== missing.record.folderName || latest.installedAt !== missing.record.installedAt) {
      return;
    }
    removed = registry.remove(projectId);
    draft.managedExtensions = registry.read();
  });
  return removed;
}

// src/runtime-id.ts
function createRuntimeId() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// src/trust/trust-copy.ts
var CURRENT_ASSESSMENT_WARNING = "TavernKeeper found concerns in this version. You can view the check before choosing whether to install it.";
var STALE_ASSESSMENT_WARNING = "TavernKeeper checked an older version of this project. The newest changes have not been checked yet.";
var UNSANDBOXED_CODE_DISCLOSURE = "These extensions are made by third parties. Tavernary lists them but does not control them. TavernKeeper checks one version and may miss problems. Review a project before installing it.";

// src/trust/trust-policy.ts
function selectTrustPrompts({
  trustAcknowledgedAt,
  target,
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
    const stale = target.requestedSha === null || assessment.scannedSha === null || target.requestedSha.toLowerCase() !== assessment.scannedSha.toLowerCase();
    prompts.push({
      kind: "assessment-warning",
      severity: assessment.riskLevel,
      stale,
      reportUrl: assessment.reportUrl,
      reviewDisabledReason: assessment.reportUrl ? null : "No TavernKeeper check link is available.",
      copy: stale ? STALE_ASSESSMENT_WARNING : CURRENT_ASSESSMENT_WARNING
    });
  }
  return prompts;
}

// src/lifecycle/lifecycle-policy.ts
function evaluateLifecycle({
  operation,
  project: project2,
  context
}) {
  if (project2?.id === COMPANION_PROJECT_ID) {
    return { kind: "rejected", reason: "self-protected" };
  }
  if (!project2) return { kind: "rejected", reason: "project-not-found" };
  if (context.operationInProgress) {
    return { kind: "rejected", reason: "operation-in-progress" };
  }
  if (!context.snapshot.canMutate) {
    return { kind: "rejected", reason: "catalog-incompatible" };
  }
  if (!isActionableExtension(project2)) {
    return { kind: "rejected", reason: "browse-only-project" };
  }
  const installed = installedEntry(
    project2.id,
    context.inventory.managed,
    context.inventory.external
  );
  if (operation === "install") {
    if (installed) return { kind: "rejected", reason: "already-installed" };
    try {
      if (!project2.install) throw new Error("Install contract is missing.");
      const contract = parseInstallContract(project2.install);
      if (contract.folderName !== project2.install.folderName) {
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
function isActionableExtension(project2) {
  return Boolean(
    project2?.kind === "extension" && project2.frontends.some(({ id }) => id === "sillytavern")
  );
}
function installedEntry(projectId, managed, external) {
  const managedEntry = managed.find(({ project: project2 }) => project2.id === projectId);
  if (managedEntry) return { ownership: "managed", entry: managedEntry };
  const externalEntry = external.find(({ project: project2 }) => project2.id === projectId);
  return externalEntry ? { ownership: "external", entry: externalEntry } : null;
}

// src/lifecycle/install-target-resolver.ts
var LEGACY_CHECKED_DISABLED_REASON = "Update SillyTavern to use the latest scanned version.";
var NEWEST_LOOKUP_FAILED_REASON = "We couldn't find the latest version from the creator. Try again.";
var InstallTargetPreparationError = class extends Error {
  reason;
  constructor(reason, options = {}) {
    super(reason, options);
    this.name = "InstallTargetPreparationError";
    this.reason = reason;
  }
};
var DefaultInstallTargetResolver = class {
  #host;
  #snapshot;
  #now;
  constructor(options) {
    this.#host = options.host;
    this.#snapshot = options.snapshot;
    this.#now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
  }
  async prepare(project2) {
    const currentProject = this.#currentProject(project2.id);
    if (!currentProject?.install) {
      throw new InstallTargetPreparationError("This project is not available for installation.");
    }
    const report2 = checkedTarget(currentProject);
    const capabilities = await this.#host.getInstallCapabilities();
    if (!capabilities.pinnedCommitInstall || !capabilities.remoteRevisionLookup) {
      return legacyChoice(report2, currentProject.tavernKeeper?.currentSha ?? null);
    }
    const newest = await this.#resolveNewest(currentProject);
    if (!report2) return { kind: "single", target: newest };
    if (report2.requestedSha === newest.requestedSha) return { kind: "single", target: report2 };
    return {
      kind: "choose",
      checked: { target: report2, disabledReason: null },
      newest
    };
  }
  #currentProject(projectId) {
    if (!("catalog" in this.#snapshot)) return null;
    return this.#snapshot.catalog.projects.find((candidate) => candidate.id === projectId) ?? null;
  }
  async #resolveNewest(project2) {
    try {
      const resolved = await this.#host.resolveRemoteRevision({
        repositoryUrl: project2.install.repositoryUrl,
        branch: project2.install.branch
      });
      if (!isFullCommitSha(resolved.sha)) {
        throw new Error("The host returned an invalid newest revision.");
      }
      return {
        kind: "newest",
        requestedSha: resolved.sha.toLowerCase(),
        resolvedAt: this.#now()
      };
    } catch (cause) {
      throw new InstallTargetPreparationError(NEWEST_LOOKUP_FAILED_REASON, { cause });
    }
  }
};
function createInstallTargetResolver(options) {
  return new DefaultInstallTargetResolver(options);
}
async function prepareInstallTargetChoice(options) {
  return createInstallTargetResolver(options).prepare(options.project);
}
async function prepareNewestInstallTarget(options) {
  const currentProject = "catalog" in options.snapshot ? options.snapshot.catalog.projects.find(({ id }) => id === options.project.id) ?? null : null;
  if (!currentProject?.install) {
    throw new InstallTargetPreparationError("This project is not available for installation.");
  }
  const capabilities = await options.host.getInstallCapabilities();
  if (!capabilities.pinnedCommitInstall || !capabilities.remoteRevisionLookup) {
    return { kind: "newest", requestedSha: null, resolvedAt: null };
  }
  try {
    const resolved = await options.host.resolveRemoteRevision({
      repositoryUrl: currentProject.install.repositoryUrl,
      branch: currentProject.install.branch
    });
    if (!isFullCommitSha(resolved.sha)) {
      throw new Error("The host returned an invalid newest revision.");
    }
    return {
      kind: "newest",
      requestedSha: resolved.sha.toLowerCase(),
      resolvedAt: (options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString()))()
    };
  } catch (cause) {
    throw new InstallTargetPreparationError(NEWEST_LOOKUP_FAILED_REASON, { cause });
  }
}
function checkedTarget(project2) {
  const report2 = project2.tavernKeeper?.report;
  if (!report2 || !isFullCommitSha(report2.scannedSha) || typeof report2.scannedAt !== "string" || typeof report2.reportId !== "string" || typeof report2.reportUrl !== "string") {
    return null;
  }
  return {
    kind: "checked",
    requestedSha: report2.scannedSha.toLowerCase(),
    checkedAt: report2.scannedAt,
    reportId: report2.reportId,
    reportUrl: report2.reportUrl
  };
}
function legacyChoice(checked, catalogCurrentSha) {
  const newest = {
    kind: "newest",
    requestedSha: null,
    resolvedAt: null
  };
  const normalizedCatalogCurrentSha = typeof catalogCurrentSha === "string" ? catalogCurrentSha.toLowerCase() : null;
  if (!checked || !normalizedCatalogCurrentSha || !isFullCommitSha(normalizedCatalogCurrentSha) || checked.requestedSha === normalizedCatalogCurrentSha) {
    return { kind: "single", target: newest };
  }
  return {
    kind: "choose",
    checked: { target: checked, disabledReason: LEGACY_CHECKED_DISABLED_REASON },
    newest
  };
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
    ...input.installProvenance === void 0 ? {} : { installProvenance: structuredClone(input.installProvenance) },
    ...input.cleanupOutcome === void 0 ? {} : { cleanupOutcome: input.cleanupOutcome },
    ...input.tavernKeeperReportUrl === void 0 ? {} : { tavernKeeperReportUrl: input.tavernKeeperReportUrl },
    steps: order.map((id, index) => ({
      id,
      status: id === input.failedAt ? "failed" : index <= completedIndex ? "succeeded" : input.status === "cancelled" || input.status === "rejected" ? "skipped" : "pending"
    }))
  };
}

// src/lifecycle/removal-impact.ts
function previewRemovalImpact({
  projectId,
  projectName,
  ownership,
  installedKits,
  activeKitId,
  removable,
  kitTitles = {}
}) {
  const references = projectKitReferences(projectId, installedKits, kitTitles);
  const activeKitAffected = references.some(({ id }) => id === activeKitId);
  const kitNames = references.map(({ title }) => title).join(", ");
  const consequence = references.length === 0 ? "" : ` ${kitNames} will become incomplete${activeKitAffected ? ", and the active Kit will show drift" : ""}.`;
  return {
    projectId,
    projectName,
    ownership,
    ownershipLabel: {
      managed: "Managed by Companion",
      external: "Installed outside Companion",
      absent: "Not installed"
    }[ownership],
    installedKits: references,
    activeKitAffected,
    removable,
    confirmation: `Uninstall ${projectName}?${consequence}`
  };
}
function markInstalledKitsIncomplete(installedKits, projectId) {
  const next = structuredClone(installedKits);
  for (const [kitId, candidate] of Object.entries(next)) {
    if (!kitProjectIds(candidate).includes(projectId) || !isRecord3(candidate)) continue;
    const missing = Array.isArray(candidate.missingProjectIds) ? candidate.missingProjectIds.filter((value) => typeof value === "string") : [];
    const installed = Array.isArray(candidate.installedProjectIds) ? candidate.installedProjectIds.filter(
      (value) => typeof value === "string" && value !== projectId
    ) : [];
    next[kitId] = {
      ...candidate,
      status: "incomplete",
      installedProjectIds: installed,
      missingProjectIds: [.../* @__PURE__ */ new Set([...missing, projectId])].sort()
    };
  }
  return next;
}
function projectKitReferences(projectId, installedKits, kitTitles) {
  return Object.entries(installedKits).filter(([, candidate]) => kitProjectIds(candidate).includes(projectId)).map(([id, candidate]) => ({
    id,
    title: kitTitles[id] ?? id,
    installedProjectCount: kitProjectIds(candidate).length
  })).sort((left, right) => left.title.localeCompare(right.title));
}
function kitProjectIds(value) {
  if (!isRecord3(value)) return [];
  const ids = Array.isArray(value.installedProjectIds) ? value.installedProjectIds : [];
  return ids.filter((candidate) => typeof candidate === "string");
}
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/lifecycle/verified-install.ts
var VerifiedInstallError = class extends Error {
  stage;
  subtype;
  cleanupOutcome;
  requestedSha;
  installedSha;
  constructor(input) {
    super(input.message, { cause: input.cause });
    this.name = "VerifiedInstallError";
    this.stage = input.stage;
    this.subtype = input.subtype;
    this.cleanupOutcome = input.cleanupOutcome;
    this.requestedSha = input.requestedSha;
    this.installedSha = input.installedSha;
  }
};
async function executeVerifiedInstall(input) {
  if (!input.project.install) {
    throw new VerifiedInstallError({
      message: "The project has no install contract.",
      stage: "preflight",
      subtype: "invalid-install-contract",
      cleanupOutcome: "not-needed",
      requestedSha: input.target.requestedSha,
      installedSha: null
    });
  }
  const contract = parseInstallContract(input.project.install);
  const capabilities = await input.host.getInstallCapabilities();
  if (input.target.requestedSha !== null && !capabilities.localRevisionLookup) {
    throw new VerifiedInstallError({
      message: "The selected revision cannot be verified on this host.",
      stage: "preflight",
      subtype: "local-revision-lookup-unavailable",
      cleanupOutcome: "not-needed",
      requestedSha: input.target.requestedSha,
      installedSha: null
    });
  }
  await input.host.install({
    repositoryUrl: contract.repositoryUrl,
    branch: contract.branch,
    ...input.target.requestedSha === null ? {} : { commitSha: input.target.requestedSha }
  });
  const installed = exactFolder(await input.host.discover(), contract.folderName);
  if (!installed) {
    throw new VerifiedInstallError({
      message: "The expected installed extension was not found.",
      stage: "post-install-verification",
      subtype: "expected-extension-missing",
      cleanupOutcome: "not-needed",
      requestedSha: input.target.requestedSha,
      installedSha: null
    });
  }
  let installedSha = null;
  if (capabilities.localRevisionLookup) {
    try {
      installedSha = await input.host.readLocalRevision({
        internalName: installed.internalName,
        type: installed.type
      });
    } catch (cause) {
      if (input.target.requestedSha === null) {
        throw new VerifiedInstallError({
          message: "SillyTavern could not report the installed revision.",
          stage: "post-install-verification",
          subtype: "local-revision-read-failed",
          cleanupOutcome: "not-needed",
          requestedSha: null,
          installedSha: null,
          cause
        });
      }
      throw await cleanupMismatch({
        host: input.host,
        extension: installed,
        expectedFolderName: contract.folderName,
        requestedSha: input.target.requestedSha,
        installedSha: null,
        subtype: "local-revision-read-failed",
        message: "SillyTavern could not report the installed revision."
      });
    }
  }
  if (input.target.requestedSha !== null && installedSha !== input.target.requestedSha) {
    throw await cleanupMismatch({
      host: input.host,
      extension: installed,
      expectedFolderName: contract.folderName,
      requestedSha: input.target.requestedSha,
      installedSha,
      subtype: "revision-mismatch",
      message: "The installed revision did not match the selected revision."
    });
  }
  return { extension: installed, installedSha, cleanupOutcome: "not-needed" };
}
async function cleanupMismatch(input) {
  try {
    await input.host.remove({
      internalName: input.extension.internalName,
      type: input.extension.type
    });
    const afterCleanup = await input.host.discover();
    if (hasFolder(afterCleanup, input.expectedFolderName)) {
      throw new Error("The installed extension remained after cleanup.");
    }
    return new VerifiedInstallError({
      message: input.message,
      stage: "post-install-verification",
      subtype: input.subtype,
      cleanupOutcome: "succeeded",
      requestedSha: input.requestedSha,
      installedSha: input.installedSha
    });
  } catch (cause) {
    if (cause instanceof VerifiedInstallError) return cause;
    return new VerifiedInstallError({
      message: `${input.message} Cleanup failed.`,
      stage: "post-install-verification",
      subtype: input.subtype,
      cleanupOutcome: "failed",
      requestedSha: input.requestedSha,
      installedSha: input.installedSha,
      cause
    });
  }
}
function exactFolder(extensions, folderName) {
  const identity = folderIdentity3(folderName);
  const matches = extensions.filter(
    ({ folderName: candidate }) => folderIdentity3(candidate) === identity
  );
  return matches.length === 1 ? matches[0] : null;
}
function hasFolder(extensions, folderName) {
  const identity = folderIdentity3(folderName);
  return extensions.some(({ folderName: candidate }) => folderIdentity3(candidate) === identity);
}
function folderIdentity3(value) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

// src/lifecycle/lifecycle-coordinator.ts
var INSTALL_CHOICE_STALE_REASON = "This install choice is out of date. Choose a version again.";
var InstallPreparationStaleError = class extends Error {
  reason = INSTALL_CHOICE_STALE_REASON;
  constructor() {
    super(INSTALL_CHOICE_STALE_REASON);
    this.name = "InstallPreparationStaleError";
  }
};
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
    this.#createId = options.createId ?? createRuntimeId;
    this.lock = options.lock ?? new OperationLock();
  }
  async prepareInstall(projectId) {
    const snapshot = this.#getSnapshot();
    const project2 = eligibleProjectForPreparation(projectId, snapshot);
    const catalog = "catalog" in snapshot ? snapshot.catalog : null;
    if (!project2 || !catalog) {
      throw new InstallTargetPreparationError("This project is not eligible for installation.");
    }
    const choice = await prepareInstallTargetChoice({
      host: this.#host,
      snapshot,
      project: project2,
      now: this.#now
    });
    return bindInstallTargetChoice(choice, project2, catalog.generatedAt);
  }
  async prepareNewestInstall(projectId) {
    const snapshot = this.#getSnapshot();
    const project2 = eligibleProjectForPreparation(projectId, snapshot);
    const catalog = "catalog" in snapshot ? snapshot.catalog : null;
    if (!project2 || !catalog) {
      throw new InstallTargetPreparationError("This project is not eligible for installation.");
    }
    const target = await prepareNewestInstallTarget({
      host: this.#host,
      snapshot,
      project: project2,
      now: this.#now
    });
    return {
      target,
      binding: createPreparationBinding(project2, target, catalog.generatedAt)
    };
  }
  install(projectId, selection) {
    return this.lock.runExclusive(`install:${projectId}`, async ({ setPhase }) => {
      const selectedTarget = selection.target;
      const startedAt = this.#now();
      const id = this.#createId();
      const snapshot = this.#getSnapshot();
      const catalog = "catalog" in snapshot ? snapshot.catalog : null;
      const project2 = catalog?.projects.find((candidate) => candidate.id === projectId) ?? null;
      if (projectId === COMPANION_PROJECT_ID) {
        return this.#rejected({
          id,
          projectId,
          projectName: project2?.name ?? projectId,
          startedAt
        });
      }
      if (!project2 || !catalog || !matchesPreparationBinding(
        selection,
        eligibleProjectForPreparation(projectId, snapshot),
        catalog.generatedAt
      )) {
        throw new InstallPreparationStaleError();
      }
      setPhase("discovering");
      const before = await this.#host.discover();
      const registry = new ManagedRegistry(
        normalizeManagedExtensionMap(this.#store.read().managedExtensions)
      );
      const inventory = await reconcileHostInventory({
        projects: catalog?.projects ?? [],
        host: this.#host,
        hostExtensions: before,
        managed: registry.read()
      });
      const decision = evaluateLifecycle({
        operation: "install",
        project: project2,
        context: { snapshot, inventory }
      });
      if (decision.kind !== "allowed" || decision.operation !== "install" || !project2 || !catalog) {
        return this.#rejected({
          id,
          projectId,
          projectName: project2?.name ?? projectId,
          startedAt
        });
      }
      const state = this.#store.read();
      const prompts = selectTrustPrompts({
        trustAcknowledgedAt: state.trustAcknowledgedAt,
        target: selectedTarget,
        assessment: project2.tavernKeeper ? {
          riskLevel: project2.tavernKeeper.riskLevel,
          scannedSha: project2.tavernKeeper.report?.scannedSha ?? null,
          reportUrl: project2.tavernKeeper.report?.reportUrl ?? null
        } : null
      });
      let disclosureAccepted = Boolean(state.trustAcknowledgedAt);
      setPhase("awaiting-confirmation");
      for (const prompt of prompts) {
        const approved = await this.#confirm(prompt, project2);
        if (!approved) {
          const receipt2 = createReceipt({
            id,
            kind: "install",
            projectId,
            projectName: project2.name,
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
      const executionBefore = await this.#host.discover();
      const executionSnapshot = this.#getSnapshot();
      const executionCatalog = "catalog" in executionSnapshot ? executionSnapshot.catalog : null;
      const executionProject = executionCatalog?.projects.find((candidate) => candidate.id === projectId) ?? null;
      if (!executionProject || !executionCatalog || !matchesPreparationBinding(
        selection,
        eligibleProjectForPreparation(projectId, executionSnapshot),
        executionCatalog.generatedAt
      )) {
        throw new InstallPreparationStaleError();
      }
      const executionRegistry = new ManagedRegistry(
        normalizeManagedExtensionMap(this.#store.read().managedExtensions)
      );
      const executionInventory = await reconcileHostInventory({
        projects: executionCatalog?.projects ?? [],
        host: this.#host,
        hostExtensions: executionBefore,
        managed: executionRegistry.read()
      });
      const executionDecision = evaluateLifecycle({
        operation: "install",
        project: executionProject,
        context: { snapshot: executionSnapshot, inventory: executionInventory }
      });
      if (executionDecision.kind !== "allowed" || executionDecision.operation !== "install" || !executionProject || !executionCatalog) {
        throw new InstallPreparationStaleError();
      }
      setPhase("host-request");
      let verified;
      try {
        verified = await executeVerifiedInstall({
          host: this.#host,
          project: executionProject,
          target: selectedTarget
        });
      } catch (error) {
        if (error instanceof HostRevisionUnavailableError) {
          if (disclosureAccepted) {
            await this.#persistAcknowledgement().catch(() => void 0);
          }
          throw error;
        }
        if (error instanceof VerifiedInstallError) {
          const failedBeforeMutation = error.stage === "preflight";
          const receipt3 = createReceipt({
            id,
            kind: "install",
            projectId,
            projectName: executionProject.name,
            startedAt,
            finishedAt: this.#now(),
            status: failedBeforeMutation ? "failed" : "verification-failed",
            completedThrough: failedBeforeMutation ? "requested" : "host-accepted",
            failedAt: failedBeforeMutation ? "host-accepted" : "verified",
            safeError: verificationFailureCopy(error),
            reloadRequired: false,
            ...failedBeforeMutation ? {} : {
              installProvenance: createInstallProvenance({
                target: selectedTarget,
                installedSha: error.installedSha,
                catalogGeneratedAt: executionCatalog.generatedAt
              })
            },
            cleanupOutcome: error.cleanupOutcome,
            tavernKeeperReportUrl: selectedTarget.kind === "checked" ? selectedTarget.reportUrl : null
          });
          await this.#persistNonMutation(receipt3, disclosureAccepted ? this.#now() : null);
          return receipt3;
        }
        const receipt2 = createReceipt({
          id,
          kind: "install",
          projectId,
          projectName: executionProject.name,
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
      const provenance = createInstallProvenance({
        target: selectedTarget,
        installedSha: verified.installedSha,
        catalogGeneratedAt: executionCatalog.generatedAt
      });
      executionRegistry.recordInstalled({
        projectId,
        expectedFolderName: executionDecision.contract.folderName,
        extension: verified.extension,
        installedAt: this.#now(),
        installedBy: "individual",
        provenance
      });
      const receipt = createReceipt({
        id,
        kind: "install",
        projectId,
        projectName: executionProject.name,
        startedAt,
        finishedAt: this.#now(),
        status: "succeeded",
        completedThrough: "recorded",
        safeError: null,
        reloadRequired: true,
        installProvenance: provenance,
        cleanupOutcome: verified.cleanupOutcome,
        tavernKeeperReportUrl: selectedTarget.kind === "checked" ? selectedTarget.reportUrl : null
      });
      setPhase("recording");
      try {
        await this.#store.update((draft) => {
          draft.managedExtensions = executionRegistry.read();
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
          projectName: executionProject.name,
          startedAt,
          finishedAt: this.#now(),
          status: "installed-unrecorded",
          completedThrough: "verified",
          failedAt: "recorded",
          safeError: "The extension is installed, but Companion could not record ownership. Reopen Companion to reconcile it.",
          reloadRequired: true,
          installProvenance: provenance,
          cleanupOutcome: verified.cleanupOutcome,
          tavernKeeperReportUrl: selectedTarget.kind === "checked" ? selectedTarget.reportUrl : null
        });
      }
    });
  }
  async previewRemoval(projectId) {
    const snapshot = this.#getSnapshot();
    const catalog = "catalog" in snapshot ? snapshot.catalog : null;
    const project2 = catalog?.projects.find((candidate) => candidate.id === projectId) ?? null;
    const initialState = this.#store.read();
    const kitTitles = removalKitTitles(initialState.personalKits, catalog?.kits ?? []);
    if (projectId === COMPANION_PROJECT_ID || !project2) {
      return previewRemovalImpact({
        projectId,
        projectName: project2?.name ?? projectId,
        ownership: "absent",
        installedKits: initialState.installedKits,
        activeKitId: initialState.activeKitId,
        removable: false,
        kitTitles
      });
    }
    const hostExtensions = await this.#host.discover();
    const inventory = await reconcileHostInventory({
      projects: catalog?.projects ?? [],
      host: this.#host,
      hostExtensions,
      managed: normalizeManagedExtensionMap(this.#store.read().managedExtensions)
    });
    const decision = evaluateLifecycle({
      operation: "remove",
      project: project2,
      context: { snapshot, inventory }
    });
    const state = this.#store.read();
    const discoveredOwnership = inventory.managed.some(
      ({ project: candidate }) => candidate.id === projectId
    ) ? "managed" : inventory.external.some(({ project: candidate }) => candidate.id === projectId) ? "external" : "absent";
    return previewRemovalImpact({
      projectId,
      projectName: project2.name,
      ownership: decision.kind === "allowed" && decision.operation === "remove" ? decision.ownership : discoveredOwnership,
      installedKits: state.installedKits,
      activeKitId: state.activeKitId,
      removable: decision.kind === "allowed" && decision.operation === "remove",
      kitTitles
    });
  }
  remove(projectId) {
    return this.lock.runExclusive(`remove:${projectId}`, async ({ setPhase }) => {
      const startedAt = this.#now();
      const id = this.#createId();
      const snapshot = this.#getSnapshot();
      const catalog = "catalog" in snapshot ? snapshot.catalog : null;
      const project2 = catalog?.projects.find((candidate) => candidate.id === projectId) ?? null;
      if (projectId === COMPANION_PROJECT_ID) {
        return this.#rejectedRemoval({
          id,
          projectId,
          projectName: project2?.name ?? projectId,
          startedAt
        });
      }
      setPhase("discovering");
      const before = await this.#host.discover();
      const registry = new ManagedRegistry(
        normalizeManagedExtensionMap(this.#store.read().managedExtensions)
      );
      const inventory = await reconcileHostInventory({
        projects: catalog?.projects ?? [],
        host: this.#host,
        hostExtensions: before,
        managed: registry.read()
      });
      const decision = evaluateLifecycle({
        operation: "remove",
        project: project2,
        context: { snapshot, inventory }
      });
      if (decision.kind !== "allowed" || decision.operation !== "remove" || !project2) {
        return this.#rejectedRemoval({
          id,
          projectId,
          projectName: project2?.name ?? projectId,
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
          projectName: project2.name,
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
          projectName: project2.name,
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
        projectName: project2.name,
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
          projectName: project2.name,
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
  async #persistAcknowledgement() {
    await this.#store.update((draft) => {
      if (!draft.trustAcknowledgedAt) draft.trustAcknowledgedAt = this.#now();
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
function eligibleProjectForPreparation(projectId, snapshot) {
  const project2 = ("catalog" in snapshot ? snapshot.catalog.projects.find(({ id }) => id === projectId) : null) ?? null;
  if (projectId === COMPANION_PROJECT_ID || !project2 || !snapshot.canMutate || project2.kind !== "extension" || !project2.frontends.some(({ id }) => id === "sillytavern")) {
    return null;
  }
  try {
    if (!project2.install) throw new Error("Install contract is missing.");
    const contract = parseInstallContract(project2.install);
    return contract.folderName === project2.install.folderName ? project2 : null;
  } catch {
    return null;
  }
}
function removalKitTitles(personalKits, publishedKits) {
  const titles = Object.fromEntries(publishedKits.map(({ id, title }) => [id, title]));
  for (const [id, value] of Object.entries(personalKits)) {
    if (typeof value === "object" && value !== null && "title" in value && typeof value.title === "string") {
      titles[id] = value.title;
    }
  }
  return titles;
}
function bindInstallTargetChoice(choice, project2, catalogGeneratedAt) {
  const bind = (target) => ({
    target,
    binding: createPreparationBinding(project2, target, catalogGeneratedAt)
  });
  if (choice.kind === "single") return { kind: "single", selection: bind(choice.target) };
  return {
    kind: "choose",
    checked: {
      selection: bind(choice.checked.target),
      disabledReason: choice.checked.disabledReason
    },
    newest: { selection: bind(choice.newest) }
  };
}
function createPreparationBinding(project2, target, catalogGeneratedAt) {
  if (!project2.install) throw new Error("Install contract is missing.");
  const install = parseInstallContract(project2.install);
  const report2 = project2.tavernKeeper?.report ?? null;
  return {
    projectId: project2.id,
    catalogGeneratedAt,
    install: {
      kind: install.kind,
      repositoryUrl: install.repositoryUrl,
      branch: install.branch,
      manifestPath: install.manifestPath,
      folderName: install.folderName
    },
    report: report2 ? { reportId: report2.reportId, scannedSha: report2.scannedSha } : null,
    target: { kind: target.kind, requestedSha: target.requestedSha }
  };
}
function matchesPreparationBinding(selection, project2, catalogGeneratedAt) {
  if (!project2 || !selection.target || !selection.binding) return false;
  const report2 = project2.tavernKeeper?.report ?? null;
  if (selection.target.kind === "checked" && (!report2 || selection.target.reportId !== report2.reportId || selection.target.requestedSha.toLowerCase() !== report2.scannedSha.toLowerCase())) {
    return false;
  }
  const expected = createPreparationBinding(project2, selection.target, catalogGeneratedAt);
  const actual = selection.binding;
  return actual.projectId === expected.projectId && actual.catalogGeneratedAt === expected.catalogGeneratedAt && actual.install.kind === expected.install.kind && actual.install.repositoryUrl === expected.install.repositoryUrl && actual.install.branch === expected.install.branch && actual.install.manifestPath === expected.install.manifestPath && actual.install.folderName === expected.install.folderName && actual.target.kind === expected.target.kind && actual.target.requestedSha === expected.target.requestedSha && sameReportIdentity(actual.report, expected.report);
}
function sameReportIdentity(left, right) {
  if (left === null || right === null) return left === right;
  return left.reportId === right.reportId && left.scannedSha === right.scannedSha;
}
function createInstallProvenance(input) {
  return {
    targetKind: input.target.kind,
    requestedSha: input.target.requestedSha,
    installedSha: input.installedSha,
    catalogGeneratedAt: input.catalogGeneratedAt,
    tavernKeeperReportId: input.target.kind === "checked" ? input.target.reportId : null
  };
}
function verificationFailureCopy(error) {
  if (error.stage === "preflight") {
    return error.subtype === "local-revision-lookup-unavailable" ? "SillyTavern can't verify the selected version, so Companion did not install it." : "Companion could not prepare this install request.";
  }
  if (error.cleanupOutcome === "succeeded") {
    return "The install didn't finish correctly, so Companion cleaned it up.";
  }
  if (error.cleanupOutcome === "failed") {
    return "The install didn't finish correctly, and cleanup needs attention in SillyTavern.";
  }
  return "SillyTavern did not report the expected installed extension.";
}
function createLifecycleCoordinator(options) {
  return new DefaultLifecycleCoordinator(options);
}

// src/lifecycle/install-target-fallback-broker.ts
var CHECKED_VERSION_UNAVAILABLE_REASON = "That scanned version isn't available anymore. You can choose Latest from creator or cancel.";
var InstallTargetFallbackBroker = class {
  #listeners = /* @__PURE__ */ new Set();
  #pending = null;
  read() {
    return this.#pending?.request ?? null;
  }
  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.read());
    return () => this.#listeners.delete(listener);
  }
  request(request) {
    if (this.#pending) throw new Error("Another install version choice is already waiting.");
    return new Promise((resolve) => {
      this.#pending = { request, resolve };
      this.#emit();
    });
  }
  respond(selection) {
    return this.#settle(selection);
  }
  cancel() {
    return this.#settle(null);
  }
  #settle(selection) {
    const pending = this.#pending;
    if (!pending) return false;
    this.#pending = null;
    pending.resolve(selection);
    this.#emit();
    return true;
  }
  #emit() {
    const request = this.read();
    for (const listener of this.#listeners) listener(request);
  }
};

// src/lifecycle/bulk-removal.ts
var BulkRemovalPlanChangedError = class extends Error {
  constructor() {
    super("The installed extensions changed after review. Review the uninstall again.");
    this.name = "BulkRemovalPlanChangedError";
  }
};
async function prepareBulkRemoval(lifecycle, projectIds) {
  const uniqueIds = [...new Set(projectIds)];
  const impacts = [];
  for (const projectId of uniqueIds) impacts.push(await lifecycle.previewRemoval(projectId));
  const affectedKitCounts = /* @__PURE__ */ new Map();
  for (const impact of impacts) {
    for (const kit2 of impact.installedKits) {
      const current = affectedKitCounts.get(kit2.id);
      affectedKitCounts.set(kit2.id, {
        ...kit2,
        installedProjectCount: Math.max(
          kit2.installedProjectCount,
          current?.installedProjectCount ?? 0
        ),
        selectedCount: (current?.selectedCount ?? 0) + 1
      });
    }
  }
  const affectedKits = [...affectedKitCounts.values()].map(({ id, title, installedProjectCount, selectedCount }) => ({
    id,
    title,
    resultingStatus: selectedCount >= installedProjectCount ? "Missing" : "Partial"
  })).sort((left, right) => left.title.localeCompare(right.title));
  const confirmable = impacts.length > 0 && impacts.every(({ removable }) => removable);
  return {
    projectIds: uniqueIds,
    impacts,
    affectedKits,
    activeKitAffected: impacts.some(({ activeKitAffected }) => activeKitAffected),
    confirmable,
    fingerprint: removalFingerprint(impacts)
  };
}
async function executeBulkRemoval(lifecycle, plan, createId, now = () => (/* @__PURE__ */ new Date()).toISOString()) {
  if (!plan.confirmable) throw new BulkRemovalPlanChangedError();
  const current = await prepareBulkRemoval(lifecycle, plan.projectIds);
  if (!current.confirmable || current.fingerprint !== plan.fingerprint)
    throw new BulkRemovalPlanChangedError();
  const startedAt = now();
  const results = [];
  for (const impact of current.impacts) {
    try {
      results.push(await lifecycle.remove(impact.projectId));
    } catch {
      results.push(
        createReceipt({
          id: `${createId()}-${impact.projectId}`,
          kind: "remove",
          projectId: impact.projectId,
          projectName: impact.projectName,
          startedAt,
          finishedAt: now(),
          status: "failed",
          safeError: "The uninstall request could not be completed.",
          reloadRequired: false
        })
      );
    }
  }
  const retryableProjectIds = results.filter(({ status }) => status !== "succeeded" && status !== "removed-unrecorded").map(({ projectId }) => projectId);
  const succeeded = results.length - retryableProjectIds.length;
  return {
    formatVersion: 1,
    id: createId(),
    kind: "bulk-remove",
    planFingerprint: plan.fingerprint,
    startedAt,
    completedAt: now(),
    status: retryableProjectIds.length === 0 ? "succeeded" : succeeded === 0 ? "failed" : "partial",
    projectIds: [...plan.projectIds],
    results,
    retryableProjectIds,
    reloadRequired: results.some(({ reloadRequired }) => reloadRequired)
  };
}
function parseBulkRemovalReceipt(value) {
  if (!isRecord4(value)) return null;
  if (value.formatVersion !== 1 || value.kind !== "bulk-remove" || typeof value.id !== "string" || typeof value.planFingerprint !== "string" || !isTimestamp(value.startedAt) || !isTimestamp(value.completedAt) || value.status !== "succeeded" && value.status !== "partial" && value.status !== "failed" || !isStringArray(value.projectIds) || !isStringArray(value.retryableProjectIds) || typeof value.reloadRequired !== "boolean" || !Array.isArray(value.results) || !value.results.every(isRemovalReceipt)) {
    return null;
  }
  return structuredClone(value);
}
function removalFingerprint(impacts) {
  const payload = JSON.stringify(
    impacts.map(({ projectId, ownership, removable, installedKits, activeKitAffected }) => ({
      projectId,
      ownership,
      removable,
      installedKits: installedKits.map(({ id, installedProjectCount }) => [id, installedProjectCount]).sort(([left], [right]) => left.localeCompare(right)),
      activeKitAffected
    }))
  );
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1)
    hash = Math.imul(hash ^ payload.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function isRemovalReceipt(value) {
  return isRecord4(value) && value.kind === "remove" && typeof value.id === "string" && typeof value.projectId === "string" && typeof value.projectName === "string" && isLifecycleReceiptStatus(value.status) && isTimestamp(value.startedAt) && isTimestamp(value.finishedAt) && (value.safeError === null || typeof value.safeError === "string") && Array.isArray(value.steps) && value.steps.every(
    (step2) => isRecord4(step2) && (step2.id === "requested" || step2.id === "host-accepted" || step2.id === "verified" || step2.id === "recorded") && (step2.status === "pending" || step2.status === "succeeded" || step2.status === "failed" || step2.status === "skipped")
  ) && typeof value.reloadRequired === "boolean";
}
function isLifecycleReceiptStatus(value) {
  return value === "succeeded" || value === "cancelled" || value === "rejected" || value === "failed" || value === "verification-failed" || value === "installed-unrecorded" || value === "updated-unrecorded" || value === "removed-unrecorded";
}
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
function isTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  request(prompt, project2) {
    if (this.#pending) throw new Error("A trust prompt is already pending.");
    this.#pending = { prompt: structuredClone(prompt), project: structuredClone(project2) };
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
function toPersonalKitCardViewModel(kit2, status) {
  return {
    id: kit2.id,
    title: kit2.title,
    description: kit2.description,
    origin: "personal",
    originLabel: "Personal Kit",
    componentCount: kit2.projectIds.length,
    flaggedCount: 0,
    supporterCount: null,
    operationalStatus: statusLabel(status),
    primaryAction: actionFor2(status)
  };
}
function toPublishedKitCardViewModel(kit2, status) {
  return {
    id: kit2.id,
    title: kit2.title,
    description: kit2.description,
    origin: "published",
    originLabel: "Published Kit",
    componentCount: kit2.components.length,
    flaggedCount: kit2.flaggedProjectCount,
    supporterCount: kit2.supporterCount,
    operationalStatus: statusLabel(status),
    primaryAction: kit2.components.some(({ availability }) => availability === "available") ? actionFor2(status) : { kind: "view", label: "View Kit" }
  };
}
function toPersonalKitInspector(kit2, projects, status, installed) {
  const byId = new Map(projects.map((project2) => [project2.id, project2]));
  return {
    ...toPersonalKitCardViewModel(kit2, status),
    editable: true,
    components: kit2.projectIds.map((projectId) => component(byId.get(projectId), projectId)),
    topologyChange: topologyChange(status, installed, kit2.projectIds)
  };
}
function toPublishedKitInspector(kit2, status, installed) {
  return {
    ...toPublishedKitCardViewModel(kit2, status),
    editable: false,
    components: kit2.components.map(({ projectId, name, availability, canonicalUrl, project: project2 }) => ({
      projectId,
      name,
      group: availability === "available" ? groupFor(project2) : "unavailable",
      available: availability === "available",
      assessment: project2?.tavernKeeper?.riskLevel ?? null,
      canonicalUrl
    })),
    topologyChange: topologyChange(
      status,
      installed,
      kit2.components.map(({ projectId }) => projectId)
    )
  };
}
function component(project2, id) {
  return {
    projectId: id,
    name: project2?.name ?? id,
    group: project2 ? groupFor(project2) : "unavailable",
    available: Boolean(project2),
    assessment: project2?.tavernKeeper?.riskLevel ?? null,
    canonicalUrl: project2?.canonicalUrl ?? null
  };
}
function groupFor(project2) {
  if (!project2) return "unavailable";
  return project2.kind === "extension" && project2.install ? "managed" : "context";
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
function topologyChange(status, installed, currentProjectIds) {
  if (status !== "changedOnTavernary" || !installed) return void 0;
  if (installed.definitionProjectIds === null) {
    return { kind: "unknown", currentProjectIds: [...currentProjectIds] };
  }
  const previousProjectIds = [...installed.definitionProjectIds];
  const previous = new Set(previousProjectIds);
  const current = new Set(currentProjectIds);
  return {
    kind: "exact",
    previousProjectIds,
    currentProjectIds: [...currentProjectIds],
    addedProjectIds: currentProjectIds.filter((projectId) => !previous.has(projectId)),
    removedProjectIds: previousProjectIds.filter((projectId) => !current.has(projectId))
  };
}

// src/kits/kit-discovery-controller.ts
var KitDiscoveryController = class {
  #listeners = /* @__PURE__ */ new Set();
  #catalog;
  #personal;
  #statuses;
  #segment = "personal";
  #search = "";
  #query = structuredClone(DEFAULT_KIT_QUERY);
  constructor(input) {
    this.#catalog = input.catalog;
    this.#personal = structuredClone(input.personal);
    this.#statuses = input.statuses;
  }
  read() {
    const published = selectKits(this.#catalog.kits, this.#query, this.#search).map(
      (kit2) => toPublishedKitCardViewModel(kit2, this.#statuses.get(kit2.id) ?? "saved")
    );
    const meaning = this.#search.trim().toLocaleLowerCase("en-US");
    const personal = this.#personal.filter(
      (kit2) => !meaning || `${kit2.title} ${kit2.description} ${kit2.projectIds.join(" ")}`.toLocaleLowerCase("en-US").includes(meaning)
    ).map((kit2) => toPersonalKitCardViewModel(kit2, this.#statuses.get(kit2.id) ?? "saved"));
    return {
      segment: this.#segment,
      search: this.#search,
      query: structuredClone(this.#query),
      publishedCount: this.#catalog.kits.length,
      personalCount: this.#personal.length,
      facets: this.#facets(),
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
  #facets() {
    const frontendLabels = /* @__PURE__ */ new Map();
    const purposeLabels = /* @__PURE__ */ new Map();
    const modelFamilyLabels = /* @__PURE__ */ new Map();
    for (const project2 of this.#catalog.projects) {
      for (const frontend of project2.frontends) frontendLabels.set(frontend.id, frontend.label);
      for (const family of project2.preset?.modelFamilies ?? []) {
        modelFamilyLabels.set(family.id, family.label);
      }
    }
    for (const kit2 of this.#catalog.kits) {
      for (const frontend of kit2.frontends) frontendLabels.set(frontend.id, frontend.label);
      for (const purpose of kit2.purposes) purposeLabels.set(purpose.id, purpose.label);
      for (const family of kit2.modelFamilies ?? []) {
        modelFamilyLabels.set(family.id, family.label);
      }
    }
    const counted = (labels, group) => [...labels].map(([id, label2]) => ({
      id,
      label: label2,
      count: countKitsForFilter(this.#catalog.kits, this.#query, group, id, this.#search)
    })).sort((left, right) => left.label.localeCompare(right.label));
    return {
      frontends: counted(frontendLabels, "frontends"),
      purposes: counted(purposeLabels, "purposes"),
      modelFamilies: counted(modelFamilyLabels, "modelFamilies"),
      projects: this.#catalog.projects.map((project2) => ({
        id: project2.id,
        label: project2.name,
        count: selectKits(
          this.#catalog.kits,
          { ...this.#query, includesProjectId: project2.id },
          this.#search
        ).length
      })).sort((left, right) => left.label.localeCompare(right.label)),
      availableCount: selectKits(
        this.#catalog.kits,
        { ...this.#query, allComponentsAvailable: true },
        this.#search
      ).length
    };
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
  resolveInternalName,
  onResult
}) {
  const failures = [];
  const results = [];
  let changed = false;
  for (const [action, steps] of [
    ["enable", enable],
    ["disable", disable]
  ]) {
    for (const step2 of steps) {
      const internalName = resolveInternalName(step2.projectId, step2.internalName);
      if (!internalName) {
        const failure = {
          projectId: step2.projectId,
          action,
          error: "Managed extension identity is unavailable."
        };
        failures.push(failure);
        const mutation = { ...failure, changed: false };
        results.push(mutation);
        await onResult?.(mutation);
        continue;
      }
      try {
        await host[action](internalName);
        changed = true;
        const mutation = {
          projectId: step2.projectId,
          action,
          changed: true,
          error: null
        };
        results.push(mutation);
        await onResult?.(mutation);
      } catch (error) {
        const failure = {
          projectId: step2.projectId,
          action,
          error: error instanceof Error ? error.message : "Host mutation failed."
        };
        failures.push(failure);
        const mutation = { ...failure, changed: false };
        results.push(mutation);
        await onResult?.(mutation);
      }
    }
  }
  return { changed, failures, results };
}

// src/kits/kit-plan.ts
function freezeKitPlan(plan) {
  return deepFreeze(plan);
}
function deepFreeze(value) {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

// src/kits/kit-install-targets.ts
async function prepareKitInstallTargets(input) {
  const plan = structuredClone(input.plan);
  if (plan.blockingIssues.some(({ code }) => code === "catalog-incompatible")) {
    throw new Error("Update Companion before changing Kits.");
  }
  const snapshot = {
    state: "ready-current",
    canMutate: true,
    checkedAt: null,
    catalog: structuredClone(input.catalog)
  };
  const projects = new Map(input.catalog.projects.map((project2) => [project2.id, project2]));
  for (const step2 of plan.install) {
    const project2 = projects.get(step2.projectId);
    if (!project2) throw new Error(`${step2.projectName} is no longer available.`);
    step2.targetChoice = await prepareInstallTargetChoice({
      host: input.host,
      snapshot,
      project: project2,
      now: input.now
    });
  }
  plan.installTargetsPrepared = true;
  return freezeKitPlan(plan);
}
function initialInstallTargetSelections(plan) {
  return plan.install.flatMap(
    (step2) => step2.targetChoice?.kind === "single" ? [{ projectId: step2.projectId, target: structuredClone(step2.targetChoice.target) }] : []
  );
}
function computeInstallTargetBinding(selections) {
  return sha256Hex(
    JSON.stringify(
      selections.map(({ projectId, target }) => [projectId, normalizeTarget(target)]).sort(([left], [right]) => left.localeCompare(right))
    )
  );
}
function validateInstallTargetApproval(plan, selections, binding) {
  if (plan.install.length > 0 && !plan.installTargetsPrepared) {
    throw new Error("Kit install targets were not prepared.");
  }
  if (binding !== computeInstallTargetBinding(selections)) {
    throw new Error("Kit install target binding does not match the selected versions.");
  }
  const selected = /* @__PURE__ */ new Map();
  for (const selection of selections) {
    if (selected.has(selection.projectId))
      throw new Error("A Kit install target was selected twice.");
    selected.set(selection.projectId, selection.target);
  }
  if (selected.size !== plan.install.length) {
    throw new Error("Every Kit install target must be selected.");
  }
  for (const step2 of plan.install) {
    const target = selected.get(step2.projectId);
    const choice = step2.targetChoice;
    if (!target || !choice) throw new Error("Every Kit install target must be selected.");
    if (choice.kind === "single") {
      if (!sameTarget(target, choice.target)) throw new Error("A Kit install target changed.");
      continue;
    }
    const checkedSelected = sameTarget(target, choice.checked.target);
    const newestSelected = sameTarget(target, choice.newest);
    if (!checkedSelected && !newestSelected) throw new Error("A Kit install target changed.");
    if (checkedSelected && choice.checked.disabledReason) {
      throw new Error("The latest scanned version is not available for this Kit install.");
    }
  }
}
function sameInstallTarget(left, right) {
  return sameTarget(left, right);
}
function sameTarget(left, right) {
  return JSON.stringify(normalizeTarget(left)) === JSON.stringify(normalizeTarget(right));
}
function normalizeTarget(target) {
  return target.kind === "checked" ? {
    kind: target.kind,
    requestedSha: target.requestedSha.toLowerCase(),
    checkedAt: target.checkedAt,
    reportId: target.reportId,
    reportUrl: target.reportUrl
  } : {
    kind: target.kind,
    requestedSha: target.requestedSha?.toLowerCase() ?? null,
    resolvedAt: target.resolvedAt
  };
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
  return journal.formatVersion === 1 && typeof journal.operationId === "string" && typeof journal.planId === "string" && typeof journal.kitId === "string" && (journal.operation === "install" || journal.operation === "activate" || journal.operation === "deactivate" || journal.operation === "uninstall") && typeof journal.phase === "string" && typeof journal.startedAt === "string" && (journal.currentProjectId === null || typeof journal.currentProjectId === "string") && Array.isArray(journal.completedProjects) && Array.isArray(journal.requiredProjectIds) && (!Object.hasOwn(journal, "actionableProjectIds") || Array.isArray(journal.actionableProjectIds) && journal.actionableProjectIds.every((value2) => typeof value2 === "string")) && (!Object.hasOwn(journal, "selectedInstallTargets") || Array.isArray(journal.selectedInstallTargets) && journal.selectedInstallTargets.every(isInstallTargetSelection)) && (!Object.hasOwn(journal, "completedMutations") || Array.isArray(journal.completedMutations) && journal.completedMutations.every(isActivationMutationResult)) && (journal.preOperationActiveKitId === null || typeof journal.preOperationActiveKitId === "string");
}
function isActivationMutationResult(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const mutation = value;
  return typeof mutation.projectId === "string" && (mutation.action === "enable" || mutation.action === "disable") && typeof mutation.changed === "boolean" && (mutation.error === null || typeof mutation.error === "string");
}
function isInstallTargetSelection(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const selection = value;
  if (typeof selection.projectId !== "string" || !selection.target) return false;
  if (selection.target.kind === "checked") {
    return typeof selection.target.requestedSha === "string" && typeof selection.target.checkedAt === "string" && typeof selection.target.reportId === "string" && typeof selection.target.reportUrl === "string";
  }
  return selection.target.kind === "newest" && (selection.target.requestedSha === null || typeof selection.target.requestedSha === "string") && (selection.target.resolvedAt === null || typeof selection.target.resolvedAt === "string");
}

// src/kits/kit-reference-index.ts
function buildKitReferenceIndex(installed) {
  const mutable = /* @__PURE__ */ new Map();
  for (const kit2 of installed) {
    for (const projectId of new Set(kit2.installedProjectIds)) {
      const kitIds = mutable.get(projectId) ?? [];
      kitIds.push(kit2.kitId);
      mutable.set(projectId, kitIds);
    }
  }
  return new Map(
    [...mutable].map(([projectId, kitIds]) => [projectId, Object.freeze(kitIds.sort())])
  );
}

// src/kits/kit-planner.ts
function planKitOperation(input) {
  if (!isKitOperation(input.operation)) throw new Error("Unsupported Kit operation.");
  const projectById = new Map(input.catalog.projects.map((project2) => [project2.id, project2]));
  const managedById = new Map(input.inventory.managed.map((entry) => [entry.project.id, entry]));
  const externalById = new Map(input.inventory.external.map((entry) => [entry.project.id, entry]));
  const references = buildKitReferenceIndex(input.installedKits);
  const catalogBinding = catalogMutationBinding(input.catalog, input.kit.projectIds);
  const plan = {
    id: planId(input, catalogBinding),
    operation: input.operation,
    kitId: input.kit.id,
    catalogGeneratedAt: input.catalog.generatedAt,
    catalogBinding,
    inventoryFingerprint: inventoryFingerprint(input),
    requiredProjectIds: [...input.kit.projectIds],
    actionableProjectIds: [],
    installTargetsPrepared: false,
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
    const project2 = projectById.get(projectId);
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
    if (!project2) {
      plan.blockingIssues.push({
        code: "project-unavailable",
        projectId,
        message: `${projectId} is unavailable.`
      });
      continue;
    }
    if (!isActionable(project2)) {
      plan.contextOnly.push(stepFor(project2, null));
      if (project2.kind === "extension")
        plan.blockingIssues.push({
          code: "invalid-install-contract",
          projectId,
          message: `${project2.name} cannot be installed by Companion.`
        });
      continue;
    }
    plan.actionableProjectIds.push(projectId);
    const managedEntry = managedById.get(projectId);
    const externalEntry = externalById.get(projectId);
    if (externalEntry) {
      plan.externalContext.push(stepFor(project2, externalEntry.extension.internalName));
      continue;
    }
    if (managedEntry && input.operation !== "uninstall") {
      plan.alreadyManaged.push(stepFor(project2, managedEntry.extension.internalName));
    }
    switch (input.operation) {
      case "install":
      case "activate":
        if (!managedEntry) {
          plan.install.push({ ...stepFor(project2, null), targetChoice: null });
          addWarning(plan, project2);
        }
        if (input.operation === "activate" && (!managedEntry || !managedEntry.extension.enabled))
          plan.enable.push(stepFor(project2, managedEntry?.extension.internalName ?? null));
        break;
      case "deactivate":
        if (managedEntry?.extension.enabled)
          plan.disable.push(stepFor(project2, managedEntry.extension.internalName));
        break;
      case "uninstall": {
        if (!managedEntry) break;
        const otherReferences = (references.get(projectId) ?? []).filter(
          (id) => id !== input.kit.id
        );
        if (otherReferences.length)
          plan.keptForOtherKits.push(stepFor(project2, managedEntry.extension.internalName));
        else plan.remove.push(stepFor(project2, managedEntry.extension.internalName));
        break;
      }
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
function isKitOperation(value) {
  return value === "install" || value === "activate" || value === "deactivate" || value === "uninstall";
}
function inventoryFingerprint(input) {
  const payload = JSON.stringify({
    managed: input.inventory.managed.map(({ project: project2, extension }) => [project2.id, extension.internalName, extension.enabled]).sort(),
    external: input.inventory.external.map(({ project: project2, extension }) => [project2.id, extension.internalName, extension.enabled]).sort(),
    records: Object.keys(input.managed).sort(),
    installedKits: input.installedKits.map(({ kitId, installedProjectIds }) => [kitId, [...installedProjectIds].sort()]).sort(),
    activeKitId: input.activeKitId
  });
  return textFingerprint(payload);
}
function catalogMutationBinding(catalog, projectIds) {
  const byId = new Map(catalog.projects.map((project2) => [project2.id, project2]));
  return JSON.stringify({
    generatedAt: catalog.generatedAt,
    projects: projectIds.map((projectId) => byId.get(projectId) ?? null)
  });
}
function planId(input, catalogBinding) {
  return `${input.operation}:${input.kit.id}:${input.catalog.generatedAt}:${textFingerprint(catalogBinding)}:${inventoryFingerprint(input)}`;
}
function textFingerprint(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1)
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function isActionable(project2) {
  return project2.kind === "extension" && project2.frontends.some(({ id }) => id === "sillytavern") && project2.install?.kind === "sillytavern-extension-git";
}
function step(projectId, projectName, internalName) {
  return { projectId, projectName, internalName };
}
function stepFor(project2, internalName) {
  return step(project2.id, project2.name, internalName);
}
function addWarning(plan, project2) {
  const assessment = project2.tavernKeeper;
  if (assessment?.riskLevel !== "material" && assessment?.riskLevel !== "high") return;
  plan.warnings.push({
    projectId: project2.id,
    projectName: project2.name,
    severity: assessment.riskLevel,
    freshness: assessment.freshness,
    reportUrl: assessment.report?.reportUrl ?? null,
    scannedSha: assessment.report?.scannedSha ?? null
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
  const hasDefinitionProjectIds = Object.hasOwn(input, "definitionProjectIds");
  exactKeys(
    input,
    [
      "kitId",
      "definitionFingerprint",
      ...hasDefinitionProjectIds ? ["definitionProjectIds"] : [],
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
  let installedProjectIds = uniqueStrings(input.installedProjectIds, "installedProjectIds");
  const missingProjectIds = uniqueStrings(input.missingProjectIds, "missingProjectIds");
  const definitionProjectIds = hasDefinitionProjectIds ? input.definitionProjectIds === null ? null : uniqueStrings(input.definitionProjectIds, "definitionProjectIds") : null;
  const overlap = installedProjectIds.filter((projectId) => missingProjectIds.includes(projectId));
  if (hasDefinitionProjectIds && overlap.length) {
    throw new Error("A Kit project cannot be both installed and missing.");
  }
  if (!hasDefinitionProjectIds && overlap.length) {
    const missing = new Set(missingProjectIds);
    installedProjectIds = installedProjectIds.filter((projectId) => !missing.has(projectId));
  }
  if (definitionProjectIds) {
    const definition = new Set(definitionProjectIds);
    if ([...installedProjectIds, ...missingProjectIds].some((projectId) => !definition.has(projectId))) {
      throw new Error("Installed Kit presence must belong to its definition topology.");
    }
  }
  if (input.status !== "installed" && input.status !== "incomplete" && input.status !== "drifted") {
    throw new Error("Invalid installed Kit status.");
  }
  return {
    kitId,
    definitionFingerprint,
    definitionProjectIds,
    installedProjectIds,
    missingProjectIds,
    status: input.status,
    installedAt: iso(input.installedAt, "installedAt"),
    lastVerifiedAt: iso(input.lastVerifiedAt, "lastVerifiedAt")
  };
}
async function fingerprintKitTopology(projectIds) {
  return sha256Hex(JSON.stringify(projectIds));
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
function exactKeys(value, expected, label2) {
  const expectedSet = new Set(expected);
  if (Object.keys(value).some((key) => !expectedSet.has(key)))
    throw new Error(`${label2} contains unknown fields.`);
  if (expected.some((key) => !Object.hasOwn(value, key)))
    throw new Error(`${label2} is missing fields.`);
}
function text(value, label2) {
  if (typeof value !== "string") throw new Error(`Invalid ${label2}.`);
  return value;
}
function iso(value, label2) {
  const result2 = text(value, label2);
  if (!Number.isFinite(Date.parse(result2)) || new Date(result2).toISOString() !== result2)
    throw new Error(`Invalid ${label2}.`);
  return result2;
}
function uniqueStrings(value, label2) {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label2}.`);
  const result2 = value.map((entry) => text(entry, label2));
  if (new Set(result2).size !== result2.length) throw new Error(`Duplicate ${label2}.`);
  return result2;
}

// src/kits/kit-executor.ts
var KitExecutor = class {
  #host;
  #profile;
  #kits;
  #lock;
  #getCatalog;
  #getInventoryFingerprint;
  #fallbacks;
  #confirm;
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
    this.#fallbacks = deps.fallbacks;
    this.#confirm = deps.confirm;
    this.#now = deps.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
    this.#operationId = deps.operationId ?? createRuntimeId;
    this.journal = new KitOperationJournal(deps.profile);
  }
  async execute(plan, approval) {
    validateApproval(plan, approval);
    if (plan.blockingIssues.length) throw new Error("Kit plan has blocking issues.");
    return this.#lock.runExclusive(`kit:${plan.id}`, async ({ setPhase }) => {
      if (await this.#getInventoryFingerprint() !== plan.inventoryFingerprint)
        throw new Error("Kit plan is stale. Review it again.");
      const catalog = structuredClone(this.#getCatalog());
      if (catalogMutationBinding(catalog, plan.requiredProjectIds) !== plan.catalogBinding)
        throw new Error("Kit catalog changed. Review the plan again.");
      validateInstallTargetApproval(
        plan,
        approval.selectedInstallTargets,
        approval.installTargetBinding
      );
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
        requiredProjectIds: [...plan.requiredProjectIds],
        actionableProjectIds: [...plan.actionableProjectIds],
        selectedInstallTargets: structuredClone(approval.selectedInstallTargets),
        completedMutations: []
      };
      await this.journal.write(journal);
      const progress = { reloadRequired: false };
      let receipt;
      try {
        switch (plan.operation) {
          case "install":
          case "activate":
            receipt = await this.#installOrActivate(
              plan,
              journal,
              previousActiveKitId,
              setPhase,
              catalog,
              structuredClone(approval.selectedInstallTargets),
              progress
            );
            break;
          case "deactivate":
            receipt = await this.#deactivate(
              plan,
              journal,
              previousActiveKitId,
              setPhase,
              progress
            );
            break;
          case "uninstall":
            receipt = await this.#uninstall(plan, journal, previousActiveKitId, setPhase, progress);
            break;
          default:
            throw new Error("Unsupported Kit operation.");
        }
      } catch (error) {
        receipt = this.#receipt(
          plan,
          journal,
          previousActiveKitId,
          "failed",
          [
            {
              projectId: journal.currentProjectId ?? plan.kitId,
              action: "context",
              status: "failed",
              message: error instanceof Error ? error.message : "Kit operation failed.",
              retryable: true
            }
          ],
          progress.reloadRequired
        );
      }
      await this.#persistReceipt(receipt);
      await this.journal.clear();
      return receipt;
    });
  }
  async recoverInterrupted() {
    const journal = this.journal.read();
    if (!journal) return null;
    return this.#lock.runExclusive(`kit:recovery:${journal.operationId}`, async () => {
      const current = this.journal.read();
      return current ? this.#recoverInterrupted(current) : null;
    });
  }
  async #recoverInterrupted(journal) {
    const extensions = await this.#host.discover();
    const catalog = this.#getCatalog();
    const present = presentProjectIds(catalog.projects, extensions);
    const actionableIds = new Set(journal.actionableProjectIds ?? journal.requiredProjectIds);
    const results = journal.requiredProjectIds.map((projectId) => {
      if (!actionableIds.has(projectId)) {
        return {
          projectId,
          action: "context",
          status: "external",
          message: "Context-only member required no recovery action.",
          retryable: false
        };
      }
      return {
        projectId,
        action: "context",
        status: present.has(projectId) ? "verified" : "failed",
        message: present.has(projectId) ? "Present after interruption." : "Missing after interruption.",
        retryable: !present.has(projectId)
      };
    });
    await this.#reconcileInterruptedState(journal, present);
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
      reloadRequired: false,
      projects: [...journal.completedProjects, ...results],
      keptForOtherKits: []
    };
    await this.#persistReceipt(receipt);
    await this.journal.clear();
    return receipt;
  }
  async #reconcileInterruptedState(journal, present) {
    const actionableIds = journal.actionableProjectIds ?? journal.requiredProjectIds;
    const installedProjectIds = actionableIds.filter((projectId) => present.has(projectId));
    const missingProjectIds = actionableIds.filter((projectId) => !present.has(projectId));
    const current = this.#kits.readInstalled(journal.kitId);
    const activeKitId = this.#kits.readActiveId();
    if (journal.operation === "uninstall" && installedProjectIds.length === 0) {
      await this.#kits.removeInstalledState(journal.kitId);
      return;
    }
    let status = missingProjectIds.length ? "incomplete" : "installed";
    if ((journal.operation === "deactivate" || journal.operation === "uninstall") && activeKitId === journal.kitId) {
      status = "drifted";
    }
    if (journal.operation === "activate" && journal.phase === "activating" && activeKitId !== journal.kitId && missingProjectIds.length === 0) {
      status = "drifted";
      if (journal.preOperationActiveKitId) await this.#markDrifted(journal.preOperationActiveKitId);
    }
    await this.#kits.recordInstalledState({
      kitId: journal.kitId,
      definitionFingerprint: await fingerprintKitTopology(journal.requiredProjectIds),
      definitionProjectIds: [...journal.requiredProjectIds],
      installedProjectIds,
      missingProjectIds,
      status,
      installedAt: current?.installedAt ?? journal.startedAt,
      lastVerifiedAt: this.#now()
    });
  }
  async #installOrActivate(plan, journal, previousActiveKitId, setPhase, catalog, selectedInstallTargets, progress) {
    const byId = new Map(catalog.projects.map((project2) => [project2.id, project2]));
    const selected = new Map(
      selectedInstallTargets.map((selection) => [selection.projectId, selection.target])
    );
    const results = [];
    let stopRemainingInstalls = false;
    for (let index = 0; index < plan.install.length; index += 1) {
      const step2 = plan.install[index];
      journal.currentProjectId = step2.projectId;
      journal.phase = "installing";
      setPhase(`installing:${step2.projectId}`);
      await this.journal.write(journal);
      const project2 = byId.get(step2.projectId);
      let target = selected.get(step2.projectId) ?? null;
      try {
        if (!project2?.install || !target || project2.id === "mentallyquill-tavernary-companion")
          throw new Error("Install contract is unavailable.");
        let verified;
        try {
          verified = await executeVerifiedInstall({ host: this.#host, project: project2, target });
        } catch (error) {
          if (!(error instanceof HostRevisionUnavailableError) || target.kind !== "checked") {
            throw error;
          }
          const newest = await prepareNewestInstallTarget({
            host: this.#host,
            snapshot: {
              state: "ready-current",
              canMutate: true,
              checkedAt: null,
              catalog
            },
            project: project2,
            now: this.#now
          });
          const replacement = await this.#fallbacks.request({
            projectId: project2.id,
            projectName: project2.name,
            checked: preparedSelection(project2, target, catalog.generatedAt),
            newest: preparedSelection(project2, newest, catalog.generatedAt)
          });
          if (!replacement) {
            results.push(
              result(step2.projectId, "install", "failed", CHECKED_VERSION_UNAVAILABLE_REASON, true)
            );
            appendUntouchedResults(results, plan.install.slice(index + 1));
            stopRemainingInstalls = true;
            break;
          }
          if (replacement.target.kind !== "newest" || !sameInstallTarget(replacement.target, newest))
            throw new Error("The replacement Kit install target changed.");
          target = replacement.target;
          selected.set(step2.projectId, target);
          journal.selectedInstallTargets = [...selected.entries()].map(([projectId, value]) => ({
            projectId,
            target: structuredClone(value)
          }));
          await this.journal.write(journal);
          if (!await this.#confirmChangedTarget(project2, target)) {
            results.push(
              result(
                step2.projectId,
                "install",
                "failed",
                "The latest version from the creator was not installed.",
                true
              )
            );
            appendUntouchedResults(results, plan.install.slice(index + 1));
            stopRemainingInstalls = true;
            break;
          }
          verified = await executeVerifiedInstall({ host: this.#host, project: project2, target });
        }
        progress.reloadRequired = true;
        const provenance = installProvenance(target, verified.installedSha, catalog.generatedAt);
        await this.#recordManaged(project2, verified.extension, provenance);
        results.push(
          result(
            step2.projectId,
            "install",
            "verified",
            target.kind === "checked" ? "Installed the latest scanned version." : "Installed the latest version from the creator.",
            false,
            provenance
          )
        );
      } catch (error) {
        if (error instanceof VerifiedInstallError && error.stage === "post-install-verification") {
          progress.reloadRequired = true;
        }
        results.push(
          result(step2.projectId, "install", "failed", kitInstallFailureMessage(error), true)
        );
      }
      journal.completedProjects = structuredClone(results);
      await this.journal.write(journal);
    }
    if (stopRemainingInstalls) {
      journal.completedProjects = structuredClone(results);
      await this.journal.write(journal);
    }
    const discovered = await this.#host.discover();
    const present = presentProjectIds(catalog.projects, discovered);
    const requiredActionable = plan.actionableProjectIds;
    const attemptedInstalls = new Set(plan.install.map(({ projectId }) => projectId));
    const managed = normalizeManagedExtensionMap(this.#profile.read().managedExtensions);
    const installed = requiredActionable.filter(
      (id) => present.has(id) && (!attemptedInstalls.has(id) || Boolean(managed[id]))
    );
    const missing = requiredActionable.filter((id) => !installed.includes(id));
    await this.#recordKitState(
      plan,
      installed,
      missing,
      missing.length ? "incomplete" : "installed"
    );
    if (plan.operation === "activate" && missing.length) {
      return this.#receipt(
        plan,
        journal,
        previousActiveKitId,
        "partial",
        results,
        progress.reloadRequired
      );
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
        resolveInternalName: (projectId, planned) => planned ?? records[projectId]?.internalName ?? null,
        onResult: (mutation) => this.#recordMutationProgress(journal, progress, mutation)
      });
      progress.reloadRequired ||= mutations.changed;
      for (const failure of mutations.failures)
        results.push(result(failure.projectId, failure.action, "failed", failure.error, true));
      const verified = await this.#verifyEnabled(
        plan,
        normalizeManagedExtensionMap(this.#profile.read().managedExtensions)
      );
      if (mutations.failures.length || !verified) {
        await this.#markDrifted(plan.kitId);
        if (previousActiveKitId) await this.#markDrifted(previousActiveKitId);
        return this.#receipt(
          plan,
          journal,
          previousActiveKitId,
          "failed",
          results,
          progress.reloadRequired
        );
      }
      await this.#kits.setActive(plan.kitId);
    }
    for (const step2 of plan.externalContext)
      results.push(
        result(step2.projectId, "context", "external", "External extension left unchanged.", false)
      );
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      results.some(({ status }) => status === "failed") ? "partial" : "completed",
      results,
      progress.reloadRequired
    );
  }
  async #deactivate(plan, journal, previousActiveKitId, setPhase, progress) {
    journal.phase = "deactivating";
    setPhase("deactivating");
    await this.journal.write(journal);
    const mutations = await applyActivationMutations({
      host: this.#host,
      enable: [],
      disable: plan.disable,
      resolveInternalName: (_id, planned) => planned,
      onResult: (mutation) => this.#recordMutationProgress(journal, progress, mutation)
    });
    let discovered = null;
    let discoveryError = null;
    try {
      discovered = await this.#host.discover();
    } catch (error) {
      discoveryError = message(error);
    }
    const results = plan.disable.map((step2) => {
      const mutationFailure = mutations.failures.find(
        ({ projectId }) => projectId === step2.projectId
      );
      const extension = discovered?.find(({ internalName }) => internalName === step2.internalName);
      const verificationFailure = !mutationFailure && (!extension || extension.enabled);
      return result(
        step2.projectId,
        "disable",
        mutationFailure || verificationFailure ? "failed" : "verified",
        mutationFailure?.error ?? (discoveryError ? `Disabled state could not be verified: ${discoveryError}` : null) ?? (verificationFailure ? "Extension remained enabled after the disable request." : "Disabled and verified."),
        Boolean(mutationFailure || verificationFailure)
      );
    });
    const failed = results.some(({ status }) => status === "failed");
    if (failed) await this.#markDrifted(plan.kitId);
    else await this.#kits.setActive(null);
    progress.reloadRequired ||= mutations.changed;
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      failed ? "partial" : "completed",
      results,
      progress.reloadRequired
    );
  }
  async #uninstall(plan, journal, previousActiveKitId, setPhase, progress) {
    const results = [];
    if (previousActiveKitId === plan.kitId && plan.disable.length) {
      const mutations = await applyActivationMutations({
        host: this.#host,
        enable: [],
        disable: plan.disable,
        resolveInternalName: (_id, planned) => planned,
        onResult: (mutation) => this.#recordMutationProgress(journal, progress, mutation)
      });
      progress.reloadRequired ||= mutations.changed;
      if (mutations.failures.length) {
        await this.#markDrifted(plan.kitId);
        for (const failure of mutations.failures)
          results.push(result(failure.projectId, "disable", "failed", failure.error, true));
        return this.#receipt(
          plan,
          journal,
          previousActiveKitId,
          "failed",
          results,
          progress.reloadRequired
        );
      }
      let disabledVerified = false;
      try {
        const discovered = await this.#host.discover();
        disabledVerified = plan.disable.every((step2) => {
          const extension = discovered.find(
            ({ internalName }) => internalName === step2.internalName
          );
          return Boolean(extension && !extension.enabled);
        });
      } catch {
        disabledVerified = false;
      }
      if (!disabledVerified) {
        await this.#markDrifted(plan.kitId);
        for (const step2 of plan.disable) {
          results.push(
            result(
              step2.projectId,
              "disable",
              "failed",
              "Disabled state could not be verified.",
              true
            )
          );
        }
        return this.#receipt(
          plan,
          journal,
          previousActiveKitId,
          "failed",
          results,
          progress.reloadRequired
        );
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
        progress.reloadRequired = true;
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
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      failed ? "partial" : "completed",
      results,
      progress.reloadRequired
    );
  }
  async #recordManaged(project2, extension, provenance) {
    if (!project2.install) throw new Error("Missing install contract.");
    await this.#profile.update((draft) => {
      const registry = new ManagedRegistry(normalizeManagedExtensionMap(draft.managedExtensions));
      registry.recordInstalled({
        projectId: project2.id,
        expectedFolderName: project2.install.folderName,
        extension,
        installedAt: this.#now(),
        installedBy: "kit",
        provenance
      });
      draft.managedExtensions = registry.read();
    });
  }
  async #recordMutationProgress(journal, progress, mutation) {
    progress.reloadRequired ||= mutation.changed;
    journal.currentProjectId = mutation.projectId;
    journal.completedMutations = [...journal.completedMutations ?? [], structuredClone(mutation)];
    await this.journal.write(journal);
  }
  async #confirmChangedTarget(project2, target) {
    const state = this.#profile.read();
    const prompts = selectTrustPrompts({
      trustAcknowledgedAt: state.trustAcknowledgedAt,
      target,
      assessment: project2.tavernKeeper ? {
        riskLevel: project2.tavernKeeper.riskLevel,
        scannedSha: project2.tavernKeeper.report?.scannedSha ?? null,
        reportUrl: project2.tavernKeeper.report?.reportUrl ?? null
      } : null
    });
    let disclosureAccepted = Boolean(state.trustAcknowledgedAt);
    for (const prompt of prompts) {
      if (!await this.#confirm(prompt, project2)) return false;
      if (prompt.kind === "unsandboxed-disclosure") disclosureAccepted = true;
    }
    if (disclosureAccepted && !state.trustAcknowledgedAt) {
      await this.#profile.update((draft) => {
        if (!draft.trustAcknowledgedAt) draft.trustAcknowledgedAt = this.#now();
      });
    }
    return true;
  }
  async #recordKitState(plan, installed, missing, status) {
    await this.#kits.recordInstalledState({
      kitId: plan.kitId,
      definitionFingerprint: await fingerprintKitTopology(plan.requiredProjectIds),
      definitionProjectIds: [...plan.requiredProjectIds],
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
    try {
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
    } catch {
      return false;
    }
  }
  #receipt(plan, journal, previousActiveKitId, outcome, projects, reloadRequired) {
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
      reloadRequired,
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
  if (approval.planId !== plan.id || approval.inventoryFingerprint !== plan.inventoryFingerprint || approval.catalogGeneratedAt !== plan.catalogGeneratedAt || approval.catalogBinding !== plan.catalogBinding)
    throw new Error("Kit approval does not match this plan.");
  validateInstallTargetApproval(
    plan,
    approval.selectedInstallTargets,
    approval.installTargetBinding
  );
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
    projects.filter((project2) => project2.install && exactFolder2(extensions, project2.install.folderName)).map(({ id }) => id)
  );
}
function result(projectId, action, status, messageText, retryable, installProvenance2) {
  return {
    projectId,
    action,
    status,
    message: messageText,
    retryable,
    ...installProvenance2 ? { installProvenance: installProvenance2 } : {}
  };
}
function message(error) {
  return error instanceof Error ? error.message : "Host operation failed.";
}
function preparedSelection(project2, target, catalogGeneratedAt) {
  if (!project2.install) throw new Error("Install contract is unavailable.");
  const report2 = project2.tavernKeeper?.report ?? null;
  return {
    target,
    binding: {
      projectId: project2.id,
      catalogGeneratedAt,
      install: {
        kind: project2.install.kind,
        repositoryUrl: project2.install.repositoryUrl,
        branch: project2.install.branch,
        manifestPath: project2.install.manifestPath,
        folderName: project2.install.folderName
      },
      report: report2 ? { reportId: report2.reportId, scannedSha: report2.scannedSha } : null,
      target: { kind: target.kind, requestedSha: target.requestedSha }
    }
  };
}
function appendUntouchedResults(results, steps) {
  for (const step2 of steps) {
    results.push(
      result(
        step2.projectId,
        "install",
        "untouched",
        "Not started. You can try the Kit again.",
        true
      )
    );
  }
}
function installProvenance(target, installedSha, catalogGeneratedAt) {
  return {
    targetKind: target.kind,
    requestedSha: target.requestedSha,
    installedSha,
    catalogGeneratedAt,
    tavernKeeperReportId: target.kind === "checked" ? target.reportId : null
  };
}
function kitInstallFailureMessage(error) {
  if (error instanceof HostRevisionUnavailableError) {
    return "We couldn't find the latest version from the creator. Try again.";
  }
  if (error instanceof VerifiedInstallError) {
    if (error.stage === "preflight") {
      return "SillyTavern couldn't check the selected version, so Companion did not install it.";
    }
    if (error.cleanupOutcome === "succeeded") {
      return "The install didn't finish correctly, so Companion cleaned it up.";
    }
    if (error.cleanupOutcome === "failed") {
      return "The install didn't finish correctly, and cleanup needs attention in SillyTavern.";
    }
  }
  return "The install could not finish. Try again.";
}

// src/kits/kit-store.ts
var KitStore = class {
  #profile;
  #uuid;
  #now;
  constructor(profile, dependencies = {}) {
    this.#profile = profile;
    this.#uuid = dependencies.uuid ?? createRuntimeId;
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
  async hydrateDefinitionTopology(id, definitionProjectIds, definitionFingerprint) {
    const installed = this.readInstalled(id);
    if (!installed || installed.definitionProjectIds !== null || installed.definitionFingerprint !== definitionFingerprint) {
      return installed;
    }
    let resolved = installed;
    await this.#profile.update((draft) => {
      const latest = safeParse(parseInstalledKitState, draft.installedKits[id])[0] ?? null;
      resolved = latest;
      if (!latest || latest.definitionProjectIds !== null || latest.definitionFingerprint !== definitionFingerprint) {
        return;
      }
      resolved = { ...latest, definitionProjectIds: [...definitionProjectIds] };
      draft.installedKits[id] = resolved;
    });
    return resolved ? structuredClone(resolved) : null;
  }
  async create(input) {
    const now = this.#now();
    const kit2 = parsePersonalKit({
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
      if (draft.personalKits[kit2.id]) throw new Error("Kit ID already exists.");
      draft.personalKits[kit2.id] = kit2;
    });
    return structuredClone(kit2);
  }
  async importDefinition(value) {
    const kit2 = parsePersonalKit(value);
    await this.#profile.update((draft) => {
      if (draft.personalKits[kit2.id]) throw new Error("Kit ID already exists.");
      draft.personalKits[kit2.id] = kit2;
    });
    return structuredClone(kit2);
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
  async copyPublished(kit2) {
    return this.create({
      title: `${kit2.title} copy`,
      description: kit2.description,
      projectIds: kit2.components.map(({ projectId }) => projectId).filter((id) => id !== "mentallyquill-tavernary-companion"),
      origin: { kind: "published-copy", tavernaryKitId: kit2.id }
    });
  }
  async removeDefinition(id) {
    if (!this.readDefinition(id)) return false;
    if (this.readInstalled(id)) {
      throw new Error("Uninstall the Kit before removing its definition.");
    }
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

// src/kits/kit-reconciler.ts
function reconcileKitStatus({
  kitId,
  definitionFingerprint,
  published,
  installed,
  inventory,
  activeKitId
}) {
  if (!installed) return "saved";
  if (installed.definitionFingerprint !== definitionFingerprint) {
    return published ? "changedOnTavernary" : "drifted";
  }
  if (installed.status === "drifted") return "drifted";
  const present = /* @__PURE__ */ new Set([
    ...inventory.managed.map(({ project: project2 }) => project2.id),
    ...inventory.external.map(({ project: project2 }) => project2.id)
  ]);
  if (installed.status === "incomplete" || installed.missingProjectIds.length > 0 || installed.installedProjectIds.some((projectId) => !present.has(projectId))) {
    return "incomplete";
  }
  if (activeKitId === kitId) {
    const managedById = new Map(
      inventory.managed.map(({ project: project2, extension }) => [project2.id, extension])
    );
    if (installed.installedProjectIds.some((projectId) => {
      const managed = managedById.get(projectId);
      return managed ? !managed.enabled : false;
    })) {
      return "drifted";
    }
    return "active";
  }
  return "installed";
}

// src/kits/kit-portability.ts
var MAX_KIT_FILE_BYTES = 1024 * 1024;
function serializeKit(kit2) {
  const parsed = parsePersonalKit(kit2);
  return {
    text: `${JSON.stringify(parsed, null, 2)}
`,
    filename: `${slug(parsed.title)}.tavernary-kit.json`,
    mimeType: "application/json"
  };
}
function slug(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "kit";
}

// src/ui/kits/kit-export-action.ts
function exportKitFile(kit2) {
  const file = serializeKit(kit2);
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
function addDraftMembers(draft, projectIds) {
  return projectIds.reduce(addDraftMember, draft);
}
function moveDraftMember(draft, projectId, direction) {
  const index = draft.projectIds.indexOf(projectId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= draft.projectIds.length) return draft;
  const ids = [...draft.projectIds];
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return updateKitDraft(draft, { projectIds: ids });
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

// src/ui/shared/category-icon.tsx
var strokeProps = {
  "aria-hidden": true,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
function CategoryIcon({ name }) {
  if (name === "remove") {
    return /* @__PURE__ */ u3("svg", { "aria-hidden": "true", "data-icon": name, viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ u3(
      "path",
      {
        fillRule: "evenodd",
        d: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM7.293 7.293a1 1 0 0 1 1.414 0L12 10.586l3.293-3.293a1 1 0 1 1 1.414 1.414L13.414 12l3.293 3.293a1 1 0 0 1-1.414 1.414L12 13.414l-3.293 3.293a1 1 0 0 1-1.414-1.414L10.586 12 7.293 8.707a1 1 0 0 1 0-1.414Z"
      }
    ) });
  }
  if (name === "kit-builder") {
    return /* @__PURE__ */ u3("svg", { "aria-hidden": "true", "data-icon": name, viewBox: "0 0 1920 1920", fill: "currentColor", children: /* @__PURE__ */ u3(
      "path",
      {
        fillRule: "evenodd",
        d: "M1807.124.056V1920h-112.938V.056h112.938ZM1468.254 0v1919.944H282.407c-93.4 0-169.407-75.895-169.407-169.407V169.407C113 76.007 189.007 0 282.407 0h1185.847ZM830.607 661.138 588.242 903.503h654.137v112.938H588.242l242.365 242.477-79.847 79.847-378.793-378.793 378.793-378.68 79.847 79.846Z"
      }
    ) });
  }
  if (name === "kit") {
    return /* @__PURE__ */ u3(
      "svg",
      {
        "aria-hidden": "true",
        "data-icon": name,
        viewBox: "3 3 26 26",
        fill: "currentColor",
        stroke: "none",
        children: /* @__PURE__ */ u3("path", { d: "M29,5a2,2,0,0,0-2-2H5A2,2,0,0,0,3,5V27a2,2,0,0,0,2,2H27a2,2,0,0,0,2-2ZM27,5V9H5V5Zm0,22H5V23H27Zm0-6H5V17H27Zm0-6H5V11H27Z" })
      }
    );
  }
  if (name === "add-to-kit") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: /* @__PURE__ */ u3("path", { d: "M4 6h10v12H4zM17 8v8M13 12h8" }) });
  }
  if (name === "duplicate") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: [
      /* @__PURE__ */ u3("rect", { x: "7", y: "7", width: "12", height: "12", rx: "2" }),
      /* @__PURE__ */ u3("path", { d: "M5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" })
    ] });
  }
  if (name === "copy-link") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: /* @__PURE__ */ u3("path", { d: "M9 15 15 9M7.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0M16.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0" }) });
  }
  if (name === "report" || name === "caution") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: [
      /* @__PURE__ */ u3("path", { d: "M12 3 2.5 20h19L12 3Z" }),
      /* @__PURE__ */ u3("path", { d: "M12 9v5M12 17h.01" })
    ] });
  }
  if (name === "drag-handle") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: /* @__PURE__ */ u3("path", { d: "M8 6h8M8 12h8M8 18h8" }) });
  }
  if (name === "frontend") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: [
      /* @__PURE__ */ u3("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
      /* @__PURE__ */ u3("path", { d: "M3 8h18M8 8v12M11 12h6M11 16h4" })
    ] });
  }
  if (name === "preset") {
    return /* @__PURE__ */ u3(
      "svg",
      {
        "aria-hidden": "true",
        "data-icon": name,
        viewBox: "0 0 24 24",
        fill: "currentColor",
        stroke: "none",
        children: [
          /* @__PURE__ */ u3(
            "path",
            {
              fillRule: "evenodd",
              clipRule: "evenodd",
              d: "M12.0002 8C9.79111 8 8.00024 9.79086 8.00024 12C8.00024 14.2091 9.79111 16 12.0002 16C14.2094 16 16.0002 14.2091 16.0002 12C16.0002 9.79086 14.2094 8 12.0002 8ZM10.0002 12C10.0002 10.8954 10.8957 10 12.0002 10C13.1048 10 14.0002 10.8954 14.0002 12C14.0002 13.1046 13.1048 14 12.0002 14C10.8957 14 10.0002 13.1046 10.0002 12Z"
            }
          ),
          /* @__PURE__ */ u3(
            "path",
            {
              fillRule: "evenodd",
              clipRule: "evenodd",
              d: "M11.2867 0.5C9.88583 0.5 8.6461 1.46745 8.37171 2.85605L8.29264 3.25622C8.10489 4.20638 7.06195 4.83059 6.04511 4.48813L5.64825 4.35447C4.32246 3.90796 2.83873 4.42968 2.11836 5.63933L1.40492 6.83735C0.67773 8.05846 0.954349 9.60487 2.03927 10.5142L2.35714 10.7806C3.12939 11.4279 3.12939 12.5721 2.35714 13.2194L2.03927 13.4858C0.954349 14.3951 0.67773 15.9415 1.40492 17.1626L2.11833 18.3606C2.83872 19.5703 4.3225 20.092 5.64831 19.6455L6.04506 19.5118C7.06191 19.1693 8.1049 19.7935 8.29264 20.7437L8.37172 21.1439C8.6461 22.5325 9.88584 23.5 11.2867 23.5H12.7136C14.1146 23.5 15.3543 22.5325 15.6287 21.1438L15.7077 20.7438C15.8954 19.7936 16.9384 19.1693 17.9553 19.5118L18.3521 19.6455C19.6779 20.092 21.1617 19.5703 21.8821 18.3606L22.5955 17.1627C23.3227 15.9416 23.046 14.3951 21.9611 13.4858L21.6432 13.2194C20.8709 12.5722 20.8709 11.4278 21.6432 10.7806L21.9611 10.5142C23.046 9.60489 23.3227 8.05845 22.5955 6.83732L21.8821 5.63932C21.1617 4.42968 19.678 3.90795 18.3522 4.35444L17.9552 4.48814C16.9384 4.83059 15.8954 4.20634 15.7077 3.25617L15.6287 2.85616C15.3543 1.46751 14.1146 0.5 12.7136 0.5H11.2867ZM10.3338 3.24375C10.4149 2.83334 10.7983 2.5 11.2867 2.5H12.7136C13.2021 2.5 13.5855 2.83336 13.6666 3.24378L13.7456 3.64379C14.1791 5.83811 16.4909 7.09167 18.5935 6.38353L18.9905 6.24984C19.4495 6.09527 19.9394 6.28595 20.1637 6.66264L20.8771 7.86064C21.0946 8.22587 21.0208 8.69271 20.6764 8.98135L20.3586 9.24773C18.6325 10.6943 18.6325 13.3057 20.3586 14.7523L20.6764 15.0186C21.0208 15.3073 21.0946 15.7741 20.8771 16.1394L20.1637 17.3373C19.9394 17.714 19.4495 17.9047 18.9905 17.7501L18.5936 17.6164C16.4909 16.9082 14.1791 18.1618 13.7456 20.3562L13.6666 20.7562C13.5855 21.1666 13.2021 21.5 12.7136 21.5H11.2867C10.7983 21.5 10.4149 21.1667 10.3338 20.7562L10.2547 20.356C9.82113 18.1617 7.50931 16.9082 5.40665 17.6165L5.0099 17.7501C4.55092 17.9047 4.06104 17.714 3.83671 17.3373L3.1233 16.1393C2.9058 15.7741 2.97959 15.3073 3.32398 15.0186L3.64185 14.7522C5.36782 13.3056 5.36781 10.6944 3.64185 9.24779L3.32398 8.98137C2.97959 8.69273 2.9058 8.2259 3.1233 7.86067L3.83674 6.66266C4.06106 6.28596 4.55093 6.09528 5.0099 6.24986L5.40676 6.38352C7.50938 7.09166 9.82112 5.83819 10.2547 3.64392L10.3338 3.24375Z"
            }
          )
        ]
      }
    );
  }
  if (name === "memory-retrieval") {
    return /* @__PURE__ */ u3(
      "svg",
      {
        "aria-hidden": "true",
        "data-icon": name,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.91",
        strokeMiterlimit: "10",
        children: [
          /* @__PURE__ */ u3("path", { d: "M12,4.36V20.59a1.92,1.92,0,0,1-1.91,1.91,1.93,1.93,0,0,1-1.91-1.91v0a2.45,2.45,0,0,1-.48,0,3.35,3.35,0,0,1-3.34-3.34,3.19,3.19,0,0,1,.08-.7A4.29,4.29,0,0,1,3.6,8.79,3.24,3.24,0,0,1,3.41,7.7,3.34,3.34,0,0,1,6.27,4.4v0a2.87,2.87,0,0,1,5.73,0Z" }),
          /* @__PURE__ */ u3("path", { d: "M6.75,11.05a3.35,3.35,0,0,1,0-6.69" }),
          /* @__PURE__ */ u3("path", { d: "M8.18,13.91h0A3.82,3.82,0,0,1,12,17.73h0" }),
          /* @__PURE__ */ u3("path", { d: "M9.14,7.23h0A2.86,2.86,0,0,0,12,4.36h0" }),
          /* @__PURE__ */ u3("path", { d: "M12,4.36V20.59a1.92,1.92,0,0,0,1.91,1.91,1.93,1.93,0,0,0,1.91-1.91v0a2.45,2.45,0,0,0,.48,0,3.35,3.35,0,0,0,3.34-3.34,3.19,3.19,0,0,0-.08-.7,4.29,4.29,0,0,0,.84-7.76,3.24,3.24,0,0,0,.19-1.09,3.34,3.34,0,0,0-2.86-3.3v0a2.87,2.87,0,0,0-5.73,0Z" }),
          /* @__PURE__ */ u3("path", { d: "M17.25,11.05a3.35,3.35,0,0,0,0-6.69" }),
          /* @__PURE__ */ u3("path", { d: "M15.82,13.91h0A3.82,3.82,0,0,0,12,17.73h0" }),
          /* @__PURE__ */ u3("path", { d: "M14.86,7.23h0A2.86,2.86,0,0,1,12,4.36h0" })
        ]
      }
    );
  }
  if (name === "generation-reasoning") {
    return /* @__PURE__ */ u3(
      "svg",
      {
        "aria-hidden": "true",
        "data-icon": name,
        viewBox: "0 0 487.6 487.6",
        fill: "currentColor",
        stroke: "none",
        children: /* @__PURE__ */ u3("path", { d: "M453.8,20.525H173.1c-18.6,0-33.8,15.2-33.8,33.8v117.4H19.5c-10.8,0-19.5,8.7-19.5,19.5v186.8c0,10.8,8.7,19.5,19.5,19.5h27.7v64.6c0,4.4,5.3,6.6,8.4,3.5l68.1-68.1h195.4c10.8,0,19.5-8.7,19.5-19.5v-114.9h11.2l59.3,59.3c3.8,3.8,8.8,5.9,14.2,5.9c5.1,0,10-1.9,13.8-5.4c4-3.8,6.3-9.1,6.3-14.7v-45.1h10.4c18.6,0,33.8-15.2,33.8-33.8v-175C487.6,35.725,472.5,20.525,453.8,20.525z M127.7,215.425h151.7v20.2H127.7V215.425z M58.9,215.425h45.7v20.2H58.9V215.425z M58.9,254.725h104.8v20.2H58.9V254.725z M58.9,294.025h151.7v20.2H58.9V294.025z M163.7,353.525H58.9v-20.2h104.8V353.525z M279.7,353.525h-92.9v-20.2h92.9V353.525z M233.7,314.225v-20.2h45.7v20.2H233.7z M279.7,274.925h-92.9v-20.2h92.9V274.925z M456.7,229.325c0,1.6-1.3,2.8-2.8,2.8h-41.5v49.8l-49.8-49.8h-23.9v-41c0-10.8-8.7-19.5-19.5-19.5h-149v-117.3c0-1.6,1.3-2.8,2.8-2.8h280.8c1.6,0,2.8,1.3,2.8,2.8v175H456.7z" })
      }
    );
  }
  if (name === "character-worldbuilding") {
    return /* @__PURE__ */ u3(
      "svg",
      {
        "aria-hidden": "true",
        "data-icon": name,
        viewBox: "0 0 512 512",
        fill: "currentColor",
        stroke: "none",
        children: /* @__PURE__ */ u3("path", { d: "M512 0C460.22 3.56 96.44 38.2 71.01 287.61c-3.09 26.66-4.84 53.44-5.99 80.24l178.87-178.69c6.25-6.25 16.4-6.25 22.65 0s6.25 16.38 0 22.63L7.04 471.03c-9.38 9.37-9.38 24.57 0 33.94 9.38 9.37 24.59 9.37 33.98 0l57.13-57.07c42.09-.14 84.15-2.53 125.96-7.36 53.48-5.44 97.02-26.47 132.58-56.54H255.74l146.79-48.88c11.25-14.89 21.37-30.71 30.45-47.12h-81.14l106.54-53.21C500.29 132.86 510.19 26.26 512 0z" })
      }
    );
  }
  if (name === "rpg-systems") {
    return /* @__PURE__ */ u3(
      "svg",
      {
        "aria-hidden": "true",
        "data-icon": name,
        viewBox: "-16 0 512 512",
        fill: "currentColor",
        stroke: "none",
        children: /* @__PURE__ */ u3("path", { d: "M106.75 215.06L1.2 370.95c-3.08 5 .1 11.5 5.93 12.14l208.26 22.07-108.64-190.1zM7.41 315.43L82.7 193.08 6.06 147.1c-2.67-1.6-6.06.32-6.06 3.43v162.81c0 4.03 5.29 5.53 7.41 2.09zM18.25 423.6l194.4 87.66c5.3 2.45 11.35-1.43 11.35-7.26v-65.67l-203.55-22.3c-4.45-.5-6.23 5.59-2.2 7.57zm81.22-257.78L179.4 22.88c4.34-7.06-3.59-15.25-10.78-11.14L17.81 110.35c-2.47 1.62-2.39 5.26.13 6.78l81.53 48.69zM240 176h109.21L253.63 7.62C250.5 2.54 245.25 0 240 0s-10.5 2.54-13.63 7.62L130.79 176H240zm233.94-28.9l-76.64 45.99 75.29 122.35c2.11 3.44 7.41 1.94 7.41-2.1V150.53c0-3.11-3.39-5.03-6.06-3.43zm-93.41 18.72l81.53-48.7c2.53-1.52 2.6-5.16.13-6.78l-150.81-98.6c-7.19-4.11-15.12 4.08-10.78 11.14l79.93 142.94zm79.02 250.21L256 438.32v65.67c0 5.84 6.05 9.71 11.35 7.26l194.4-87.66c4.03-1.97 2.25-8.06-2.2-7.56zm-86.3-200.97l-108.63 190.1 208.26-22.07c5.83-.65 9.01-7.14 5.93-12.14L373.25 215.06zM240 208H139.57L240 383.75 340.43 208H240z" })
      }
    );
  }
  if (name === "interface-workflow") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: [
      /* @__PURE__ */ u3("path", { d: "M4 6h5m4 0h7M4 12h10m4 0h2M4 18h2m4 0h10" }),
      /* @__PURE__ */ u3("circle", { cx: "11", cy: "6", r: "2" }),
      /* @__PURE__ */ u3("circle", { cx: "16", cy: "12", r: "2" }),
      /* @__PURE__ */ u3("circle", { cx: "8", cy: "18", r: "2" })
    ] });
  }
  if (name === "developer-infrastructure") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: [
      /* @__PURE__ */ u3("path", { d: "m7 3 5 3-5 3-5-3 5-3Zm10 0 5 3-5 3-5-3 5-3ZM7 12l5 3-5 3-5-3 5-3Zm10 0 5 3-5 3-5-3 5-3Z" }),
      /* @__PURE__ */ u3("path", { d: "M7 9v3m10-3v3m-5-6v9" })
    ] });
  }
  if (name === "community") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: [
      /* @__PURE__ */ u3("circle", { cx: "7", cy: "7", r: "3" }),
      /* @__PURE__ */ u3("circle", { cx: "17", cy: "8", r: "3" }),
      /* @__PURE__ */ u3("circle", { cx: "12", cy: "17", r: "3" }),
      /* @__PURE__ */ u3("path", { d: "m9.8 7.3 4.3.4m-5.4 2 2.1 4.5m4.8-3.7-2.1 3.8" })
    ] });
  }
  if (name === "search") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: [
      /* @__PURE__ */ u3("circle", { cx: "11", cy: "11", r: "7" }),
      /* @__PURE__ */ u3("path", { d: "m20 20-4-4" })
    ] });
  }
  if (name === "chevron") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: /* @__PURE__ */ u3("path", { d: "m6 9 6 6 6-6" }) });
  }
  if (name === "filter" || name === "filter-lines") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: /* @__PURE__ */ u3("path", { d: "M4 6h16M7 12h10M10 18h4" }) });
  }
  if (name === "collapse") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 32 32", children: /* @__PURE__ */ u3("path", { d: "M23 26l-7-7-7 7M9 6l7 7 7-7" }) });
  }
  if (name === "close") {
    return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: /* @__PURE__ */ u3("path", { d: "m6 6 12 12M18 6 6 18" }) });
  }
  return /* @__PURE__ */ u3("svg", { ...strokeProps, "data-icon": name, viewBox: "0 0 24 24", children: /* @__PURE__ */ u3("path", { d: "M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5H5z" }) });
}

// src/ui/kits/kit-member-row.tsx
function KitMemberRow({
  id,
  name,
  kind = "extension",
  onDragStart,
  onMove,
  onRemove
}) {
  return /* @__PURE__ */ u3("li", { class: "tavernary-companion-kit-builder-row", "data-project-id": id, "data-kind": kind, children: [
    /* @__PURE__ */ u3(
      "button",
      {
        type: "button",
        class: "tavernary-companion-kit-drag-handle",
        "aria-label": `Drag ${name} to reorder`,
        onPointerDown: onDragStart,
        onKeyDown: (event) => {
          if (!event.altKey || event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          onMove(event.key === "ArrowUp" ? -1 : 1);
        },
        children: /* @__PURE__ */ u3(CategoryIcon, { name: "drag-handle" })
      }
    ),
    /* @__PURE__ */ u3("span", { class: "tavernary-companion-kit-builder-row__identity", children: [
      /* @__PURE__ */ u3("strong", { children: name }),
      /* @__PURE__ */ u3("small", { children: kind })
    ] }),
    /* @__PURE__ */ u3(
      "button",
      {
        type: "button",
        class: "tavernary-companion-kit-builder-remove",
        "aria-label": `Remove ${name} from Kit`,
        "aria-pressed": "true",
        onClick: onRemove,
        children: /* @__PURE__ */ u3("span", { "aria-hidden": "true", children: "\u2212" })
      }
    )
  ] });
}

// src/ui/kits/kit-editor.tsx
function useTransitionPresence(visible, durationMs) {
  const [state, setState] = d2(() => ({
    observedVisible: visible,
    present: visible,
    phase: visible ? "entering" : "exiting"
  }));
  const frameRef = A2(null);
  const timerRef = A2(null);
  if (state.observedVisible !== visible) {
    setState({
      observedVisible: visible,
      present: visible || state.present,
      phase: visible ? "entering" : "exiting"
    });
  }
  h2(() => {
    let cancelled = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (visible) {
      const finishEntry = () => {
        if (cancelled) return;
        setState(
          (current) => current.observedVisible ? { ...current, present: true, phase: "entered" } : current
        );
      };
      if (reducedMotion) queueMicrotask(finishEntry);
      else {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          finishEntry();
        });
      }
    } else {
      const finishExit = () => {
        if (cancelled) return;
        setState(
          (current) => current.observedVisible ? current : { ...current, present: false, phase: "exiting" }
        );
      };
      if (reducedMotion) queueMicrotask(finishExit);
      else {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          finishExit();
        }, durationMs);
      }
    }
    return () => {
      cancelled = true;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [durationMs, visible]);
  return { present: state.present, phase: state.phase };
}
function KitEditor({
  draft,
  projects,
  collapsed,
  onStart,
  onUpdate,
  onCollapse,
  onDiscard,
  onSave
}) {
  const [compact, setCompact] = d2(false);
  const [confirmDiscard, setConfirmDiscard] = d2(false);
  const [submitAttempted, setSubmitAttempted] = d2(false);
  const panelRef = A2(null);
  const mobileOpenerRef = A2(null);
  const restoreMobileFocusRef = A2(false);
  const lastDraftRef = A2(draft);
  const onCollapseRef = A2(onCollapse);
  const discardDialogRef = A2(null);
  const discardTriggerRef = A2(null);
  const keepEditingRef = A2(null);
  const stackRef = A2(null);
  const dragCleanupRef = A2(() => void 0);
  const titleRef = A2(null);
  const formId = g2();
  const titleCountId = `${formId}-title-count`;
  const titleErrorId = `${formId}-title-error`;
  const descriptionCountId = `${formId}-description-count`;
  const discardTitleId = `${formId}-discard-title`;
  const discardDescriptionId = `${formId}-discard-description`;
  onCollapseRef.current = onCollapse;
  if (draft) lastDraftRef.current = draft;
  const mobileSheetVisible = compact && !collapsed && draft !== null;
  const mobilePresence = useTransitionPresence(mobileSheetVisible, 220);
  const renderedDraft = draft ?? (compact && mobilePresence.present ? lastDraftRef.current : null);
  const count = renderedDraft?.projectIds.length ?? 0;
  const projectCount = `${count} ${count === 1 ? "project" : "projects"}`;
  const titleIssue = renderedDraft?.issues.find((issue) => issue.startsWith("Title"));
  const compositionIssues = renderedDraft?.issues.filter((issue) => issue !== titleIssue) ?? [];
  const mobileModalOpen = compact && mobilePresence.present && renderedDraft !== null;
  h2(() => {
    const root = panelRef.current?.closest(".tavernary-companion-root");
    const sync = () => {
      const width = root?.clientWidth || window.innerWidth;
      setCompact(width <= 760);
    };
    sync();
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  h2(() => {
    if (!mobileModalOpen) return;
    const panel = panelRef.current;
    const root = panel?.closest(".tavernary-companion-root");
    const background = root ? Array.from(
      root.querySelectorAll(
        ".tavernary-companion-shell__header, .tavernary-companion-category-navigation, .tavernary-companion-shell__content"
      )
    ) : [];
    const priorInert = background.map((element) => ({ element, inert: element.inert }));
    for (const element of background) element.inert = true;
    panel?.querySelector("h2")?.focus({ preventScroll: true });
    const controls = () => panel?.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
    ) ?? [];
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCollapseRef.current();
        return;
      }
      const focusable = controls();
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last2 = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last2.focus();
      } else if (!event.shiftKey && document.activeElement === last2) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      for (const { element, inert } of priorInert) element.inert = inert;
    };
  }, [mobileModalOpen]);
  h2(() => {
    if (mobileModalOpen) {
      restoreMobileFocusRef.current = true;
      return;
    }
    if (!restoreMobileFocusRef.current || mobilePresence.present) return;
    restoreMobileFocusRef.current = false;
    const timer = window.setTimeout(() => {
      const opener = mobileOpenerRef.current;
      if (opener?.isConnected) opener.focus();
      else
        panelRef.current?.querySelector('[aria-label="Open Kit Builder"]')?.focus();
      mobileOpenerRef.current = null;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mobileModalOpen, mobilePresence.present]);
  const closeDiscard = () => {
    setConfirmDiscard(false);
    window.setTimeout(() => discardTriggerRef.current?.focus(), 0);
  };
  h2(() => {
    if (!confirmDiscard) return;
    keepEditingRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeDiscard();
        return;
      }
      if (event.key !== "Tab" || !discardDialogRef.current) return;
      const buttons = Array.from(
        discardDialogRef.current.querySelectorAll("button")
      );
      const first = buttons[0];
      const last2 = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last2?.focus();
      } else if (!event.shiftKey && document.activeElement === last2) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [confirmDiscard]);
  h2(() => {
    if (!draft) {
      setConfirmDiscard(false);
      setSubmitAttempted(false);
    }
  }, [draft]);
  h2(() => () => dragCleanupRef.current(), []);
  const openBuilder = (event) => {
    mobileOpenerRef.current = event.currentTarget;
    onStart();
  };
  const beginPointerReorder = (currentDraft2, projectId, event) => {
    if (event.button !== 0) return;
    dragCleanupRef.current();
    event.preventDefault();
    const sourceIndex = currentDraft2.projectIds.indexOf(projectId);
    if (sourceIndex < 0) return;
    const pointerId = event.pointerId;
    const originY = event.clientY;
    const handle = event.currentTarget;
    const row = handle.closest("[data-project-id]");
    let targetIndex = sourceIndex;
    let dragging = false;
    const cleanup2 = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      row?.classList.remove("dragging");
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      dragCleanupRef.current = () => void 0;
    };
    const move = (pointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      if (!dragging && Math.abs(pointerEvent.clientY - originY) < 5) return;
      if (!dragging) {
        dragging = true;
        handle.setPointerCapture(pointerId);
        row?.classList.add("dragging");
      }
      pointerEvent.preventDefault();
      const rows = Array.from(
        stackRef.current?.querySelectorAll("[data-project-id]") ?? []
      );
      const firstBelowPointer = rows.findIndex((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return pointerEvent.clientY < rect.top + rect.height / 2;
      });
      targetIndex = firstBelowPointer < 0 ? rows.length - 1 : firstBelowPointer;
    };
    const finish = (pointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      if (dragging && targetIndex !== sourceIndex) {
        const projectIds = [...currentDraft2.projectIds];
        const [moved] = projectIds.splice(sourceIndex, 1);
        projectIds.splice(targetIndex, 0, moved);
        onUpdate(updateKitDraft(currentDraft2, { projectIds }));
      }
      cleanup2();
    };
    const cancel = (pointerEvent) => {
      if (pointerEvent.pointerId === pointerId) cleanup2();
    };
    dragCleanupRef.current = cleanup2;
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
  };
  if (compact && collapsed && !renderedDraft && !mobilePresence.present) return null;
  if (collapsed && !(compact && mobilePresence.present)) {
    if (compact && renderedDraft) {
      return /* @__PURE__ */ u3(
        "aside",
        {
          ref: panelRef,
          class: "tavernary-companion-kit-draft-pill-container",
          "aria-label": "Kit draft",
          children: /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              class: "tavernary-companion-kit-draft-pill",
              "aria-label": "Open Kit Builder",
              onClick: openBuilder,
              children: [
                /* @__PURE__ */ u3(CategoryIcon, { name: "kit-builder" }),
                /* @__PURE__ */ u3("span", { children: "Kit draft" }),
                /* @__PURE__ */ u3("small", { children: projectCount })
              ]
            }
          )
        }
      );
    }
    return /* @__PURE__ */ u3(
      "aside",
      {
        ref: panelRef,
        class: "tavernary-companion-kit-builder-panel collapsed",
        "aria-label": "Kit Builder",
        children: /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-builder-rail", children: [
          /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              class: "tavernary-companion-kit-builder-toggle",
              "aria-label": "Open Kit Builder",
              onClick: openBuilder,
              children: /* @__PURE__ */ u3(CategoryIcon, { name: "kit-builder" })
            }
          ),
          /* @__PURE__ */ u3("span", { class: "tavernary-companion-kit-builder-rail__label", children: "Kit Builder" }),
          /* @__PURE__ */ u3("small", { "aria-hidden": "true", children: [
            projectCount,
            " in draft"
          ] })
        ] })
      }
    );
  }
  if (!renderedDraft) return null;
  const currentDraft = renderedDraft;
  const byId = new Map(projects.map((project2) => [project2.id, project2]));
  return /* @__PURE__ */ u3(
    "aside",
    {
      ref: panelRef,
      class: "tavernary-companion-kit-builder-panel",
      "aria-label": "Kit Builder",
      role: compact ? "dialog" : "complementary",
      "aria-modal": compact || void 0,
      "data-layout": compact ? "mobile" : "desktop",
      "data-motion-phase": compact ? mobilePresence.phase : void 0,
      children: [
        /* @__PURE__ */ u3("header", { class: "tavernary-companion-kit-builder-panel__header", children: [
          /* @__PURE__ */ u3("h2", { tabIndex: -1, children: "Kit Builder" }),
          /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              class: "tavernary-companion-kit-builder-collapse",
              "aria-label": compact ? "Close Kit Builder" : "Collapse Kit Builder",
              onClick: () => onCollapseRef.current(),
              children: /* @__PURE__ */ u3(CategoryIcon, { name: compact ? "close" : "kit-builder" })
            }
          )
        ] }),
        /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-builder-panel__body", children: [
          /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-builder-heading", children: [
            /* @__PURE__ */ u3("h2", { children: currentDraft.sourceId ? "Edit Kit" : "Create Kit" }),
            /* @__PURE__ */ u3(
              "button",
              {
                ref: discardTriggerRef,
                type: "button",
                class: "tavernary-companion-kit-discard",
                "aria-label": "Discard draft",
                onClick: () => setConfirmDiscard(true),
                children: /* @__PURE__ */ u3(CategoryIcon, { name: "remove" })
              }
            )
          ] }),
          /* @__PURE__ */ u3(
            "form",
            {
              class: "tavernary-companion-kit-builder",
              onSubmit: (event) => {
                event.preventDefault();
                if (currentDraft.issues.length === 0) {
                  onSave(currentDraft);
                  return;
                }
                setSubmitAttempted(true);
                queueMicrotask(() => titleRef.current?.focus());
              },
              children: [
                /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-builder-field", children: [
                  /* @__PURE__ */ u3("label", { for: `${formId}-title`, children: "Title" }),
                  /* @__PURE__ */ u3(
                    "input",
                    {
                      ref: titleRef,
                      id: `${formId}-title`,
                      type: "text",
                      maxLength: 60,
                      value: currentDraft.title,
                      "aria-describedby": `${titleCountId}${submitAttempted && titleIssue ? ` ${titleErrorId}` : ""}`,
                      "aria-invalid": submitAttempted && Boolean(titleIssue) || void 0,
                      onInput: (event) => onUpdate(updateKitDraft(currentDraft, { title: event.currentTarget.value }))
                    }
                  ),
                  /* @__PURE__ */ u3("small", { id: titleCountId, children: [
                    currentDraft.title.length,
                    "/60 characters"
                  ] }),
                  submitAttempted && titleIssue ? /* @__PURE__ */ u3("span", { id: titleErrorId, class: "tavernary-companion-kit-builder-field-error", children: titleIssue }) : null
                ] }),
                /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-builder-field", children: [
                  /* @__PURE__ */ u3("label", { for: `${formId}-description`, children: "Description" }),
                  /* @__PURE__ */ u3(
                    "textarea",
                    {
                      id: `${formId}-description`,
                      maxLength: 600,
                      value: currentDraft.description,
                      "aria-describedby": descriptionCountId,
                      onInput: (event) => onUpdate(updateKitDraft(currentDraft, { description: event.currentTarget.value }))
                    }
                  ),
                  /* @__PURE__ */ u3("small", { id: descriptionCountId, children: [
                    currentDraft.description.length,
                    "/600 characters"
                  ] })
                ] }),
                /* @__PURE__ */ u3(
                  "section",
                  {
                    class: "tavernary-companion-kit-composition",
                    "aria-labelledby": `${formId}-frontend`,
                    children: [
                      /* @__PURE__ */ u3("h3", { id: `${formId}-frontend`, children: "Frontend" }),
                      /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-frontend-slot", children: [
                        /* @__PURE__ */ u3(CategoryIcon, { name: "frontend" }),
                        /* @__PURE__ */ u3("strong", { children: "SillyTavern" })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ u3("section", { class: "tavernary-companion-kit-composition", "aria-labelledby": `${formId}-stack`, children: [
                  /* @__PURE__ */ u3("h3", { id: `${formId}-stack`, children: "Extensions & Presets" }),
                  /* @__PURE__ */ u3(
                    "ol",
                    {
                      ref: stackRef,
                      class: "tavernary-companion-kit-builder-stack",
                      "aria-label": "Ordered Kit projects",
                      children: [
                        currentDraft.projectIds.length === 0 ? /* @__PURE__ */ u3("li", { class: "tavernary-companion-kit-builder-empty", children: "Add projects from the catalog" }) : null,
                        currentDraft.projectIds.map((id) => {
                          const project2 = byId.get(id);
                          return /* @__PURE__ */ u3(
                            KitMemberRow,
                            {
                              id,
                              name: project2?.name ?? id,
                              kind: project2?.kind ?? "extension",
                              onDragStart: (event) => beginPointerReorder(currentDraft, id, event),
                              onMove: (direction) => onUpdate(moveDraftMember(currentDraft, id, direction)),
                              onRemove: () => onUpdate(
                                updateKitDraft(currentDraft, {
                                  projectIds: currentDraft.projectIds.filter(
                                    (candidate) => candidate !== id
                                  )
                                })
                              )
                            },
                            id
                          );
                        })
                      ]
                    }
                  )
                ] }),
                submitAttempted && compositionIssues.length ? /* @__PURE__ */ u3("ul", { class: "tavernary-companion-kit-builder-errors", "aria-label": "Kit validation", children: compositionIssues.map((issue) => /* @__PURE__ */ u3("li", { children: issue }, issue)) }) : null,
                /* @__PURE__ */ u3("footer", { class: "tavernary-companion-kit-builder-footer", children: [
                  /* @__PURE__ */ u3("span", { children: projectCount }),
                  /* @__PURE__ */ u3(
                    "button",
                    {
                      type: "submit",
                      class: "tavernary-companion-button tavernary-companion-button--primary",
                      children: "Save Kit"
                    }
                  )
                ] })
              ]
            }
          )
        ] }),
        confirmDiscard ? /* @__PURE__ */ u3(
          "div",
          {
            class: "tavernary-companion-kit-discard-backdrop",
            onMouseDown: (event) => {
              if (event.target === event.currentTarget) closeDiscard();
            },
            children: /* @__PURE__ */ u3(
              "section",
              {
                ref: discardDialogRef,
                class: "tavernary-companion-kit-discard-dialog",
                role: "dialog",
                "aria-modal": "true",
                "aria-labelledby": discardTitleId,
                "aria-describedby": discardDescriptionId,
                children: [
                  /* @__PURE__ */ u3("h2", { id: discardTitleId, children: "Discard Kit changes?" }),
                  /* @__PURE__ */ u3("p", { id: discardDescriptionId, children: "Your unsaved changes will be lost." }),
                  /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-discard-actions", children: [
                    /* @__PURE__ */ u3(
                      "button",
                      {
                        ref: keepEditingRef,
                        type: "button",
                        class: "tavernary-companion-kit-discard-keep",
                        onClick: closeDiscard,
                        children: "Keep editing"
                      }
                    ),
                    /* @__PURE__ */ u3(
                      "button",
                      {
                        type: "button",
                        class: "tavernary-companion-kit-discard-confirm",
                        onClick: onDiscard,
                        children: "Discard changes"
                      }
                    )
                  ] })
                ]
              }
            )
          }
        ) : null
      ]
    }
  );
}

// src/ui/kits/kit-receipt.tsx
function KitReceipt({
  receipt,
  onDismiss,
  onReload,
  onRetry
}) {
  return /* @__PURE__ */ u3("article", { class: "tavernary-companion-kit-receipt", children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("h3", { children: receipt.operation === "activate" && receipt.outcome === "completed" ? "Managed Kit activated" : receiptHeading(receipt.outcome) }),
        receipt.previousActiveKitId && receipt.activeKitId === receipt.previousActiveKitId && receipt.outcome !== "completed" ? /* @__PURE__ */ u3("p", { children: [
          receipt.previousActiveKitId,
          " remains active."
        ] }) : null
      ] }),
      /* @__PURE__ */ u3("button", { type: "button", onClick: onDismiss, children: "Dismiss" })
    ] }),
    /* @__PURE__ */ u3("ul", { children: receipt.projects.map((project2, index) => /* @__PURE__ */ u3("li", { children: [
      /* @__PURE__ */ u3("strong", { children: project2.projectId }),
      /* @__PURE__ */ u3("span", { children: [
        actionLabel(project2.action),
        " \xB7 ",
        statusLabel2(project2.status)
      ] }),
      /* @__PURE__ */ u3("span", { children: project2.message })
    ] }, `${project2.projectId}-${project2.action}-${index}`)) }),
    receipt.reloadRequired ? /* @__PURE__ */ u3("button", { type: "button", onClick: onReload, children: "Reload now" }) : null,
    receipt.projects.some(({ retryable }) => retryable) ? /* @__PURE__ */ u3("button", { type: "button", onClick: onRetry, children: "Try again" }) : null
  ] });
}
function receiptHeading(outcome) {
  return {
    completed: "Kit finished",
    partial: "Kit partly finished",
    failed: "Kit didn't finish",
    interrupted: "Kit was interrupted"
  }[outcome];
}
function actionLabel(action) {
  return {
    install: "Install",
    enable: "Enable",
    disable: "Disable",
    remove: "Remove",
    keep: "Keep",
    context: "Check"
  }[action];
}
function statusLabel2(status) {
  return {
    verified: "Finished",
    failed: "Needs attention",
    untouched: "Not started",
    kept: "Kept",
    external: "Left as is",
    context: "No change needed"
  }[status];
}

// src/ui/kits/kit-operation-tray.tsx
function KitOperationTray({
  active,
  receipt,
  onDismiss,
  onReload,
  onRetry
}) {
  if (active?.operationId.startsWith("kit:"))
    return /* @__PURE__ */ u3("aside", { class: "tavernary-companion-kit-operation-tray", role: "status", "aria-live": "polite", children: [
      /* @__PURE__ */ u3("span", { "aria-hidden": "true" }),
      " ",
      /* @__PURE__ */ u3("p", { children: phase(active.phase) })
    ] });
  if (receipt)
    return /* @__PURE__ */ u3("aside", { class: "tavernary-companion-kit-operation-tray", children: /* @__PURE__ */ u3(KitReceipt, { receipt, onDismiss, onReload, onRetry }) });
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

// src/ui/lifecycle/dialog-frame.tsx
function DialogFrame({
  label: label2,
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
      "aria-label": label2,
      class: `tavernary-companion-dialog ${className}`.trim(),
      children
    }
  ) });
}

// src/ui/kits/kit-impact-summary.tsx
var groups = [
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
  selectedInstallTargets,
  onReview
}) {
  if (!warnings.length) return null;
  const selected = new Map(
    (selectedInstallTargets ?? []).map((selection) => [selection.projectId, selection.target])
  );
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-kit-warnings", role: "alert", children: [
    /* @__PURE__ */ u3("h3", { children: "Before you install" }),
    /* @__PURE__ */ u3("p", { children: CURRENT_ASSESSMENT_WARNING }),
    /* @__PURE__ */ u3("ul", { children: warnings.map((warning) => /* @__PURE__ */ u3("li", { children: [
      /* @__PURE__ */ u3("span", { children: [
        /* @__PURE__ */ u3("strong", { children: warning.projectName }),
        " \xB7",
        " ",
        warning.severity === "high" ? "High concern" : "Needs a closer look",
        warningIsOlder(warning, selected.get(warning.projectId)) ? " \xB7 TavernKeeper checked an older version" : ""
      ] }),
      warning.reportUrl ? /* @__PURE__ */ u3("button", { type: "button", onClick: () => onReview(warning.reportUrl), children: "View check" }) : /* @__PURE__ */ u3("span", { children: "No scan link available" })
    ] }, warning.projectId)) })
  ] });
}
function warningIsOlder(warning, target) {
  if (warning.scannedSha && target?.requestedSha) {
    return warning.scannedSha.toLowerCase() !== target.requestedSha.toLowerCase();
  }
  return warning.freshness === "stale";
}

// node_modules/preact/compat/dist/compat.module.js
function g3(n2, t3) {
  for (var e3 in t3) n2[e3] = t3[e3];
  return n2;
}
function E2(n2, t3) {
  for (var e3 in n2) if ("__source" !== e3 && !(e3 in t3)) return true;
  for (var r3 in t3) if ("__source" !== r3 && n2[r3] !== t3[r3]) return true;
  return false;
}
function M2(n2, t3) {
  this.props = n2, this.context = t3;
}
(M2.prototype = new C()).isPureReactComponent = true, M2.prototype.shouldComponentUpdate = function(n2, t3) {
  return E2(this.props, n2) || E2(this.state, t3);
};
var T3 = l.__b;
l.__b = function(n2) {
  n2.type && n2.type.__f && n2.ref && (n2.props.ref = n2.ref, n2.ref = null), T3 && T3(n2);
};
var A3 = "undefined" != typeof Symbol && Symbol.for && Symbol.for("react.forward_ref") || 3911;
var O2 = l.__e;
l.__e = function(n2, t3, e3, r3) {
  if (n2.then) {
    for (var u4, o3 = t3; o3 = o3.__; ) if ((u4 = o3.__c) && u4.__c) return null == t3.__e && (t3.__e = e3.__e, t3.__k = e3.__k || []), u4.__c(n2, t3);
  }
  O2(n2, t3, e3, r3);
};
var U2 = l.unmount;
function V2(n2, t3, e3) {
  return n2 && (n2.__c && n2.__c.__H && (n2.__c.__H.__.forEach(function(n3) {
    "function" == typeof n3.__c && n3.__c();
  }), n2.__c.__H = null), null != (n2 = g3({}, n2)).__c && (n2.__c.__P === e3 && (n2.__c.__P = t3), n2.__c.__e = true, n2.__c = null), n2.__k = n2.__k && n2.__k.map(function(n3) {
    return V2(n3, t3, e3);
  })), n2;
}
function W2(n2, t3, e3) {
  return n2 && e3 && (n2.__v = null, n2.__k = n2.__k && n2.__k.map(function(n3) {
    return W2(n3, t3, e3);
  }), n2.__c && n2.__c.__P === t3 && (n2.__e && e3.appendChild(n2.__e), n2.__c.__e = true, n2.__c.__P = e3)), n2;
}
function P3() {
  this.__u = 0, this.o = null, this.__b = null;
}
function j3(n2) {
  var t3 = n2.__ && n2.__.__c;
  return t3 && t3.__a && t3.__a(n2);
}
function B3() {
  this.i = null, this.l = null;
}
l.unmount = function(n2) {
  var t3 = n2.__c;
  t3 && (t3.__z = true), t3 && t3.__R && t3.__R(), t3 && 32 & n2.__u && (n2.type = null), U2 && U2(n2);
}, (P3.prototype = new C()).__c = function(n2, t3) {
  var e3 = t3.__c, r3 = this;
  null == r3.o && (r3.o = []), r3.o.push(e3);
  var u4 = j3(r3.__v), o3 = false, i3 = function() {
    o3 || r3.__z || (o3 = true, e3.__R = null, u4 ? u4(f4) : f4());
  };
  e3.__R = i3;
  var l3 = e3.__P;
  e3.__P = null;
  var f4 = function() {
    if (!--r3.__u) {
      if (r3.state.__a) {
        var n3 = r3.state.__a;
        r3.__v.__k[0] = W2(n3, n3.__c.__P, n3.__c.__O);
      }
      var t4;
      for (r3.setState({ __a: r3.__b = null }); t4 = r3.o.pop(); ) t4.__P = l3, t4.forceUpdate();
    }
  };
  r3.__u++ || 32 & t3.__u || r3.setState({ __a: r3.__b = r3.__v.__k[0] }), n2.then(i3, i3);
}, P3.prototype.componentWillUnmount = function() {
  this.o = [];
}, P3.prototype.render = function(n2, e3) {
  if (this.__b) {
    if (this.__v.__k) {
      var r3 = document.createElement("div"), o3 = this.__v.__k[0].__c;
      this.__v.__k[0] = V2(this.__b, r3, o3.__O = o3.__P);
    }
    this.__b = null;
  }
  var i3 = e3.__a && k(S, null, n2.fallback);
  return i3 && (i3.__u &= -33), [k(S, null, e3.__a ? null : n2.children), i3];
};
var H2 = function(n2, t3, e3) {
  if (++e3[1] === e3[0] && n2.l.delete(t3), n2.props.revealOrder && ("t" !== n2.props.revealOrder[0] || !n2.l.size)) for (e3 = n2.i; e3; ) {
    for (; e3.length > 3; ) e3.pop()();
    if (e3[1] < e3[0]) break;
    n2.i = e3 = e3[2];
  }
};
function Z(n2) {
  return this.getChildContext = function() {
    return n2.context;
  }, n2.children;
}
function Y(n2) {
  var e3 = this, r3 = n2.h;
  if (e3.componentWillUnmount = function() {
    R(null, e3.v), e3.v = null, e3.h = null;
  }, e3.h && e3.h !== r3 && e3.componentWillUnmount(), !e3.v) {
    for (var u4 = e3.__v; null !== u4 && !u4.__m && null !== u4.__; ) u4 = u4.__;
    e3.h = r3, e3.v = { nodeType: 1, parentNode: r3, childNodes: [], __k: { __m: u4.__m }, contains: function() {
      return true;
    }, namespaceURI: r3.namespaceURI, insertBefore: function(n3, t3) {
      this.childNodes.push(n3), e3.h.insertBefore(n3, t3);
    }, removeChild: function(n3) {
      this.childNodes.splice(this.childNodes.indexOf(n3) >>> 1, 1), e3.h.removeChild(n3);
    } };
  }
  R(k(Z, { context: e3.context }, n2.__v), e3.v);
}
function $2(n2, e3) {
  var r3 = k(Y, { __v: n2, h: e3 });
  return r3.containerInfo = e3, r3;
}
(B3.prototype = new C()).__a = function(n2) {
  var t3 = this, e3 = j3(t3.__v), r3 = t3.l.get(n2);
  return r3[0]++, function(u4) {
    var o3 = function() {
      t3.props.revealOrder ? (r3.push(u4), H2(t3, n2, r3)) : u4();
    };
    e3 ? e3(o3) : o3();
  };
}, B3.prototype.render = function(n2) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var t3 = F(n2.children);
  n2.revealOrder && "b" === n2.revealOrder[0] && t3.reverse();
  for (var e3 = t3.length; e3--; ) this.l.set(t3[e3], this.i = [1, 0, this.i]);
  return n2.children;
}, B3.prototype.componentDidUpdate = B3.prototype.componentDidMount = function() {
  var n2 = this;
  this.l.forEach(function(t3, e3) {
    H2(n2, e3, t3);
  });
};
var q3 = "undefined" != typeof Symbol && Symbol.for && Symbol.for("react.element") || 60103;
var G2 = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;
var J2 = /^on(Ani|Tra|Tou|BeforeInp|Compo)/;
var K2 = /[A-Z0-9]/g;
var Q2 = "undefined" != typeof document;
var X2 = function(n2) {
  return ("undefined" != typeof Symbol && "symbol" == typeof Symbol() ? /fil|che|rad/ : /fil|che|ra/).test(n2);
};
C.prototype.isReactComponent = true, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(t3) {
  Object.defineProperty(C.prototype, t3, { configurable: true, get: function() {
    return this["UNSAFE_" + t3];
  }, set: function(n2) {
    Object.defineProperty(this, t3, { configurable: true, writable: true, value: n2 });
  } });
});
var en = l.event;
l.event = function(n2) {
  return en && (n2 = en(n2)), n2.persist = function() {
  }, n2.isPropagationStopped = function() {
    return this.cancelBubble;
  }, n2.isDefaultPrevented = function() {
    return this.defaultPrevented;
  }, n2.nativeEvent = n2;
};
var rn;
var un = { configurable: true, get: function() {
  return this.class;
} };
var on = l.vnode;
l.vnode = function(n2) {
  "string" == typeof n2.type && (function(n3) {
    var t3 = n3.props, e3 = n3.type, u4 = {}, o3 = -1 == e3.indexOf("-");
    for (var i3 in t3) {
      var l3 = t3[i3];
      if (!("value" === i3 && "defaultValue" in t3 && null == l3 || Q2 && "children" === i3 && "noscript" === e3 || "class" === i3 || "className" === i3)) {
        var f4 = i3.toLowerCase();
        "defaultValue" === i3 && "value" in t3 && null == t3.value ? i3 = "value" : "download" === i3 && true === l3 ? l3 = "" : "translate" === f4 && "no" === l3 ? l3 = false : "o" === f4[0] && "n" === f4[1] ? "ondoubleclick" === f4 ? i3 = "ondblclick" : "onchange" !== f4 || "input" !== e3 && "textarea" !== e3 || X2(t3.type) ? "onfocus" === f4 ? i3 = "onfocusin" : "onblur" === f4 ? i3 = "onfocusout" : J2.test(i3) && (i3 = f4) : f4 = i3 = "oninput" : o3 && G2.test(i3) ? i3 = i3.replace(K2, "-$&").toLowerCase() : null === l3 && (l3 = void 0), "oninput" === f4 && u4[i3 = f4] && (i3 = "oninputCapture"), u4[i3] = l3;
      }
    }
    "select" == e3 && (u4.multiple && Array.isArray(u4.value) && (u4.value = F(t3.children).forEach(function(n4) {
      n4.props.selected = -1 != u4.value.indexOf(n4.props.value);
    })), null != u4.defaultValue && (u4.value = F(t3.children).forEach(function(n4) {
      n4.props.selected = u4.multiple ? -1 != u4.defaultValue.indexOf(n4.props.value) : u4.defaultValue == n4.props.value;
    }))), t3.class && !t3.className ? (u4.class = t3.class, Object.defineProperty(u4, "className", un)) : t3.className && (u4.class = u4.className = t3.className), n3.props = u4;
  })(n2), n2.$$typeof = q3, on && on(n2);
};
var ln = l.__r;
l.__r = function(n2) {
  ln && ln(n2), rn = n2.__c;
};
var fn = l.diffed;
l.diffed = function(n2) {
  fn && fn(n2);
  var t3 = n2.props, e3 = n2.__e;
  null != e3 && "textarea" === n2.type && "value" in t3 && t3.value !== e3.value && (e3.value = null == t3.value ? "" : t3.value), rn = null;
};

// src/ui/shared/overlay-portal.ts
function resolveOverlayPortalTarget(source) {
  return source?.closest("dialog[open]") ?? document.body;
}

// src/ui/projects/tavernkeeper-history-strip.tsx
var riskLabels = {
  low: "low concern",
  material: "material concern",
  high: "immediate danger"
};
function TavernKeeperHistoryStrip({
  history
}) {
  const conclusions = history.slice(-12);
  if (conclusions.length < 2) return null;
  return /* @__PURE__ */ u3(
    "span",
    {
      class: "tavernary-companion-tavernkeeper-history",
      role: "group",
      "aria-label": "Recent TavernKeeper scan history",
      children: conclusions.map((conclusion) => {
        const label2 = `TavernKeeper scan history: ${riskLabels[conclusion.riskLevel]} on ${formatDate2(conclusion.assessedAt)} at commit ${conclusion.scannedSha.slice(0, 7)} under policy ${conclusion.scannerPolicyVersion}`;
        return /* @__PURE__ */ u3(
          "a",
          {
            "aria-label": `Open TavernKeeper report for ${label2}`,
            href: conclusion.reportUrl,
            rel: "noopener noreferrer",
            target: "_blank",
            children: /* @__PURE__ */ u3("i", { class: `risk-${conclusion.riskLevel}`, role: "img", "aria-label": label2 })
          },
          conclusion.reportId
        );
      })
    }
  );
}
function formatDate2(value) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(value));
}

// src/ui/projects/tavernkeeper-scan-indicator.tsx
var encodedCitationPattern = /\s*\uE200cite\uE202[^\uE201]*\uE201/giu;
var findingReferencePattern = /\s*\((?:V\d+\s+)?findings?\s+[^)]*\b[0-9a-f]{64}\b[^)]*\)/giu;
var bracketedFindingReferencePattern = /\s*\[[0-9a-f]{64}(?:,\s*[0-9a-f]{64})*\]/giu;
var danglingFindingReferencePattern = /\s*\[(?=[0-9a-f]{64}(?:,|$))[\s\S]*$/iu;
var bareFindingReferencePattern = /(?:Findings:\s*)?(?:\[|\(|【)?[0-9a-f]{64}\b(?:\]|\)|】)?/giu;
var invisibleFormattingPattern = /[\u200B-\u200D\u2060\uFEFF]/gu;
function conciseAssessmentSummary(summary) {
  const withoutArtifacts = summary.replace(encodedCitationPattern, "").replace(findingReferencePattern, "").replace(bracketedFindingReferencePattern, "").replace(danglingFindingReferencePattern, "").replace(bareFindingReferencePattern, "").replace(invisibleFormattingPattern, "");
  let display = withoutArtifacts.replace(/\s+([,.;!?])/gu, "$1").replace(/\s+/gu, " ").trim();
  if (withoutArtifacts !== summary && !/[.!?]["')\]]?$/u.test(display)) {
    const lastCompleteSentence = Math.max(
      display.lastIndexOf("."),
      display.lastIndexOf("!"),
      display.lastIndexOf("?")
    );
    if (lastCompleteSentence >= 0) display = display.slice(0, lastCompleteSentence + 1);
    else if (display) display += ".";
  }
  return display;
}
function stateCopy(status) {
  if (status.report) {
    const freshness = status.freshness === "stale" ? status.currentSha?.toLowerCase() === status.report.scannedSha.toLowerCase() ? " This version was scanned, but the assessment is due for refresh." : " The creator has published changes since this scan." : status.freshness === "unavailable" ? " Tavernary cannot confirm the repository's current commit, so freshness is unavailable." : "";
    return `${conciseAssessmentSummary(status.report.summary)}${freshness}`;
  }
  if (status.state === "unsupported") {
    return "TavernKeeper scanning is not supported for this project's source.";
  }
  if (status.freshness === "unavailable") {
    return "Tavernary cannot confirm the repository's current commit, and no completed assessment is available.";
  }
  return "This project hasn't been scanned by TavernKeeper.";
}
var freshnessLabels = {
  current: "current",
  stale: "stale assessment",
  unavailable: "freshness unavailable",
  unassessed: "not assessed",
  unsupported: "unsupported source"
};
var riskGradeLabels = {
  low: "Low concern",
  material: "Material concern",
  high: "Immediate danger"
};
var dangerBasisLabels = {
  malicious_or_compromised: "Credible malicious or compromised behavior",
  critical_exploitable_vulnerability: "Critical, readily exploitable vulnerability",
  mixed: "Malicious or compromised behavior and an exploitable vulnerability"
};
function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
function accessibleStatus(status) {
  if (!status.report) {
    if (status.freshness === "unsupported") return "Unsupported source.";
    if (status.freshness === "unavailable") return "Not assessed; freshness unavailable.";
    return "Not assessed.";
  }
  return `${riskGradeLabels[status.report.riskLevel]}; ${freshnessLabels[status.freshness]}.`;
}
var CLOSE_DELAY = 150;
var VIEWPORT_MARGIN = 8;
var POPOVER_GAP = 8;
var activeDismiss = null;
function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}
function viewportBounds() {
  const viewport = window.visualViewport;
  return viewport ? {
    height: viewport.height,
    left: viewport.offsetLeft,
    top: viewport.offsetTop,
    width: viewport.width
  } : { height: window.innerHeight, left: 0, top: 0, width: window.innerWidth };
}
function popoverPosition(trigger, popover) {
  const viewport = viewportBounds();
  const left = clamp(
    trigger.left + trigger.width / 2 - popover.width / 2,
    viewport.left + VIEWPORT_MARGIN,
    viewport.left + viewport.width - popover.width - VIEWPORT_MARGIN
  );
  const above = trigger.top - popover.height - POPOVER_GAP;
  const below = trigger.bottom + POPOVER_GAP;
  const top = clamp(
    above >= viewport.top + VIEWPORT_MARGIN ? above : below,
    viewport.top + VIEWPORT_MARGIN,
    viewport.top + viewport.height - popover.height - VIEWPORT_MARGIN
  );
  return { left, top };
}
function formatDate3(scannedAt) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(scannedAt));
}
function TavernKeeperScanIndicator({
  projectId,
  status,
  inlinePanel = false
}) {
  const [open, setOpen] = d2(false);
  const [position, setPosition] = d2(null);
  const triggerRef = A2(null);
  const popoverRef = A2(null);
  const firstLinkRef = A2(null);
  const closeTimer = A2(null);
  const openRef = A2(false);
  const pointerOpenState = A2(null);
  const suppressNextFocusOpen = A2(false);
  const content = stateCopy(status);
  const report2 = status.report;
  const popoverId = `tavernkeeper-scan-${projectId}`;
  const headingId = `${popoverId}-heading`;
  const clearCloseTimer = q2(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const closePopover = q2(() => {
    clearCloseTimer();
    openRef.current = false;
    setOpen(false);
    setPosition(null);
  }, [clearCloseTimer]);
  const openPopover = q2(() => {
    clearCloseTimer();
    if (activeDismiss && activeDismiss !== closePopover) activeDismiss();
    openRef.current = true;
    setOpen(true);
  }, [clearCloseTimer, closePopover]);
  const openFromFocus = q2(() => {
    if (suppressNextFocusOpen.current) {
      suppressNextFocusOpen.current = false;
      return;
    }
    openPopover();
  }, [openPopover]);
  const delayClose = q2(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(closePopover, CLOSE_DELAY);
  }, [clearCloseTimer, closePopover]);
  const openFromPointer = q2(
    (event) => {
      if (event.pointerType !== "touch") {
        pointerOpenState.current ??= openRef.current;
        openPopover();
      }
    },
    [openPopover]
  );
  const delayCloseFromPointer = q2(
    (event) => {
      if (event.pointerType !== "touch") {
        pointerOpenState.current = null;
        delayClose();
      }
    },
    [delayClose]
  );
  const rememberPointerOpenState = q2(() => {
    pointerOpenState.current ??= openRef.current;
  }, []);
  const togglePopover = q2(() => {
    const wasOpenBeforePointerFocus = pointerOpenState.current ?? openRef.current;
    pointerOpenState.current = null;
    if (wasOpenBeforePointerFocus) closePopover();
    else openPopover();
  }, [closePopover, openPopover]);
  const containsInteractiveElement = q2((target) => {
    if (!(target instanceof Node)) return false;
    return Boolean(triggerRef.current?.contains(target) || popoverRef.current?.contains(target));
  }, []);
  const closeOnFocusExit = q2(
    (event) => {
      if (!containsInteractiveElement(event.relatedTarget)) delayClose();
    },
    [containsInteractiveElement, delayClose]
  );
  const focusFirstLink = q2(
    (event) => {
      if (event.key !== "Tab" || event.shiftKey || !open || !firstLinkRef.current) return;
      event.preventDefault();
      firstLinkRef.current.focus();
    },
    [open]
  );
  const focusTrigger = q2((event) => {
    if (event.key !== "Tab" || !event.shiftKey) return;
    event.preventDefault();
    triggerRef.current?.focus();
  }, []);
  const updatePosition = q2(() => {
    if (!triggerRef.current || !popoverRef.current) return;
    setPosition(
      popoverPosition(
        triggerRef.current.getBoundingClientRect(),
        popoverRef.current.getBoundingClientRect()
      )
    );
  }, []);
  h2(() => () => clearCloseTimer(), [clearCloseTimer]);
  h2(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    trigger.addEventListener("focus", openFromFocus);
    return () => trigger.removeEventListener("focus", openFromFocus);
  }, [openFromFocus]);
  h2(() => {
    if (!open) return;
    activeDismiss = closePopover;
    return () => {
      if (activeDismiss === closePopover) activeDismiss = null;
    };
  }, [closePopover, open]);
  _2(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, { capture: true, passive: true });
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [open, updatePosition]);
  h2(() => {
    if (!open) return;
    const dismissOnPointerDown = (event) => {
      if (!containsInteractiveElement(event.target)) delayClose();
    };
    const dismissOnEscape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        closePopover();
        suppressNextFocusOpen.current = true;
        triggerRef.current?.focus();
        queueMicrotask(() => {
          suppressNextFocusOpen.current = false;
        });
      }
    };
    const dismissOnFocus = (event) => {
      if (!containsInteractiveElement(event.target)) delayClose();
    };
    document.addEventListener("pointerdown", dismissOnPointerDown);
    document.addEventListener("keydown", dismissOnEscape, true);
    document.addEventListener("focusin", dismissOnFocus);
    return () => {
      document.removeEventListener("pointerdown", dismissOnPointerDown);
      document.removeEventListener("keydown", dismissOnEscape, true);
      document.removeEventListener("focusin", dismissOnFocus);
    };
  }, [closePopover, containsInteractiveElement, delayClose, open]);
  return /* @__PURE__ */ u3(S, { children: [
    /* @__PURE__ */ u3(
      "button",
      {
        "aria-controls": popoverId,
        "aria-expanded": open,
        "aria-label": `TavernKeeper scan: ${accessibleStatus(status)}`,
        class: `tavernary-companion-tavernkeeper-trigger state-${status.state}`,
        onBlur: closeOnFocusExit,
        onClick: togglePopover,
        onKeyDown: focusFirstLink,
        onPointerDown: rememberPointerOpenState,
        onPointerEnter: openFromPointer,
        onPointerLeave: delayCloseFromPointer,
        ref: triggerRef,
        type: "button",
        children: [
          /* @__PURE__ */ u3(ScanIcon, {}),
          status.freshness === "stale" ? /* @__PURE__ */ u3(ClockIcon, {}) : null
        ]
      }
    ),
    open && typeof document !== "undefined" ? (() => {
      const panel = /* @__PURE__ */ u3(
        "section",
        {
          "aria-labelledby": headingId,
          class: "tavernary-companion-tavernkeeper-popover",
          id: popoverId,
          onBlurCapture: closeOnFocusExit,
          onFocusCapture: openPopover,
          onPointerEnter: openFromPointer,
          onPointerLeave: delayCloseFromPointer,
          ref: popoverRef,
          role: "dialog",
          style: {
            ...position,
            visibility: position ? "visible" : "hidden"
          },
          children: [
            /* @__PURE__ */ u3("header", { class: "tavernary-companion-tavernkeeper-popover__header", children: [
              /* @__PURE__ */ u3("h2", { id: headingId, children: "TavernKeeper Scan Results" }),
              report2 ? /* @__PURE__ */ u3(
                "span",
                {
                  class: `tavernary-companion-tavernkeeper-popover__status state-${status.state}`,
                  children: [
                    /* @__PURE__ */ u3("strong", { children: riskGradeLabels[report2.riskLevel] }),
                    /* @__PURE__ */ u3("span", { children: freshnessLabels[status.freshness] })
                  ]
                }
              ) : null
            ] }),
            report2 ? /* @__PURE__ */ u3(S, { children: [
              /* @__PURE__ */ u3("p", { class: "tavernary-companion-tavernkeeper-summary", children: content }),
              /* @__PURE__ */ u3(
                "p",
                {
                  "aria-label": "Assessment finding counts",
                  class: "tavernary-companion-tavernkeeper-counts",
                  children: [
                    /* @__PURE__ */ u3("span", { children: countLabel(report2.minorCautions, "minor caution") }),
                    /* @__PURE__ */ u3("span", { children: countLabel(report2.materialConcerns, "material concern") }),
                    /* @__PURE__ */ u3("span", { children: countLabel(report2.highDanger, "high-danger finding") })
                  ]
                }
              ),
              /* @__PURE__ */ u3("dl", { class: "tavernary-companion-tavernkeeper-details", children: [
                report2.riskLevel === "high" && report2.dangerBasis !== "none" ? /* @__PURE__ */ u3("div", { children: [
                  /* @__PURE__ */ u3("dt", { children: "Danger basis" }),
                  /* @__PURE__ */ u3("dd", { children: dangerBasisLabels[report2.dangerBasis] })
                ] }) : null,
                /* @__PURE__ */ u3("div", { children: [
                  /* @__PURE__ */ u3("dt", { children: "Scanned" }),
                  /* @__PURE__ */ u3("dd", { children: [
                    /* @__PURE__ */ u3("time", { dateTime: report2.scannedAt, children: formatDate3(report2.scannedAt) }),
                    /* @__PURE__ */ u3("span", { "aria-hidden": "true", children: " \xB7 " }),
                    /* @__PURE__ */ u3(
                      "a",
                      {
                        "aria-label": `Browse scanned source at commit ${report2.scannedSha} on GitHub`,
                        href: report2.treeUrl,
                        onKeyDown: focusTrigger,
                        ref: firstLinkRef,
                        rel: "noopener noreferrer",
                        target: "_blank",
                        children: [
                          report2.scannedSha.slice(0, 7),
                          /* @__PURE__ */ u3("span", { "aria-hidden": "true", children: " \u2197" })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ u3("div", { children: [
                  /* @__PURE__ */ u3("dt", { children: "Assessed" }),
                  /* @__PURE__ */ u3("dd", { children: [
                    /* @__PURE__ */ u3("time", { dateTime: report2.assessedAt, children: formatDate3(report2.assessedAt) }),
                    " by Tavernary"
                  ] })
                ] })
              ] }),
              status.history.length >= 2 ? /* @__PURE__ */ u3("div", { class: "tavernary-companion-tavernkeeper-recent", children: [
                /* @__PURE__ */ u3("span", { children: "Recent scans" }),
                /* @__PURE__ */ u3(TavernKeeperHistoryStrip, { history: status.history })
              ] }) : null,
              /* @__PURE__ */ u3("footer", { class: "tavernary-companion-tavernkeeper-actions", children: [
                /* @__PURE__ */ u3("a", { href: report2.reportUrl, rel: "noopener noreferrer", target: "_blank", children: [
                  "View full report",
                  /* @__PURE__ */ u3("span", { "aria-hidden": "true", children: " \u2197" })
                ] }),
                status.historyUrl ? /* @__PURE__ */ u3(
                  "a",
                  {
                    href: externalTavernaryUrl(status.historyUrl),
                    rel: "noopener noreferrer",
                    target: "_blank",
                    children: [
                      "View scan history",
                      /* @__PURE__ */ u3("span", { "aria-hidden": "true", children: " \u2192" })
                    ]
                  }
                ) : null
              ] })
            ] }) : /* @__PURE__ */ u3("p", { class: "tavernary-companion-tavernkeeper-summary", children: content })
          ]
        }
      );
      return inlinePanel ? panel : $2(panel, resolveOverlayPortalTarget(triggerRef.current));
    })() : null
  ] });
}
function externalTavernaryUrl(value) {
  return new URL(value, "https://tavernary.org").href;
}
function ScanIcon() {
  return /* @__PURE__ */ u3("svg", { "aria-hidden": "true", "data-icon": "scan-fill", fill: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ u3("path", { d: "M4.257 5.671l2.137 2.137a7 7 0 1 0 1.414-1.414L5.67 4.257A9.959 9.959 0 0 1 12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12c0-2.401.846-4.605 2.257-6.329zm3.571 3.572L12 13.414 13.414 12 9.243 7.828a5 5 0 1 1-1.414 1.414z" }) });
}
function ClockIcon() {
  return /* @__PURE__ */ u3(
    "svg",
    {
      "aria-hidden": "true",
      class: "tavernary-companion-tavernkeeper-freshness-clock",
      "data-icon": "clock",
      fill: "none",
      stroke: "currentColor",
      viewBox: "0 0 24 24",
      children: /* @__PURE__ */ u3(
        "path",
        {
          d: "M12 7V12L14.5 13.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "stroke-width": "2"
        }
      )
    }
  );
}

// src/ui/lifecycle/version-choice-option.tsx
var LATEST_SCANNED_LABEL = "Latest scanned";
var LATEST_CREATOR_LABEL = "Latest from creator";
var LATEST_CREATOR_DESCRIPTION = "Newer changes have not been scanned yet.";
function VersionChoiceOption({
  buttonRef,
  description,
  descriptionId,
  disabledReason = null,
  disabledReasonId,
  label: label2,
  onSelect,
  scan = null
}) {
  const describedBy = disabledReason && disabledReasonId ? `${descriptionId} ${disabledReasonId}` : descriptionId;
  return /* @__PURE__ */ u3("div", { class: "tavernary-companion-version-choice-option", children: [
    /* @__PURE__ */ u3(
      "button",
      {
        ref: buttonRef,
        type: "button",
        class: "tavernary-companion-version-choice-option__select",
        "aria-label": label2,
        "aria-describedby": describedBy,
        disabled: disabledReason !== null,
        onClick: onSelect,
        children: [
          /* @__PURE__ */ u3("strong", { children: label2 }),
          /* @__PURE__ */ u3("span", { id: descriptionId, children: description }),
          disabledReason && disabledReasonId ? /* @__PURE__ */ u3("span", { id: disabledReasonId, children: disabledReason }) : null
        ]
      }
    ),
    scan ? /* @__PURE__ */ u3("div", { class: "tavernary-companion-version-choice-option__scan", children: /* @__PURE__ */ u3(TavernKeeperScanIndicator, { projectId: scan.projectId, status: scan.status, inlinePanel: true }) }) : null
  ] });
}
function scannedVersionDescription(checkedAt, olderThanLatest = true) {
  const date = new Date(checkedAt);
  const label2 = Number.isNaN(date.valueOf()) ? "recently" : new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  }).format(date);
  return olderThanLatest ? `Scanned ${label2} \xB7 older than latest.` : `Scanned ${label2}.`;
}
function matchingScanStatus(status, target) {
  if (!status?.report) return null;
  if (status.report.reportId !== target.reportId) return null;
  if (status.report.scannedSha.toLowerCase() !== target.requestedSha.toLowerCase()) return null;
  return status;
}
function isVersionChoiceOwnedTarget(surface, target) {
  if (!(target instanceof Node)) return false;
  if (surface?.contains(target)) return true;
  const element = target instanceof Element ? target : target.parentElement;
  return Boolean(element?.closest(".tavernary-companion-tavernkeeper-popover"));
}
function hasOpenTavernKeeperPanel(projectId) {
  return document.getElementById(`tavernkeeper-scan-${projectId}`) !== null;
}

// src/ui/kits/kit-version-choices.tsx
function KitVersionChoices({
  steps,
  selections,
  onChange
}) {
  if (!steps.length) return null;
  const selected = new Map(selections.map((selection) => [selection.projectId, selection.target]));
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-kit-version-choices", "aria-labelledby": "kit-versions-heading", children: [
    /* @__PURE__ */ u3("h3", { id: "kit-versions-heading", children: "Install" }),
    /* @__PURE__ */ u3("p", { children: "Choose a version for each project that has two options." }),
    steps.map((step2) => /* @__PURE__ */ u3(
      ProjectVersionChoice,
      {
        step: step2,
        selected: selected.get(step2.projectId) ?? null,
        onChange: (target) => onChange(step2.projectId, target)
      },
      step2.projectId
    ))
  ] });
}
function ProjectVersionChoice({
  step: step2,
  selected,
  onChange
}) {
  const choice = step2.targetChoice;
  if (!choice) {
    return /* @__PURE__ */ u3("section", { class: "tavernary-companion-kit-version-choice", role: "status", children: [
      /* @__PURE__ */ u3("strong", { children: step2.projectName }),
      /* @__PURE__ */ u3("span", { children: "We couldn't find the latest version from the creator. Try again." })
    ] });
  }
  if (choice.kind === "single") {
    return /* @__PURE__ */ u3("section", { class: "tavernary-companion-kit-version-choice", children: [
      /* @__PURE__ */ u3("strong", { children: step2.projectName }),
      /* @__PURE__ */ u3("span", { children: targetLabel(choice.target) }),
      /* @__PURE__ */ u3("small", { children: targetDescription(choice.target) })
    ] });
  }
  const checkedDescriptionId = `kit-version-${step2.projectId}-checked-description`;
  const checkedDisabledId = `kit-version-${step2.projectId}-checked-disabled`;
  const newestDescriptionId = `kit-version-${step2.projectId}-newest-description`;
  return /* @__PURE__ */ u3("fieldset", { class: "tavernary-companion-kit-version-choice", children: [
    /* @__PURE__ */ u3("legend", { children: step2.projectName }),
    /* @__PURE__ */ u3("label", { children: [
      /* @__PURE__ */ u3(
        "input",
        {
          type: "radio",
          name: `kit-version-${step2.projectId}`,
          "aria-label": `${LATEST_SCANNED_LABEL} for ${step2.projectName}`,
          "aria-describedby": choice.checked.disabledReason ? `${checkedDescriptionId} ${checkedDisabledId}` : checkedDescriptionId,
          checked: Boolean(selected && sameInstallTarget(selected, choice.checked.target)),
          disabled: choice.checked.disabledReason !== null,
          onChange: () => onChange(choice.checked.target)
        }
      ),
      /* @__PURE__ */ u3("span", { children: [
        /* @__PURE__ */ u3("strong", { children: LATEST_SCANNED_LABEL }),
        /* @__PURE__ */ u3("small", { id: checkedDescriptionId, children: scannedVersionDescription(choice.checked.target.checkedAt) }),
        choice.checked.disabledReason ? /* @__PURE__ */ u3("small", { id: checkedDisabledId, children: choice.checked.disabledReason }) : null
      ] })
    ] }),
    /* @__PURE__ */ u3("label", { children: [
      /* @__PURE__ */ u3(
        "input",
        {
          type: "radio",
          name: `kit-version-${step2.projectId}`,
          "aria-label": `${LATEST_CREATOR_LABEL} for ${step2.projectName}`,
          "aria-describedby": newestDescriptionId,
          checked: Boolean(selected && sameInstallTarget(selected, choice.newest)),
          onChange: () => onChange(choice.newest)
        }
      ),
      /* @__PURE__ */ u3("span", { children: [
        /* @__PURE__ */ u3("strong", { children: LATEST_CREATOR_LABEL }),
        /* @__PURE__ */ u3("small", { id: newestDescriptionId, children: targetDescription(choice.newest) })
      ] })
    ] })
  ] });
}
function targetLabel(target) {
  return target.kind === "checked" ? LATEST_SCANNED_LABEL : LATEST_CREATOR_LABEL;
}
function targetDescription(target) {
  return target.kind === "checked" ? scannedVersionDescription(target.checkedAt, false) : LATEST_CREATOR_DESCRIPTION;
}

// src/ui/kits/kit-preflight-dialog.tsx
function KitPreflightDialog({
  plan,
  onCancel,
  onReview,
  onConfirm
}) {
  const [selectedInstallTargets, setSelectedInstallTargets] = d2(
    () => initialInstallTargetSelections(plan)
  );
  h2(() => {
    setSelectedInstallTargets(initialInstallTargetSelections(plan));
  }, [plan]);
  const everyVersionChosen = plan.installTargetsPrepared && selectedInstallTargets.length === plan.install.length;
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
    /* @__PURE__ */ u3(
      KitVersionChoices,
      {
        steps: plan.install,
        selections: selectedInstallTargets,
        onChange: (projectId, target) => setSelectedInstallTargets((current) => [
          ...current.filter((selection) => selection.projectId !== projectId),
          { projectId, target }
        ])
      }
    ),
    /* @__PURE__ */ u3(
      KitWarningGroup,
      {
        warnings: plan.warnings,
        selectedInstallTargets,
        onReview
      }
    ),
    /* @__PURE__ */ u3("footer", { children: [
      /* @__PURE__ */ u3("button", { type: "button", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          disabled: plan.blockingIssues.length > 0 || !everyVersionChosen,
          onClick: () => onConfirm({
            planId: plan.id,
            inventoryFingerprint: plan.inventoryFingerprint,
            catalogGeneratedAt: plan.catalogGeneratedAt,
            catalogBinding: plan.catalogBinding,
            acceptedWarningProjectIds: plan.warnings.map(({ projectId }) => projectId),
            selectedInstallTargets,
            installTargetBinding: computeInstallTargetBinding(selectedInstallTargets)
          }),
          children: confirm
        }
      )
    ] })
  ] });
}

// src/ui/lifecycle/assessment-warning-dialog.tsx
function AssessmentWarningDialog({
  projectName,
  prompt,
  onReview,
  onCancel,
  onConfirm
}) {
  const high = prompt.severity === "high";
  return /* @__PURE__ */ u3(
    DialogFrame,
    {
      label: `Security warning for ${projectName}`,
      className: high ? "is-high" : "is-material",
      onCancel,
      children: [
        /* @__PURE__ */ u3("p", { class: "tavernary-companion-dialog__severity", children: high ? "High concern" : "Needs a closer look" }),
        /* @__PURE__ */ u3("h2", { children: [
          "Review before installing ",
          projectName
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
              children: "View check"
            }
          ),
          /* @__PURE__ */ u3("button", { type: "button", onClick: onCancel, children: "Go back" }),
          /* @__PURE__ */ u3("button", { type: "button", class: "is-danger", onClick: onConfirm, children: "Install this version" })
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
    /* @__PURE__ */ u3("h3", { children: receiptHeading2(receipt) }),
    receipt.safeError ? /* @__PURE__ */ u3("p", { children: receipt.safeError }) : null,
    receipt.reloadRequired ? /* @__PURE__ */ u3("p", { children: "Reload required" }) : null,
    /* @__PURE__ */ u3("ol", { children: receipt.steps.map((step2) => /* @__PURE__ */ u3("li", { "data-status": step2.status, children: [
      stepLabel(step2.id),
      ": ",
      step2.status
    ] })) }),
    /* @__PURE__ */ u3("p", { children: succeeded ? "Verified against SillyTavern." : "No unverified success was recorded." }),
    receipt.installProvenance?.targetKind === "checked" || receipt.installProvenance?.targetKind === "newest" ? /* @__PURE__ */ u3(InstallDetails, { receipt }) : null,
    onDismiss ? /* @__PURE__ */ u3("button", { type: "button", onClick: onDismiss, children: "Dismiss" }) : null
  ] });
}
function receiptHeading2(receipt) {
  if (receipt.status === "succeeded") {
    if (receipt.kind === "install" && receipt.installProvenance?.targetKind === "checked") {
      return "Installed the latest scanned version.";
    }
    if (receipt.kind === "install" && receipt.installProvenance?.targetKind === "newest") {
      return "Installed the latest version from the creator.";
    }
    return `${receipt.projectName} ${receipt.kind === "install" ? "installed" : "removed"} and verified`;
  }
  if (receipt.status === "cancelled") return `${receipt.projectName} operation cancelled`;
  return `${receipt.projectName} ${receipt.kind} did not complete`;
}
function InstallDetails({ receipt }) {
  const provenance = receipt.installProvenance;
  return /* @__PURE__ */ u3("details", { class: "tavernary-companion-operation-receipt__details", children: [
    /* @__PURE__ */ u3("summary", { children: "Details" }),
    /* @__PURE__ */ u3("dl", { children: [
      /* @__PURE__ */ u3("dt", { children: "Requested SHA" }),
      /* @__PURE__ */ u3("dd", { children: provenance.requestedSha ? /* @__PURE__ */ u3("code", { children: provenance.requestedSha }) : "Not available" }),
      /* @__PURE__ */ u3("dt", { children: "Installed SHA" }),
      /* @__PURE__ */ u3("dd", { children: provenance.installedSha ? /* @__PURE__ */ u3("code", { children: provenance.installedSha }) : "Not available" }),
      /* @__PURE__ */ u3("dt", { children: "Catalog time" }),
      /* @__PURE__ */ u3("dd", { children: provenance.catalogGeneratedAt ? /* @__PURE__ */ u3("time", { dateTime: provenance.catalogGeneratedAt, children: formatTechnicalDate(provenance.catalogGeneratedAt) }) : "Not available" }),
      receipt.tavernKeeperReportUrl ? /* @__PURE__ */ u3(S, { children: [
        /* @__PURE__ */ u3("dt", { children: "TavernKeeper" }),
        /* @__PURE__ */ u3("dd", { children: /* @__PURE__ */ u3("a", { href: receipt.tavernKeeperReportUrl, target: "_blank", rel: "noopener noreferrer", children: "TavernKeeper check" }) })
      ] }) : null
    ] })
  ] });
}
function formatTechnicalDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toISOString();
}
function stepLabel(id) {
  return {
    requested: "Requested",
    "host-accepted": "Host accepted",
    verified: "Verified",
    recorded: "Recorded"
  }[id];
}

// src/ui/lifecycle/operation-success-notification.tsx
var DISPLAY_DURATION_MS = 4500;
var VIEWPORT_MARGIN2 = 8;
var PANEL_GAP = 8;
function OperationSuccessNotification({
  receipt,
  onDismiss
}) {
  const notificationRef = A2(null);
  const dismissRef = A2(onDismiss);
  const timerRef = A2(null);
  const timerStartedAtRef = A2(0);
  const remainingDurationRef = A2(DISPLAY_DURATION_MS);
  const pointerInsideRef = A2(false);
  const focusInsideRef = A2(false);
  const [position, setPosition] = d2({
    visibility: "hidden"
  });
  h2(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);
  const clearDismissTimer = q2(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);
  const startDismissTimer = q2(() => {
    if (timerRef.current !== null || remainingDurationRef.current <= 0) return;
    timerStartedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      remainingDurationRef.current = 0;
      dismissRef.current?.();
    }, remainingDurationRef.current);
  }, []);
  const pauseDismissTimer = q2(() => {
    if (timerRef.current === null) return;
    remainingDurationRef.current = Math.max(
      0,
      remainingDurationRef.current - (Date.now() - timerStartedAtRef.current)
    );
    clearDismissTimer();
  }, [clearDismissTimer]);
  const resumeDismissTimer = q2(() => {
    if (pointerInsideRef.current || focusInsideRef.current) return;
    startDismissTimer();
  }, [startDismissTimer]);
  h2(() => {
    remainingDurationRef.current = DISPLAY_DURATION_MS;
    pointerInsideRef.current = false;
    focusInsideRef.current = false;
    startDismissTimer();
    return clearDismissTimer;
  }, [clearDismissTimer, receipt.id, startDismissTimer]);
  _2(() => {
    const panel = document.querySelector(".tavernary-companion-root");
    if (!panel) return;
    panel.dataset.operationNotificationActive = "";
    return () => {
      delete panel.dataset.operationNotificationActive;
    };
  }, [receipt.id]);
  _2(() => {
    const notification = notificationRef.current;
    const panel = document.querySelector(".tavernary-companion-root");
    if (!notification || !panel) {
      setPosition({
        insetBlockStart: `${VIEWPORT_MARGIN2}px`,
        insetInlineStart: "50%",
        maxInlineSize: `calc(100vw - ${VIEWPORT_MARGIN2 * 2}px)`,
        visibility: "visible"
      });
      return;
    }
    const updatePosition = () => {
      const panelRect = panel.getBoundingClientRect();
      const notificationRect = notification.getBoundingClientRect();
      const maxInlineSize = Math.max(
        0,
        Math.min(
          520,
          panelRect.width - VIEWPORT_MARGIN2 * 2,
          window.innerWidth - VIEWPORT_MARGIN2 * 2
        )
      );
      setPosition({
        insetBlockStart: `${Math.max(
          VIEWPORT_MARGIN2,
          panelRect.top - notificationRect.height - PANEL_GAP
        )}px`,
        insetInlineStart: `${panelRect.left + panelRect.width / 2}px`,
        maxInlineSize: `${maxInlineSize}px`,
        visibility: "visible"
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    resizeObserver?.observe(panel);
    resizeObserver?.observe(notification);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resizeObserver?.disconnect();
    };
  }, [receipt.id]);
  if (typeof document === "undefined") return null;
  const title = successTitle(receipt);
  const detail = successDetail(receipt);
  const statusLabel3 = receipt.kind === "install" ? "Installation complete" : "Removal complete";
  return $2(
    /* @__PURE__ */ u3(
      "aside",
      {
        ref: notificationRef,
        class: "tavernary-companion-operation-notification",
        role: "status",
        "aria-label": statusLabel3,
        "aria-live": "polite",
        "aria-atomic": "true",
        style: position,
        children: /* @__PURE__ */ u3(
          "button",
          {
            class: "tavernary-companion-operation-notification__button",
            type: "button",
            "aria-label": `Dismiss notification: ${title}. ${detail}`,
            onClick: onDismiss,
            onPointerEnter: () => {
              pointerInsideRef.current = true;
              pauseDismissTimer();
            },
            onPointerLeave: () => {
              pointerInsideRef.current = false;
              resumeDismissTimer();
            },
            onFocus: () => {
              focusInsideRef.current = true;
              pauseDismissTimer();
            },
            onBlur: () => {
              focusInsideRef.current = false;
              resumeDismissTimer();
            },
            children: [
              /* @__PURE__ */ u3("span", { class: "tavernary-companion-operation-notification__mark", "aria-hidden": "true", children: "\u2713" }),
              /* @__PURE__ */ u3("span", { class: "tavernary-companion-operation-notification__copy", children: [
                /* @__PURE__ */ u3("strong", { children: title }),
                /* @__PURE__ */ u3("span", { children: detail })
              ] }),
              /* @__PURE__ */ u3("span", { class: "tavernary-companion-operation-notification__dismiss", "aria-hidden": "true", children: "\xD7" })
            ]
          }
        )
      }
    ),
    document.body
  );
}
function successTitle(receipt) {
  if (receipt.kind === "install" && receipt.installProvenance?.targetKind === "checked") {
    return "Installed the latest scanned version.";
  }
  if (receipt.kind === "install" && receipt.installProvenance?.targetKind === "newest") {
    return "Installed the latest version from the creator.";
  }
  return `${receipt.projectName} ${receipt.kind === "install" ? "installed" : "removed"}`;
}
function successDetail(receipt) {
  if (receipt.kind === "install") {
    return receipt.reloadRequired ? "Verified in SillyTavern \xB7 Reload to finish installation" : "Verified in SillyTavern \xB7 Managed by Companion";
  }
  return receipt.reloadRequired ? "Verified removed \xB7 Reload to finish" : "Verified removed from SillyTavern";
}

// src/ui/lifecycle/bulk-removal-receipt.tsx
function BulkRemovalReceiptView({
  receipt,
  onRetryFailed,
  onDismiss,
  onReload
}) {
  const removed = receipt.results.length - receipt.retryableProjectIds.length;
  return /* @__PURE__ */ u3(
    "aside",
    {
      class: "tavernary-companion-operation-tray tavernary-companion-bulk-removal-receipt",
      role: "status",
      "aria-label": "Bulk uninstall result",
      children: [
        /* @__PURE__ */ u3("h2", { children: receipt.status === "succeeded" ? "Uninstall complete" : "Uninstall finished" }),
        /* @__PURE__ */ u3("p", { children: [
          removed,
          " removed \xB7 ",
          receipt.retryableProjectIds.length,
          " failed"
        ] }),
        /* @__PURE__ */ u3("ul", { children: receipt.results.map((result2) => {
          const succeeded = result2.status === "succeeded" || result2.status === "removed-unrecorded";
          return /* @__PURE__ */ u3("li", { children: [
            result2.projectName,
            " \u2014 ",
            succeeded ? "Removed" : "Failed",
            result2.safeError ? /* @__PURE__ */ u3("small", { children: result2.safeError }) : null
          ] }, result2.id);
        }) }),
        receipt.reloadRequired ? /* @__PURE__ */ u3("p", { children: "Reload is required to finish applying changes." }) : null,
        /* @__PURE__ */ u3("div", { children: [
          receipt.retryableProjectIds.length ? /* @__PURE__ */ u3("button", { type: "button", onClick: () => onRetryFailed([...receipt.retryableProjectIds]), children: "Retry failed" }) : null,
          receipt.reloadRequired ? /* @__PURE__ */ u3("button", { type: "button", onClick: onReload, children: "Reload now" }) : null,
          /* @__PURE__ */ u3("button", { type: "button", onClick: onDismiss, children: "Dismiss" })
        ] })
      ]
    }
  );
}

// src/ui/lifecycle/operation-tray.tsx
function OperationTray({
  active,
  receipt,
  bulkRemovalReceipt,
  error,
  onDismissReceipt,
  onDismissError,
  onRetryError,
  onReload,
  onRetryBulkRemoval,
  onDismissBulkRemoval
}) {
  if (error) {
    return /* @__PURE__ */ u3(
      "aside",
      {
        class: "tavernary-companion-operation-tray tavernary-companion-operation-tray--error",
        role: "alert",
        children: [
          /* @__PURE__ */ u3("p", { children: error }),
          onRetryError ? /* @__PURE__ */ u3("button", { type: "button", onClick: onRetryError, children: "Retry" }) : null,
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
  if (bulkRemovalReceipt) {
    return /* @__PURE__ */ u3(
      BulkRemovalReceiptView,
      {
        receipt: bulkRemovalReceipt,
        onRetryFailed: (projectIds) => onRetryBulkRemoval?.(projectIds),
        onDismiss: () => onDismissBulkRemoval?.(),
        onReload: () => onReload?.()
      }
    );
  }
  if (receipt) {
    if (receipt.kind === "update" && (receipt.status === "succeeded" || receipt.status === "updated-unrecorded")) {
      return /* @__PURE__ */ u3(
        "aside",
        {
          class: "tavernary-companion-operation-tray tavernary-companion-update-reload",
          role: "status",
          "aria-label": "Update complete",
          "aria-live": "polite",
          children: [
            /* @__PURE__ */ u3("p", { children: [
              /* @__PURE__ */ u3("strong", { children: updateSuccessLabel(receipt) }),
              " Reload to apply updates."
            ] }),
            receipt.safeError ? /* @__PURE__ */ u3("p", { children: receipt.safeError }) : null,
            /* @__PURE__ */ u3("button", { type: "button", onClick: onReload, children: "Reload now" })
          ]
        }
      );
    }
    if (receipt.status === "succeeded") {
      return /* @__PURE__ */ u3(OperationSuccessNotification, { receipt, onDismiss: onDismissReceipt });
    }
    return /* @__PURE__ */ u3("aside", { class: "tavernary-companion-operation-tray", children: /* @__PURE__ */ u3(OperationReceipt, { receipt, onDismiss: onDismissReceipt }) });
  }
  return null;
}
function updateSuccessLabel(receipt) {
  if (receipt.installProvenance?.targetKind === "checked") {
    return "Updated to the latest scanned version.";
  }
  if (receipt.installProvenance?.targetKind === "newest") {
    return "Updated to the latest version from the creator.";
  }
  return `${receipt.projectName} updated.`;
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

// src/ui/lifecycle/install-version-awareness.tsx
function InstallVersionAwareness({
  projectId,
  projectName,
  anchor,
  selection,
  onConfirm,
  onCancel
}) {
  const surfaceRef = A2(null);
  const confirmRef = A2(null);
  const settled = A2(false);
  const headingId = `install-latest-${projectId}-heading`;
  const restoreFocus = q2(() => {
    if (anchor.isConnected) anchor.focus({ preventScroll: true });
  }, [anchor]);
  const cancel = q2(() => {
    if (settled.current) return;
    settled.current = true;
    onCancel();
    restoreFocus();
    queueMicrotask(restoreFocus);
  }, [onCancel, restoreFocus]);
  const confirm = q2(() => {
    if (settled.current) return;
    settled.current = true;
    restoreFocus();
    onConfirm(selection);
  }, [onConfirm, restoreFocus, selection]);
  h2(() => {
    const dismissEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    const containFocus = (event) => {
      if (event.key !== "Tab") return;
      const controls = surfaceRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]'
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last2 = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last2.focus();
      } else if (!event.shiftKey && document.activeElement === last2) {
        event.preventDefault();
        first.focus();
      } else if (!surfaceRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last2 : first).focus();
      }
    };
    document.addEventListener("keydown", dismissEscape, true);
    document.addEventListener("keydown", containFocus, true);
    confirmRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", dismissEscape, true);
      document.removeEventListener("keydown", containFocus, true);
    };
  }, [cancel]);
  if (typeof document === "undefined") return null;
  return $2(
    /* @__PURE__ */ u3(
      "div",
      {
        class: "tavernary-companion-install-version-chooser-backdrop is-awareness",
        onPointerDown: (event) => {
          if (event.target === event.currentTarget) cancel();
        },
        children: /* @__PURE__ */ u3(
          "section",
          {
            ref: surfaceRef,
            class: "tavernary-companion-install-version-chooser tavernary-companion-install-version-awareness",
            role: "dialog",
            "aria-labelledby": headingId,
            "aria-modal": "true",
            "data-project-name": projectName,
            children: [
              /* @__PURE__ */ u3("h2", { id: headingId, children: "Install latest from creator?" }),
              /* @__PURE__ */ u3("p", { children: "This installs the creator\u2019s latest version." }),
              /* @__PURE__ */ u3("p", { children: "TavernKeeper has not scanned this exact version." }),
              /* @__PURE__ */ u3("div", { class: "tavernary-companion-install-version-awareness__actions", children: [
                /* @__PURE__ */ u3("button", { type: "button", onClick: cancel, children: "Cancel" }),
                /* @__PURE__ */ u3("button", { ref: confirmRef, type: "button", onClick: confirm, children: "Install latest" })
              ] })
            ]
          }
        )
      }
    ),
    resolveOverlayPortalTarget(anchor)
  );
}

// src/ui/lifecycle/install-version-chooser.tsx
var VIEWPORT_MARGIN3 = 8;
var ANCHOR_GAP = 8;
function InstallVersionChooser({
  projectId,
  projectName,
  anchor,
  choice,
  scanStatus = null,
  notice = null,
  onSelect,
  onCancel
}) {
  const surfaceRef = A2(null);
  const checkedRef = A2(null);
  const newestRef = A2(null);
  const settled = A2(false);
  const [position, setPosition] = d2({
    left: VIEWPORT_MARGIN3,
    top: VIEWPORT_MARGIN3,
    visibility: "hidden"
  });
  const headingId = `install-version-${projectId}-heading`;
  const checkedDescriptionId = `${headingId}-checked-description`;
  const checkedDisabledId = `${headingId}-checked-disabled`;
  const newestDescriptionId = `${headingId}-newest-description`;
  const restoreFocus = q2(() => {
    if (anchor.isConnected) anchor.focus({ preventScroll: true });
  }, [anchor]);
  const cancel = q2(() => {
    if (settled.current) return;
    settled.current = true;
    onCancel();
    restoreFocus();
    queueMicrotask(restoreFocus);
  }, [onCancel, restoreFocus]);
  const select = q2(
    (selection) => {
      if (settled.current) return;
      settled.current = true;
      restoreFocus();
      onSelect(selection);
    },
    [onSelect, restoreFocus]
  );
  const updatePosition = q2(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    setPosition(positionChooser(anchor.getBoundingClientRect(), surface.getBoundingClientRect()));
  }, [anchor]);
  _2(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(anchor);
    if (surfaceRef.current) observer?.observe(surfaceRef.current);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
      observer?.disconnect();
    };
  }, [anchor, updatePosition]);
  h2(() => {
    const dismissOutside = (event) => {
      const target = event.target;
      if (isVersionChoiceOwnedTarget(surfaceRef.current, target)) return;
      cancel();
    };
    const dismissEscape = (event) => {
      if (event.key !== "Escape") return;
      if (hasOpenTavernKeeperPanel(projectId)) return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissEscape, true);
    const firstChoice = choice.checked.disabledReason ? newestRef.current : checkedRef.current;
    firstChoice?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissEscape, true);
    };
  }, [cancel, choice.checked.disabledReason, projectId]);
  if (typeof document === "undefined") return null;
  const checkedDescription = scannedVersionDescription(choice.checked.selection.target.checkedAt);
  const checkedScanStatus = matchingScanStatus(scanStatus, choice.checked.selection.target);
  return $2(
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-install-version-chooser-backdrop", children: /* @__PURE__ */ u3(
      "section",
      {
        ref: surfaceRef,
        class: "tavernary-companion-install-version-chooser",
        role: "dialog",
        "aria-labelledby": headingId,
        "data-project-name": projectName,
        style: { position: "fixed", ...position },
        children: [
          /* @__PURE__ */ u3("h2", { id: headingId, children: [
            "Choose a version for ",
            projectName
          ] }),
          notice ? /* @__PURE__ */ u3("p", { class: "tavernary-companion-install-version-chooser__notice", role: "status", children: notice }) : null,
          /* @__PURE__ */ u3(
            VersionChoiceOption,
            {
              buttonRef: checkedRef,
              label: LATEST_SCANNED_LABEL,
              description: checkedDescription,
              descriptionId: checkedDescriptionId,
              disabledReason: choice.checked.disabledReason,
              disabledReasonId: checkedDisabledId,
              onSelect: () => select(choice.checked.selection),
              scan: checkedScanStatus ? { projectId, status: checkedScanStatus } : null
            }
          ),
          /* @__PURE__ */ u3(
            VersionChoiceOption,
            {
              buttonRef: newestRef,
              label: LATEST_CREATOR_LABEL,
              description: LATEST_CREATOR_DESCRIPTION,
              descriptionId: newestDescriptionId,
              onSelect: () => select(choice.newest.selection)
            }
          ),
          /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              class: "tavernary-companion-install-version-chooser__cancel",
              onClick: cancel,
              children: "Cancel"
            }
          )
        ]
      }
    ) }),
    resolveOverlayPortalTarget(anchor)
  );
}
function dispatchPreparedInstallChoice(choice, onInstall, onChoose, onAware) {
  if (choice.kind === "choose") onChoose(choice);
  else if (choice.selection.target.kind === "newest") onAware(choice.selection);
  else onInstall(choice.selection);
}
function positionChooser(anchor, chooser) {
  const viewport = viewportBounds2();
  const maxWidth = Math.max(0, viewport.width - VIEWPORT_MARGIN3 * 2);
  const width = Math.min(360, maxWidth);
  const measuredWidth = Math.min(chooser.width || width, maxWidth);
  const measuredHeight = Math.min(chooser.height, viewport.height - VIEWPORT_MARGIN3 * 2);
  const left = clamp2(
    anchor.right - measuredWidth,
    viewport.left + VIEWPORT_MARGIN3,
    viewport.left + viewport.width - measuredWidth - VIEWPORT_MARGIN3
  );
  const below = anchor.bottom + ANCHOR_GAP;
  const above = anchor.top - measuredHeight - ANCHOR_GAP;
  const top = clamp2(
    below + measuredHeight <= viewport.top + viewport.height - VIEWPORT_MARGIN3 ? below : above,
    viewport.top + VIEWPORT_MARGIN3,
    viewport.top + viewport.height - measuredHeight - VIEWPORT_MARGIN3
  );
  return { left, top, width, visibility: "visible" };
}
function viewportBounds2() {
  const viewport = window.visualViewport;
  return viewport ? {
    height: viewport.height,
    left: viewport.offsetLeft,
    top: viewport.offsetTop,
    width: viewport.width
  } : { height: window.innerHeight, left: 0, top: 0, width: window.innerWidth };
}
function clamp2(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
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

// src/ui/shared/tooltip.tsx
var VIEWPORT_MARGIN4 = 8;
var TOOLTIP_GAP = 8;
function clamp3(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
function tooltipPosition(trigger, tooltip) {
  const left = clamp3(
    trigger.left + trigger.width / 2 - tooltip.width / 2,
    VIEWPORT_MARGIN4,
    window.innerWidth - tooltip.width - VIEWPORT_MARGIN4
  );
  const above = trigger.top - tooltip.height - TOOLTIP_GAP;
  const below = trigger.bottom + TOOLTIP_GAP;
  const preferredTop = above >= VIEWPORT_MARGIN4 ? above : below;
  const top = clamp3(
    preferredTop,
    VIEWPORT_MARGIN4,
    window.innerHeight - tooltip.height - VIEWPORT_MARGIN4
  );
  return { left, top };
}
function Tooltip({
  id,
  label: label2,
  children,
  className = "",
  style,
  ariaLabel,
  showOnAncestorFocus = false
}) {
  const triggerRef = A2(null);
  const tooltipRef = A2(null);
  const pointerFocusPending = A2(false);
  const keyboardClearRef = A2(null);
  const [open, setOpen] = d2(false);
  const [position, setPosition] = d2(null);
  const hide = q2(() => {
    setOpen(false);
    setPosition(null);
  }, []);
  const show = q2(() => {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    setOpen(true);
  }, []);
  const clearPointerFocus = q2(() => {
    pointerFocusPending.current = false;
    if (keyboardClearRef.current) {
      document.removeEventListener("keydown", keyboardClearRef.current, true);
      keyboardClearRef.current = null;
    }
  }, []);
  const beginPointerFocus = q2(() => {
    clearPointerFocus();
    pointerFocusPending.current = true;
    const clearOnKeyboard = () => clearPointerFocus();
    keyboardClearRef.current = clearOnKeyboard;
    document.addEventListener("keydown", clearOnKeyboard, true);
    hide();
  }, [clearPointerFocus, hide]);
  const showFromFocus = q2(() => {
    if (pointerFocusPending.current) return;
    show();
  }, [show]);
  const leave = q2(() => {
    hide();
  }, [hide]);
  const blur = q2(() => {
    clearPointerFocus();
    hide();
  }, [clearPointerFocus, hide]);
  h2(() => () => clearPointerFocus(), [clearPointerFocus]);
  h2(() => {
    if (!showOnAncestorFocus) return;
    const trigger = triggerRef.current;
    const focusTarget = trigger?.closest("a, button") ?? trigger?.closest(".tavernary-companion-project-card")?.querySelector(".tavernary-companion-project-card__hitarea");
    if (!focusTarget) return;
    focusTarget.addEventListener("pointerdown", beginPointerFocus);
    focusTarget.addEventListener("focus", showFromFocus);
    focusTarget.addEventListener("blur", blur);
    return () => {
      focusTarget.removeEventListener("pointerdown", beginPointerFocus);
      focusTarget.removeEventListener("focus", showFromFocus);
      focusTarget.removeEventListener("blur", blur);
    };
  }, [beginPointerFocus, blur, showFromFocus, showOnAncestorFocus]);
  const updatePosition = q2(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    setPosition(
      tooltipPosition(
        triggerRef.current.getBoundingClientRect(),
        tooltipRef.current.getBoundingClientRect()
      )
    );
  }, []);
  _2(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);
  h2(() => {
    if (!open) return;
    const mobileQuery = window.matchMedia("(max-width: 760px)");
    const dismissOnMobile = (event) => {
      if (event.matches) hide();
    };
    const dismissOnEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      hide();
    };
    mobileQuery.addEventListener("change", dismissOnMobile);
    document.addEventListener("keydown", dismissOnEscape, true);
    return () => {
      mobileQuery.removeEventListener("change", dismissOnMobile);
      document.removeEventListener("keydown", dismissOnEscape, true);
    };
  }, [hide, open]);
  return /* @__PURE__ */ u3(S, { children: [
    /* @__PURE__ */ u3(
      "span",
      {
        ref: triggerRef,
        class: `tavernary-companion-tooltip-anchor ${className}`.trim(),
        style,
        "aria-label": ariaLabel,
        "aria-describedby": id,
        role: ariaLabel ? "img" : void 0,
        onPointerEnter: show,
        onPointerLeave: leave,
        onPointerDownCapture: beginPointerFocus,
        onFocusCapture: showFromFocus,
        onBlurCapture: (event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            blur();
          }
        },
        children
      }
    ),
    open && typeof document !== "undefined" ? $2(
      /* @__PURE__ */ u3(
        "span",
        {
          ref: tooltipRef,
          class: "tavernary-companion-tooltip-content",
          id,
          role: "tooltip",
          style: {
            ...position,
            visibility: position ? "visible" : "hidden"
          },
          children: label2
        }
      ),
      resolveOverlayPortalTarget(triggerRef.current)
    ) : null
  ] });
}

// src/ui/installed/installed-bulk-bar.tsx
function InstalledBulkBar({
  count,
  disabled = false,
  onAddToKit,
  onUninstall,
  onClear
}) {
  const id = g2();
  return /* @__PURE__ */ u3(
    "aside",
    {
      class: "tavernary-companion-kit-selection-dock tavernary-companion-installed-bulk-bar",
      "aria-label": "Bulk actions",
      children: [
        /* @__PURE__ */ u3("span", { class: "tavernary-companion-sr-only", role: "status", "aria-live": "polite", children: [
          count,
          " selected"
        ] }),
        /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-selection-actions", children: [
          /* @__PURE__ */ u3(
            Tooltip,
            {
              id: `${id}-clear`,
              label: "Clear the selection and exit selection mode.",
              className: "tavernary-companion-control-tooltip",
              children: /* @__PURE__ */ u3(
                "button",
                {
                  type: "button",
                  class: "tavernary-companion-kit-selection-cancel",
                  "aria-label": "Clear selection and exit",
                  onClick: onClear,
                  children: "Clear"
                }
              )
            }
          ),
          /* @__PURE__ */ u3(
            Tooltip,
            {
              id: `${id}-uninstall`,
              label: "Review and uninstall the selected extensions.",
              className: "tavernary-companion-control-tooltip",
              children: /* @__PURE__ */ u3(
                "button",
                {
                  type: "button",
                  class: "is-danger",
                  "aria-label": "Uninstall selected extensions",
                  disabled: disabled || count === 0,
                  onClick: onUninstall,
                  children: "Uninstall"
                }
              )
            }
          ),
          /* @__PURE__ */ u3(
            Tooltip,
            {
              id: `${id}-add-to-kit`,
              label: "Create a new Kit or add these extensions to a personal Kit. Ownership does not change.",
              className: "tavernary-companion-control-tooltip",
              children: /* @__PURE__ */ u3(
                "button",
                {
                  type: "button",
                  class: "tavernary-companion-kit-selection-add",
                  "aria-label": "Add selected extensions to a Kit",
                  disabled: disabled || count === 0,
                  onClick: onAddToKit,
                  children: [
                    "Add to Kit",
                    /* @__PURE__ */ u3("span", { class: "selection-count", "aria-hidden": "true", children: count })
                  ]
                }
              )
            }
          )
        ] })
      ]
    }
  );
}

// src/ui/installed/installed-status-help.tsx
var INSTALLED_KIT_STATUS_HELP = {
  Active: "This Kit currently defines the enabled state for Companion-managed extensions.",
  Partial: "Some extensions in this Kit are not currently installed.",
  Drifted: "Installed or enabled extensions no longer match this Kit's last verified state.",
  Missing: "None of this Kit's extensions are currently installed."
};
function InstalledStatusHelp({ status }) {
  const id = g2();
  const [open, setOpen] = d2(false);
  const label2 = status ? INSTALLED_KIT_STATUS_HELP[status] : "Explain Installed Kit statuses.";
  return /* @__PURE__ */ u3("span", { class: `tavernary-companion-installed-status-help${status ? " is-compact" : ""}`, children: [
    /* @__PURE__ */ u3(Tooltip, { id: `${id}-tooltip`, label: label2, children: /* @__PURE__ */ u3(
      "button",
      {
        type: "button",
        "aria-label": status ? `${status} Kit status help` : "Kit status help",
        "aria-expanded": open,
        onClick: () => setOpen((current) => !current),
        children: status ? /* @__PURE__ */ u3("strong", { children: status }) : "Status help"
      }
    ) }),
    open ? /* @__PURE__ */ u3("span", { class: "tavernary-companion-installed-status-help__panel", role: "note", children: status ? INSTALLED_KIT_STATUS_HELP[status] : /* @__PURE__ */ u3("dl", { children: Object.entries(INSTALLED_KIT_STATUS_HELP).map(
      ([name, meaning]) => /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("dt", { children: name }),
        /* @__PURE__ */ u3("dd", { children: meaning })
      ] }, name)
    ) }) }) : null
  ] });
}

// src/ui/installed/installed-kit-card.tsx
function InstalledKitCard({
  kit: kit2,
  selected,
  onSelect,
  onOpen,
  onUninstall
}) {
  const id = g2();
  const [actionsOpen, setActionsOpen] = d2(false);
  const count = kit2.selectionProjectIds.length;
  const noun = count === 1 ? "extension" : "extensions";
  return /* @__PURE__ */ u3(
    "article",
    {
      class: `tavernary-companion-installed-kit-card${selected ? " is-selected" : ""}${kit2.active ? " is-active" : ""}`,
      children: [
        /* @__PURE__ */ u3(
          Tooltip,
          {
            id: `${id}-kit-select`,
            label: "Select the currently installed extensions in this Kit.",
            children: /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                class: "tavernary-companion-installed-kit-card__select",
                "aria-label": `Select ${count} installed ${noun} from ${kit2.title}`,
                "aria-pressed": selected,
                disabled: count === 0,
                onClick: onSelect,
                children: [
                  /* @__PURE__ */ u3("h4", { children: kit2.title }),
                  /* @__PURE__ */ u3("span", { children: [
                    kit2.installedCount,
                    "/",
                    kit2.totalProjectCount,
                    " installed"
                  ] }),
                  kit2.displayStatus === "Drifted" ? /* @__PURE__ */ u3("small", { children: "Needs review" }) : null
                ]
              }
            )
          }
        ),
        kit2.displayStatus !== "Complete" ? /* @__PURE__ */ u3(InstalledStatusHelp, { status: kit2.displayStatus }) : null,
        /* @__PURE__ */ u3("div", { class: "tavernary-companion-installed-kit-card__actions", children: [
          /* @__PURE__ */ u3(Tooltip, { id: `${id}-kit-actions`, label: `More actions for ${kit2.title}.`, children: /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              "aria-label": `More actions for ${kit2.title}`,
              "aria-expanded": actionsOpen,
              onClick: () => setActionsOpen((current) => !current),
              children: /* @__PURE__ */ u3("span", { "aria-hidden": "true", children: "\u2022\u2022\u2022" })
            }
          ) }),
          actionsOpen ? /* @__PURE__ */ u3("div", { role: "menu", "aria-label": `${kit2.title} actions`, children: [
            !kit2.orphaned ? /* @__PURE__ */ u3("button", { type: "button", role: "menuitem", onClick: onOpen, children: "View Kit" }) : null,
            kit2.orphaned ? /* @__PURE__ */ u3("button", { type: "button", role: "menuitem", class: "is-danger", onClick: onUninstall, children: "Uninstall Kit" }) : null
          ] }) : null
        ] })
      ]
    }
  );
}

// src/ui/shared/install-icon.tsx
var INSTALL_PATH = "M9 2v2H5l-.001 10h14L19 4h-4V2h5a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5zm9.999 14h-14L5 20h14l-.001-4zM17 17v2h-2v-2h2zM13 2v5h3l-4 4-4-4h3V2h2z";
var UNINSTALL_PATH = "M8 2v2H5l-.001 10h14L19 4h-3V2h4a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h4zm10.999 14h-14L5 20h14l-.001-4zM17 17v2h-2v-2h2zM12 2l4 4h-3v5h-2V6H8l4-4z";
function InstallIcon() {
  return /* @__PURE__ */ u3(
    "svg",
    {
      "aria-hidden": "true",
      "data-icon": "install",
      "data-testid": "install-icon",
      fill: "currentColor",
      viewBox: "0 0 24 24",
      children: /* @__PURE__ */ u3("path", { d: INSTALL_PATH })
    }
  );
}
function UninstallIcon() {
  return /* @__PURE__ */ u3(
    "svg",
    {
      "aria-hidden": "true",
      "data-icon": "uninstall",
      "data-testid": "uninstall-icon",
      fill: "currentColor",
      viewBox: "0 0 24 24",
      children: /* @__PURE__ */ u3("path", { d: UNINSTALL_PATH })
    }
  );
}

// src/ui/projects/project-lifecycle-control.tsx
function ProjectLifecycleControl({
  projectName,
  action,
  disabled = false,
  onAction
}) {
  const disabledReasonId = g2();
  if (action.kind !== "install" && action.kind !== "uninstall") return null;
  const installed = action.kind === "uninstall";
  const label2 = `${action.label} ${projectName}`;
  return /* @__PURE__ */ u3(S, { children: [
    /* @__PURE__ */ u3(
      Tooltip,
      {
        id: `${disabledReasonId}-lifecycle-action-tooltip`,
        label: action.label,
        className: "tavernary-companion-control-tooltip",
        children: /* @__PURE__ */ u3(
          "button",
          {
            type: "button",
            class: `tavernary-companion-project-lifecycle${installed ? " is-installed" : ""}`,
            "data-testid": "project-lifecycle-action",
            "aria-label": label2,
            "aria-describedby": disabled ? disabledReasonId : void 0,
            "aria-pressed": installed,
            disabled,
            onClick: (event) => onAction(action, event.currentTarget),
            children: /* @__PURE__ */ u3("span", { class: "tavernary-companion-project-lifecycle__face", "aria-hidden": "true", children: installed ? /* @__PURE__ */ u3(UninstallIcon, {}) : /* @__PURE__ */ u3(InstallIcon, {}) })
          }
        )
      }
    ),
    disabled ? /* @__PURE__ */ u3("span", { id: disabledReasonId, class: "tavernary-companion-sr-only", children: "Another Companion operation is in progress." }) : null
  ] });
}

// src/ui/installed/installed-section.tsx
function InstalledSection({
  section,
  memberships = /* @__PURE__ */ new Map(),
  togglingInternalName = null,
  updateStates = {},
  onAction,
  onRetryUpdate,
  onUpdate,
  onForgetMissing,
  onManage,
  onToggleExtension,
  lifecycleDisabled,
  selectedProjectIds = [],
  onToggleSelection
}) {
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-installed-section", children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("h3", { children: section.title }),
      /* @__PURE__ */ u3("span", { children: section.rows.length })
    ] }),
    section.rows.length === 0 ? /* @__PURE__ */ u3("p", { children: emptyExplanation(section.id) }) : /* @__PURE__ */ u3("div", { class: "tavernary-companion-installed-grid", children: section.rows.map((row) => /* @__PURE__ */ u3(
      InstalledCard,
      {
        row,
        sectionId: section.id,
        kitTitles: memberships.get(row.id) ?? [],
        toggling: togglingInternalName === row.internalName,
        updateState: updateStates[row.id],
        onAction,
        onRetryUpdate,
        onUpdate,
        onForgetMissing,
        onManage,
        onToggleExtension,
        lifecycleDisabled,
        selected: selectedProjectIds.includes(row.id),
        onToggleSelection
      },
      `${section.id}-${row.id}`
    )) })
  ] });
}
function InstalledCard({
  row,
  sectionId,
  kitTitles,
  toggling,
  updateState,
  onAction,
  onRetryUpdate,
  onUpdate,
  onForgetMissing,
  onManage,
  onToggleExtension,
  lifecycleDisabled,
  selected,
  onToggleSelection
}) {
  const missing = sectionId === "attention";
  const unknown = !missing && (sectionId === "ambiguous" || sectionId === "unknown" || row.action.kind === "manage-in-sillytavern");
  return /* @__PURE__ */ u3(
    "article",
    {
      class: `tavernary-companion-installed-card${row.enabled !== null ? " is-installed" : " is-missing"}${row.enabled === false ? " is-disabled" : ""}${selected ? " is-selected" : ""}`,
      onClick: (event) => {
        if (!row.selectionEligible || isInteractiveTarget(event.target)) return;
        onToggleSelection?.(row.id);
      },
      children: [
        row.selectionEligible ? /* @__PURE__ */ u3(
          "button",
          {
            type: "button",
            class: "tavernary-companion-installed-card__select",
            "aria-pressed": selected,
            "aria-label": `${selected ? "Deselect" : "Select"} ${row.name}`,
            onClick: () => onToggleSelection?.(row.id)
          }
        ) : null,
        /* @__PURE__ */ u3("header", { children: [
          /* @__PURE__ */ u3("span", { children: sectionLabel(sectionId) }),
          updateState && updateState.kind !== "idle" ? /* @__PURE__ */ u3(
            "strong",
            {
              class: `tavernary-companion-installed-update-status is-${updateState.kind}`,
              role: "status",
              title: updateState.kind === "attention" ? updateState.reason : void 0,
              children: updateStatusLabel(updateState)
            }
          ) : null
        ] }),
        /* @__PURE__ */ u3("h4", { children: row.canonicalUrl ? /* @__PURE__ */ u3("a", { href: row.canonicalUrl, target: "_blank", rel: "noopener noreferrer", children: row.name }) : row.name }),
        kitTitles.length ? /* @__PURE__ */ u3("div", { class: "tavernary-companion-installed-memberships", title: kitTitles.join(", "), children: [
          "In ",
          kitTitles.join(", ")
        ] }) : null,
        updateState?.kind === "attention" || updateState?.kind === "error" ? /* @__PURE__ */ u3("p", { class: "tavernary-companion-installed-attention-reason", children: updateState.reason }) : null,
        missing ? /* @__PURE__ */ u3("p", { class: "tavernary-companion-installed-attention-reason", children: row.detail }) : null,
        /* @__PURE__ */ u3("footer", { children: [
          row.toggleable && row.internalName && row.enabled !== null ? /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              role: "switch",
              class: "tavernary-companion-extension-toggle",
              "aria-checked": row.enabled,
              "aria-label": `${row.enabled ? "Disable" : "Enable"} ${row.name}`,
              disabled: lifecycleDisabled || toggling,
              onClick: () => onToggleExtension?.(row.id, row.internalName, !row.enabled),
              children: [
                /* @__PURE__ */ u3("span", { "aria-hidden": "true", children: /* @__PURE__ */ u3("i", {}) }),
                /* @__PURE__ */ u3("b", { children: toggling ? "Updating\u2026" : row.enabled ? "Enabled" : "Disabled" })
              ]
            }
          ) : null,
          updateState?.kind === "available" ? /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              class: "tavernary-companion-installed-update-button",
              "aria-label": `Update ${row.name}`,
              disabled: lifecycleDisabled,
              onClick: (event) => onUpdate?.(row.id, event.currentTarget),
              children: "Update"
            }
          ) : null,
          updateState?.kind === "error" ? /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              "aria-label": `Retry updates for ${row.name}`,
              disabled: lifecycleDisabled,
              onClick: () => onRetryUpdate?.(row.id),
              children: "Retry"
            }
          ) : null,
          updateState?.kind === "attention" && !unknown ? /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              "aria-label": `Manage ${row.name} in SillyTavern`,
              disabled: lifecycleDisabled,
              onClick: () => onManage?.(),
              children: "Manage in SillyTavern"
            }
          ) : null,
          missing ? /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              "aria-label": `Forget ${row.name} record`,
              disabled: lifecycleDisabled,
              onClick: () => onForgetMissing?.(row.id),
              children: "Forget record"
            }
          ) : unknown ? /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              "aria-label": `Manage ${row.name} in SillyTavern`,
              onClick: () => onManage?.(),
              children: row.action.label
            }
          ) : /* @__PURE__ */ u3(
            ProjectLifecycleControl,
            {
              projectName: row.name,
              action: row.action,
              disabled: lifecycleDisabled,
              onAction: (action, anchor) => onAction?.(row.id, action, anchor)
            }
          )
        ] })
      ]
    }
  );
}
function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea"));
}
function updateStatusLabel(state) {
  if (state.kind === "available" && state.notice === "You already have the latest scanned version.") {
    return "Latest scanned";
  }
  return {
    checking: "Checking\u2026",
    current: "Latest",
    available: "Update available",
    attention: "Needs attention",
    error: "Could not check"
  }[state.kind];
}
function sectionLabel(id) {
  return {
    managed: "Companion managed",
    external: "Installed externally",
    ambiguous: "Catalog match ambiguous",
    unknown: "Uncataloged",
    attention: "No longer installed"
  }[id];
}
function emptyExplanation(id) {
  return {
    managed: "No installed extensions are currently managed by Companion.",
    external: "No catalog extensions were found outside Companion management.",
    ambiguous: "No installed extensions have multiple catalog matches.",
    unknown: "Every discovered extension matched the current catalog.",
    attention: "No previously managed extensions are missing."
  }[id];
}

// src/ui/installed/installed-route.tsx
function InstalledRoute({
  sections,
  kits = [],
  refreshing = false,
  togglingInternalName = null,
  updateStates = {},
  onRefresh,
  onCheckUpdates,
  onRetryUpdate,
  onUpdate,
  onAction,
  onForgetMissing,
  onManage,
  onOpenKit,
  onUninstallKit,
  onToggleExtension,
  onSelectKit,
  selection = { active: false, projectIds: [], sourceKitIds: [] },
  onToggleSelection,
  onAddSelectedToKit,
  onUninstallSelected,
  onClearSelection,
  lifecycleDisabled
}) {
  h2(() => {
    void onRefresh();
  }, [onRefresh]);
  h2(() => {
    if (!selection.active) return;
    const clearOnEscape = (event) => {
      if (event.key !== "Escape" || document.querySelector('[role="dialog"][aria-modal="true"]'))
        return;
      event.preventDefault();
      onClearSelection?.();
    };
    window.addEventListener("keydown", clearOnEscape);
    return () => window.removeEventListener("keydown", clearOnEscape);
  }, [onClearSelection, selection.active]);
  const populatedSections = sections.filter((section) => section.rows.length > 0);
  const installedKits = kits;
  const checkingUpdates = Object.values(updateStates).some(({ kind }) => kind === "checking");
  const usingNativeUpdates = Object.values(updateStates).some(
    (state) => state.kind === "current" && state.native === true || state.kind === "available" && state.targets.some(({ requestedSha }) => requestedSha === null)
  );
  const installedCount = populatedSections.filter(({ id }) => id !== "attention").reduce((total, section) => total + section.rows.length, 0);
  const memberships = /* @__PURE__ */ new Map();
  for (const kit2 of installedKits) {
    for (const projectId of kit2.installedProjectIds) {
      const titles = memberships.get(projectId) ?? [];
      if (!titles.includes(kit2.title)) titles.push(kit2.title);
      memberships.set(projectId, titles);
    }
  }
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-installed-route", "aria-labelledby": "installed-heading", children: [
    /* @__PURE__ */ u3("h2", { id: "installed-heading", class: "tavernary-companion-sr-only", children: "Installed extensions" }),
    /* @__PURE__ */ u3("header", { class: "tavernary-companion-route-toolbar", children: [
      /* @__PURE__ */ u3("strong", { "aria-hidden": "true", children: "Installed" }),
      /* @__PURE__ */ u3("span", { children: [
        installedCount,
        " installed ",
        installedCount === 1 ? "extension" : "extensions"
      ] }),
      refreshing ? /* @__PURE__ */ u3("p", { role: "status", children: "Updating installed extensions\u2026" }) : null,
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          "aria-label": checkingUpdates ? "Checking for updates" : "Check for updates",
          disabled: checkingUpdates || lifecycleDisabled,
          onClick: () => void onCheckUpdates?.(),
          children: checkingUpdates ? "Checking\u2026" : "Check again"
        }
      )
    ] }),
    usingNativeUpdates ? /* @__PURE__ */ u3("p", { class: "tavernary-companion-installed-update-note", children: "SillyTavern can update extensions to the latest version from their creator. Updating to a specific TavernKeeper-scanned version isn\u2019t supported by this build." }) : null,
    installedKits.length ? /* @__PURE__ */ u3(
      "section",
      {
        class: "tavernary-companion-installed-kits",
        "aria-labelledby": "installed-kits-heading",
        children: [
          /* @__PURE__ */ u3("header", { children: [
            /* @__PURE__ */ u3("div", { children: [
              /* @__PURE__ */ u3("div", { class: "tavernary-companion-installed-kits__title", children: [
                /* @__PURE__ */ u3("h3", { id: "installed-kits-heading", children: "Installed Kits" }),
                /* @__PURE__ */ u3(InstalledStatusHelp, {})
              ] }),
              /* @__PURE__ */ u3("p", { children: "Choose a Kit to select its installed extensions." })
            ] }),
            /* @__PURE__ */ u3("span", { children: installedKits.length })
          ] }),
          /* @__PURE__ */ u3("div", { class: "tavernary-companion-installed-kit-grid", children: installedKits.map((kit2) => /* @__PURE__ */ u3(
            InstalledKitCard,
            {
              kit: kit2,
              selected: selection.sourceKitIds.includes(kit2.id),
              onSelect: () => onSelectKit?.(kit2.id),
              onOpen: () => onOpenKit?.(kit2.id),
              onUninstall: () => onUninstallKit?.(kit2.id)
            },
            kit2.id
          )) })
        ]
      }
    ) : null,
    populatedSections.length ? populatedSections.map((section) => /* @__PURE__ */ u3(
      InstalledSection,
      {
        section,
        memberships,
        togglingInternalName,
        updateStates,
        onAction,
        onRetryUpdate,
        onUpdate,
        onForgetMissing,
        onManage,
        onToggleExtension,
        lifecycleDisabled,
        selectedProjectIds: selection.projectIds,
        onToggleSelection
      },
      section.id
    )) : installedKits.length === 0 ? /* @__PURE__ */ u3("p", { children: "No installed extensions were found in this profile." }) : null,
    selection.active ? /* @__PURE__ */ u3(
      InstalledBulkBar,
      {
        count: selection.projectIds.length,
        disabled: lifecycleDisabled,
        onAddToKit: () => onAddSelectedToKit?.(),
        onUninstall: () => onUninstallSelected?.(),
        onClear: () => onClearSelection?.()
      }
    ) : null
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
  kit: kit2,
  disabled,
  onAction,
  onEdit,
  onCopy,
  onExport,
  onUninstall,
  onDuplicate,
  onRemove
}) {
  return /* @__PURE__ */ u3("article", { class: "tavernary-companion-kit-inspector", children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("p", { children: [
        kit2.originLabel,
        " \xB7 ",
        kit2.operationalStatus
      ] }),
      /* @__PURE__ */ u3("h2", { children: kit2.title }),
      /* @__PURE__ */ u3("p", { children: kit2.description })
    ] }),
    kit2.topologyChange ? /* @__PURE__ */ u3("section", { class: "tavernary-companion-kit-inspector__topology", children: [
      /* @__PURE__ */ u3("h3", { children: "Membership changes" }),
      kit2.topologyChange.kind === "exact" ? /* @__PURE__ */ u3(S, { children: [
        /* @__PURE__ */ u3("p", { children: [
          "Previously installed: ",
          list(kit2.topologyChange.previousProjectIds)
        ] }),
        /* @__PURE__ */ u3("p", { children: [
          "Added: ",
          list(kit2.topologyChange.addedProjectIds)
        ] }),
        /* @__PURE__ */ u3("p", { children: [
          "Removed: ",
          list(kit2.topologyChange.removedProjectIds)
        ] })
      ] }) : /* @__PURE__ */ u3("p", { children: "Previous membership is unavailable for this legacy install." }),
      /* @__PURE__ */ u3("p", { children: [
        "Current Tavernary Kit: ",
        list(kit2.topologyChange.currentProjectIds)
      ] })
    ] }) : null,
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-inspector__actions", children: [
      kit2.primaryAction.kind !== "review" && kit2.primaryAction.kind !== "view" ? /* @__PURE__ */ u3("button", { type: "button", disabled, onClick: () => onAction(kit2.primaryAction), children: kit2.primaryAction.label }) : null,
      kit2.editable ? /* @__PURE__ */ u3("button", { type: "button", onClick: onEdit, children: "Edit" }) : /* @__PURE__ */ u3("button", { type: "button", onClick: onCopy, children: "Copy to Personal Kits" }),
      kit2.editable ? /* @__PURE__ */ u3("button", { type: "button", onClick: onExport, children: "Export" }) : null,
      kit2.editable ? /* @__PURE__ */ u3("button", { type: "button", onClick: onDuplicate, children: "Duplicate" }) : null,
      kit2.editable ? /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          disabled: disabled || kit2.operationalStatus !== "Saved",
          title: kit2.operationalStatus === "Saved" ? void 0 : "Uninstall this Kit before removing its saved definition.",
          onClick: onRemove,
          children: "Remove saved Kit"
        }
      ) : null,
      kit2.operationalStatus !== "Saved" ? /* @__PURE__ */ u3("button", { type: "button", disabled, onClick: onUninstall, children: "Uninstall Kit" }) : null
    ] }),
    groups2.map(({ id, title }) => /* @__PURE__ */ u3(
      KitComponentGroup,
      {
        title,
        components: kit2.components.filter(({ group }) => group === id)
      },
      id
    ))
  ] });
}
function list(projectIds) {
  return projectIds.length ? projectIds.join(", ") : "None";
}

// src/ui/kits/kit-card.tsx
function KitCard({
  kit: kit2,
  disabled,
  onOpen,
  onAction
}) {
  return /* @__PURE__ */ u3("article", { class: "tavernary-companion-kit-card", "data-kit-id": kit2.id, children: [
    /* @__PURE__ */ u3("header", { children: [
      /* @__PURE__ */ u3("h3", { children: kit2.title }),
      /* @__PURE__ */ u3("span", { children: kit2.originLabel })
    ] }),
    /* @__PURE__ */ u3("p", { children: kit2.description || "No description provided." }),
    /* @__PURE__ */ u3("dl", { children: [
      /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("dt", { children: "Components" }),
        /* @__PURE__ */ u3("dd", { children: kit2.componentCount })
      ] }),
      /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("dt", { children: "Status" }),
        /* @__PURE__ */ u3("dd", { children: kit2.operationalStatus })
      ] }),
      kit2.origin === "published" ? /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("dt", { children: "Votes" }),
        /* @__PURE__ */ u3("dd", { children: kit2.supporterCount ?? "Unavailable" })
      ] }) : null,
      kit2.flaggedCount ? /* @__PURE__ */ u3("div", { children: [
        /* @__PURE__ */ u3("dt", { children: "Flagged" }),
        /* @__PURE__ */ u3("dd", { children: kit2.flaggedCount })
      ] }) : null
    ] }),
    /* @__PURE__ */ u3("footer", { children: [
      /* @__PURE__ */ u3(
        "button",
        {
          class: "tavernary-companion-button tavernary-companion-button--secondary",
          type: "button",
          "data-focus-key": `kit-${kit2.id}`,
          onClick: onOpen,
          children: "Details"
        }
      ),
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          class: "tavernary-companion-kit-card__primary tavernary-companion-button tavernary-companion-button--primary",
          disabled,
          onClick: () => onAction(kit2.primaryAction),
          children: kit2.primaryAction.label
        }
      )
    ] })
  ] });
}

// src/ui/projects/filter-choice.tsx
function FilterChoice({
  label: label2,
  count,
  checked,
  onChange,
  title,
  class: className
}) {
  return /* @__PURE__ */ u3(
    "label",
    {
      class: `tavernary-companion-filter-choice${checked ? " is-selected" : ""}${className ? ` ${className}` : ""}`,
      title,
      children: /* @__PURE__ */ u3("span", { class: "tavernary-companion-filter-choice__chip", children: [
        /* @__PURE__ */ u3(
          "input",
          {
            class: "tavernary-companion-filter-choice__input",
            type: "checkbox",
            "aria-label": label2,
            checked,
            onChange
          }
        ),
        /* @__PURE__ */ u3("span", { class: "tavernary-companion-filter-choice__check", "aria-hidden": "true", children: "\u2713" }),
        /* @__PURE__ */ u3("span", { children: label2 }),
        /* @__PURE__ */ u3(
          "b",
          {
            class: "tavernary-companion-filter-choice__count",
            "aria-label": `${count} ${count === 1 ? "project" : "projects"}`,
            children: count
          }
        )
      ] })
    }
  );
}

// src/ui/projects/filter-controls.tsx
function FilterGroup({
  title,
  options,
  selected,
  onToggle,
  presentation = "list",
  searchLabel,
  initialVisibleCount = options.length,
  kindColors = false,
  countNoun = "project",
  selectionMode = "multiple"
}) {
  const [search, setSearch] = d2("");
  const [expanded, setExpanded] = d2(false);
  const [chipsOverflow, setChipsOverflow] = d2(false);
  const chipListRef = A2(null);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const pinned = options.slice(0, initialVisibleCount);
  const selectedExtras = options.filter(
    (option, index) => index >= initialVisibleCount && selected.includes(option.id)
  );
  const collapsedIds = new Set([...pinned, ...selectedExtras].map(({ id }) => id));
  const collapsedOptions = options.filter(({ id }) => collapsedIds.has(id));
  const visibleOptions = normalizedSearch ? options.filter(({ label: label2 }) => label2.toLocaleLowerCase().includes(normalizedSearch)) : expanded ? options : collapsedOptions;
  const hiddenCount = options.length - collapsedOptions.length;
  _2(() => {
    if (presentation !== "chips" || !chipListRef.current) return;
    const list2 = chipListRef.current;
    const measure = () => {
      const rowCount = new Set(
        Array.from(list2.children).map((child) => Math.round(child.offsetTop))
      ).size;
      setChipsOverflow(rowCount > 4);
    };
    if (typeof ResizeObserver === "undefined") {
      measure();
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(list2);
    measure();
    return () => observer.disconnect();
  }, [expanded, options, presentation, selected]);
  if (options.length === 0) return null;
  return /* @__PURE__ */ u3("fieldset", { class: "tavernary-companion-filter-group", children: [
    /* @__PURE__ */ u3("legend", { children: title }),
    searchLabel ? /* @__PURE__ */ u3(
      "input",
      {
        class: "tavernary-companion-filter-search",
        type: "search",
        value: search,
        placeholder: "Search\u2026",
        "aria-label": searchLabel,
        onInput: (event) => setSearch(event.currentTarget.value)
      }
    ) : null,
    /* @__PURE__ */ u3(
      "div",
      {
        ref: presentation === "chips" ? chipListRef : void 0,
        class: `tavernary-companion-filter-options tavernary-companion-filter-options--${presentation}${presentation === "chips" && !expanded ? " is-collapsed" : ""}`,
        children: visibleOptions.map(
          (option) => presentation === "chips" ? /* @__PURE__ */ u3(
            FilterChoice,
            {
              label: option.label,
              count: option.count,
              checked: selected.includes(option.id),
              onChange: () => onToggle(option.id)
            },
            option.id
          ) : /* @__PURE__ */ u3("label", { class: "tavernary-companion-filter-option", children: [
            /* @__PURE__ */ u3(
              "input",
              {
                type: selectionMode === "single" ? "radio" : "checkbox",
                name: selectionMode === "single" ? `filter-${title}` : void 0,
                "aria-label": option.label,
                checked: selected.includes(option.id),
                class: kindColors ? "tavernary-companion-kind-checkbox" : void 0,
                "data-kind": kindColors ? option.id : void 0,
                onChange: () => onToggle(option.id)
              }
            ),
            /* @__PURE__ */ u3("span", { children: option.label }),
            /* @__PURE__ */ u3("b", { "aria-label": `${option.count} ${option.count === 1 ? countNoun : `${countNoun}s`}`, children: option.count })
          ] }, option.id)
        )
      }
    ),
    presentation === "list" && !normalizedSearch && (hiddenCount > 0 || expanded) ? /* @__PURE__ */ u3(
      "button",
      {
        class: "tavernary-companion-filter-disclosure",
        type: "button",
        "aria-expanded": expanded,
        onClick: () => setExpanded((value) => !value),
        children: expanded ? "Show fewer" : `Show ${hiddenCount} more`
      }
    ) : null,
    presentation === "chips" && (chipsOverflow || expanded) ? /* @__PURE__ */ u3(
      "button",
      {
        class: "tavernary-companion-filter-disclosure tavernary-companion-metadata-disclosure",
        type: "button",
        "aria-expanded": expanded,
        onClick: () => setExpanded((value) => !value),
        children: expanded ? "Show fewer" : "Show more"
      }
    ) : null
  ] });
}

// src/ui/kits/dual-range.tsx
function DualRange({
  label: label2,
  minimumLabel,
  maximumLabel,
  min,
  max,
  step: step2 = 1,
  value,
  onChange
}) {
  const [minimum, maximum] = value;
  const span = Math.max(1, max - min);
  const minimumPercent = (minimum - min) / span * 100;
  const maximumPercent = (maximum - min) / span * 100;
  const handleKeyDown = (thumb, event) => {
    if (!["PageUp", "PageDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = thumb === "minimum" ? minimum : maximum;
    const target = event.key === "Home" ? thumb === "minimum" ? min : minimum : event.key === "End" ? thumb === "minimum" ? maximum : max : current + (event.key === "PageUp" ? 5 * step2 : -5 * step2);
    if (thumb === "minimum") {
      onChange([Math.max(min, Math.min(target, maximum)), maximum]);
    } else {
      onChange([minimum, Math.min(max, Math.max(target, minimum))]);
    }
  };
  return /* @__PURE__ */ u3("fieldset", { class: "tavernary-companion-dual-range", children: [
    /* @__PURE__ */ u3("legend", { children: label2 }),
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-dual-range__readouts", "aria-hidden": "true", children: [
      /* @__PURE__ */ u3("span", { children: [
        "Min ",
        minimum
      ] }),
      /* @__PURE__ */ u3("span", { children: [
        "Max ",
        maximum
      ] })
    ] }),
    /* @__PURE__ */ u3(
      "div",
      {
        class: "tavernary-companion-dual-range__track",
        style: `--range-start:${minimumPercent}%;--range-end:${maximumPercent}%`,
        children: [
          /* @__PURE__ */ u3(
            "input",
            {
              type: "range",
              "aria-label": minimumLabel,
              min,
              max: maximum,
              step: step2,
              value: minimum,
              onInput: (event) => onChange([Math.min(event.currentTarget.valueAsNumber, maximum), maximum]),
              onKeyDown: (event) => handleKeyDown("minimum", event)
            }
          ),
          /* @__PURE__ */ u3(
            "input",
            {
              type: "range",
              "aria-label": maximumLabel,
              min: minimum,
              max,
              step: step2,
              value: maximum,
              onInput: (event) => onChange([minimum, Math.max(event.currentTarget.valueAsNumber, minimum)]),
              onKeyDown: (event) => handleKeyDown("maximum", event)
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ u3("span", { class: "tavernary-companion-sr-only", "aria-live": "polite", children: [
      minimum,
      " to ",
      maximum,
      " projects"
    ] })
  ] });
}

// src/ui/kits/kit-filter-panel.tsx
function KitFilterPanel({
  query,
  facets,
  open = false,
  onChange,
  onClose
}) {
  const panelRef = A2(null);
  const headingRef = A2(null);
  const update = (change) => onChange({ ...query, ...change });
  const toggle2 = (values, id) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
  h2(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const background = panel.closest(".tavernary-companion-kits-route")?.querySelectorAll(
      ".tavernary-companion-route-toolbar, .tavernary-companion-kit-switcher, .tavernary-companion-kit-segments, .tavernary-companion-kit-search, .tavernary-companion-published-kit-results"
    );
    const previous = [...background ?? []].map((element) => ({
      element,
      inert: element.hasAttribute("inert"),
      ariaHidden: element.getAttribute("aria-hidden")
    }));
    for (const { element } of previous) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }
    headingRef.current?.focus();
    const trapFocus = (event) => {
      if (event.key !== "Tab") return;
      const focusable = [
        ...panel.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      ].filter((element) => element.offsetParent !== null || element === document.activeElement);
      if (!focusable.length) return;
      const first = focusable[0];
      const last2 = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last2.focus();
      } else if (!event.shiftKey && document.activeElement === last2) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", trapFocus);
    return () => {
      panel.removeEventListener("keydown", trapFocus);
      for (const item of previous) {
        if (!item.inert) item.element.removeAttribute("inert");
        if (item.ariaHidden === null) item.element.removeAttribute("aria-hidden");
        else item.element.setAttribute("aria-hidden", item.ariaHidden);
      }
    };
  }, [open]);
  return /* @__PURE__ */ u3(S, { children: [
    open ? /* @__PURE__ */ u3(
      "button",
      {
        type: "button",
        class: "tavernary-companion-kit-filter-backdrop",
        "aria-label": "Close Kit filters",
        onClick: onClose
      }
    ) : null,
    /* @__PURE__ */ u3(
      "aside",
      {
        ref: panelRef,
        id: "tavernary-companion-kit-filters",
        class: `tavernary-companion-kit-filter-panel${open ? " is-open" : ""}`,
        role: open ? "dialog" : void 0,
        "aria-modal": open || void 0,
        "aria-label": "Kit filters",
        children: [
          /* @__PURE__ */ u3("header", { children: [
            /* @__PURE__ */ u3("h3", { ref: headingRef, tabIndex: open ? -1 : void 0, children: "Filters" }),
            /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                onClick: () => onChange({ ...structuredClone(DEFAULT_KIT_QUERY), sort: query.sort }),
                children: "Clear all"
              }
            ),
            /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                class: "tavernary-companion-kit-filter-close",
                "aria-label": "Close Kit filters",
                onClick: onClose,
                children: "\xD7"
              }
            )
          ] }),
          /* @__PURE__ */ u3(
            FilterGroup,
            {
              title: "Compatible frontend",
              options: facets.frontends,
              selected: query.frontends,
              onToggle: (id) => update({ frontends: toggle2(query.frontends, id) }),
              searchLabel: "Search compatible frontends",
              initialVisibleCount: 3,
              countNoun: "Kit"
            }
          ),
          /* @__PURE__ */ u3(
            FilterGroup,
            {
              title: "Purpose",
              options: facets.purposes,
              selected: query.purposes,
              onToggle: (id) => update({ purposes: toggle2(query.purposes, id) }),
              presentation: "chips",
              countNoun: "Kit"
            }
          ),
          /* @__PURE__ */ u3(
            FilterGroup,
            {
              title: "Model family",
              options: facets.modelFamilies,
              selected: query.modelFamilies ?? [],
              onToggle: (id) => update({ modelFamilies: toggle2(query.modelFamilies ?? [], id) }),
              presentation: "chips",
              countNoun: "Kit"
            }
          ),
          /* @__PURE__ */ u3(
            FilterGroup,
            {
              title: "Includes project",
              options: facets.projects,
              selected: query.includesProjectId ? [query.includesProjectId] : [],
              onToggle: (id) => update({ includesProjectId: id }),
              searchLabel: "Search included projects",
              initialVisibleCount: 5,
              countNoun: "Kit",
              selectionMode: "single"
            }
          ),
          /* @__PURE__ */ u3(
            DualRange,
            {
              label: "Kit size",
              minimumLabel: "Minimum projects",
              maximumLabel: "Maximum projects",
              min: 3,
              max: 50,
              value: [query.minProjects, query.maxProjects],
              onChange: ([minProjects, maxProjects]) => update({ minProjects, maxProjects })
            }
          ),
          /* @__PURE__ */ u3("fieldset", { class: "tavernary-companion-kit-status-filter", children: [
            /* @__PURE__ */ u3("legend", { children: "Kit status" }),
            /* @__PURE__ */ u3("label", { class: "tavernary-companion-filter-option", children: [
              /* @__PURE__ */ u3(
                "input",
                {
                  type: "checkbox",
                  checked: query.allComponentsAvailable,
                  "aria-label": "All components available",
                  onChange: (event) => update({ allComponentsAvailable: event.currentTarget.checked })
                }
              ),
              /* @__PURE__ */ u3("span", { children: "All components available" }),
              /* @__PURE__ */ u3("b", { "aria-label": `${facets.availableCount} Kits`, children: facets.availableCount })
            ] })
          ] })
        ]
      }
    )
  ] });
}

// src/ui/kits/kit-switcher.tsx
function KitSwitcher({
  kits,
  activeKitId,
  disabled,
  onActivate,
  onDeactivate
}) {
  const installed = kits.filter(
    ({ operationalStatus }) => operationalStatus === "Installed" || operationalStatus === "Active"
  );
  return /* @__PURE__ */ u3("label", { class: "tavernary-companion-kit-switcher", children: [
    "Active managed Kit",
    /* @__PURE__ */ u3(
      "select",
      {
        value: activeKitId ?? "",
        disabled,
        onChange: (event) => {
          const next = event.currentTarget.value;
          if (!next && activeKitId) onDeactivate?.();
          else if (next !== activeKitId) onActivate(next);
        },
        children: [
          /* @__PURE__ */ u3("option", { value: "", children: "None" }),
          installed.map((kit2) => /* @__PURE__ */ u3("option", { value: kit2.id, children: [
            kit2.title,
            kit2.id === activeKitId ? " (active)" : ""
          ] }, kit2.id))
        ]
      }
    )
  ] });
}

// src/ui/kits/kits-route.tsx
function KitsRoute({
  controller,
  lifecycleDisabled = false,
  onOpenKit,
  onAction,
  switcherKits = [],
  activeKitId = null,
  onActivate,
  onDeactivate
}) {
  const [state, setState] = d2(controller.read());
  const [filtersOpen, setFiltersOpen] = d2(false);
  const filterTriggerRef = A2(null);
  h2(() => controller.subscribe(setState), [controller]);
  const closeFilters = q2(() => {
    setFiltersOpen(false);
    filterTriggerRef.current?.focus();
  }, []);
  h2(() => {
    if (!filtersOpen) return;
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeFilters();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeFilters, filtersOpen]);
  const kitResults = (kits) => kits.length ? /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-grid", children: kits.map((kit2) => /* @__PURE__ */ u3(
    KitCard,
    {
      kit: kit2,
      disabled: lifecycleDisabled,
      onOpen: () => onOpenKit(kit2.id),
      onAction: (action) => onAction(kit2.id, action)
    },
    `${kit2.origin}-${kit2.id}`
  )) }) : /* @__PURE__ */ u3("p", { children: "No Kits match the current view." });
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-kits-route", "aria-labelledby": "kits-heading", children: [
    /* @__PURE__ */ u3("h2", { id: "kits-heading", class: "tavernary-companion-sr-only", children: "Kits" }),
    /* @__PURE__ */ u3("header", { class: "tavernary-companion-route-toolbar", children: [
      /* @__PURE__ */ u3("strong", { "aria-hidden": "true", children: "Kits" }),
      /* @__PURE__ */ u3("span", { children: [
        state.visible.length,
        " ",
        state.visible.length === 1 ? "Kit" : "Kits",
        " shown"
      ] })
    ] }),
    switcherKits.some(
      ({ operationalStatus }) => operationalStatus === "Installed" || operationalStatus === "Active"
    ) ? /* @__PURE__ */ u3(
      KitSwitcher,
      {
        kits: switcherKits,
        activeKitId,
        disabled: lifecycleDisabled,
        onActivate: (id) => onActivate?.(id),
        onDeactivate
      }
    ) : null,
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-segments", role: "tablist", "aria-label": "Kit sources", children: [
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": state.segment === "personal",
          onClick: () => {
            setFiltersOpen(false);
            controller.setSegment("personal");
          },
          children: [
            "Personal ",
            /* @__PURE__ */ u3("span", { children: state.personalCount })
          ]
        }
      ),
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
      )
    ] }),
    /* @__PURE__ */ u3("label", { class: "tavernary-companion-kit-search", children: [
      /* @__PURE__ */ u3("span", { class: "tavernary-companion-sr-only", children: "Search Kits" }),
      /* @__PURE__ */ u3(
        "input",
        {
          type: "search",
          "aria-label": "Search Kits",
          placeholder: "Search Kits\u2026",
          value: state.search,
          onInput: (event) => controller.setSearch(event.currentTarget.value)
        }
      )
    ] }),
    state.segment === "published" ? /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3(
        "button",
        {
          ref: filterTriggerRef,
          type: "button",
          class: "tavernary-companion-kit-filter-trigger",
          "aria-label": "Kit filters",
          "aria-controls": "tavernary-companion-kit-filters",
          "aria-expanded": filtersOpen,
          onClick: () => setFiltersOpen((current) => !current),
          children: "Filters"
        }
      ),
      /* @__PURE__ */ u3("div", { class: "tavernary-companion-published-kit-workspace", children: [
        /* @__PURE__ */ u3(
          KitFilterPanel,
          {
            query: state.query,
            facets: state.facets,
            open: filtersOpen,
            onClose: closeFilters,
            onChange: (query) => controller.setQuery(query)
          }
        ),
        /* @__PURE__ */ u3("div", { class: "tavernary-companion-published-kit-results", children: [
          /* @__PURE__ */ u3("label", { class: "tavernary-companion-kit-sort", children: [
            /* @__PURE__ */ u3("span", { children: "Sort" }),
            /* @__PURE__ */ u3(
              "select",
              {
                value: state.query.sort,
                "aria-label": "Sort Published Kits",
                onChange: (event) => controller.setQuery({
                  ...state.query,
                  sort: event.currentTarget.value
                }),
                children: [
                  /* @__PURE__ */ u3("option", { value: "trending", children: "Trending" }),
                  /* @__PURE__ */ u3("option", { value: "newest", children: "Newest" }),
                  /* @__PURE__ */ u3("option", { value: "updated", children: "Recently updated" }),
                  /* @__PURE__ */ u3("option", { value: "alphabetical", children: "Alphabetical" }),
                  /* @__PURE__ */ u3("option", { value: "relevance", children: "Relevance" })
                ]
              }
            )
          ] }),
          kitResults(state.visible)
        ] })
      ] })
    ] }) : kitResults(state.visible)
  ] });
}

// src/ui/catalog/catalog-freshness.tsx
function CatalogFreshness({
  snapshot,
  now = (/* @__PURE__ */ new Date()).toISOString(),
  refreshing = false
}) {
  const label2 = refreshing ? "Checking catalog\u2026" : freshnessLabel(snapshot);
  const title = "catalog" in snapshot ? `Catalog published ${relativeAge(snapshot.catalog.generatedAt, now)}` : void 0;
  return /* @__PURE__ */ u3("span", { class: "tavernary-companion-catalog-freshness", "data-state": snapshot.state, title, children: label2 });
}
function freshnessLabel(snapshot) {
  switch (snapshot.state) {
    case "empty-loading":
      return "Checking catalog\u2026";
    case "ready-current":
      return "Catalog up to date";
    case "ready-stale":
      return "Catalog may be old";
    case "ready-offline":
      return "Cached \xB7 offline";
    case "incompatible-with-cache":
    case "incompatible-empty":
      return "Update required";
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
        emptyError ? /* @__PURE__ */ u3("header", { children: [
          /* @__PURE__ */ u3(CatalogFreshness, { snapshot, refreshing }),
          /* @__PURE__ */ u3("button", { type: "button", onClick: () => void refresh(), disabled: refreshing, children: "Try again" })
        ] }) : null,
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

// src/ui/projects/active-filter-chips.tsx
function ActiveFilterChips({
  query,
  facets,
  onQueryChange
}) {
  const labels = {
    frontends: toLabelMap(facets.frontends),
    kinds: toLabelMap(facets.kinds),
    tags: toLabelMap(facets.tags),
    modelFamilies: toLabelMap(facets.modelFamilies),
    completionFormats: toLabelMap(facets.completionFormats),
    development: toLabelMap(facets.development),
    licenses: toLabelMap(facets.licenses)
  };
  const arrayFilters = [
    { key: "frontends", values: query.frontends },
    { key: "kinds", values: query.kinds },
    { key: "tags", values: query.tags },
    { key: "modelFamilies", values: query.modelFamilies ?? [] },
    { key: "completionFormats", values: query.completionFormats ?? [] },
    { key: "development", values: query.development },
    { key: "licenses", values: query.licenses }
  ];
  const categoryLabel = CATEGORY_OPTIONS.find(({ id }) => id === query.category)?.label;
  const viewLabel = (/* @__PURE__ */ new Map([
    ["active", "Active catalog view"],
    ["new", "New catalog view"],
    ["released", "Recently released catalog view"]
  ])).get(query.view);
  return /* @__PURE__ */ u3("div", { class: "tavernary-companion-filter-chips", "aria-label": "Active filters", children: [
    query.category && categoryLabel ? /* @__PURE__ */ u3(
      FilterChip,
      {
        label: categoryLabel,
        ariaLabel: `Remove ${categoryLabel} category filter`,
        onRemove: () => onQueryChange({ ...query, category: "" })
      }
    ) : null,
    arrayFilters.flatMap(
      ({ key, values }) => values.map((id) => {
        const label2 = labels[key].get(id) ?? id;
        return /* @__PURE__ */ u3(
          FilterChip,
          {
            label: label2,
            ariaLabel: `Remove ${label2} filter`,
            onRemove: () => onQueryChange({
              ...query,
              [key]: values.filter((value) => value !== id)
            })
          },
          `${key}-${id}`
        );
      })
    ),
    query.view !== "all" && viewLabel ? /* @__PURE__ */ u3(
      FilterChip,
      {
        label: viewLabel,
        ariaLabel: `Remove ${viewLabel} filter`,
        onRemove: () => onQueryChange({ ...query, view: "all" })
      }
    ) : null
  ] });
}
function FilterChip({
  label: label2,
  ariaLabel,
  onRemove
}) {
  return /* @__PURE__ */ u3("button", { type: "button", "aria-label": ariaLabel, onClick: onRemove, children: [
    label2,
    " ",
    /* @__PURE__ */ u3("span", { "aria-hidden": "true", children: "\xD7" })
  ] });
}
function toLabelMap(options) {
  return new Map(options.map(({ id, label: label2 }) => [id, label2]));
}

// src/ui/projects/filter-panel.tsx
function FilterPanel({
  query,
  facets,
  onQueryChange
}) {
  return /* @__PURE__ */ u3("aside", { class: "tavernary-companion-filter-panel", "aria-label": "Project filters", children: [
    /* @__PURE__ */ u3(
      FilterGroup,
      {
        title: "Compatible frontend",
        options: facets.frontends,
        selected: query.frontends,
        onToggle: (id) => onQueryChange({ ...query, frontends: toggle(query.frontends, id) }),
        searchLabel: "Search compatible frontends",
        initialVisibleCount: 3
      }
    ),
    /* @__PURE__ */ u3(
      FilterGroup,
      {
        title: "Project kind",
        options: facets.kinds,
        selected: query.kinds,
        onToggle: (id) => onQueryChange({ ...query, kinds: toggle(query.kinds, id) }),
        kindColors: true
      }
    ),
    /* @__PURE__ */ u3(
      TagBrowser,
      {
        tags: facets.tags,
        selected: query.tags,
        onToggle: (id) => onQueryChange({ ...query, tags: toggle(query.tags, id) })
      }
    ),
    /* @__PURE__ */ u3(
      FilterGroup,
      {
        title: "Model family",
        options: facets.modelFamilies,
        selected: query.modelFamilies ?? [],
        onToggle: (id) => onQueryChange({
          ...query,
          modelFamilies: toggle(query.modelFamilies ?? [], id)
        }),
        presentation: "chips"
      }
    ),
    /* @__PURE__ */ u3(
      FilterGroup,
      {
        title: "Completion format",
        options: facets.completionFormats,
        selected: query.completionFormats ?? [],
        onToggle: (id) => onQueryChange({
          ...query,
          completionFormats: toggle(query.completionFormats ?? [], id)
        }),
        presentation: "chips"
      }
    ),
    /* @__PURE__ */ u3(
      FilterGroup,
      {
        title: "Development",
        options: facets.development,
        selected: query.development,
        onToggle: (id) => onQueryChange({
          ...query,
          development: toggle(query.development, id)
        })
      }
    ),
    /* @__PURE__ */ u3(
      FilterGroup,
      {
        title: "License",
        options: facets.licenses,
        selected: query.licenses,
        onToggle: (id) => onQueryChange({
          ...query,
          licenses: toggle(query.licenses, id)
        })
      }
    )
  ] });
}
function TagBrowser({
  tags,
  selected,
  onToggle
}) {
  const [search, setSearch] = d2("");
  const [expanded, setExpanded] = d2({ goal: false, trait: false });
  if (tags.length === 0) return null;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleTags = tags.filter(
    ({ id, label: label2 }) => !normalizedSearch || id.toLocaleLowerCase().includes(normalizedSearch) || label2.toLocaleLowerCase().includes(normalizedSearch)
  );
  const selectedTags = selected.map((id) => tags.find((tag2) => tag2.id === id)).filter((tag2) => tag2 !== void 0);
  return /* @__PURE__ */ u3(
    "section",
    {
      class: "tavernary-companion-filter-tag-browser",
      "aria-labelledby": "tavernary-companion-project-tag-filter-heading",
      children: [
        /* @__PURE__ */ u3("h3", { id: "tavernary-companion-project-tag-filter-heading", children: "Goals & traits" }),
        /* @__PURE__ */ u3("div", { class: "tavernary-companion-tag-browser", children: [
          /* @__PURE__ */ u3(
            "input",
            {
              class: "tavernary-companion-filter-search",
              type: "search",
              value: search,
              placeholder: "Search tags\u2026",
              "aria-label": "Search goals and traits",
              onInput: (event) => setSearch(event.currentTarget.value)
            }
          ),
          /* @__PURE__ */ u3("div", { class: "tavernary-companion-tag-browser__status", children: /* @__PURE__ */ u3("span", { "aria-live": "polite", children: [
            selected.length,
            " selected"
          ] }) }),
          selectedTags.length ? /* @__PURE__ */ u3(
            "div",
            {
              class: "tavernary-companion-tag-browser__selected",
              "aria-label": "Selected goals and traits",
              children: selectedTags.map((tag2) => /* @__PURE__ */ u3(
                "button",
                {
                  type: "button",
                  "aria-label": `Remove ${tag2.label}`,
                  onClick: () => onToggle(tag2.id),
                  children: [
                    /* @__PURE__ */ u3("span", { "aria-hidden": "true", children: "\u2713" }),
                    /* @__PURE__ */ u3("span", { children: tag2.label }),
                    /* @__PURE__ */ u3("span", { "aria-hidden": "true", children: "\xD7" })
                  ]
                },
                tag2.id
              ))
            }
          ) : null,
          /* @__PURE__ */ u3("div", { class: "tavernary-companion-tag-browser__facets", children: [
            ["goal", "Goals"],
            ["trait", "Traits"]
          ].map(([facet, label2]) => {
            const group = visibleTags.filter((tag2) => tag2.facet === facet).sort(
              (left, right) => right.count - left.count || left.label.localeCompare(right.label)
            );
            if (group.length === 0) return null;
            const shown = normalizedSearch || expanded[facet] ? group : group.slice(0, 8);
            const hiddenCount = group.length - shown.length;
            return /* @__PURE__ */ u3("fieldset", { class: "tavernary-companion-tag-browser__group", children: [
              /* @__PURE__ */ u3("legend", { children: label2 }),
              /* @__PURE__ */ u3("div", { class: "tavernary-companion-tag-browser__options", children: shown.map((tag2) => /* @__PURE__ */ u3(
                FilterChoice,
                {
                  class: "tavernary-companion-tag-browser__option",
                  label: tag2.label,
                  count: tag2.count,
                  checked: selected.includes(tag2.id),
                  title: tag2.description,
                  onChange: () => onToggle(tag2.id)
                },
                tag2.id
              )) }),
              !normalizedSearch && (hiddenCount > 0 || expanded[facet]) ? /* @__PURE__ */ u3(
                "button",
                {
                  type: "button",
                  class: "tavernary-companion-filter-disclosure",
                  "aria-expanded": expanded[facet],
                  onClick: () => setExpanded((current) => ({ ...current, [facet]: !current[facet] })),
                  children: expanded[facet] ? "Show fewer" : `Show ${hiddenCount} more`
                }
              ) : null
            ] }, facet);
          }) }),
          normalizedSearch && visibleTags.length === 0 ? /* @__PURE__ */ u3("p", { class: "tavernary-companion-tag-browser__empty", children: "No matching goals or traits." }) : null
        ] })
      ]
    }
  );
}
function toggle(values, id) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

// src/ui/shared/activity-strip.tsx
function ActivityStrip({ weeks }) {
  const values = weeks?.slice(-12) ?? Array.from({ length: 12 }, () => false);
  const padded = [
    ...Array.from({ length: Math.max(0, 12 - values.length) }, () => false),
    ...values
  ];
  return /* @__PURE__ */ u3("span", { class: "tavernary-companion-activity-strip", "aria-hidden": "true", children: padded.map((value, index) => /* @__PURE__ */ u3("i", { class: value ? "is-active" : "" }, index)) });
}

// src/ui/shared/activity-summary.tsx
function ActivitySummary({
  projectId,
  activity,
  tooltip
}) {
  if (activity.activeWeeks12 === null || activity.weeklyActivity === null) {
    return /* @__PURE__ */ u3(
      Tooltip,
      {
        id: `${projectId}-activity`,
        label: tooltip,
        ariaLabel: tooltip,
        className: "tavernary-companion-development-unavailable",
        children: "No data"
      }
    );
  }
  return /* @__PURE__ */ u3(
    Tooltip,
    {
      id: `${projectId}-activity`,
      label: tooltip,
      ariaLabel: tooltip,
      className: `tavernary-companion-activity-summary evidence-${activity.evidenceStatus}`,
      children: [
        /* @__PURE__ */ u3("b", { "aria-hidden": "true", children: "Activity" }),
        /* @__PURE__ */ u3(ActivityStrip, { weeks: activity.weeklyActivity })
      ]
    }
  );
}

// src/ui/projects/project-kit-control.tsx
function ProjectKitControl({
  projectId,
  projectName,
  selected,
  compact = false,
  onToggle
}) {
  const tooltipId = g2();
  const tooltipLabel = selected ? "Remove from selection" : "Add to Kit";
  return /* @__PURE__ */ u3(
    Tooltip,
    {
      id: `${tooltipId}-kit-action-tooltip`,
      label: tooltipLabel,
      className: "tavernary-companion-control-tooltip",
      children: /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          class: "tavernary-companion-project-kit-control",
          "aria-label": selected ? `Remove ${projectName} from selection` : `Add ${projectName} to Kit`,
          "aria-pressed": selected,
          onClick: () => onToggle(projectId),
          children: /* @__PURE__ */ u3("span", { class: "tavernary-companion-project-kit-control__face", "aria-hidden": "true", children: [
            /* @__PURE__ */ u3(
              "svg",
              {
                "data-kit-glyph": selected ? "remove" : "add",
                viewBox: "0 0 12 12",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                children: /* @__PURE__ */ u3("path", { d: selected ? "M1.5 6h9" : "M6 1.5v9M1.5 6h9" })
              }
            ),
            compact ? null : /* @__PURE__ */ u3("small", { children: "Kit" })
          ] })
        }
      )
    }
  );
}

// src/ui/projects/project-card.tsx
function ProjectCard({
  project: project2,
  onAction,
  onManageInSillyTavern,
  density = "standard",
  lifecycleDisabled = false,
  selectedForKit = false,
  onToggleKitSelection
}) {
  const selfProtected = project2.id === COMPANION_PROJECT_ID || project2.action.kind === "current-extension";
  const managedInSillyTavern = selfProtected || project2.action.kind === "manage-in-sillytavern";
  const iconName = project2.kind === "extension" ? project2.primaryFunctionId : project2.kind;
  const hasActivityMetrics = project2.activity.activeWeeks12 !== null && project2.activity.weeklyActivity !== null;
  const openRepositoryFromExposedContent = (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("a, button")) return;
    const opened = window.open(project2.canonicalUrl, "_blank", "noopener,noreferrer");
    if (opened) opened.opener = null;
  };
  return /* @__PURE__ */ u3(
    "article",
    {
      class: `tavernary-companion-project-card kind-${project2.kind}${project2.installed ? " is-installed" : ""}`,
      "data-project-id": project2.id,
      onClick: openRepositoryFromExposedContent,
      children: [
        /* @__PURE__ */ u3(
          "a",
          {
            class: "tavernary-companion-project-card__hitarea",
            href: project2.canonicalUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            "aria-label": `Open ${project2.displayName} repository`,
            "data-focus-key": `project-${project2.id}`,
            children: /* @__PURE__ */ u3("span", { class: "tavernary-companion-sr-only", children: [
              "Open ",
              project2.displayName,
              " repository"
            ] })
          }
        ),
        /* @__PURE__ */ u3("header", { class: "tavernary-companion-project-card__top", children: [
          /* @__PURE__ */ u3(
            Tooltip,
            {
              id: `${project2.id}-type`,
              label: project2.tooltips.type,
              className: "tavernary-companion-project-card__kind",
              children: [
                /* @__PURE__ */ u3("span", { class: "tavernary-companion-project-card__function-symbol", children: /* @__PURE__ */ u3(CategoryIcon, { name: iconName }) }),
                kindLabel(project2.kind)
              ]
            }
          ),
          project2.kind === "preset" ? project2.preset ? /* @__PURE__ */ u3("span", { class: "tavernary-companion-project-card__development is-preset", children: [
            project2.preset.versionLabel ? /* @__PURE__ */ u3(
              Tooltip,
              {
                id: `${project2.id}-preset-version`,
                label: project2.tooltips.preset?.version ?? "",
                className: "tavernary-companion-project-card__preset-version",
                children: project2.preset.versionLabel
              }
            ) : null,
            project2.preset.publishedLabel ? /* @__PURE__ */ u3(
              Tooltip,
              {
                id: `${project2.id}-preset-publication`,
                label: project2.tooltips.preset?.published ?? "",
                className: "tavernary-companion-project-card__preset-publication",
                children: project2.preset.publishedLabel
              }
            ) : null,
            project2.preset.sizeLabel ? /* @__PURE__ */ u3(
              Tooltip,
              {
                id: `${project2.id}-preset-size`,
                label: project2.tooltips.preset?.size ?? "",
                className: "tavernary-companion-project-card__preset-size",
                children: project2.preset.sizeLabel
              }
            ) : null
          ] }) : null : /* @__PURE__ */ u3("span", { class: "tavernary-companion-project-card__development", children: [
            /* @__PURE__ */ u3(
              ActivitySummary,
              {
                projectId: project2.id,
                activity: project2.activity,
                tooltip: project2.tooltips.activity
              }
            ),
            hasActivityMetrics && project2.activity.latestSourceActivityLabel ? /* @__PURE__ */ u3(
              Tooltip,
              {
                id: `${project2.id}-commit`,
                label: project2.tooltips.latestSourceActivity ?? "",
                className: "tavernary-companion-project-card__activity-age",
                style: {
                  "--tavernary-companion-commit-freshness": `${project2.activity.latestSourceActivityFreshness}%`
                },
                children: project2.activity.latestSourceActivityLabel
              }
            ) : hasActivityMetrics ? /* @__PURE__ */ u3(
              Tooltip,
              {
                id: `${project2.id}-commit`,
                label: project2.tooltips.latestSourceActivity ?? "",
                ariaLabel: project2.tooltips.latestSourceActivity ?? void 0,
                className: "tavernary-companion-project-card__activity-age no-source-activity",
                children: missingSourceActivityLabel(project2.activity.evidenceStatus)
              }
            ) : null,
            project2.communityAggregate !== null ? /* @__PURE__ */ u3(
              Tooltip,
              {
                id: `${project2.id}-community`,
                label: project2.tooltips.community ?? "",
                className: "tavernary-companion-project-card__community",
                children: [
                  /* @__PURE__ */ u3(CategoryIcon, { name: "community" }),
                  /* @__PURE__ */ u3("b", { children: project2.communityAggregate })
                ]
              }
            ) : null,
            project2.repositorySizeLabel ? /* @__PURE__ */ u3(
              Tooltip,
              {
                id: `${project2.id}-repository-size`,
                label: project2.tooltips.repositorySize ?? "",
                className: "tavernary-companion-project-card__repository-size",
                children: project2.repositorySizeLabel
              }
            ) : null
          ] })
        ] }),
        /* @__PURE__ */ u3("div", { class: "tavernary-companion-project-card__title", children: [
          /* @__PURE__ */ u3("h3", { children: density === "compact" ? /* @__PURE__ */ u3(
            Tooltip,
            {
              id: `${project2.id}-title`,
              label: project2.summary,
              className: "tavernary-companion-project-card__title-text",
              showOnAncestorFocus: true,
              children: project2.displayName
            }
          ) : /* @__PURE__ */ u3("span", { class: "tavernary-companion-project-card__title-text", children: project2.displayName }) }),
          project2.tavernKeeper ? /* @__PURE__ */ u3(TavernKeeperScanIndicator, { projectId: project2.id, status: project2.tavernKeeper }) : null
        ] }),
        project2.attributionLabel ? /* @__PURE__ */ u3(
          Tooltip,
          {
            id: `${project2.id}-attribution`,
            label: project2.tooltips.attribution ?? "",
            className: "tavernary-companion-project-card__attribution",
            children: project2.attributionLabel
          }
        ) : null,
        /* @__PURE__ */ u3("p", { class: "tavernary-companion-project-card__summary", children: project2.summary }),
        /* @__PURE__ */ u3("div", { class: "tavernary-companion-project-card__bottom", children: [
          /* @__PURE__ */ u3("div", { class: "tavernary-companion-project-card__chips", children: [
            project2.frontends.map((frontend, index) => /* @__PURE__ */ u3(
              Tooltip,
              {
                id: `${project2.id}-frontend-${index}`,
                label: project2.tooltips.frontends[index] ?? "",
                className: "tavernary-companion-chip tavernary-companion-chip--frontend",
                children: frontend
              }
            )),
            project2.tagChips.map((tag2, index) => /* @__PURE__ */ u3(
              Tooltip,
              {
                id: `${project2.id}-tag-${index}`,
                label: project2.tooltips.tags[index] ?? "",
                className: `tavernary-companion-chip tavernary-companion-chip--tag tag-${tag2.facet}`,
                children: tag2.label
              }
            )),
            project2.preset?.modelFamilies.map((family, index) => /* @__PURE__ */ u3(
              Tooltip,
              {
                id: `${project2.id}-model-${index}`,
                label: project2.tooltips.preset?.modelFamilies[index] ?? "",
                className: "tavernary-companion-chip",
                children: family
              }
            )),
            project2.preset?.completionFormats.map((format, index) => /* @__PURE__ */ u3(
              Tooltip,
              {
                id: `${project2.id}-completion-${index}`,
                label: project2.tooltips.preset?.completionFormats[index] ?? "",
                className: "tavernary-companion-chip",
                children: format
              }
            ))
          ] }),
          project2.action.reason ? /* @__PURE__ */ u3("p", { class: "tavernary-companion-project-card__reason", children: project2.action.reason }) : null,
          /* @__PURE__ */ u3("div", { class: "tavernary-companion-project-card__utility", children: [
            /* @__PURE__ */ u3("div", { class: "tavernary-companion-project-card__meta", children: [
              /* @__PURE__ */ u3(
                Tooltip,
                {
                  id: `${project2.id}-license`,
                  label: project2.tooltips.license,
                  className: `tavernary-companion-license license-${project2.licenseStatus}`,
                  children: project2.licenseLabel
                }
              ),
              project2.installed ? /* @__PURE__ */ u3("span", { children: "Installed" }) : null
            ] }),
            /* @__PURE__ */ u3("footer", { children: [
              managedInSillyTavern ? /* @__PURE__ */ u3("button", { type: "button", onClick: onManageInSillyTavern, children: "Manage in SillyTavern" }) : /* @__PURE__ */ u3(
                ProjectLifecycleControl,
                {
                  projectName: project2.displayName,
                  action: project2.action,
                  disabled: lifecycleDisabled,
                  onAction
                }
              ),
              !selfProtected && project2.kitSelectable && onToggleKitSelection ? /* @__PURE__ */ u3(
                ProjectKitControl,
                {
                  projectId: project2.id,
                  projectName: project2.displayName,
                  selected: selectedForKit,
                  compact: density === "compact",
                  onToggle: onToggleKitSelection
                }
              ) : null
            ] })
          ] })
        ] })
      ]
    }
  );
}
function kindLabel(kind) {
  return { extension: "Extension", preset: "System Preset", frontend: "Frontend" }[kind];
}
function missingSourceActivityLabel(evidenceStatus) {
  return { complete: "Quiet", provisional: "Pending", degraded: "Partial" }[evidenceStatus];
}

// src/ui/projects/project-grid.tsx
var PROJECT_BATCH_SIZE = 60;
function ProjectGrid({
  projects,
  density = "standard",
  onProjectAction,
  onManageInSillyTavern,
  lifecycleDisabled,
  selectedKitProjectIds = [],
  onToggleKitSelection,
  visibleCount: controlledVisibleCount,
  onVisibleCountChange
}) {
  const [internalVisibleCount, setInternalVisibleCount] = d2(PROJECT_BATCH_SIZE);
  const visibleCount = controlledVisibleCount ?? internalVisibleCount;
  h2(() => {
    if (controlledVisibleCount === void 0) setInternalVisibleCount(PROJECT_BATCH_SIZE);
  }, [projects, controlledVisibleCount]);
  const showMore = () => {
    const next = visibleCount + PROJECT_BATCH_SIZE;
    if (onVisibleCountChange) onVisibleCountChange(next);
    else setInternalVisibleCount(next);
  };
  if (projects.length === 0) {
    return /* @__PURE__ */ u3("p", { children: "No projects match the current filters." });
  }
  return /* @__PURE__ */ u3(
    "section",
    {
      class: `tavernary-companion-project-results${density === "compact" ? " is-compact" : ""}`,
      "aria-label": "Project results",
      children: [
        /* @__PURE__ */ u3("div", { class: "tavernary-companion-project-grid", children: projects.slice(0, visibleCount).map((project2) => /* @__PURE__ */ u3(
          ProjectCard,
          {
            project: project2,
            onAction: (action, anchor) => onProjectAction(project2.id, action, anchor),
            onManageInSillyTavern,
            density,
            lifecycleDisabled,
            selectedForKit: selectedKitProjectIds.includes(project2.id),
            onToggleKitSelection
          },
          project2.id
        )) }),
        visibleCount < projects.length ? /* @__PURE__ */ u3(
          "button",
          {
            type: "button",
            class: "tavernary-companion-project-results__more tavernary-companion-button tavernary-companion-button--secondary",
            "aria-label": "Show more projects",
            onClick: showMore,
            children: "Show more"
          }
        ) : null
      ]
    }
  );
}

// src/ui/projects/project-results-toolbar.tsx
var sorts = [
  { id: "recent", label: "Recent Activity" },
  { id: "date-added", label: "Date Added" },
  { id: "sustained", label: "Sustained Activity" },
  { id: "popularity", label: "Popularity" },
  { id: "alphabetical", label: "Alphabetical" },
  { id: "relevance", label: "Relevance" }
];
function ProjectResultsToolbar({
  query,
  resultCount,
  onQueryChange
}) {
  const densityAction = query.density === "standard" ? "Use compact cards" : "Use standard cards";
  return /* @__PURE__ */ u3("div", { class: "tavernary-companion-results-toolbar", children: [
    /* @__PURE__ */ u3("output", { "aria-live": "polite", children: [
      resultCount,
      " ",
      resultCount === 1 ? "project" : "projects"
    ] }),
    /* @__PURE__ */ u3(
      Tooltip,
      {
        id: "tavernary-companion-density-tooltip",
        label: densityAction,
        className: "tavernary-companion-control-tooltip",
        children: /* @__PURE__ */ u3(
          "button",
          {
            class: "tavernary-companion-density-toggle",
            type: "button",
            "aria-label": densityAction,
            "aria-pressed": query.density === "compact",
            onClick: () => onQueryChange({
              ...query,
              density: query.density === "standard" ? "compact" : "standard"
            }),
            children: /* @__PURE__ */ u3(CategoryIcon, { name: "collapse" })
          }
        )
      }
    ),
    /* @__PURE__ */ u3(
      "select",
      {
        class: "tavernary-companion-project-sort",
        "aria-label": "Sort projects",
        value: query.sort,
        onChange: (event) => onQueryChange({ ...query, sort: event.currentTarget.value }),
        children: sorts.map(({ id, label: label2 }) => /* @__PURE__ */ u3("option", { value: id, children: label2 }))
      }
    )
  ] });
}

// src/ui/kits/kit-selection-dock.tsx
function KitSelectionDock({
  count,
  onAdd,
  onCancel
}) {
  const projectLabel = `${count} ${count === 1 ? "project" : "projects"}`;
  return /* @__PURE__ */ u3("section", { class: "tavernary-companion-kit-selection-dock", "aria-label": `${projectLabel} selected`, children: /* @__PURE__ */ u3("div", { class: "tavernary-companion-kit-selection-actions", children: [
    /* @__PURE__ */ u3("button", { type: "button", class: "tavernary-companion-kit-selection-cancel", onClick: onCancel, children: "Cancel" }),
    /* @__PURE__ */ u3(
      "button",
      {
        type: "button",
        class: "tavernary-companion-kit-selection-add",
        "aria-label": `Add ${projectLabel} to Kit`,
        disabled: count === 0,
        onClick: onAdd,
        children: [
          "Add to Kit",
          /* @__PURE__ */ u3("span", { class: "selection-count", "aria-hidden": "true", children: count })
        ]
      }
    )
  ] }) });
}

// src/ui/projects/projects-route.tsx
var defaultFacets = {
  frontends: [{ id: "sillytavern", label: "SillyTavern", count: 0 }],
  kinds: [
    { id: "frontend", label: "Frontend", count: 0 },
    { id: "extension", label: "Extension", count: 0 },
    { id: "preset", label: "System Preset", count: 0 }
  ],
  tags: [],
  modelFamilies: [],
  completionFormats: [],
  development: [
    { id: "active-month", label: "Active this month", count: 0 },
    { id: "new-release", label: "Recently released", count: 0 },
    { id: "dormant", label: "Dormant", count: 0 }
  ],
  licenses: [
    { id: "open-source", label: "Open source", count: 0 },
    { id: "proprietary", label: "Proprietary", count: 0 },
    { id: "pending", label: "Pending verification", count: 0 },
    { id: "missing", label: "Missing license", count: 0 }
  ]
};
function ProjectsRoute({
  state,
  facets = state.facets ?? defaultFacets,
  onQueryChange,
  onProjectAction = () => void 0,
  onManageInSillyTavern,
  lifecycleDisabled,
  kitSelectionActive = false,
  selectedKitProjectIds = [],
  onToggleKitSelection,
  onAddKitSelection,
  onCancelKitSelection,
  visibleProjectCount,
  onVisibleProjectCountChange
}) {
  const [filtersOpen, setFiltersOpen] = d2(false);
  const [compactFilters, setCompactFilters] = d2(true);
  const route = A2(null);
  const filterTrigger = A2(null);
  const filterSurface = A2(null);
  const restoreFilterTriggerFocus = A2(false);
  const closeFilters = () => {
    restoreFilterTriggerFocus.current = true;
    setFiltersOpen(false);
  };
  h2(() => {
    const root = route.current?.closest(".tavernary-companion-root");
    if (!root) return;
    const syncMode = () => {
      const compact = root.clientWidth <= 760;
      setCompactFilters(compact);
      if (!compact) setFiltersOpen(false);
    };
    syncMode();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(syncMode);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  h2(() => {
    if (!filtersOpen || !compactFilters || !filterSurface.current) return;
    const surface = filterSurface.current;
    const root = route.current?.closest(".tavernary-companion-root");
    const getControls = () => surface.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
    );
    getControls()[0]?.focus({ preventScroll: true });
    const inerted = [];
    if (root) {
      let branch = surface;
      let parent = branch.parentElement;
      while (parent) {
        for (const child of parent.children) {
          if (child !== branch && child instanceof HTMLElement && !child.classList.contains("tavernary-companion-filter-backdrop")) {
            inerted.push({ element: child, inert: child.inert });
            child.inert = true;
          }
        }
        if (parent === root) break;
        branch = parent;
        parent = parent.parentElement;
      }
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFilters();
        return;
      }
      const controls = getControls();
      if (event.key !== "Tab" || controls.length === 0) return;
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
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      for (const { element, inert } of inerted) element.inert = inert;
    };
  }, [compactFilters, filtersOpen]);
  h2(() => {
    if (filtersOpen || !restoreFilterTriggerFocus.current) return;
    restoreFilterTriggerFocus.current = false;
    filterTrigger.current?.focus();
  }, [filtersOpen]);
  const hasChangedFilters = !sameValues(state.query.frontends, DEFAULT_COMPANION_QUERY.frontends) || !sameValues(state.query.kinds, DEFAULT_COMPANION_QUERY.kinds) || state.query.category !== DEFAULT_COMPANION_QUERY.category || state.query.tags.length > 0 || (state.query.modelFamilies?.length ?? 0) > 0 || (state.query.completionFormats?.length ?? 0) > 0 || state.query.development.length > 0 || state.query.licenses.length > 0 || state.query.view !== DEFAULT_COMPANION_QUERY.view;
  const clearFilters = () => onQueryChange({
    ...structuredClone(DEFAULT_COMPANION_QUERY),
    search: state.query.search,
    sort: state.query.sort
  });
  const clearFiltersFromSurface = () => {
    clearFilters();
    if (filtersOpen) {
      queueMicrotask(
        () => filterSurface.current?.querySelector(".tavernary-companion-filter-close")?.focus()
      );
    }
  };
  const filterCount = state.query.frontends.length + state.query.kinds.length + state.query.tags.length + (state.query.modelFamilies?.length ?? 0) + (state.query.completionFormats?.length ?? 0) + state.query.development.length + state.query.licenses.length;
  return /* @__PURE__ */ u3(
    "section",
    {
      ref: route,
      class: `tavernary-companion-projects-route${filtersOpen && compactFilters ? " has-open-filters" : ""}`,
      "aria-label": "Projects",
      children: [
        /* @__PURE__ */ u3("div", { class: "tavernary-companion-projects-route__workspace", children: [
          filtersOpen && compactFilters ? /* @__PURE__ */ u3(
            "div",
            {
              class: "tavernary-companion-filter-backdrop",
              "data-testid": "filter-backdrop",
              "aria-hidden": "true",
              onPointerDown: closeFilters
            }
          ) : null,
          /* @__PURE__ */ u3(
            "div",
            {
              id: "tavernary-companion-project-filters",
              ref: filterSurface,
              role: filtersOpen && compactFilters ? "dialog" : void 0,
              "aria-label": "Project filters",
              "aria-modal": filtersOpen && compactFilters || void 0,
              class: `tavernary-companion-filter-surface${filtersOpen ? " is-open" : ""}`,
              children: [
                /* @__PURE__ */ u3("header", { class: "tavernary-companion-filter-surface__header", children: [
                  /* @__PURE__ */ u3("div", { children: [
                    /* @__PURE__ */ u3("span", { class: "tavernary-companion-filter-surface__eyebrow", children: "Refine catalog" }),
                    /* @__PURE__ */ u3("h2", { children: "Filters" })
                  ] }),
                  /* @__PURE__ */ u3(
                    "button",
                    {
                      type: "button",
                      class: "tavernary-companion-filter-clear",
                      "aria-label": "Clear all filters",
                      disabled: !hasChangedFilters,
                      onClick: clearFiltersFromSurface,
                      children: "Clear all"
                    }
                  ),
                  /* @__PURE__ */ u3(
                    "button",
                    {
                      type: "button",
                      class: "tavernary-companion-filter-close",
                      "aria-label": "Close filters",
                      onClick: closeFilters,
                      children: /* @__PURE__ */ u3(CategoryIcon, { name: "close" })
                    }
                  )
                ] }),
                /* @__PURE__ */ u3(FilterPanel, { query: state.query, facets, onQueryChange })
              ]
            }
          ),
          /* @__PURE__ */ u3("main", { class: "tavernary-companion-projects-route__main", children: [
            /* @__PURE__ */ u3("div", { class: "tavernary-companion-filter-bar", children: [
              /* @__PURE__ */ u3("p", { class: "tavernary-companion-catalog-advisory", children: /* @__PURE__ */ u3(
                "a",
                {
                  href: "https://tavernary.org/about/#safety-security",
                  target: "_blank",
                  rel: "noopener noreferrer",
                  children: "Safety: TavernKeeper scans are advisory, not a guarantee. Review a project carefully before installing it or providing credentials."
                }
              ) }),
              /* @__PURE__ */ u3(
                "button",
                {
                  ref: filterTrigger,
                  type: "button",
                  class: "tavernary-companion-filter-trigger",
                  "aria-label": "Open filters",
                  "aria-controls": "tavernary-companion-project-filters",
                  "aria-expanded": filtersOpen,
                  onClick: () => setFiltersOpen(true),
                  children: [
                    /* @__PURE__ */ u3(CategoryIcon, { name: "filter-lines" }),
                    filterCount > 0 ? /* @__PURE__ */ u3("b", { children: filterCount }) : null
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ u3(
              ProjectResultsToolbar,
              {
                query: state.query,
                resultCount: state.projects.length,
                onQueryChange
              }
            ),
            hasChangedFilters ? /* @__PURE__ */ u3(ActiveFilterChips, { query: state.query, facets, onQueryChange }) : null,
            /* @__PURE__ */ u3(
              ProjectGrid,
              {
                projects: state.projects,
                onProjectAction,
                onManageInSillyTavern,
                lifecycleDisabled,
                selectedKitProjectIds,
                onToggleKitSelection,
                density: state.query.density,
                visibleCount: visibleProjectCount,
                onVisibleCountChange: onVisibleProjectCountChange
              }
            )
          ] })
        ] }),
        kitSelectionActive ? /* @__PURE__ */ u3(
          KitSelectionDock,
          {
            count: selectedKitProjectIds.length,
            onAdd: () => onAddKitSelection?.(),
            onCancel: () => onCancelKitSelection?.()
          }
        ) : null
      ]
    }
  );
}
function sameValues(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

// src/ui/shell/catalog-navigation.tsx
var NAVIGATION_CATEGORY_OPTIONS = CATEGORY_OPTIONS.filter(({ id }) => id !== "frontend");
function CategoryMark({ id }) {
  if (!id) {
    return /* @__PURE__ */ u3("span", { class: "tavernary-companion-all-symbol", "aria-hidden": "true", children: [
      /* @__PURE__ */ u3("i", {}),
      /* @__PURE__ */ u3("i", {}),
      /* @__PURE__ */ u3("i", {}),
      /* @__PURE__ */ u3("i", {})
    ] });
  }
  return /* @__PURE__ */ u3(CategoryIcon, { name: id });
}
function CatalogNavigation({
  route,
  query,
  onNavigate,
  onQueryChange
}) {
  const [mobileOpen, setMobileOpen] = d2(false);
  const mobileTrigger = A2(null);
  const mobileMenu = A2(null);
  const currentCategory = CATEGORY_OPTIONS.find((category) => category.id === query.category) ?? CATEGORY_OPTIONS[0];
  const current = route === "kits" ? { id: "kits", label: "Kits" } : route === "installed" ? { id: "installed", label: "Installed" } : { id: currentCategory.id, label: currentCategory.label };
  const selectCategory = (category) => {
    onNavigate("projects");
    onQueryChange({ ...query, category });
    setMobileOpen(false);
  };
  h2(() => {
    if (!mobileOpen) return;
    const closeFromKeyboard = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMobileOpen(false);
      mobileTrigger.current?.focus();
    };
    const closeFromPointer = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (mobileTrigger.current?.contains(target) || mobileMenu.current?.contains(target)) return;
      setMobileOpen(false);
    };
    document.addEventListener("keydown", closeFromKeyboard);
    document.addEventListener("mousedown", closeFromPointer);
    return () => {
      document.removeEventListener("keydown", closeFromKeyboard);
      document.removeEventListener("mousedown", closeFromPointer);
    };
  }, [mobileOpen]);
  const selectRoute = (nextRoute) => {
    onNavigate(nextRoute);
    setMobileOpen(false);
  };
  return /* @__PURE__ */ u3(S, { children: [
    /* @__PURE__ */ u3("nav", { class: "tavernary-companion-category-navigation", "aria-label": "Catalog categories", children: [
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          class: route === "kits" ? "active" : "",
          "data-category": "kits",
          "aria-pressed": route === "kits",
          onClick: () => selectRoute("kits"),
          children: [
            /* @__PURE__ */ u3(CategoryIcon, { name: "kit" }),
            /* @__PURE__ */ u3("span", { children: "Kits" })
          ]
        }
      ),
      NAVIGATION_CATEGORY_OPTIONS.map((category) => /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          class: route === "projects" && query.category === category.id ? "active" : "",
          "data-category": category.id || "all",
          "aria-pressed": route === "projects" && query.category === category.id,
          onClick: () => selectCategory(category.id),
          children: [
            /* @__PURE__ */ u3(CategoryMark, { id: category.id }),
            /* @__PURE__ */ u3("span", { children: category.shortLabel })
          ]
        },
        category.id || "all"
      )),
      /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          class: route === "installed" ? "active" : "",
          "data-category": "installed",
          "aria-pressed": route === "installed",
          onClick: () => selectRoute("installed"),
          children: [
            /* @__PURE__ */ u3(CategoryIcon, { name: "kit-builder" }),
            /* @__PURE__ */ u3("span", { children: "Installed" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-mobile-category", children: [
      /* @__PURE__ */ u3(
        "button",
        {
          ref: mobileTrigger,
          class: "tavernary-companion-mobile-category__trigger",
          type: "button",
          "aria-label": "Browse categories",
          "aria-expanded": mobileOpen,
          "data-category": current.id || "all",
          onClick: () => setMobileOpen((open) => !open),
          children: [
            /* @__PURE__ */ u3(CategoryMark, { id: current.id }),
            /* @__PURE__ */ u3("span", { children: [
              /* @__PURE__ */ u3("small", { children: "Browse" }),
              current.label
            ] }),
            /* @__PURE__ */ u3(CategoryIcon, { name: "chevron" })
          ]
        }
      ),
      mobileOpen ? /* @__PURE__ */ u3(
        "div",
        {
          ref: mobileMenu,
          class: "tavernary-companion-mobile-category__menu",
          role: "group",
          "aria-label": "Browse categories menu",
          children: [
            /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                class: route === "kits" ? "active" : "",
                "data-category": "kits",
                onClick: () => selectRoute("kits"),
                children: [
                  /* @__PURE__ */ u3(CategoryIcon, { name: "kit" }),
                  /* @__PURE__ */ u3("span", { children: "Kits" })
                ]
              }
            ),
            NAVIGATION_CATEGORY_OPTIONS.map((category) => /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                class: route === "projects" && query.category === category.id ? "active" : "",
                "data-category": category.id || "all",
                onClick: () => selectCategory(category.id),
                children: [
                  /* @__PURE__ */ u3(CategoryMark, { id: category.id }),
                  /* @__PURE__ */ u3("span", { children: category.label })
                ]
              },
              category.id || "all"
            )),
            /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                class: route === "installed" ? "active" : "",
                "data-category": "installed",
                onClick: () => selectRoute("installed"),
                children: [
                  /* @__PURE__ */ u3(CategoryIcon, { name: "kit-builder" }),
                  /* @__PURE__ */ u3("span", { children: "Installed" })
                ]
              }
            )
          ]
        }
      ) : null
    ] })
  ] });
}

// src/ui/shell/shell-header.tsx
function ShellHeader({
  search,
  onRequestClose,
  catalogSnapshot,
  catalogRefreshing,
  onRefreshCatalog
}) {
  return /* @__PURE__ */ u3("header", { class: "tavernary-companion-shell__header", children: [
    /* @__PURE__ */ u3(
      "a",
      {
        class: "tavernary-companion-brand",
        href: "https://tavernary.org/",
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": "Tavernary Companion \u2014 open Tavernary.org in a new tab",
        children: [
          /* @__PURE__ */ u3("span", { class: "tavernary-companion-brand__mark", role: "img", "aria-label": "Tavernary" }),
          /* @__PURE__ */ u3("div", { class: "tavernary-companion-brand__copy", children: /* @__PURE__ */ u3("h1", { id: "tavernary-companion-heading", "aria-label": "Tavernary Companion", children: [
            /* @__PURE__ */ u3("span", { class: "tavernary-companion-brand__name", children: "Tavernary" }),
            /* @__PURE__ */ u3("span", { class: "tavernary-companion-brand__companion", children: "Companion" })
          ] }) })
        ]
      }
    ),
    search ? /* @__PURE__ */ u3("label", { class: "tavernary-companion-header-search", children: [
      /* @__PURE__ */ u3("span", { class: "tavernary-companion-sr-only", children: "Search projects" }),
      /* @__PURE__ */ u3(
        "input",
        {
          type: "search",
          "aria-label": "Search projects",
          placeholder: "Search projects or creators\u2026",
          value: search.value,
          onInput: (event) => search.onChange(event.currentTarget.value)
        }
      )
    ] }) : null,
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-shell__utilities", children: [
      catalogSnapshot ? /* @__PURE__ */ u3(S, { children: [
        /* @__PURE__ */ u3(CatalogFreshness, { snapshot: catalogSnapshot, refreshing: catalogRefreshing }),
        onRefreshCatalog ? /* @__PURE__ */ u3(
          "button",
          {
            class: `tavernary-companion-button tavernary-companion-button--primary tavernary-companion-refresh${catalogRefreshing ? " is-refreshing" : ""}`,
            type: "button",
            onClick: onRefreshCatalog,
            "aria-label": catalogRefreshing ? "Refreshing catalog" : "Refresh catalog",
            "aria-busy": catalogRefreshing ? "true" : "false",
            disabled: catalogRefreshing,
            children: [
              /* @__PURE__ */ u3("svg", { "data-refresh-icon": "true", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ u3(
                "path",
                {
                  d: "M21 3V8M21 8H16M21 8L18 5.29168C16.4077 3.86656 14.3051 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.2832 21 19.8675 18.008 20.777 14",
                  stroke: "currentColor",
                  "stroke-width": "2",
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round"
                }
              ) }),
              /* @__PURE__ */ u3("span", { children: catalogRefreshing ? "Refreshing" : "Refresh" })
            ]
          }
        ) : null
      ] }) : null,
      onRequestClose ? /* @__PURE__ */ u3(
        "button",
        {
          class: "tavernary-companion-button tavernary-companion-button--secondary",
          type: "button",
          onClick: onRequestClose,
          "aria-label": "Close Tavernary Companion",
          children: "Close"
        }
      ) : null
    ] })
  ] });
}

// src/ui/shell/companion-shell.tsx
var noRefresh = () => void 0;
var noAction = () => void 0;
var INITIAL_PROJECT_COUNT = 60;
function CompanionShell({
  controller,
  discovery,
  facets,
  onProjectAction,
  onRefreshInventory = noRefresh,
  updateStates = {},
  onCheckUpdates,
  onRetryUpdate,
  onUpdateExtension,
  inventoryRefreshing = false,
  togglingInternalName = null,
  onToggleExtension,
  installedSelection,
  onSelectInstalledKit,
  onToggleInstalledSelection,
  onAddInstalledSelectionToKit,
  onUninstallInstalledSelection,
  onClearInstalledSelection,
  onForgetMissingManaged,
  onOpenExtensionManager,
  lifecycleDisabled = false,
  kitDiscovery,
  kitInspectors = {},
  installedKits = [],
  onKitAction,
  onEditKit,
  onCopyKit,
  onExportKit,
  onUninstallKit,
  onDuplicateKit,
  onRemoveKit,
  onCreateKitFromSelection,
  kitBuilder,
  activeKitId = null,
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
  const [kitSelection, setKitSelection] = d2(null);
  const [visibleProjectCount, setVisibleProjectCount] = d2(INITIAL_PROJECT_COUNT);
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
  const updateProjectQuery = (query) => {
    setVisibleProjectCount(INITIAL_PROJECT_COUNT);
    discovery?.setQuery(query);
  };
  const headerCatalogSnapshot = catalogSnapshot?.state.startsWith("ready-") ? catalogSnapshot : void 0;
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
            search: !detail && state.route === "projects" && discoveryState ? {
              value: discoveryState.query.search,
              onChange: (search) => updateProjectQuery({ ...discoveryState.query, search })
            } : void 0,
            onRequestClose,
            catalogSnapshot: headerCatalogSnapshot,
            catalogRefreshing,
            onRefreshCatalog: headerCatalogSnapshot ? () => void onRefreshCatalog() : void 0
          }
        ),
        /* @__PURE__ */ u3(
          CatalogNavigation,
          {
            route: state.route,
            query: discoveryState?.query ?? DEFAULT_COMPANION_QUERY,
            onNavigate: (route) => controller.navigate(route),
            onQueryChange: updateProjectQuery
          }
        ),
        /* @__PURE__ */ u3("div", { class: "tavernary-companion-shell__workspace", "data-testid": "companion-workspace", children: [
          /* @__PURE__ */ u3("main", { class: "tavernary-companion-shell__content", children: /* @__PURE__ */ u3(
            CatalogBoundary,
            {
              snapshot: catalogSnapshot,
              onRefresh: onRefreshCatalog,
              onUpdateCompanion,
              onUseCached: onUseCachedCatalog,
              onOpenTavernary,
              children: [
                !detail && state.route === "projects" ? /* @__PURE__ */ u3(S, { children: discovery && discoveryState ? /* @__PURE__ */ u3(
                  ProjectsRoute,
                  {
                    state: discoveryState,
                    facets: facets ?? discoveryState.facets,
                    onQueryChange: updateProjectQuery,
                    onProjectAction: (id, action, anchor) => onProjectAction?.(id, action, anchor),
                    onManageInSillyTavern: onOpenExtensionManager,
                    lifecycleDisabled,
                    kitSelectionActive: kitSelection !== null,
                    selectedKitProjectIds: kitSelection ?? [],
                    onToggleKitSelection: (projectId) => setKitSelection((current) => {
                      if (!current) return [projectId];
                      return current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId];
                    }),
                    onAddKitSelection: () => {
                      if (!kitSelection?.length) return;
                      onCreateKitFromSelection?.(kitSelection);
                      setKitSelection(null);
                    },
                    onCancelKitSelection: () => setKitSelection(null),
                    visibleProjectCount,
                    onVisibleProjectCountChange: setVisibleProjectCount
                  }
                ) : /* @__PURE__ */ u3("h2", { id: "tavernary-companion-projects-heading", children: "Projects" }) }) : null,
                !detail && state.route === "kits" ? /* @__PURE__ */ u3(S, { children: kitDiscovery ? /* @__PURE__ */ u3(
                  KitsRoute,
                  {
                    controller: kitDiscovery,
                    lifecycleDisabled,
                    onOpenKit: (id) => controller.openDetail({ kind: "kit", id, focusKey: `kit-${id}` }),
                    onAction: (id, action) => {
                      if (action.kind === "review" || action.kind === "view") {
                        controller.openDetail({ kind: "kit", id, focusKey: `kit-${id}` });
                      } else {
                        onKitAction?.(id, action);
                      }
                    },
                    switcherKits: Object.values(kitInspectors),
                    activeKitId,
                    onActivate: (id) => onKitAction?.(id, { kind: "activate", label: "Activate" }),
                    onDeactivate: () => {
                      if (activeKitId)
                        onKitAction?.(activeKitId, { kind: "deactivate", label: "Deactivate" });
                    }
                  }
                ) : /* @__PURE__ */ u3("h2", { id: "tavernary-companion-kits-heading", children: "Kits" }) }) : null,
                !detail && state.route === "installed" ? /* @__PURE__ */ u3(S, { children: discoveryState ? /* @__PURE__ */ u3(
                  InstalledRoute,
                  {
                    sections: discoveryState.installedSections,
                    kits: installedKits,
                    activeKitId,
                    refreshing: inventoryRefreshing,
                    updateStates,
                    togglingInternalName,
                    onRefresh: onRefreshInventory,
                    onCheckUpdates,
                    onRetryUpdate,
                    onUpdate: onUpdateExtension,
                    onAction: (id, action, anchor) => onProjectAction?.(id, action, anchor),
                    onForgetMissing: onForgetMissingManaged,
                    onManage: onOpenExtensionManager,
                    onOpenKit: (id) => controller.openDetail({ kind: "kit", id, focusKey: `installed-kit-${id}` }),
                    onUninstallKit,
                    onToggleExtension,
                    selection: installedSelection,
                    onSelectKit: onSelectInstalledKit,
                    onToggleSelection: onToggleInstalledSelection,
                    onAddSelectedToKit: onAddInstalledSelectionToKit,
                    onUninstallSelected: onUninstallInstalledSelection,
                    onClearSelection: onClearInstalledSelection,
                    lifecycleDisabled
                  }
                ) : /* @__PURE__ */ u3("h2", { id: "tavernary-companion-installed-heading", children: "Installed extensions" }) }) : null,
                detail ? /* @__PURE__ */ u3("section", { "aria-label": "kit detail", children: [
                  /* @__PURE__ */ u3("button", { type: "button", onClick: () => restoreAfterBack(controller), children: "Back" }),
                  kitInspectors[detail.id] ? /* @__PURE__ */ u3(
                    KitInspector,
                    {
                      kit: kitInspectors[detail.id],
                      disabled: lifecycleDisabled,
                      onAction: (action) => onKitAction?.(detail.id, action),
                      onEdit: () => onEditKit?.(detail.id),
                      onCopy: () => onCopyKit?.(detail.id),
                      onExport: () => onExportKit?.(detail.id),
                      onUninstall: () => onUninstallKit?.(detail.id),
                      onDuplicate: () => onDuplicateKit?.(detail.id),
                      onRemove: () => {
                        onRemoveKit?.(detail.id);
                        restoreAfterBack(controller);
                      }
                    }
                  ) : /* @__PURE__ */ u3("h2", { children: detail.id })
                ] }) : null
              ]
            }
          ) }),
          kitBuilder
        ] })
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

// src/updates/update-coordinator.ts
var DefaultExtensionUpdateCoordinator = class {
  #host;
  #getSnapshot;
  #getInventory;
  #lock;
  #store;
  #confirm;
  #now;
  #createId;
  #subscribers = /* @__PURE__ */ new Set();
  #snapshot = { states: {} };
  #checkedEvidence = {};
  #checkSequence = {};
  #generation = 0;
  constructor(options) {
    this.#host = options.host;
    this.#getSnapshot = options.getSnapshot;
    this.#getInventory = options.getInventory;
    this.#lock = options.lock;
    this.#store = options.store;
    this.#confirm = options.confirm;
    this.#now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
    this.#createId = options.createId ?? createRuntimeId;
  }
  read() {
    return structuredClone(this.#snapshot);
  }
  subscribe(subscriber) {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }
  async check(projectId) {
    if (projectId === COMPANION_PROJECT_ID) return;
    const generation = this.#generation;
    const sequence = (this.#checkSequence[projectId] ?? 0) + 1;
    this.#checkSequence[projectId] = sequence;
    const isCurrent = () => generation === this.#generation && sequence === this.#checkSequence[projectId];
    this.#setState(projectId, { kind: "checking" });
    const snapshot = this.#getSnapshot();
    const inventory = this.#getInventory();
    const catalog = "catalog" in snapshot ? snapshot.catalog : null;
    const project2 = catalog?.projects.find(({ id }) => id === projectId) ?? null;
    const entry = [...inventory.managed, ...inventory.external].find(
      (candidate) => candidate.project.id === projectId
    );
    if (!project2?.install || !entry || entry.extension.type !== "local") {
      this.#setState(projectId, { kind: "current" });
      return;
    }
    const scannedSha = project2.tavernKeeper?.report?.scannedSha;
    const candidateShas = typeof scannedSha === "string" && isFullCommitSha(scannedSha) ? [scannedSha.toLowerCase()] : [];
    try {
      const inspection = await this.#host.inspectUpdate({
        internalName: entry.extension.internalName,
        type: entry.extension.type,
        repositoryUrl: project2.install.repositoryUrl,
        branch: project2.install.branch,
        candidateShas
      });
      if (!isCurrent()) return;
      this.#publishInspection(project2, entry.extension.internalName, inspection);
    } catch {
      if (!isCurrent()) return;
      delete this.#checkedEvidence[projectId];
      this.#setState(projectId, {
        kind: "error",
        reason: "Companion couldn\u2019t check this extension. Try again; if it still fails, open it in SillyTavern."
      });
    }
  }
  async checkAll() {
    const inventory = this.#getInventory();
    const projectIds = [
      ...new Set(
        [...inventory.managed, ...inventory.external].filter(({ extension }) => extension.type === "local").filter(({ project: project2 }) => project2.id !== COMPANION_PROJECT_ID).map(({ project: project2 }) => project2.id)
      )
    ];
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < projectIds.length) {
        const projectId = projectIds[nextIndex];
        nextIndex += 1;
        await this.check(projectId);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, projectIds.length) }, async () => worker()));
  }
  invalidate() {
    this.#generation += 1;
    this.#snapshot = { states: {} };
    this.#checkedEvidence = {};
    this.#checkSequence = {};
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
  prepare(projectId) {
    const state = this.#snapshot.states[projectId];
    const evidence = this.#checkedEvidence[projectId];
    const snapshot = this.#getSnapshot();
    const catalog = "catalog" in snapshot ? snapshot.catalog : null;
    const project2 = catalog?.projects.find(({ id }) => id === projectId) ?? null;
    if (state?.kind !== "available" || !evidence || !catalog || !project2) {
      throw new Error("Check this extension for updates again.");
    }
    return {
      notice: state.notice,
      selections: state.targets.map(
        (target) => bindUpdateSelection({
          project: project2,
          catalogGeneratedAt: catalog.generatedAt,
          internalName: evidence.internalName,
          installedSha: evidence.installedSha,
          target
        })
      )
    };
  }
  update(selection) {
    return this.#lock.runExclusive(
      `update:${selection.binding.projectId}`,
      async ({ setPhase }) => {
        const startedAt = this.#now();
        const receiptId = this.#createId();
        const snapshot = this.#getSnapshot();
        const inventory = this.#getInventory();
        const catalog = "catalog" in snapshot ? snapshot.catalog : null;
        const project2 = catalog?.projects.find(({ id }) => id === selection.binding.projectId) ?? null;
        const entry = [...inventory.managed, ...inventory.external].find(
          (candidate) => candidate.project.id === selection.binding.projectId
        );
        if (!catalog || !project2?.install || !entry || entry.extension.type !== "local") {
          throw new Error("This update choice is out of date. Check again.");
        }
        const scannedSha = project2.tavernKeeper?.report?.scannedSha;
        const candidateShas = typeof scannedSha === "string" && isFullCommitSha(scannedSha) ? [scannedSha.toLowerCase()] : [];
        const inspection = await this.#host.inspectUpdate({
          internalName: entry.extension.internalName,
          type: entry.extension.type,
          repositoryUrl: project2.install.repositoryUrl,
          branch: project2.install.branch,
          candidateShas
        });
        const availability = this.#publishInspection(
          project2,
          entry.extension.internalName,
          inspection
        );
        if (!matchesUpdateBinding(selection, {
          project: project2,
          catalogGeneratedAt: catalog.generatedAt,
          internalName: entry.extension.internalName,
          installedSha: inspection.installedSha
        })) {
          throw new Error("This update choice is out of date. Check again.");
        }
        if (availability.kind !== "available" || !availability.targets.some(
          (target) => target.kind === selection.target.kind && target.requestedSha === selection.target.requestedSha
        )) {
          throw new Error("This update choice is out of date. Check again.");
        }
        const state = this.#store.read();
        const prompts = selectTrustPrompts({
          trustAcknowledgedAt: state.trustAcknowledgedAt,
          target: selection.target,
          assessment: project2.tavernKeeper ? {
            riskLevel: project2.tavernKeeper.riskLevel,
            scannedSha: project2.tavernKeeper.report?.scannedSha ?? null,
            reportUrl: project2.tavernKeeper.report?.reportUrl ?? null
          } : null
        });
        let disclosureAccepted = false;
        setPhase("awaiting-confirmation");
        for (const prompt of prompts) {
          if (!await this.#confirm(prompt, project2)) {
            const receipt2 = createReceipt({
              id: receiptId,
              kind: "update",
              projectId: project2.id,
              projectName: project2.name,
              startedAt,
              finishedAt: this.#now(),
              status: "cancelled",
              safeError: null,
              reloadRequired: false
            });
            await this.#store.update((draft) => {
              draft.operationReceipt = structuredClone(receipt2);
            });
            return receipt2;
          }
          if (prompt.kind === "unsandboxed-disclosure") disclosureAccepted = true;
        }
        setPhase("host-request");
        let applyResponseFailed = false;
        try {
          await this.#host.applyUpdate({
            internalName: entry.extension.internalName,
            type: entry.extension.type,
            repositoryUrl: project2.install.repositoryUrl,
            branch: project2.install.branch,
            expectedCurrentSha: selection.binding.installedSha,
            targetSha: selection.target.requestedSha
          });
        } catch {
          applyResponseFailed = true;
        }
        if (applyResponseFailed) {
          let observedSha = null;
          let outcomeKnown = false;
          try {
            const afterRequest = await this.#host.inspectUpdate({
              internalName: entry.extension.internalName,
              type: entry.extension.type,
              repositoryUrl: project2.install.repositoryUrl,
              branch: project2.install.branch,
              candidateShas
            });
            observedSha = afterRequest.installedSha;
            outcomeKnown = true;
            this.#publishInspection(project2, entry.extension.internalName, afterRequest);
          } catch {
          }
          if (outcomeKnown && observedSha === selection.binding.installedSha) {
            const receipt2 = createReceipt({
              id: receiptId,
              kind: "update",
              projectId: project2.id,
              projectName: project2.name,
              startedAt,
              finishedAt: this.#now(),
              status: "failed",
              completedThrough: "requested",
              failedAt: "host-accepted",
              safeError: "SillyTavern did not complete the extension update.",
              reloadRequired: false
            });
            await this.#persistIncompleteReceipt(receipt2, disclosureAccepted);
            return receipt2;
          }
          if (!outcomeKnown || !matchesAppliedUpdate(selection, observedSha)) {
            delete this.#checkedEvidence[project2.id];
            this.#setState(project2.id, {
              kind: "attention",
              reason: "Companion could not verify the installed version. Manage it in SillyTavern."
            });
            const receipt2 = createReceipt({
              id: receiptId,
              kind: "update",
              projectId: project2.id,
              projectName: project2.name,
              startedAt,
              finishedAt: this.#now(),
              status: "verification-failed",
              completedThrough: "requested",
              failedAt: "verified",
              safeError: "Companion could not determine whether SillyTavern applied the update.",
              reloadRequired: false
            });
            await this.#persistIncompleteReceipt(receipt2, disclosureAccepted);
            return receipt2;
          }
        }
        setPhase("verifying");
        let installedSha = null;
        let verificationReadable = false;
        try {
          const discovered = await this.#host.discover();
          const verifiedExtension = discovered.find(
            (candidate) => candidate.internalName === entry.extension.internalName && candidate.folderName.toLocaleLowerCase("en-US") === entry.extension.folderName.toLocaleLowerCase("en-US") && candidate.type === entry.extension.type
          );
          installedSha = verifiedExtension ? await this.#host.readLocalRevision({
            internalName: verifiedExtension.internalName,
            type: verifiedExtension.type
          }) : null;
          verificationReadable = true;
        } catch {
        }
        const provenance = {
          targetKind: selection.target.kind,
          requestedSha: selection.target.requestedSha,
          installedSha,
          catalogGeneratedAt: catalog.generatedAt,
          tavernKeeperReportId: selection.target.kind === "checked" ? selection.target.reportId : null
        };
        if (!verificationReadable) {
          delete this.#checkedEvidence[project2.id];
          this.#setState(project2.id, {
            kind: "attention",
            reason: "Companion could not verify the installed version. Manage it in SillyTavern."
          });
          const receipt2 = createReceipt({
            id: receiptId,
            kind: "update",
            projectId: project2.id,
            projectName: project2.name,
            startedAt,
            finishedAt: this.#now(),
            status: "verification-failed",
            completedThrough: "host-accepted",
            failedAt: "verified",
            safeError: "Companion could not verify the installed extension after updating.",
            reloadRequired: false,
            installProvenance: provenance,
            tavernKeeperReportUrl: selection.target.kind === "checked" ? selection.target.reportUrl : null
          });
          await this.#persistIncompleteReceipt(receipt2, disclosureAccepted);
          return receipt2;
        }
        if (!matchesAppliedUpdate(selection, installedSha)) {
          delete this.#checkedEvidence[project2.id];
          this.#setState(project2.id, {
            kind: "attention",
            reason: "The installed version did not match the selected update. Manage it in SillyTavern."
          });
          const receipt2 = createReceipt({
            id: receiptId,
            kind: "update",
            projectId: project2.id,
            projectName: project2.name,
            startedAt,
            finishedAt: this.#now(),
            status: "verification-failed",
            completedThrough: "host-accepted",
            failedAt: "verified",
            safeError: "SillyTavern did not report the selected extension version after updating.",
            reloadRequired: false,
            installProvenance: provenance,
            tavernKeeperReportUrl: selection.target.kind === "checked" ? selection.target.reportUrl : null
          });
          await this.#persistIncompleteReceipt(receipt2, disclosureAccepted);
          return receipt2;
        }
        const receipt = createReceipt({
          id: receiptId,
          kind: "update",
          projectId: project2.id,
          projectName: project2.name,
          startedAt,
          finishedAt: this.#now(),
          status: "succeeded",
          completedThrough: "recorded",
          safeError: null,
          reloadRequired: true,
          installProvenance: provenance,
          tavernKeeperReportUrl: selection.target.kind === "checked" ? selection.target.reportUrl : null
        });
        setPhase("recording");
        try {
          await this.#store.update((draft) => {
            const managed = draft.managedExtensions[project2.id];
            if (managed && typeof managed === "object" && !Array.isArray(managed)) {
              managed.provenance = structuredClone(provenance);
            }
            if (disclosureAccepted && !draft.trustAcknowledgedAt) {
              draft.trustAcknowledgedAt = this.#now();
            }
            draft.operationReceipt = null;
          });
        } catch {
          await this.check(project2.id);
          return createReceipt({
            id: receiptId,
            kind: "update",
            projectId: project2.id,
            projectName: project2.name,
            startedAt,
            finishedAt: this.#now(),
            status: "updated-unrecorded",
            completedThrough: "verified",
            failedAt: "recorded",
            safeError: "The extension was updated and verified, but Companion could not save its update record. Reopen Companion to reconcile it.",
            reloadRequired: true,
            installProvenance: provenance,
            tavernKeeperReportUrl: selection.target.kind === "checked" ? selection.target.reportUrl : null
          });
        }
        await this.check(project2.id);
        return receipt;
      }
    );
  }
  #setState(projectId, state) {
    this.#snapshot.states[projectId] = structuredClone(state);
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
  #publishInspection(project2, internalName, inspection) {
    const availability = deriveUpdateAvailability({ project: project2, inspection });
    this.#checkedEvidence[project2.id] = {
      installedSha: inspection.installedSha,
      internalName
    };
    this.#setState(project2.id, availability);
    return availability;
  }
  async #persistIncompleteReceipt(receipt, disclosureAccepted) {
    await this.#store.update((draft) => {
      if (disclosureAccepted && !draft.trustAcknowledgedAt) {
        draft.trustAcknowledgedAt = this.#now();
      }
      draft.operationReceipt = structuredClone(receipt);
    }).catch(() => void 0);
  }
};
function createExtensionUpdateCoordinator(options) {
  return new DefaultExtensionUpdateCoordinator(options);
}
function matchesAppliedUpdate(selection, installedSha) {
  return selection.target.requestedSha === null ? installedSha !== null && installedSha !== selection.binding.installedSha : installedSha === selection.target.requestedSha;
}

// src/ui/installed/update-version-chooser.tsx
var VIEWPORT_MARGIN5 = 8;
var ANCHOR_GAP2 = 8;
function UpdateVersionChooser({
  projectId,
  projectName,
  anchor,
  choice,
  scanStatus = null,
  onSelect,
  onCancel
}) {
  const surfaceRef = A2(null);
  const firstChoiceRef = A2(null);
  const settled = A2(false);
  const [position, setPosition] = d2({
    left: VIEWPORT_MARGIN5,
    top: VIEWPORT_MARGIN5,
    visibility: "hidden"
  });
  const headingId = `update-version-${projectId}-heading`;
  const restoreFocus = q2(() => {
    if (anchor.isConnected) anchor.focus({ preventScroll: true });
  }, [anchor]);
  const cancel = q2(() => {
    if (settled.current) return;
    settled.current = true;
    onCancel();
    restoreFocus();
    queueMicrotask(restoreFocus);
  }, [onCancel, restoreFocus]);
  const select = q2(
    (selection) => {
      if (settled.current) return;
      settled.current = true;
      restoreFocus();
      onSelect(selection);
    },
    [onSelect, restoreFocus]
  );
  const updatePosition = q2(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    setPosition(positionChooser2(anchor.getBoundingClientRect(), surface.getBoundingClientRect()));
  }, [anchor]);
  _2(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(anchor);
    if (surfaceRef.current) observer?.observe(surfaceRef.current);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      observer?.disconnect();
    };
  }, [anchor, updatePosition]);
  h2(() => {
    const dismissOutside = (event) => {
      const target = event.target;
      if (isVersionChoiceOwnedTarget(surfaceRef.current, target)) return;
      cancel();
    };
    const dismissEscape = (event) => {
      if (event.key !== "Escape") return;
      if (hasOpenTavernKeeperPanel(projectId)) return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissEscape, true);
    firstChoiceRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissEscape, true);
    };
  }, [cancel, projectId]);
  if (typeof document === "undefined") return null;
  return $2(
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-install-version-chooser-backdrop", children: /* @__PURE__ */ u3(
      "section",
      {
        ref: surfaceRef,
        class: "tavernary-companion-install-version-chooser",
        role: "dialog",
        "aria-labelledby": headingId,
        style: { position: "fixed", ...position },
        children: [
          /* @__PURE__ */ u3("h2", { id: headingId, children: [
            "Update ",
            projectName
          ] }),
          choice.notice ? /* @__PURE__ */ u3("p", { class: "tavernary-companion-install-version-chooser__notice", role: "status", children: choice.notice }) : null,
          choice.selections.map((selection, index) => {
            const checked = selection.target.kind === "checked";
            const checkedScanStatus = selection.target.kind === "checked" ? matchingScanStatus(scanStatus, selection.target) : null;
            const description = selection.target.kind === "checked" ? scannedVersionDescription(
              selection.target.checkedAt,
              choice.selections.some(({ target }) => target.kind === "newest")
            ) : LATEST_CREATOR_DESCRIPTION;
            const descriptionId = `${headingId}-${selection.target.kind}-description`;
            return /* @__PURE__ */ u3(
              VersionChoiceOption,
              {
                buttonRef: index === 0 ? firstChoiceRef : void 0,
                label: checked ? LATEST_SCANNED_LABEL : LATEST_CREATOR_LABEL,
                description,
                descriptionId,
                onSelect: () => select(selection),
                scan: checkedScanStatus ? { projectId, status: checkedScanStatus } : null
              },
              `${selection.target.kind}-${selection.target.requestedSha}`
            );
          }),
          /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              class: "tavernary-companion-install-version-chooser__cancel",
              onClick: cancel,
              children: "Cancel"
            }
          )
        ]
      }
    ) }),
    resolveOverlayPortalTarget(anchor)
  );
}
function positionChooser2(anchor, chooser) {
  const width = Math.min(360, Math.max(0, window.innerWidth - VIEWPORT_MARGIN5 * 2));
  const measuredWidth = Math.min(chooser.width || width, width);
  const measuredHeight = Math.min(chooser.height, window.innerHeight - VIEWPORT_MARGIN5 * 2);
  const left = clamp4(
    anchor.right - measuredWidth,
    VIEWPORT_MARGIN5,
    window.innerWidth - measuredWidth - VIEWPORT_MARGIN5
  );
  const below = anchor.bottom + ANCHOR_GAP2;
  const above = anchor.top - measuredHeight - ANCHOR_GAP2;
  const top = clamp4(
    below + measuredHeight <= window.innerHeight - VIEWPORT_MARGIN5 ? below : above,
    VIEWPORT_MARGIN5,
    window.innerHeight - measuredHeight - VIEWPORT_MARGIN5
  );
  return { left, top, width, visibility: "visible" };
}
function clamp4(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

// src/ui/installed/add-to-kit-dialog.tsx
function AddToKitDialog({
  selectedCount,
  kits,
  onChoose,
  onCancel
}) {
  const noun = selectedCount === 1 ? "extension" : "extensions";
  const personalKits = [...kits].sort((left, right) => left.title.localeCompare(right.title));
  return /* @__PURE__ */ u3(DialogFrame, { label: `Add ${selectedCount} ${noun} to a Kit`, onCancel, children: [
    /* @__PURE__ */ u3("h2", { children: "Add to Kit" }),
    /* @__PURE__ */ u3("p", { children: [
      "Add ",
      selectedCount,
      " selected ",
      noun,
      " to a new or existing personal Kit."
    ] }),
    /* @__PURE__ */ u3("p", { class: "tavernary-companion-dialog__note", children: "Adding to a Kit does not change extension ownership." }),
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-add-to-kit-targets", children: [
      /* @__PURE__ */ u3("button", { type: "button", onClick: () => onChoose({ kind: "new" }), children: "Create a new Kit" }),
      personalKits.map((kit2) => /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          "aria-label": `Add to ${kit2.title}`,
          onClick: () => onChoose({ kind: "existing", kitId: kit2.id }),
          children: kit2.title
        },
        kit2.id
      ))
    ] }),
    /* @__PURE__ */ u3("button", { type: "button", onClick: onCancel, children: "Cancel" })
  ] });
}

// src/ui/installed/installed-selection.ts
var EMPTY_INSTALLED_SELECTION = {
  active: false,
  projectIds: [],
  sourceKitIds: []
};
function clearInstalledSelection() {
  return EMPTY_INSTALLED_SELECTION;
}
function selectInstalledKit(state, kitId, projectIds) {
  if (projectIds.length === 0) return state;
  return {
    active: true,
    projectIds: [.../* @__PURE__ */ new Set([...state.projectIds, ...projectIds])],
    sourceKitIds: [.../* @__PURE__ */ new Set([...state.sourceKitIds, kitId])]
  };
}
function toggleInstalledProject(state, projectId) {
  if (state.projectIds.length === 1 && state.projectIds[0] === projectId) {
    return EMPTY_INSTALLED_SELECTION;
  }
  return {
    ...state,
    active: true,
    projectIds: state.projectIds.includes(projectId) ? state.projectIds.filter((id) => id !== projectId) : [...state.projectIds, projectId]
  };
}
function reconcileInstalledSelection(state, selectableProjectIds, kitMembersById) {
  const selectable = new Set(selectableProjectIds);
  const projectIds = state.projectIds.filter((id) => selectable.has(id));
  if (projectIds.length === 0) return EMPTY_INSTALLED_SELECTION;
  const selected = new Set(projectIds);
  const sourceKitIds = state.sourceKitIds.filter((kitId) => {
    const members = (kitMembersById[kitId] ?? []).filter((id) => selectable.has(id));
    return members.length > 0 && members.every((id) => selected.has(id));
  });
  return { active: true, projectIds, sourceKitIds };
}

// src/ui/lifecycle/bulk-removal-dialog.tsx
function BulkRemovalDialog({
  plan,
  onCancel,
  onConfirm
}) {
  const count = plan.projectIds.length;
  const noun = count === 1 ? "extension" : "extensions";
  return /* @__PURE__ */ u3(DialogFrame, { label: `Uninstall ${count} ${noun}`, onCancel, children: [
    /* @__PURE__ */ u3("h2", { children: [
      "Uninstall ",
      count,
      " ",
      noun,
      "?"
    ] }),
    /* @__PURE__ */ u3("p", { children: "Companion will uninstall each extension in order and verify it before continuing." }),
    /* @__PURE__ */ u3("ul", { class: "tavernary-companion-bulk-removal-projects", children: plan.impacts.map((impact) => /* @__PURE__ */ u3("li", { children: [
      /* @__PURE__ */ u3("strong", { children: impact.projectName }),
      /* @__PURE__ */ u3("span", { children: impact.ownershipLabel }),
      !impact.removable ? /* @__PURE__ */ u3("span", { children: "Cannot be uninstalled from Companion." }) : null
    ] }, impact.projectId)) }),
    plan.affectedKits.length ? /* @__PURE__ */ u3("section", { "aria-label": "Affected Kits", children: [
      /* @__PURE__ */ u3("h3", { children: "Affected Kits" }),
      plan.affectedKits.map((kit2) => /* @__PURE__ */ u3("p", { children: [
        kit2.title,
        " will become ",
        kit2.resultingStatus,
        "."
      ] }, kit2.id)),
      plan.activeKitAffected ? /* @__PURE__ */ u3("p", { children: "The active Kit will show drift." }) : null
    ] }) : null,
    /* @__PURE__ */ u3("div", { class: "tavernary-companion-dialog__actions", children: [
      /* @__PURE__ */ u3("button", { type: "button", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ u3("button", { type: "button", class: "is-danger", onClick: onConfirm, disabled: !plan.confirmable, children: [
        "Uninstall ",
        count
      ] })
    ] })
  ] });
}

// src/ui/popup-host.tsx
var emptyInventory = { managed: [], external: [], unknown: [], missingManaged: [] };
function projectScanStatus(snapshot, projectId) {
  if (!snapshot || !("catalog" in snapshot)) return null;
  return snapshot.catalog.projects.find(({ id }) => id === projectId)?.tavernKeeper ?? null;
}
function selectableInstalledProjectIds(runtime) {
  return runtime.discovery.read().installedSections.flatMap(
    ({ rows }) => rows.filter(({ selectionEligible }) => selectionEligible).map(({ id }) => id)
  );
}
function installedKitMemberships(kits) {
  return Object.fromEntries(kits.map((kit2) => [kit2.id, kit2.selectionProjectIds]));
}
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
  const [togglingInternalName, setTogglingInternalName] = d2(null);
  const [forgettingManagedId, setForgettingManagedId] = d2(null);
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
  const [bulkRemovalReceipt, setBulkRemovalReceipt] = d2(
    parseBulkRemovalReceipt(store?.read().operationReceipt)
  );
  const [updateSnapshot, setUpdateSnapshot] = d2(
    runtime?.updates.read() ?? { states: {} }
  );
  const [kitReceipt, setKitReceipt] = d2(
    parseKitReceipt(store?.read().operationReceipt)
  );
  const [pendingKitPlan, setPendingKitPlan] = d2(null);
  const [pendingBulkRemovalPlan, setPendingBulkRemovalPlan] = d2(
    null
  );
  const [preparingBulkRemoval, setPreparingBulkRemoval] = d2(false);
  const bulkRemovalInProgress = A2(false);
  const [kitDisclosurePlan, setKitDisclosurePlan] = d2(null);
  const [kitDraft, setKitDraft] = d2(null);
  const [kitDraftOrigin, setKitDraftOrigin] = d2(null);
  const [pendingAddToKitIds, setPendingAddToKitIds] = d2(null);
  const [kitBuilderCollapsed, setKitBuilderCollapsed] = d2(true);
  const [kitInspectors, setKitInspectors] = d2({});
  const [installedKitCards, setInstalledKitCards] = d2([]);
  const [installedSelection, setInstalledSelection] = d2(EMPTY_INSTALLED_SELECTION);
  const [operationError, setOperationError] = d2(null);
  const [preparingInstall, setPreparingInstall] = d2(false);
  const [preparingKitPlan, setPreparingKitPlan] = d2(false);
  const [pendingInstallChoice, setPendingInstallChoice] = d2(null);
  const [pendingInstallAwareness, setPendingInstallAwareness] = d2(null);
  const [pendingUpdateChoice, setPendingUpdateChoice] = d2(null);
  const localInstallFallbacks = T2(() => new InstallTargetFallbackBroker(), []);
  const installFallbacks = runtime?.installFallbacks ?? localInstallFallbacks;
  const [pendingInstallFallback, setPendingInstallFallback] = d2(installFallbacks.read());
  const fallbackAnchor = A2(null);
  h2(() => {
    const unsubscribe = installFallbacks.subscribe(setPendingInstallFallback);
    return () => {
      unsubscribe();
      installFallbacks.cancel();
    };
  }, [installFallbacks]);
  const syncKits = q2(async () => {
    if (!runtime || !store) return;
    const snapshot = runtime.catalog.read();
    if (!("catalog" in snapshot)) return;
    const presentation = await buildKitPresentation(
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
    setInstalledKitCards(presentation.installedKits);
    setInstalledSelection(
      (current) => reconcileInstalledSelection(
        current,
        selectableInstalledProjectIds(runtime),
        installedKitMemberships(presentation.installedKits)
      )
    );
  }, [runtime, store]);
  const refreshInventory = q2(async () => {
    if (!runtime || !host || !store) return false;
    setOperationError(null);
    setInventoryRefreshing(true);
    try {
      const extensions = await host.discover();
      const snapshot = runtime.catalog.read();
      const inventory = await reconcileHostInventory({
        projects: "catalog" in snapshot ? snapshot.catalog.projects : [],
        host,
        hostExtensions: extensions,
        managed: normalizeManagedExtensionMap(store.read().managedExtensions)
      });
      runtime.kitContext.inventory = inventory;
      runtime.discovery.setInventory(inventory);
      runtime.updates.invalidate();
      await syncKits();
      return true;
    } catch {
      setOperationError("Could not refresh installed extensions. Try again.");
      return false;
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
    const unsubscribeUpdates = runtime.updates.subscribe(setUpdateSnapshot);
    const unsubscribePrompts = runtime.prompts.subscribe(setPendingPrompt);
    const unsubscribeStore = store?.subscribe((state) => {
      if (!bulkRemovalInProgress.current) {
        setReceipt(parseReceipt(state.operationReceipt));
        setBulkRemovalReceipt(parseBulkRemovalReceipt(state.operationReceipt));
      }
      setKitReceipt(parseKitReceipt(state.operationReceipt));
      void syncKits();
    });
    const onFocus = () => void runtime.catalog.onFocus();
    window.addEventListener("focus", onFocus);
    setCatalogRefreshing(true);
    void runtime.catalog.open().finally(async () => {
      setCatalogRefreshing(false);
      if (runtime.kitExecutor.journal.read() && runtime.lifecycle.lock.read() === null) {
        await refreshInventory();
        setKitReceipt(await runtime.kitExecutor.recoverInterrupted());
        await syncKits();
      }
    });
    return () => {
      unsubscribeCatalog();
      unsubscribeLock();
      unsubscribeUpdates();
      unsubscribePrompts();
      unsubscribeStore?.();
      runtime.prompts.cancel();
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshInventory, runtime, store, syncKits]);
  const refreshInstalled = q2(async () => {
    if (!runtime) return;
    if (!await refreshInventory()) return;
    await runtime.updates.checkAll();
  }, [refreshInventory, runtime]);
  const checkAllUpdates = q2(async () => {
    if (!runtime) return;
    setOperationError(null);
    await runtime.updates.checkAll();
  }, [runtime]);
  const requestBulkRemoval = async (projectIds) => {
    if (!runtime || projectIds.length === 0) return;
    setOperationError(null);
    setPreparingBulkRemoval(true);
    try {
      setPendingBulkRemovalPlan(await prepareBulkRemoval(runtime.lifecycle, projectIds));
    } catch {
      setOperationError("Could not review the selected extensions for uninstall.");
    } finally {
      setPreparingBulkRemoval(false);
    }
  };
  const runBulkRemoval = async (plan) => {
    if (!runtime || !store) return;
    setPendingBulkRemovalPlan(null);
    setPreparingBulkRemoval(true);
    setOperationError(null);
    setReceipt(null);
    setBulkRemovalReceipt(null);
    bulkRemovalInProgress.current = true;
    try {
      const result2 = await executeBulkRemoval(runtime.lifecycle, plan, createRuntimeId);
      bulkRemovalInProgress.current = false;
      await store.update((draft) => {
        draft.operationReceipt = structuredClone(result2);
      });
      setBulkRemovalReceipt(result2);
      await refreshInventory();
      const selectable = new Set(selectableInstalledProjectIds(runtime));
      const retryableProjectIds = result2.retryableProjectIds.filter((id) => selectable.has(id));
      setInstalledSelection(
        retryableProjectIds.length ? { active: true, projectIds: retryableProjectIds, sourceKitIds: [] } : clearInstalledSelection()
      );
    } catch (error) {
      bulkRemovalInProgress.current = false;
      if (error instanceof BulkRemovalPlanChangedError) {
        await refreshInventory();
        setOperationError("Installed state changed. Review the bulk uninstall again.");
      } else {
        setOperationError("The bulk uninstall could not finish.");
      }
    } finally {
      bulkRemovalInProgress.current = false;
      setPreparingBulkRemoval(false);
    }
  };
  const executeInstallSelection = async (projectId, projectName, anchor, selection, allowUnavailableFallback = true) => {
    if (!runtime) return;
    try {
      const result2 = await runtime.lifecycle.install(projectId, selection);
      setReceipt(result2);
      await refreshInventory();
    } catch (error) {
      if (allowUnavailableFallback && error instanceof HostRevisionUnavailableError && selection.target.kind === "checked") {
        const newest = await runtime.lifecycle.prepareNewestInstall(projectId);
        fallbackAnchor.current = anchor;
        const replacement = await installFallbacks.request({
          projectId,
          projectName,
          checked: selection,
          newest
        });
        if (replacement) {
          await executeInstallSelection(projectId, projectName, anchor, replacement, false);
        }
        fallbackAnchor.current = null;
        return;
      }
      if (error instanceof HostRevisionUnavailableError && selection.target.kind === "newest") {
        throw new InstallTargetPreparationError(NEWEST_LOOKUP_FAILED_REASON, { cause: error });
      }
      throw error;
    }
  };
  const runAction = async (projectId, action, anchor) => {
    if (!runtime || !host) return;
    setOperationError(null);
    try {
      if (action.kind === "install") {
        setPreparingInstall(true);
        const prepared = await runtime.lifecycle.prepareInstall(projectId);
        const snapshot = runtime.catalog.read();
        const projectName = ("catalog" in snapshot ? snapshot.catalog.projects.find(({ id }) => id === projectId)?.name : null) ?? projectId;
        dispatchPreparedInstallChoice(
          prepared,
          (selection) => {
            void executeInstallSelection(projectId, projectName, anchor, selection).catch(
              showOperationError
            );
          },
          (choice) => setPendingInstallChoice({ projectId, projectName, anchor, choice }),
          (selection) => setPendingInstallAwareness({ projectId, projectName, anchor, selection })
        );
      } else if (action.kind === "uninstall") {
        setRemovalImpact(await runtime.lifecycle.previewRemoval(projectId));
      } else if (action.kind === "update-required" || action.kind === "manage-in-sillytavern") {
        await host.openExtensionManager();
      }
    } catch (error) {
      showOperationError(error);
    } finally {
      setPreparingInstall(false);
    }
  };
  const showOperationError = (error) => {
    setOperationError(error instanceof Error ? error.message : "The operation could not finish.");
  };
  const requestUpdate = (projectId, projectName, anchor) => {
    if (!runtime) return;
    setOperationError(null);
    try {
      setPendingUpdateChoice({
        projectId,
        projectName,
        anchor,
        choice: runtime.updates.prepare(projectId)
      });
    } catch (error) {
      showOperationError(error);
    }
  };
  const executeUpdateSelection = async (selection) => {
    if (!runtime) return;
    try {
      const result2 = await runtime.updates.update(selection);
      setReceipt(result2);
    } catch (error) {
      showOperationError(error);
    }
  };
  const toggleExtension = async (projectId, internalName, enabled) => {
    if (!host) return;
    setOperationError(null);
    setTogglingInternalName(internalName);
    try {
      assertNotCompanionProject(projectId, enabled ? "enable" : "disable");
      if (enabled) await host.enable(internalName);
      else await host.disable(internalName);
      await refreshInventory();
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "The extension state could not be changed."
      );
    } finally {
      setTogglingInternalName(null);
    }
  };
  const forgetMissingManaged = async (projectId) => {
    if (!runtime || !store) return;
    setOperationError(null);
    setForgettingManagedId(projectId);
    try {
      if (!await refreshInventory()) return;
      const forgotten = await forgetMissingManagedRecord({
        projectId,
        inventory: runtime.kitContext.inventory,
        store
      });
      if (forgotten) await refreshInventory();
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "The saved management record could not be removed."
      );
    } finally {
      setForgettingManagedId(null);
    }
  };
  const requestKitOperation = async (kitId, operation) => {
    if (!runtime || !store || !host) return;
    setOperationError(null);
    setPreparingKitPlan(true);
    try {
      const snapshot = runtime.catalog.read();
      if (!("catalog" in snapshot)) return;
      const kit2 = resolveKit(runtime, snapshot.catalog, kitId);
      if (!kit2) return;
      const planned = planKitOperation({
        operation,
        kit: kit2,
        catalog: snapshot.catalog,
        inventory: runtime.kitContext.inventory,
        managed: normalizeManagedExtensionMap(store.read().managedExtensions),
        installedKits: runtime.kits.readInstalledStates(),
        activeKitId: runtime.kits.readActiveId(),
        catalogCanMutate: snapshot.canMutate
      });
      const plan = await prepareKitInstallTargets({
        plan: planned,
        catalog: snapshot.catalog,
        host
      });
      if (!store.read().trustAcknowledgedAt && plan.install.length) setKitDisclosurePlan(plan);
      else setPendingKitPlan(plan);
    } catch (error) {
      showOperationError(error);
    } finally {
      setPreparingKitPlan(false);
    }
  };
  const requestKitAction = (kitId, action) => {
    if (action !== "uninstall" && (action.kind === "review" || action.kind === "view")) return;
    void requestKitOperation(
      kitId,
      action === "uninstall" ? "uninstall" : action.kind === "activate" ? "activate" : action.kind === "deactivate" ? "deactivate" : "install"
    );
  };
  const executeKitPlan = async (plan, approval) => {
    if (!runtime) return;
    setPendingKitPlan(null);
    setOperationError(null);
    try {
      const result2 = await runtime.kitExecutor.execute(plan, approval);
      setKitReceipt(result2);
      await refreshInventory();
      await syncKits();
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
    setKitDraft(null);
    if (kitDraftOrigin === "installed-selection") {
      setInstalledSelection(clearInstalledSelection());
    }
    setKitDraftOrigin(null);
    setKitBuilderCollapsed(true);
    await syncKits();
  };
  const chooseAddToKitTarget = (target) => {
    if (!runtime || !pendingAddToKitIds?.length) return;
    const source = target.kind === "existing" ? runtime.kits.readDefinition(target.kitId) : null;
    if (target.kind === "existing" && !source) {
      setOperationError("That personal Kit is no longer available.");
      setPendingAddToKitIds(null);
      return;
    }
    setKitDraft(addDraftMembers(createKitDraft(source ?? void 0), pendingAddToKitIds));
    setKitDraftOrigin("installed-selection");
    setKitBuilderCollapsed(false);
    setPendingAddToKitIds(null);
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
        togglingInternalName,
        onRefreshCatalog: refreshCatalog,
        onRefreshInventory: refreshInstalled,
        updateStates: updateSnapshot.states,
        onCheckUpdates: checkAllUpdates,
        onRetryUpdate: (projectId) => void runtime?.updates.check(projectId),
        onUpdateExtension: (projectId, anchor) => {
          const snapshot = runtime?.catalog.read();
          const projectName = snapshot && "catalog" in snapshot ? snapshot.catalog.projects.find(({ id }) => id === projectId)?.name ?? projectId : projectId;
          requestUpdate(projectId, projectName, anchor);
        },
        onToggleExtension: (projectId, internalName, enabled) => void toggleExtension(projectId, internalName, enabled),
        installedSelection,
        onSelectInstalledKit: (kitId) => {
          const kit2 = installedKitCards.find(({ id }) => id === kitId);
          if (!kit2) return;
          setInstalledSelection(
            (current) => selectInstalledKit(current, kit2.id, kit2.selectionProjectIds)
          );
        },
        onToggleInstalledSelection: (projectId) => {
          if (!runtime) return;
          setInstalledSelection((current) => {
            const next = toggleInstalledProject(current, projectId);
            if (next.projectIds.length === 0) return { ...next, sourceKitIds: [] };
            return reconcileInstalledSelection(
              next,
              selectableInstalledProjectIds(runtime),
              installedKitMemberships(installedKitCards)
            );
          });
        },
        onClearInstalledSelection: () => setInstalledSelection(clearInstalledSelection()),
        onAddInstalledSelectionToKit: () => {
          if (installedSelection.projectIds.length) {
            setPendingAddToKitIds([...installedSelection.projectIds]);
          }
        },
        onUninstallInstalledSelection: () => void requestBulkRemoval(installedSelection.projectIds),
        onForgetMissingManaged: (projectId) => void forgetMissingManaged(projectId),
        onProjectAction: (projectId, action, anchor) => void runAction(projectId, action, anchor),
        onOpenExtensionManager: () => void host?.openExtensionManager(),
        onUpdateCompanion: () => void host?.openExtensionManager(),
        onOpenTavernary: () => host?.openExternal("https://tavernary.org/"),
        lifecycleDisabled: activeOperation !== null || togglingInternalName !== null || forgettingManagedId !== null || preparingInstall || pendingInstallChoice !== null || pendingInstallAwareness !== null || pendingUpdateChoice !== null || pendingInstallFallback !== null || preparingKitPlan || preparingBulkRemoval,
        kitDiscovery: runtime?.kitDiscovery,
        kitInspectors,
        installedKits: installedKitCards,
        onKitAction: requestKitAction,
        onCreateKitFromSelection: (projectIds) => {
          setKitDraftOrigin(null);
          setKitDraft(
            (current) => projectIds.reduce(
              (next, projectId) => addDraftMember(next, projectId),
              current ?? createKitDraft()
            )
          );
          if (!kitDraft) setKitBuilderCollapsed(true);
        },
        onEditKit: (id) => {
          const kit2 = runtime?.kits.readDefinition(id);
          if (kit2) {
            setKitDraftOrigin(null);
            setKitDraft(createKitDraft(kit2));
            setKitBuilderCollapsed(false);
          }
        },
        onCopyKit: (id) => {
          const snapshot = runtime?.catalog.read();
          const kit2 = snapshot && "catalog" in snapshot ? snapshot.catalog.kits.find((item) => item.id === id) : null;
          if (kit2) void runtime?.kits.copyPublished(kit2).then(() => syncKits());
        },
        onExportKit: (id) => {
          const kit2 = runtime?.kits.readDefinition(id);
          if (kit2) exportKitFile(kit2);
        },
        onUninstallKit: (id) => requestKitAction(id, "uninstall"),
        onDuplicateKit: (id) => void runtime?.kits.duplicate(id).then(() => syncKits()).catch(() => setOperationError("The personal Kit could not be duplicated.")),
        onRemoveKit: (id) => void runtime?.kits.removeDefinition(id).then(() => syncKits()).catch(() => setOperationError("Uninstall the Kit before removing it.")),
        activeKitId: runtime?.kits.readActiveId() ?? null,
        kitBuilder: kitEditorProjects ? /* @__PURE__ */ u3(
          KitEditor,
          {
            draft: kitDraft,
            projects: kitEditorProjects,
            collapsed: kitBuilderCollapsed,
            onStart: () => {
              setKitDraftOrigin(null);
              setKitDraft((current) => current ?? createKitDraft());
              setKitBuilderCollapsed(false);
            },
            onUpdate: setKitDraft,
            onCollapse: () => setKitBuilderCollapsed(true),
            onDiscard: () => {
              setKitDraft(null);
              setKitDraftOrigin(null);
              setKitBuilderCollapsed(true);
            },
            onSave: (draft) => void saveKitDraft(draft)
          }
        ) : null
      }
    ),
    pendingAddToKitIds && runtime ? /* @__PURE__ */ u3(
      AddToKitDialog,
      {
        selectedCount: pendingAddToKitIds.length,
        kits: runtime.kits.readDefinitions(),
        onChoose: chooseAddToKitTarget,
        onCancel: () => setPendingAddToKitIds(null)
      }
    ) : null,
    pendingBulkRemovalPlan ? /* @__PURE__ */ u3(
      BulkRemovalDialog,
      {
        plan: pendingBulkRemovalPlan,
        onCancel: () => setPendingBulkRemovalPlan(null),
        onConfirm: () => void runBulkRemoval(pendingBulkRemovalPlan)
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
    pendingInstallChoice ? /* @__PURE__ */ u3(
      InstallVersionChooser,
      {
        projectId: pendingInstallChoice.projectId,
        projectName: pendingInstallChoice.projectName,
        anchor: pendingInstallChoice.anchor,
        choice: pendingInstallChoice.choice,
        scanStatus: projectScanStatus(catalogSnapshot, pendingInstallChoice.projectId),
        onCancel: () => setPendingInstallChoice(null),
        onSelect: (selection) => {
          const pending = pendingInstallChoice;
          setPendingInstallChoice(null);
          void executeInstallSelection(
            pending.projectId,
            pending.projectName,
            pending.anchor,
            selection
          ).catch(showOperationError);
        }
      }
    ) : null,
    pendingInstallAwareness ? /* @__PURE__ */ u3(
      InstallVersionAwareness,
      {
        projectId: pendingInstallAwareness.projectId,
        projectName: pendingInstallAwareness.projectName,
        anchor: pendingInstallAwareness.anchor,
        selection: pendingInstallAwareness.selection,
        onCancel: () => setPendingInstallAwareness(null),
        onConfirm: (selection) => {
          const pending = pendingInstallAwareness;
          setPendingInstallAwareness(null);
          void executeInstallSelection(
            pending.projectId,
            pending.projectName,
            pending.anchor,
            selection
          ).catch(showOperationError);
        }
      }
    ) : null,
    pendingUpdateChoice ? /* @__PURE__ */ u3(
      UpdateVersionChooser,
      {
        projectId: pendingUpdateChoice.projectId,
        projectName: pendingUpdateChoice.projectName,
        anchor: pendingUpdateChoice.anchor,
        choice: pendingUpdateChoice.choice,
        scanStatus: projectScanStatus(catalogSnapshot, pendingUpdateChoice.projectId),
        onCancel: () => setPendingUpdateChoice(null),
        onSelect: (selection) => {
          setPendingUpdateChoice(null);
          void executeUpdateSelection(selection);
        }
      }
    ) : null,
    pendingInstallFallback && (fallbackAnchor.current ?? document.querySelector(".tavernary-companion-root")) ? /* @__PURE__ */ u3(
      InstallVersionChooser,
      {
        projectId: pendingInstallFallback.projectId,
        projectName: pendingInstallFallback.projectName,
        anchor: fallbackAnchor.current ?? document.querySelector(".tavernary-companion-root"),
        choice: {
          kind: "choose",
          checked: {
            selection: pendingInstallFallback.checked,
            disabledReason: CHECKED_VERSION_UNAVAILABLE_REASON
          },
          newest: { selection: pendingInstallFallback.newest }
        },
        scanStatus: projectScanStatus(catalogSnapshot, pendingInstallFallback.projectId),
        onCancel: () => installFallbacks.cancel(),
        onSelect: (selection) => installFallbacks.respond(selection)
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
        bulkRemovalReceipt,
        error: operationError,
        onDismissReceipt: () => {
          if (receipt) void clearStoredReceipt(store, receipt.id);
          setReceipt(null);
        },
        onDismissError: () => setOperationError(null),
        onRetryError: () => void refreshInventory(),
        onReload: () => host?.reload(),
        onRetryBulkRemoval: (projectIds) => {
          setInstalledSelection({ active: true, projectIds, sourceKitIds: [] });
          void requestBulkRemoval(projectIds);
        },
        onDismissBulkRemoval: () => {
          if (bulkRemovalReceipt) void clearStoredReceipt(store, bulkRemovalReceipt.id);
          setBulkRemovalReceipt(null);
        }
      }
    ),
    /* @__PURE__ */ u3(
      KitOperationTray,
      {
        active: activeOperation,
        receipt: kitReceipt,
        onReload: () => host?.reload(),
        onDismiss: () => {
          if (kitReceipt) void clearStoredReceipt(store, kitReceipt.id);
          setKitReceipt(null);
        },
        onRetry: () => {
          if (!kitReceipt) return;
          void requestKitOperation(kitReceipt.kitId, retryKitOperation(kitReceipt));
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
  const installFallbacks = new InstallTargetFallbackBroker();
  const lifecycle = createLifecycleCoordinator({
    host,
    store,
    getSnapshot: () => catalog.read(),
    confirm: (prompt, project2) => prompts.request(prompt, project2)
  });
  const lock = lifecycle.lock;
  const updates = createExtensionUpdateCoordinator({
    host,
    store,
    lock,
    getSnapshot: () => catalog.read(),
    getInventory: () => kitContext.inventory,
    confirm: (prompt, project2) => prompts.request(prompt, project2)
  });
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
    getInventoryFingerprint: async () => {
      const snapshot = catalog.read();
      if (!("catalog" in snapshot)) throw new Error("A compatible catalog is required.");
      const inventory = await reconcileHostInventory({
        projects: snapshot.catalog.projects,
        host,
        managed: normalizeManagedExtensionMap(store.read().managedExtensions)
      });
      kitContext.inventory = inventory;
      discovery.setInventory(inventory);
      return inventoryFingerprint({
        inventory,
        managed: normalizeManagedExtensionMap(store.read().managedExtensions),
        installedKits: kits.readInstalledStates(),
        activeKitId: kits.readActiveId()
      });
    },
    fallbacks: installFallbacks,
    confirm: (prompt, project2) => prompts.request(prompt, project2)
  });
  return {
    catalog,
    discovery,
    lifecycle,
    updates,
    prompts,
    installFallbacks,
    kits,
    kitDiscovery,
    kitExecutor,
    kitContext
  };
}
function parseReceipt(value) {
  if (!value || typeof value.id !== "string" || value.kind !== "install" && value.kind !== "update" && value.kind !== "remove" || typeof value.projectId !== "string" || typeof value.projectName !== "string" || !Array.isArray(value.steps)) {
    return null;
  }
  return structuredClone(value);
}
function parseKitReceipt(value) {
  if (!value || value.kind !== "kit-operation" || value.formatVersion !== 1 || typeof value.id !== "string" || typeof value.planId !== "string" || !isKitOperation2(value.operation) || typeof value.kitId !== "string" || typeof value.startedAt !== "string" || typeof value.completedAt !== "string" || !isKitOutcome(value.outcome) || !isNullableString(value.previousActiveKitId) || !isNullableString(value.activeKitId) || value.reloadRequired !== void 0 && typeof value.reloadRequired !== "boolean" || !Array.isArray(value.projects) || !value.projects.every(isKitProjectResult) || !Array.isArray(value.keptForOtherKits) || !value.keptForOtherKits.every((item) => typeof item === "string")) {
    return null;
  }
  return {
    ...structuredClone(value),
    reloadRequired: value.reloadRequired === true
  };
}
function isKitOperation2(value) {
  return value === "install" || value === "activate" || value === "deactivate" || value === "uninstall";
}
function isKitOutcome(value) {
  return value === "completed" || value === "partial" || value === "failed" || value === "interrupted";
}
function isNullableString(value) {
  return value === null || typeof value === "string";
}
function isKitProjectResult(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const result2 = value;
  return typeof result2.projectId === "string" && (result2.action === "install" || result2.action === "enable" || result2.action === "disable" || result2.action === "remove" || result2.action === "keep" || result2.action === "context") && (result2.status === "verified" || result2.status === "failed" || result2.status === "untouched" || result2.status === "kept" || result2.status === "external" || result2.status === "context") && typeof result2.message === "string" && typeof result2.retryable === "boolean";
}
function resolveKit(runtime, catalog, kitId) {
  const personal = runtime.kits.readDefinition(kitId);
  if (personal) return { id: personal.id, projectIds: personal.projectIds, origin: "personal" };
  const published = catalog.kits.find((kit2) => kit2.id === kitId);
  if (published) {
    return {
      id: published.id,
      projectIds: published.components.map(({ projectId }) => projectId),
      origin: "published"
    };
  }
  const installed = runtime.kits.readInstalled(kitId);
  if (!installed) return null;
  return {
    id: installed.kitId,
    projectIds: installed.definitionProjectIds ?? [
      .../* @__PURE__ */ new Set([...installed.installedProjectIds, ...installed.missingProjectIds])
    ],
    origin: "published"
  };
}
async function buildKitPresentation(catalog, kits, inventory) {
  const statuses = /* @__PURE__ */ new Map();
  const activeId = kits.readActiveId();
  const inspectors = {};
  for (const kit2 of kits.readDefinitions()) {
    const definitionFingerprint = await fingerprintKitTopology(kit2.projectIds);
    const installed = await kits.hydrateDefinitionTopology(
      kit2.id,
      kit2.projectIds,
      definitionFingerprint
    );
    const status = reconcileKitStatus({
      kitId: kit2.id,
      definitionFingerprint,
      published: false,
      installed,
      inventory,
      activeKitId: activeId
    });
    statuses.set(kit2.id, status);
    inspectors[kit2.id] = toPersonalKitInspector(kit2, catalog.projects, status, installed);
  }
  for (const kit2 of catalog.kits) {
    const projectIds = kit2.components.map(({ projectId }) => projectId);
    const definitionFingerprint = await fingerprintKitTopology(projectIds);
    const installed = await kits.hydrateDefinitionTopology(
      kit2.id,
      projectIds,
      definitionFingerprint
    );
    const status = reconcileKitStatus({
      kitId: kit2.id,
      definitionFingerprint,
      published: true,
      installed,
      inventory,
      activeKitId: activeId
    });
    statuses.set(kit2.id, status);
    inspectors[kit2.id] = toPublishedKitInspector(kit2, status, installed);
  }
  const projectNames = new Map(catalog.projects.map((project2) => [project2.id, project2.name]));
  const presentProjectIds2 = /* @__PURE__ */ new Set([
    ...inventory.managed.map(({ project: project2 }) => project2.id),
    ...inventory.external.map(({ project: project2 }) => project2.id)
  ]);
  const selectableProjectIds = new Set(
    [...inventory.managed, ...inventory.external].filter(
      ({ project: project2, extension }) => project2.id !== COMPANION_PROJECT_ID && extension.type === "local"
    ).map(({ project: project2 }) => project2.id)
  );
  const installedKits = kits.readInstalledStates().map((installed) => {
    const inspector = inspectors[installed.kitId];
    const currentNames = new Map(
      inspector?.components.map((component2) => [component2.projectId, component2.name]) ?? []
    );
    const topology = installed.definitionProjectIds ?? [
      .../* @__PURE__ */ new Set([...installed.installedProjectIds, ...installed.missingProjectIds])
    ];
    const presentTopology = topology.filter((projectId) => presentProjectIds2.has(projectId));
    const missingProjectIds = topology.filter((projectId) => !presentProjectIds2.has(projectId));
    const active = installed.kitId === activeId;
    const reconciledStatus = inspector?.operationalStatus ?? installedStatusLabel(installed.status);
    const displayStatus = installedKitDisplayStatus({
      active,
      installedCount: presentTopology.length,
      missingCount: missingProjectIds.length,
      drifted: reconciledStatus === "Drifted"
    });
    return {
      id: installed.kitId,
      title: inspector?.title ?? installed.kitId,
      description: inspector?.description ?? "This installed Kit is no longer present in the current catalog.",
      originLabel: inspector?.originLabel ?? "Installed Kit",
      operationalStatus: installed.kitId === activeId ? "Active" : inspector?.operationalStatus ?? installedStatusLabel(installed.status),
      components: topology.map((projectId) => ({
        projectId,
        name: currentNames.get(projectId) ?? projectNames.get(projectId) ?? projectId
      })),
      installedProjectIds: [...installed.installedProjectIds],
      missingProjectIds,
      selectionProjectIds: presentTopology.filter(
        (projectId) => selectableProjectIds.has(projectId)
      ),
      installedCount: presentTopology.length,
      totalProjectCount: topology.length,
      displayStatus,
      statusHelp: installedKitStatusHelp(displayStatus),
      active,
      orphaned: !inspector
    };
  });
  return { statuses, inspectors, installedKits };
}
function installedKitDisplayStatus({
  active,
  installedCount,
  missingCount,
  drifted
}) {
  if (installedCount === 0) return "Missing";
  if (drifted || active && missingCount > 0) return "Drifted";
  if (missingCount > 0) return "Partial";
  return active ? "Active" : "Complete";
}
function installedKitStatusHelp(status) {
  return {
    Active: "This Kit currently defines the enabled state for Companion-managed extensions.",
    Partial: "Some extensions in this Kit are not currently installed.",
    Drifted: "Installed or enabled extensions no longer match this Kit's last verified state.",
    Missing: "None of this Kit's extensions are currently installed.",
    Complete: "Every extension in this Kit is currently installed."
  }[status];
}
function installedStatusLabel(status) {
  return {
    installed: "Installed",
    incomplete: "Incomplete",
    drifted: "Drifted"
  }[status];
}
function renderCompanionPopup(container, options = {}) {
  R(/* @__PURE__ */ u3(CompanionPopupHost, { ...options }), container);
  return () => R(null, container);
}
async function clearStoredReceipt(store, receiptId) {
  if (!store || store.read().operationReceipt?.id !== receiptId) return;
  await store.update((draft) => {
    if (draft.operationReceipt?.id === receiptId) draft.operationReceipt = null;
  });
}
function retryKitOperation(receipt) {
  return receipt.operation;
}

// src/ui/launcher.ts
function mountCompanionLauncher(input) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "menu_button menu_button_icon tavernary-companion-launcher";
  button.dataset.tavernaryCompanionLauncher = "";
  const icon = document.createElement("img");
  icon.dataset.tavernaryCompanionIcon = "";
  icon.src = new URL("./assets/tavernary-trihex.png", import.meta.url).href;
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  const label2 = document.createElement("span");
  label2.dataset.tavernaryCompanionLabel = "";
  label2.textContent = "Tavernary Companion";
  button.append(icon, label2);
  input.anchor.before(button);
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
      transparent: true,
      dismissOnBackdrop: true,
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
  let saveSettings;
  try {
    [host, saveSettings] = await Promise.all([
      context.host ?? context.hostFactory?.() ?? createSillyTavernRuntimeHost(context),
      resolveImmediateSettingsSave(context)
    ]);
  } catch (error) {
    console.error("Tavernary Companion could not initialize the SillyTavern runtime.", error);
    return { ok: false, reason: "missing-host" };
  }
  await whenDocumentReady();
  const launcherAnchor = document.querySelector("#extensions_details");
  if (!launcherAnchor) {
    return { ok: false, reason: "missing-menu" };
  }
  const store = new ProfileStore({
    extensionSettings: context.extensionSettings,
    saveSettings
  });
  const launcher = mountCompanionLauncher({ anchor: launcherAnchor, host, store });
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

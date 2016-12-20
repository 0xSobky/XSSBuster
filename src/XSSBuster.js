(function(window, Object, Array) {
    // Version 1.0.0.2.
    var inputs, origin, _origin, win, _Function, _eval, _setTimeout,
        _setInterval, _atob, some, _cookieDesc, _localStorage, _appendChild,
        _replaceChild, _insertBefore, elPrototype, isSafeArg, guardMethod,
        _execScript, _setImmediate, _sessionStorage, guardSink, guardStorage,
        guardWrite, toSafeStr, _write, _writeln, _innerHTML, _outerHTML,
        getOwnPropertyDescriptor, genDescriptor, _insertAdjacentHTML,
        _createContextualFragment, Rprototype, getPrototypeOf, _cookie;

    // Assert we have access to the window object.
    if (!window) {
        return;
    }

    inputs = [];
    origin = window.location.origin ||
        window.location.protocol + '//' + window.location.host;

    /**
     * Take an input and return its data type.
     *
     * @param input {string|array|object}, some data.
     * @return {string}, data type.
     */
    var getType = function(input) {
        var toString = Object.prototype.toString;
        // Is it a string?
        if (typeof input === 'string' ||
            toString.call(input) === '[object String]') {
            return 'string';
        // An object?
        } else if (toString.call(input) === '[object Object]') {
            return 'object';
        }
        try {
            // Perhaps an array?
            if (Array.isArray(input)) {
                return 'array';
            }
        } catch (e) {
            if (toString.call(input) === '[object Array]') {
                return 'array';
            }
        }
        return 'other';
    };

    /**
     * Take a URL-encoded input and return it in plaintext.
     *
     * @param input {string}, data string to decode.
     * @return {object}, a container for decoded data.
     */
    var toPlain = function(input) {
        var eu = window.encodeURI;
        var du = window.decodeURI;
        var euc = window.encodeURIComponent;
        var duc = window.decodeURIComponent;
        var depth = 0;
        var revMethod = [];
        /**
         * URL-decode a given string.
         *
         * @param input {string}, a URL-encoded string.
         * @return {string}, a URL-decoded string.
         */
        var deEncode = function(input) {
            var es, ues, eusExtend, _input;
            /**
             * A try/catch clause to handle any
             * URIError exceptions that might occur.
             */
            try {
                // Recursively URL-decode the input data.
                while (duc(input) !== input) {
                    _input = duc(input);
                    if (du(input) === _input) {
                        input = du(input);
                        revMethod.push(eu);
                    } else {
                        input = _input;
                        revMethod.push(euc);
                    }
                    ++depth;
                }
            } catch (e) {
                // Make sure `escape` and `unescape` are still supported.
                if (typeof window.escape === 'function' &&
                    typeof window.unescape === 'function') {
                    es = window.escape;
                    ues = window.unescape;
                // A just-in-case fallback.
                } else {
                    /**
                     * Extend a given URI encoding/decoding function's functionality.
                     *
                     * @param func {function}, a `decodeURIComponent`/`encodeURIComponent` function.
                     * @return {function}.
                     */
                    eusExtend = function(func) {
                        var charset = /[\w\s\/\-\^+=_$#@!&*\|,.?:<>\[\]()'";{}]|[^\x00-\x7F]|%(?:40|2[B-F]|2[0-9]|3[A-E]|[57][B-D])/gi;
                        return function(string) {
                            string = string.match(charset);
                            return (string) ? func(string.join('')) : null;
                        };
                    };
                    es = eusExtend(euc);
                    ues = eusExtend(duc);
                }
                input = ues(input);
                revMethod.push(es);
                ++depth;
                if (ues(input) !== input) {
                    return deEncode(input);
                }
            }
            return input;
        };
        input = deEncode(input);
        return {
            output: input,
            depth: depth,
            revMethod: revMethod
        };
    };

    /**
     * Take a `toPlain` output and re-encode it.
     *
     * @param input {string}, the output data property of toPlain's output object.
     * @param depth {integer}, the depth data property of toPlain's output object.
     * @param revMethod {function}, the revMethod data property of toPlain's output object.
     * @return {string}, URL-encoded data.
     */
    var reEncode = function(input, depth, revMethod) {
        while (depth--) {
            input = revMethod[depth](input);
        }
        return input;
    };

    /**
     * Matches evil URI schemes (e.g., `javascript/vbscript:` and `data:`) alongside HTML entities
     * in general...not to mention event handlers and scary curly notations!
     */
    var bRegex = /\{\{|\}\}|&#?\w{2,7};?|on[a-z]+\W*?=|(?:(?:d\W*a\W*t\W*a\W*?)|(?:v\W*b|j\W*a\W*v\W*a)\W*s\W*c\W*r\W*i\W*p\W*t\W*?):/gi;

    /**
     * Take a raw input and sanitize it as needed.
     *
     * @param input {string|array|object}, a string literal, array or object.
     * @return {string|array|object|boolean}, sanitized data or `false`.
     */
    var sanitize = function(input) {
        var _input, propSanitize, index, keys, hasOwnProperty, prop, item;
        // Matches only Basic Latin characters along with a few safe special chars.
        var wRegex = /[^\w\s\/\-\^+=$#@!&*\|,;:.?%()\[\]{}]/gi;
        var isModified = false;
        // Check if `input` is a string.
        if (getType(input) === 'string') {
            // Assert it's not a whitespace string.
            if (/\S/.test(input)) {
                // Check if `input` is URL-encoded.
                if (/%\w{2}/.test(input)) {
                    _input = toPlain(input);
                    input = _input.output;
                }
                if (wRegex.test(input)) {
                    input = input.replace(wRegex, '');
                    isModified = true;
                }
                if (bRegex.test(input)) {
                    do {
                        input = input.replace(bRegex, '');
                        bRegex.lastIndex = 0;
                    } while (bRegex.test(input));
                    isModified = true;
                }
                // Add `input` to the list of tainted strings.
                inputs.push(input);
                // Re-encode `input` if it has been decoded.
                if (_input) {
                    input = reEncode(input, _input.depth, _input.revMethod);
                }
            }
        // Check if it's an object.
        } else if (getType(input) === 'object') {
            /**
             * Take an object property and audit it.
             *
             * @param prop {string}, an object property name.
             * @return void.
             */
            propSanitize = function(prop) {
                var value = sanitize(input[prop]);
                if (value !== false) {
                    input[prop] = value;
                    isModified = true;
                }
            };
            try {
                keys = Object.getOwnPropertyNames(input);
                for (index in keys) {
                    propSanitize(keys[index]);
                }
            } catch (e) {
                hasOwnProperty = Object.prototype.hasOwnProperty;
                for (prop in input) {
                    if (hasOwnProperty.call(input, prop)) {
                        propSanitize(prop);
                    }
                }
            }
        // Check if it's an array.
        } else if (getType(input) === 'array') {
            index = input.length;
            // Iterate over array items and sanitize them one by one.
            while (index--) {
                item = sanitize(input[index]);
                if (item !== false) {
                    input[index] = item;
                    isModified = true;
                }
            }
        }
        return (isModified) ? input : false;
    };

    /**
     * Take a URL object and sanitize it.
     *
     * @param urlObj {object}, a URL object.
     * @return {string|boolean}, a string URL or `false`.
     */
    var auditUrl = function(urlObj) {
        var pathname, search, _isModified, pIndex, _pIndex, aParam, sParam, hash;
        var isModified = false;
        /**
         * For sanitizing the pathname property of
         * the current window location object.
         */
        pathname = sanitize(urlObj.pathname);
        if (pathname !== false) {
            urlObj.pathname = pathname;
            isModified = true;
        }
        /**
         * For sanitizing the search property of
         * the current window location object.
         */
        search = urlObj.search;
        if (search) {
            _isModified = false;
            search = search.slice(1).split('&');
            pIndex = search.length;
            while (pIndex--) {
                aParam = search[pIndex].split('=');
                if (aParam.length < 3) {
                    sParam = sanitize(aParam[0]);
                    if (sParam !== false) {
                        aParam[0] = sParam;
                        _isModified = true;
                    }
                    if (aParam[1]) {
                        sParam = sanitize(aParam[1]);
                        if (sParam !== false) {
                            aParam[1] = sParam;
                            _isModified = true;
                        }
                    }
                } else {
                    _pIndex = aParam.length;
                    while (_pIndex--) {
                        sParam = sanitize(aParam[_pIndex]);
                        if (sParam !== false) {
                            _isModified = true;
                            aParam[_pIndex] = sParam;
                        }
                    }
                }
                if (_isModified) {
                    search[pIndex] = aParam.join('=');
                }
            }
            if (_isModified) {
                urlObj.search = search.join('&');
                isModified = true;
            }
        }
        /**
         * For sanitizing the hash property of
         * the current window location object.
         */
        hash = urlObj.hash.slice(1);
        if (hash) {
            hash = sanitize(hash);
            if (hash !== false) {
                urlObj.hash = hash;
                isModified = true;
            }
        }
        return (isModified) ? urlObj.href : false;
    };

    /**
     * Parse a URL string.
     *
     * @param url {string}, a URL string.
     * @return {object}, a URL object.
     */
    var parseUrl = function(url) {
        var uriParseRe, uriArr;
        try {
            url = new URL(url);
        } catch (e) {
            uriParseRe = /^(\w+:\/\/)?([^\/:?#]*)(:\d+)?([^?#]*)(\?[^#]+)?(#.+)?/;
            uriArr = url.match(uriParseRe);
            url = {
                get href() {
                    var frags = uriArr.slice(1, uriArr.length);
                    return frags.join('');
                },
                get protocol() {
                    return uriArr[1].slice(0, -2);
                },
                set protocol(value) {
                    uriArr[1] = value;
                },
                get hostname() {
                    return uriArr[2];
                },
                set hostname(value) {
                    uriArr[2] = value;
                },
                get port() {
                    return (uriArr[3]) ? uriArr[3].slice(1) : '';
                },
                set port(value) {
                    uriArr[3] = ':' + value;
                },
                get host() {
                    return uriArr[2] + (uriArr[3] || '');
                },
                set host(value) {
                    value = value.split(':');
                    this.hostname = value[0] || this.hostname;
                    this.port = value[1] || this.port;
                },
                get pathname() {
                    return uriArr[4] || '/';
                },
                set pathname(value) {
                    uriArr[4] = '/' + value;
                },
                get search() {
                    return uriArr[5] || '';
                },
                set search(value) {
                    uriArr[5] = (value) ? '?' + value : '';
                },
                get hash() {
                    return uriArr[6] || '';
                },
                set hash(value) {
                    uriArr[6] = (value) ? '#' + value : '';
                }
            };
        }
        return url;
    };

    /**
     * Register a new cross-browser event listener.
     *
     * @param target {object}, a target object to bind the event listener to.
     * @param equiv {string}, a corresponding DOM property name for @target.
     * @param evName {string}, the name of the event to register.
     * @param callback {function}, a callback function for the event listener.
     * @return void.
     */
    var addListener = (function() {
        if (window.addEventListener) {
            return function(target, equiv, evName, callback) {
                var _addEventListener = (equiv === 'window') ?
                    window.addEventListener : document.addEventListener;
                _addEventListener.call(target, evName, callback);
            };
        }
        // For IE8 and earlier versions support.
        return function(target, equiv, evName, callback) {
            var _callback;
            var _attachEvent = (equiv === 'window') ? window.attachEvent :
                document.attachEvent;
            if (evName === 'DOMContentLoaded') {
                _callback = function() {
                    if (target.readyState === 'interactive') {
                        callback();
                    }
                };
                _attachEvent.call(target, 'onreadystatechange', _callback);
            } else {
                _attachEvent.call(target, 'on' + evName, callback);
            }
        };
    })();

    /**
     * A proxy function for `Object.defineProperties`.
     *
     * @param obj {object}, a target object.
     * @param properties {object}, a property descriptor.
     * @return void.
     */
    var defineProperties = function(obj, properties) {
        var prop, _value;
        var index = properties.length;
        while (index--) {
            prop = properties[index];
            _value = prop.value;
            prop = prop.default ? {
                value: _value,
                enumerable: true,
                writable: true,
                configurable: true
            } : prop;
        }
        try {
            Object.defineProperties(obj, properties);
        } catch (e) {}
    };

    /**
     * Redefine the name property of a given window object,
     * so we add a setter to sanitize it whenever it changes.
     *
     * @param winObj {object}, a window object.
     * @return void.
     */
    var auditWinName = function(winObj) {
        var _name = winObj.name;
        defineProperties(winObj, {
            'name': {
                get: function() {
                    return _name;
                },
                set: function(val) {
                    var sVal = sanitize(val);
                    if (sVal !== false) {
                        _name = sVal;
                    } else {
                        _name = val;
                    }
                },
                enumerable: true
            }
        });
        winObj.name = _name;
    };

    /**
     * Take a window object and audit its default properties.
     *
     * @param winObj {object}, a window object.
     * @return void.
     */
    var auditWin = function(winObj) {
        var name, title, referrer, _onhashchange, _onmessage, auditFrames;
        /**
         * For registering event listeners to audit
         * non-fixed and communicative input sources.
         */
        _onhashchange = function() {
            var hash = sanitize(winObj.location.hash.slice(1));
            if (hash !== false) {
                winObj.location.hash = hash;
            }
        };
        _onmessage = function(ev) {
            var data, index, port;
            var ports = ev.ports;
            var _origin = ev.origin || ev.originalEvent.origin;
            if (_origin !== origin) {
                data = sanitize(ev.data);
                if (data !== false) {
                    defineProperties(ev, {
                        'data': {
                            value: data,
                            default: true
                        }
                    });
                }
                if (ports) {
                    index = ports.length;
                    while (index--) {
                        port = ports[index];
                        port.onmessage = _onmessage;
                    }
                }
            }
        };
        // For hash re-sanitization whenever it gets modified.
        addListener(winObj, 'window', 'hashchange', _onhashchange);
        // For cross-document messaging sanitization.
        addListener(winObj, 'window', 'message', _onmessage);
        // Audit the current window URL.
        auditUrl(winObj.location);
        /**
         * For sanitizing the name property
         * of the current window object.
         */
        name = winObj.name;
        if (name) {
            name = sanitize(name);
            if (name !== false) {
                winObj.name = name;
            }
        }
        /**
         * For sanitizing the title of the current document.
         * And yep, `document.title` can be -partially?-
         * manipulated by attackers as in search pages!
         */
        title = sanitize(winObj.document.title);
        if (title !== false) {
            winObj.document.title = title;
        }
        // For sanitizing any given document referrer.
        referrer = winObj.document.referrer;
        if (referrer) {
            referrer = auditUrl(parseUrl(referrer));
            if (referrer !== false) {
                defineProperties(winObj.document, {
                    'referrer': {
                        value: referrer,
                        default: true
                    }
                });
            }
        }
        /**
         * For auditing child frames.
         *
         * @return void.
         */
        auditFrames = function() {
            var fIndex, currentFrame;
            var getElementsByTagName = document.getElementsByTagName;
            var frames = getElementsByTagName.call(winObj.document,
                'iframe');
            /**
             * For auditing a given frame node.
             *
             * @param currentFrame {object}, a frame node.
             * @return void.
             */
            var auditFrame = function(currentFrame) {
                var fWindow;
                try {
                    fWindow = currentFrame.contentWindow;
                    if (currentFrame.src !== fWindow.location.href) {
                        auditWinName(fWindow);
                        auditWin(fWindow);
                    }
                } catch (e) {}
            };
            fIndex = frames.length;
            while (fIndex--) {
                currentFrame = frames[fIndex];
                (function(currentFrame) {
                    addListener(currentFrame, 'document', 'load',
                        function() {
                            auditFrame(currentFrame);
                        });
                })(currentFrame);
            }
        };
        addListener(winObj.document, 'document',
            'DOMContentLoaded', auditFrames);
    };

    // Audit `self` window.
    auditWin(window);

    // Audit `parent` window(s).
    if (window !== top) {
        win = parent;
        try {
            _origin = win.location.origin ||
                win.location.protocol + '//' + win.location.host;
        } catch(e) {}
        do {
            try {
                if (_origin !== origin) {
                    auditWinName(win);
                    auditWin(win);
                }
            } catch (e) {
                continue;
            } finally {
                win = win.parent;
            }
        } while (win !== top);
    }

    /* Monkey-patch JS sinks. */
    _Function = window.Function;
    _eval = window.eval;
    _setInterval = window.setInterval;
    _setTimeout = window.setTimeout;
    elPrototype = Element.prototype;
    _appendChild = elPrototype.appendChild;
    _replaceChild = elPrototype.replaceChild;
    _insertBefore = elPrototype.insertBefore;
    some = Array.prototype.some || function(fn) {
        var index = this.length;
        while (index--) {
            if (fn(this[index])) {
                return true;
            }
        }
        return false;
    };

    /**
     * Check if a given string is safe.
     *
     * @return void.
     */
    isSafeArg = function() {
        /**
         * Validate any given string argument.
         *
         * @param arg {string}, a given string.
         * @return {boolean}.
         */
        var validate = function(arg) {
            /**
             * Check if a given string is tainted.
             *
             * @param taint {string}, a given string.
             * @return {boolean}.
             */
            var isTainted = function(taint) {
                return (isNaN(taint) &&
                    taint.length > 6 &&
                    arg.indexOf(taint) !== -1);
            };
            arg = toPlain(arg).output;
            return (some.call(inputs, isTainted));
        };
        if (some.call(arguments, validate)) {
            return false;
        }
        return true;
    };

    /**
     * Take a suspicious string and neutralize it.
     *
     * @param str {string}, a suspicious string.
     * @return {string}, a neutralized string.
     */
    toSafeStr = function(str) {
        if (str.indexOf('<') !== 0 && bRegex.test(str)) {
            str = str.replace(bRegex, '');
        }
        return str;
    };

    /**
     * Guard `appendChild` and alike methods.
     *
     * @param method {function}, a given function.
     * @return {function}.
     */
    guardMethod = function(method) {
        return function(node) {
            var nodeName = node.nodeName;
            /**
             * Check if a given node is unsafe.
             *
             * @param node {object}, a given DOM node.
             * @return {boolean}.
             */
            var isUnsafeEl = function(node) {
                var childScripts, attribs, index, attrib, attribName;
                if (node.hasChildNodes && node.hasChildNodes()) {
                    childScripts = node.getElementsByTagName('script');
                    if (some.call(childScripts, isUnsafeEl)) {
                        return true;
                    }
                }
                if (nodeName === 'SCRIPT') {
                    if (!isSafeArg(node.text) || !isSafeArg(node.src)) {
                        return true;
                    }
                    return false;
                } else if (nodeName === 'OBJECT') {
                    if (!isSafeArg(node.data)) {
                        return true;
                    }
                }
                if (node.hasAttributes && node.hasAttributes()) {
                    attribs = node.attributes;
                    index = attribs.length;
                    while (index--) {
                        attrib = attribs[index];
                        attribName = attrib.name;
                        if (/^on./.test(attribName) &&
                            !isSafeArg(attrib.value)) {
                            node.removeAttribute(attribName);
                        }
                    }
                }
            };
            if (isUnsafeEl(node)) {
                node.innerHTML = '';
                if (node.hasAttribute('src')) {
                    node.removeAttribute('src');
                }
            }
            return method.apply(this, arguments);
        };
    };

    /* Guard `appendChild` and alike. */
    elPrototype.appendChild = guardMethod(_appendChild);
    elPrototype.replaceChild = guardMethod(_replaceChild);
    elPrototype.insertBefore = guardMethod(_insertBefore);

    /* Guard `innerHTML` and alike. */
    Rprototype = Range.prototype;
    getOwnPropertyDescriptor = function () {
        try {
            return Object.getOwnPropertyDescriptor.apply(this, arguments);
        } catch (e) {}
    };
    _innerHTML = getOwnPropertyDescriptor(elPrototype, 'innerHTML');
    _outerHTML = getOwnPropertyDescriptor(elPrototype, 'outerHTML');
    _createContextualFragment = Rprototype.createContextualFragment;
    Rprototype.createContextualFragment = function(tagStr) {
        if (!isSafeArg(tagStr)) {
            tagStr = toSafeStr(tagStr);
        }
        return _createContextualFragment.call(this, tagStr);
    };
    /**
     * Generate a safe property descriptor.
     *
     * @param prop {object}, a descriptor object.
     * @return {object}.
     */
    genDescriptor = function(prop) {
        return {
            get: function() {
                return prop.get.call(this);
            },
            set: function(val) {
                if (!isSafeArg(val)) {
                    val = toSafeStr(val);
                }
                return prop.set.call(this, val);
            }
        };
    };
    Object.defineProperties(elPrototype, {
        'innerHTML': genDescriptor(_innerHTML),
        'outerHTML': genDescriptor(_outerHTML)
    });

    _insertAdjacentHTML = elPrototype.insertAdjacentHTML;
    if (_insertAdjacentHTML) {
        elPrototype.insertAdjacentHTML = function(position, html) {
            if (!isSafeArg(html)) {
                html = toSafeStr(html);
            }
            return _insertAdjacentHTML.call(this, position, html);
        };
    }

    /* Guard `document.write` and alike methods. */
    _write = document.write;
    _writeln = document.writeln;
    /**
     * Guard a given function against tainted strings.
     *
     * @param writeFn {function}, a write-like function.
     * @return {function}.
     */
    guardWrite = function(writeFn) {
        return function(str) {
            var els, el;
            if (!isSafeArg(str)) {
                str = toSafeStr(str);
                els = document.getElementsByTagName('*');
                el = els[els.length - 1];
                el.parentElement.innerHTML = str;
            } else {
                writeFn.call(document, str);
            }
        };
    };
    document.write = guardWrite(_write);
    document.writeln = guardWrite(_writeln);

    Function = function() {
        /**
         * Construct a new `Function` instance.
         *
         * @return {function}.
         */
        var construct = function() {
            var fn = _Function.apply(null, arguments);
            fn.constructor = Function;
            try {
                Object.setPrototypeOf(fn, Function);
            } catch (e) {
                fn.__proto__ = Function;
            }
            return fn;
        };
        if (isSafeArg.apply(null, arguments)) {
            return construct.apply(null, arguments);
        }
        return construct();
    };
    Function.prototype = Function;

    /**
     * Guard a given sink function.
     *
     * @param sinkFn {function}, a sink function.
     * @return {function}, a safe sink function.
     */
    guardSink = function(sinkFn) {
        return function() {
            if (isSafeArg.apply(null, arguments)) {
                return sinkFn.apply(this, arguments);
            }
        };
    };
    window.eval = guardSink(_eval);
    window.setTimeout = guardSink(_setTimeout);
    window.setInterval = guardSink(_setInterval);
    if (typeof window.atob === 'function') {
        _atob = window.atob;
        window.atob = function(str) {
            if (isSafeArg(str)) {
                return _atob(str);
            }
            str = sanitize(_atob(str));
            return str;
        };
    }
    if (typeof window.execScript === 'function') {
        _execScript = window.execScript;
        window.execScript = guardSink(_execScript);
    }
    if (typeof window.setImmediate === 'function') {
        _setImmediate = window.setImmediate;
        window.setImmediate = guardSink(_setImmediate);
    }

    /* Monkey-patch storage sources. */
    getPrototypeOf = function () {
        try {
            return Object.getPrototypeOf.apply(this, arguments);
        } catch (e) {}
    };
    _cookieDesc = (function () {
        try {
            return getOwnPropertyDescriptor(document, 'cookie') ||
                getOwnPropertyDescriptor(getPrototypeOf(document), 'cookie') ||
                {
                    get: document.__lookupGetter__('cookie'),
                    set: document.__lookupSetter__('cookie')
                }
        } catch (e) {}
    })();
    _cookie = document.cookie;
    defineProperties(document, {
        'cookie': {
            get: function() {
                try {
                    return _cookieDesc.get.call(this);
                } catch (e) {
                    return _cookie;
                }
            },
            set: function(val) {
                if (isSafeArg(val)) {
                    try {
                        return _cookieDesc.set.call(this, val);
                    } catch (e) {
                        _cookie += ';' + val;
                    }
                }
            }
        }
    });
    /**
     * Guard a given storage object.
     *
     * @param storageObj {object}, a storage object.
     * @return {object}, a safe storage object.
     */
    guardStorage = function(storageObj) {
        return {
            setItem: function(key, value) {
                if (isSafeArg(key, value)) {
                    storageObj.setItem(key, value);
                }
            },
            getItem: function(key) {
                return storageObj.getItem(key);
            }
        };
    };
    if (window.localStorage) {
        _localStorage = window.localStorage;
        delete window.localStorage;
        window.localStorage = guardStorage(_localStorage);
    }
    if (window.sessionStorage) {
        _sessionStorage = window.sessionStorage;
        delete window.sessionStorage;
        window.sessionStorage = guardStorage(_sessionStorage);
    }
})(window, Object, Array);

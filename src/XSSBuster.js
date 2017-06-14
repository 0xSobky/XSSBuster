(function(window, Object, Array) {
    // Version 1.1.3.
    var NativeFunction, Rprototype, cookie, cookieDesc, cookieIndex,
        cookiePair, cookiePairs, elPrototype, innerHTML, nativeAppendChild,
        nativeAtob, nativeCreateContextualFragment, nativeEval,
        nativeExecScript, nativeInsertAdjacentElement, nativeInsertAdjacentHTML,
        nativeInsertBefore, nativeLocalStorage, nativeReplaceChild,
        nativeSessionStorage, nativeSetImmediate, nativeSetInterval,
        nativeSetTimeout, nativeWrite, nativeWriteln, outerHTML, valIndex, win,
        winOrigin;

    var taintedStrings = [];

    var origin = window.location.origin ||
        window.location.protocol + '//' + window.location.host;

    /*
     * Matches evil URI schemes, event handlers, HTML entities,
     * and scary curly notations!
     */
    var blacklistRe = /{{|}}|&#?\w{2,7};?|\b(?:on[a-z]+\W*?=|(?:(?:d\W*a\W*t\W*a\W*?)|(?:v\W*b|j\W*a\W*v\W*a)\W*s\W*c\W*r\W*i\W*p\W*t\W*?):)/gi;

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
        // An array?
        } else if (Array.isArray && Array.isArray(input) ||
            toString.call(input) === '[object Array]') {
            return 'array';
        // A map?
        } else if (toString.call(input) === '[object Map]') {
            return 'map';
        // A set?
        } else if (toString.call(input) === '[object Set]') {
            return 'set';
        // A regex?
        } else if (toString.call(input) === '[object RegExp]') {
            return 'regex';
        // A file?
        } else if (toString.call(input) === '[object File]') {
            return 'file';
        // A fileList?
        } else if (toString.call(input) === '[object FileList]') {
            return 'fileList';
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
        var encURI = window.encodeURI;
        var decURI = window.decodeURI;
        var encURIComp = window.encodeURIComponent;
        var decURIComp = window.decodeURIComponent;
        var depth = 0;
        var revMethod = [];
        /**
         * URL-decode a given string.
         *
         * @param input {string}, a URL-encoded string.
         * @return {string}, a URL-decoded string.
         */
        var deEncode = function(input) {
            var es, eusExtend, origInput, ues;
            /* A try/catch clause to handle any URIError exceptions. */
            try {
                // Recursively URL-decode the input data.
                while (decURIComp(input) !== input) {
                    origInput = decURIComp(input);
                    if (decURI(input) === origInput) {
                        input = decURI(input);
                        revMethod.push(encURI);
                    } else {
                        input = origInput;
                        revMethod.push(encURIComp);
                    }
                    ++depth;
                }
            } catch (e) {
                // Make sure `escape()` and `unescape()` are still supported.
                if (typeof window.escape === 'function' &&
                    typeof window.unescape === 'function') {
                    es = window.escape;
                    ues = window.unescape;
                // A just-in-case fallback.
                } else {
                    /**
                     * Extend a URL-encoding/decoding function's functionality.
                     *
                     * @param func {function}, a URL-encoding/decoding function.
                     * @return {function}.
                     */
                    eusExtend = function(func) {
                        var charsetRe = /(?:[^%]|%(?:40|2[b-f]|2[0-9]|3[a-e]|[57][b-d]))+/gi;
                        return function(string) {
                            string = string.match(charsetRe);
                            return (string) ? func(string.join('')) : null;
                        };
                    };
                    es = eusExtend(encURIComp);
                    ues = eusExtend(decURIComp);
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
     * Take a `toPlain()` output and re-encode it.
     *
     * @param input {string}, a `toPlain().output` property.
     * @param depth {integer}, a `toPlain().depth` property.
     * @param revMethod {function}, a `toPlain().revMethod` property.
     * @return {string}, URL-encoded data.
     */
    var reEncode = function(input, depth, revMethod) {
        while (depth--) {
            input = revMethod[depth](input);
        }
        return input;
    };

    /**
     * Take a raw input and sanitize it as needed.
     *
     * @param input {string|array|object}, a string literal, array or object.
     * @return {string|array|object|boolean}, sanitized data or `false`.
     */
    var sanitize = function(input) {
        var formData, hasOwnProperty, index, item, keys, origInput, prop, propSanitize,
            tmpVar;
        // Matches safe Basic Latin characters.
        var whitelistRe = /[^\w\s\/+=$#@!&*|,;:.?%()[\]{}^-]/g;
        var isModified = false;
        var inptType = getType(input);
        // Check if `input` is a string.
        if (inptType === 'string') {
            // Assert it's not a whitespace string.
            if (/\S/.test(input)) {
                // Check if `input` is URL-encoded.
                if (/%/.test(input)) {
                    origInput = toPlain(input);
                    input = origInput.output;
                }
                if (whitelistRe.test(input)) {
                    input = input.replace(whitelistRe, '');
                    isModified = true;
                }
                if (blacklistRe.test(input)) {
                    input = input.replace(blacklistRe, '');
                    isModified = true;
                }
                // Add `input` to the list of tainted strings.
                taintedStrings.push(input);
                // Re-encode `input` if it has been decoded.
                if (origInput) {
                    input = reEncode(input, origInput.depth, origInput.revMethod);
                }
            }
        // Check if it's an object.
        } else if (inptType === 'object') {
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
        // Check if it's a set.
        } else if (inptType === 'set') {
            try {
                tmpVar = new Set();
                input.forEach(function(val) {
                    var sVal = sanitize(val);
                    val = sVal ? sVal : val;
                    tmpVar.add(val);
                });
                input = tmpVar;
            } catch (e) {
                input = null;
            }
            isModified = true;
        // Check if it's a map.
        } else if (inptType === 'map') {
            try {
                tmpVar = new Map();
                input.forEach(function(val, key) {
                    var sVal = sanitize(val);
                    var sKey = sanitize(key);
                    val = sVal ? sVal : val;
                    key = sKey ? sKey : key;
                    tmpVar.set(key, val);
                });
                input = tmpVar;
            } catch (e) {
                input = null;
            }
            isModified = true;
        // Check if it's a regex.
        } else if (inptType === 'regex') {
            tmpVar = sanitize(input.source);
            if (tmpVar !== false) {
                input = new RegExp(tmpVar);
                isModified = true;
            }
        // Check if it's a file.
        } else if (inptType === 'file') {
            try {
                tmpVar = sanitize(input.name);
                if (tmpVar !== false) {
                    formData = new FormData();
                    formData.append('file', input, tmpVar);
                    input = formData.get('file');
                    if (sanitize(input.name) !== false) {
                        input = null;
                    }
                    isModified = true;
                }
            } catch (e) {
                input = null;
            }
        // Check if it's an array-like object.
        } else if (inptType === 'array' || inptType === 'fileList') {
            if (inptType === 'fileList') {
                tmpVar = [];
                index = input.length;
                while (index--) {
                    tmpVar[index] = input[index];
                }
                tmpVar.item = function(index) {
                    return this[index];
                };
            } else {
                tmpVar = input;
            }
            index = tmpVar.length;
            // Iterate over array items and sanitize them one by one.
            while (index--) {
                item = sanitize(tmpVar[index]);
                if (item !== false) {
                    tmpVar[index] = item;
                    isModified = true;
                }
            }
            if (isModified) {
                input = tmpVar;
            }
        }
        return (isModified) ? input : false;
    };

    /**
     * Parse a URL string.
     *
     * @param url {string}, a URL string.
     * @return {object}, a URL object.
     */
    var parseUrl = function(url) {
        var parser;
        try {
            url = new URL(url);
        } catch (e) {
            parser = document.createElement('a');
            parser.href = url;
            url = parser;
        }
        return url;
    };

    /**
     * Take a URL object and sanitize it.
     *
     * @param urlObj {object}, a URL object.
     * @return {string|boolean}, a string URL or `false`.
     */
    var auditUrl = function(urlObj) {
        var hash, paramPair, paramIndex, paramModified, pathname, sanParam,
            search, subIndex;
        var isModified = false;
        /*
         * For sanitizing the pathname property of
         * the current window location object.
         */
        pathname = sanitize(urlObj.pathname);
        if (pathname !== false) {
            urlObj.pathname = pathname;
            isModified = true;
        }
        /*
         * For sanitizing the search property of
         * the current window location object.
         */
        search = urlObj.search;
        if (search) {
            paramModified = false;
            search = search.slice(1).split('&');
            paramIndex = search.length;
            while (paramIndex--) {
                paramPair = search[paramIndex].split('=');
                if (paramPair.length < 3) {
                    sanParam = sanitize(paramPair[0]);
                    if (sanParam !== false) {
                        paramPair[0] = sanParam;
                        paramModified = true;
                    }
                    if (paramPair[1]) {
                        sanParam = sanitize(paramPair[1]);
                        if (sanParam !== false) {
                            paramPair[1] = sanParam;
                            paramModified = true;
                        }
                    }
                } else {
                    subIndex = paramPair.length;
                    while (subIndex--) {
                        sanParam = sanitize(paramPair[subIndex]);
                        if (sanParam !== false) {
                            paramModified = true;
                            paramPair[subIndex] = sanParam;
                        }
                    }
                }
                if (paramModified) {
                    search[paramIndex] = paramPair.join('=');
                }
            }
            if (paramModified) {
                urlObj.search = search.join('&');
                isModified = true;
            }
        }
        /*
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
                var nativeAddEventListener = (equiv === 'window') ?
                    window.addEventListener : document.addEventListener;
                nativeAddEventListener.call(target, evName, callback);
            };
        }
        // For IE8 and earlier versions support.
        return function(target, _, evName, callback) {
            var domLoadedCallback;
            if (evName === 'DOMContentLoaded') {
                /**
                 * A proxy function to `callback()`.
                 * @return void.
                 */
                domLoadedCallback = function() {
                    if (target.readyState === 'interactive') {
                        callback();
                    }
                };
                target.attachEvent('onreadystatechange', domLoadedCallback);
            } else {
                target.attachEvent('on' + evName, callback);
            }
        };
    })();

    /**
     * A proxy function to `Object.defineProperties()`.
     *
     * @param obj {object}, a target object.
     * @param properties {object}, a property descriptor.
     * @return void.
     */
    var defineProperties = function(obj, properties) {
        var origValue, prop;
        var index = properties.length;
        while (index--) {
            prop = properties[index];
            origValue = prop.value;
            prop = prop.isDefault ? {
                value: origValue,
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
        var origName = winObj.name;
        defineProperties(winObj, {
            'name': {
                get: function() {
                    return origName;
                },
                set: function(val) {
                    var sanVal = sanitize(val);
                    if (sanVal !== false) {
                        origName = sanVal;
                    } else {
                        origName = val;
                    }
                },
                enumerable: true
            }
        });
        winObj.name = origName;
    };

    /**
     * Take a window object and audit its default properties.
     *
     * @param winObj {object}, a window object.
     * @return void.
     */
    var auditWin = function(winObj) {
        var auditFrames, name, referrer, title;
        /**
         * Audit the `location.hash` window property on change.
         *
         * @return void.
         */
        var onhashchangeFn = function() {
            var hash = sanitize(winObj.location.hash.slice(1));
            if (hash !== false) {
                winObj.location.hash = hash;
            }
        };
        /**
         * Intercept HTML5 messages and audit them.
         *
         * @param ev {object}, a message event.
         * @return void.
         */
        var onmessageFn = function(ev) {
            var winOrigin, data, index, port;
            var ports = ev.ports;
            try {
                winOrigin = ev.origin || ev.originalEvent.origin;
            } catch (e) {}
            if (winOrigin !== origin) {
                data = sanitize(ev.data);
                if (data !== false) {
                    defineProperties(ev, {
                        'data': {
                            value: data,
                            isDefault: true
                        }
                    });
                }
                if (ports) {
                    index = ports.length;
                    while (index--) {
                        port = ports[index];
                        port.onmessage = onmessageFn;
                    }
                }
            }
        };
        // For hash re-sanitization whenever it gets modified.
        addListener(winObj, 'window', 'hashchange', onhashchangeFn);
        // For cross-document messaging sanitization.
        addListener(winObj, 'window', 'message', onmessageFn);
        // Audit the current window URL.
        auditUrl(winObj.location);
        /*
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
        /*
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
                        isDefault: true
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

    /**
     * A proxy function to `Object.getPrototypeOf()`.
     *
     * @return {object}, a prototype object.
     */
    var getPrototypeOf = function () {
        try {
            return Object.getPrototypeOf.apply(this, arguments);
        } catch (e) {}
    };

    /**
     * Guard write functions against tainted strings.
     *
     * @param nativeWrite {function}, a write-like function.
     * @return {function}.
     */
    var guardWrite = function(nativeWrite) {
        return function(str) {
            var el, els;
            if (!isSafeArg(str)) {
                str = toSafeStr(str);
                els = document.getElementsByTagName('*');
                el = els[els.length - 1];
                el.parentElement.innerHTML = str;
            } else {
                nativeWrite.call(document, str);
            }
        };
    };

    /**
     * A proxy function to `Array.prototype.some()`.
     *
     * @param fn {function}, a test function.
     * @return {boolean}.
     */
    var some = Array.prototype.some || function(fn) {
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
    var isSafeArg = function() {
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
                return (isNaN(taint) && taint.length > 6 &&
                        arg.indexOf(taint) !== -1);
            };
            arg = toPlain(arg).output;
            return (some.call(taintedStrings, isTainted));
        };
        if (some.call(arguments, validate)) {
            return false;
        }
        return true;
    };

    /**
     * Guard a given sink function.
     *
     * @param sinkFn {function}, a sink function.
     * @return {function}, a safe sink function.
     */
    var guardSink = function(sinkFn) {
        return function() {
            if (isSafeArg.apply(null, arguments)) {
                return sinkFn.apply(this, arguments);
            }
        };
    };

    /**
     * Check if a given node is unsafe.
     *
     * @param node {object}, a given DOM node.
     * @return {boolean}.
     */
    var isUnsafeNode = function(node) {
        var childApplets, childEmbeds, childFrames, childIframes, childObjects, childScripts;
        var nodeName = node.nodeName;
        try {
            if (node.hasChildNodes()) {
                childApplets = node.getElementsByTagName('applet');
                if (childApplets.length > 0) {
                    return some.call(childApplets, isUnsafeNode);
                }
                childEmbeds = node.getElementsByTagName('embed');
                if (childEmbeds.length > 0) {
                    return some.call(childEmbeds, isUnsafeNode);
                }
                childFrames = node.getElementsByTagName('frame');
                if (childFrames.length > 0) {
                    return some.call(childFrames, isUnsafeNode);
                }
                childIframes = node.getElementsByTagName('iframe');
                if (childIframes.length > 0) {
                    return some.call(childIframes, isUnsafeNode);
                }
                childObjects = node.getElementsByTagName('object');
                if (childObjects.length > 0) {
                    return some.call(childObjects, isUnsafeNode);
                }
                childScripts = node.getElementsByTagName('script');
                if (childScripts.length > 0) {
                    return some.call(childScripts, isUnsafeNode);
                }
            }
        } catch (e) {}
        if (nodeName === 'SCRIPT') {
            if (isSafeArg(node.text) && isSafeArg(node.src)) {
                return false;
            }
            return true;
        } else if (nodeName === 'OBJECT') {
            if (isSafeArg(node.data)) {
                return false;
            }
            return true;
        } else if (nodeName === 'IFRAME' || nodeName === 'FRAME' ||
                   nodeName === 'EMBED') {
            if (isSafeArg(node.src) &&
                (!node.srcdoc || isSafeArg(node.srcdoc))) {
                return false;
            }
            return true;
        } else if (nodeName === 'APPLET') {
            if (isSafeArg(node.code) &&
                (!node.codebase || isSafeArg(node.codebase)) &&
                (!node.archive || isSafeArg(node.archive))) {
                return false;
            }
            return true;
        }
    };

    /**
     * Neutralize a given DOM node.
     *
     * @param node {object}, an unsafe DOM node.
     * @return {object}, a neutralized DOM node.
     */
    var toSafeNode = function(node) {
        var attrib, attribName, attribs, index;
        node.innerHTML = '';
        if (node.hasAttribute('src')) {
            node.removeAttribute('src');
        }
        if (node.hasAttribute('srcdoc')) {
            node.removeAttribute('srcdoc');
        }
        if (node.hasAttribute('data')) {
            node.removeAttribute('data');
        }
        if (node.hasAttribute('code')) {
            node.removeAttribute('code');
        }
        if (node.hasAttribute('archive')) {
            node.removeAttribute('archive');
        }
        if (node.hasAttribute('codebase')) {
            node.removeAttribute('codebase');
        }
        if (node.hasAttribute('object')) {
            node.removeAttribute('object');
        }
        try {
            if (node.hasAttributes()) {
                attribs = node.attributes;
                index = attribs.length;
                while (index--) {
                    attrib = attribs[index];
                    attribName = attrib.name;
                    if (/^on./.test(attribName) && !isSafeArg(attrib.value)) {
                        node.removeAttribute(attribName);
                    }
                }
            }
        } catch (e) {}
        return node;
    };

    /**
     * Guard `appendChild()` and alike methods.
     *
     * @param method {function}, a given function.
     * @return {function}.
     */
    var guardMethod = function(method) {
        return function(node) {
            if (isUnsafeNode(node)) {
                node = toSafeNode(node);
            }
            return method.apply(this, arguments);
        };
    };

    /**
     * A proxy function to `Object.getOwnPropertyDescriptor()`.
     *
     * @return {object}, a property descriptor.
     */
    var getOwnPropertyDescriptor = function () {
        try {
            return Object.getOwnPropertyDescriptor.apply(this, arguments);
        } catch (e) {}
    };

    /**
     * Guard a given storage object.
     *
     * @param storageObj {object}, a storage object.
     * @return {object}, a safe storage object.
     */
    var guardStorage = function(storageObj) {
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

    /**
     * Take a suspicious string and neutralize it.
     *
     * @param str {string}, a suspicious string.
     * @return {string}, a neutralized string.
     */
    var toSafeStr = function(str) {
        if (str.indexOf('<') !== -1 && blacklistRe.test(str)) {
            str = str.replace(blacklistRe, '');
            str = str.replace(/\bsrcdoc=/gi, 'redacted=');
        }
        return str;
    };

    /**
     * Generate a safe property descriptor.
     *
     * @param prop {object}, a descriptor object.
     * @return {object}.
     */
    var genDescriptor = function(prop) {
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

    // Audit `self` window.
    auditWin(window);

    // Audit `parent` window(s).
    if (window !== top) {
        win = parent;
        try {
            winOrigin = win.location.origin ||
                win.location.protocol + '//' + win.location.host;
        } catch(e) {}
        do {
            try {
                if (winOrigin !== origin) {
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
    NativeFunction = window.Function;
    nativeEval = window.eval;
    nativeSetInterval = window.setInterval;
    nativeSetTimeout = window.setTimeout;
    nativeWrite = document.write;
    nativeWriteln = document.writeln;
    document.write = guardWrite(nativeWrite);
    document.writeln = guardWrite(nativeWriteln);
    window.eval = guardSink(nativeEval);
    window.setTimeout = guardSink(nativeSetTimeout);
    window.setInterval = guardSink(nativeSetInterval);
    window.Function = function() {
        /**
         * Construct a new `Function()` instance.
         *
         * @return {function}.
         */
        var construct = function() {
            var fn = NativeFunction.apply(null, arguments);
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
    window.Function.prototype = Function;
    try {
        elPrototype = window.Element.prototype;
        nativeAppendChild = elPrototype.appendChild;
        nativeReplaceChild = elPrototype.replaceChild;
        nativeInsertBefore = elPrototype.insertBefore;
        nativeInsertAdjacentHTML = elPrototype.insertAdjacentHTML;
        nativeInsertAdjacentElement = elPrototype.insertAdjacentElement;
        innerHTML = getOwnPropertyDescriptor(elPrototype, 'innerHTML');
        outerHTML = getOwnPropertyDescriptor(elPrototype, 'outerHTML');
        elPrototype.appendChild = guardMethod(nativeAppendChild);
        elPrototype.replaceChild = guardMethod(nativeReplaceChild);
        elPrototype.insertBefore = guardMethod(nativeInsertBefore);
        elPrototype.insertAdjacentHTML = function(position, html) {
            if (!isSafeArg(html)) {
                html = toSafeStr(html);
            }
            return nativeInsertAdjacentHTML.call(this, position, html);
        };
        elPrototype.insertAdjacentElement = function(position, el) {
            if (isUnsafeNode(el)) {
                el = toSafeNode(el);
            }
            return nativeInsertAdjacentElement.call(this, position, el);
        };
        defineProperties(elPrototype, {
            'innerHTML': genDescriptor(innerHTML),
            'outerHTML': genDescriptor(outerHTML)
        });
    } catch (e) {}
    if (window.execScript) {
        nativeExecScript = window.execScript;
        // A nasty workaround to override `execScript()`.
        eval('var execScript;');
        window.execScript = guardSink(nativeExecScript);
    }
    if (window.setImmediate) {
        nativeSetImmediate = window.setImmediate;
        window.setImmediate = guardSink(nativeSetImmediate);
    }

    // Override `atob()` to sanitize tainted base64-encoded strings.
    if (window.atob) {
        nativeAtob = window.atob;
        window.atob = function(str) {
            if (isSafeArg(str)) {
                return nativeAtob(str);
            }
            str = sanitize(nativeAtob(str));
            return str;
        };
    }

    /* Guard `createContextualFragment()`. */
    try {
        Rprototype = window.Range.prototype;
        nativeCreateContextualFragment = Rprototype.createContextualFragment;
        Rprototype.createContextualFragment = function(tagStr) {
            if (!isSafeArg(tagStr)) {
                tagStr = '';
            }
            return nativeCreateContextualFragment.call(this, tagStr);
        };
    } catch (e) {}

    /* Monkey-patch storage sources. */
    cookie = document.cookie;
    cookieDesc = (function () {
        try {
            return getOwnPropertyDescriptor(document, 'cookie') ||
                getOwnPropertyDescriptor(getPrototypeOf(document), 'cookie') ||
                {
                    get: document.__lookupGetter__('cookie'),
                    set: document.__lookupSetter__('cookie')
                };
        } catch (e) {}
    })();
    defineProperties(document, {
        'cookie': {
            get: function() {
                try {
                    return cookieDesc.get.call(this);
                } catch (e) {
                    return cookie;
                }
            },
            set: function(val) {
                if (isSafeArg(val)) {
                    try {
                        return cookieDesc.set.call(this, val);
                    } catch (e) {
                        cookie += ';' + val;
                    }
                }
            }
        }
    });
    // Add cookie values to tainted strings
    cookiePairs = cookie.split(';');
    cookieIndex = cookiePairs.length;
    while (cookieIndex--) {
        cookiePair = cookiePairs[cookieIndex].split('=');
        valIndex = cookiePair.length;
        while (valIndex--) {
            taintedStrings.push(cookiePair[valIndex]);
        }
    }
    try {
        if (window.localStorage) {
            nativeLocalStorage = window.localStorage;
            delete window.localStorage;
            window.localStorage = guardStorage(nativeLocalStorage);
        }
        if (window.sessionStorage) {
            nativeSessionStorage = window.sessionStorage;
            delete window.sessionStorage;
            window.sessionStorage = guardStorage(nativeSessionStorage);
        }
    } catch (e) {}
})(window, Object, Array);

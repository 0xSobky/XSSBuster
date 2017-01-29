(function() {
    'use strict';
    var hash = location.hash.slice(1);

    var rawSanPayload = 'evilVar=1//svg/alert(1)';

    var sanPayload = encodeURIComponent('evilVar=1//svg/alert(1)');

    var testDiv = document.getElementById('test');

    /**
     * Register a new cross-browser event listener.
     *
     * @param evName {string}, the name of the event to register.
     * @param callback {function}, a callback function for the event listener.
     * @return void.
     */
    var addListener = (function() {
        return (window.addEventListener) ? window.addEventListener :
            // for IE8 and earlier versions support
            function (evName, callback) {
                this.attachEvent('on' + evName, callback);
            };
    })();

    /**
     * Create a script element.
     *
     * @return {object}, a script node.
     */
    var createScriptEl = function () {
        var scriptEl = document.createElement('script');
        scriptEl.text = hash;
        return scriptEl;
    };

    /**
     * Test any given sink function.
     *
     * @param fn {function}, a sink function.
     * @param name {string}, a sink function's name.
     * @return void.
     */
    var sinkTest = function(fn, name) {
        QUnit.test(name + ' test', function(assert) {
            fn(hash);
            fn('var goodVar = 1;');
            assert.ok(evilVar === 0, name + ' sanitized');
            assert.ok(evilVar === 0, name + ' functional');
        });
    };

    QUnit.test('window.name test', function(assert) {
        assert.equal(window.name, sanPayload, 'window.name sanitized');
    });

    QUnit.test('location.hash test', function(assert) {
        assert.equal(location.hash.slice(1), decodeURIComponent(sanPayload),
                     'location.hash sanitized');
    });

    QUnit.test('document.title test', function(assert) {
        assert.equal(document.title, sanPayload, 'document.title sanitized');
    });

    QUnit.test('location.search test', function(assert) {
        assert.equal(location.search.slice(5),
                     sanPayload, 'location.search sanitized');
    });

    QUnit.test('Function constructor test', function(assert) {
        var fn = new Function('');
        assert.ok(fn instanceof Function, 'fn is an instance of Function');
    });

    QUnit.test('document.cookie test', function(assert) {
        document.cookie = rawSanPayload;
        assert.notEqual(document.cookie, rawSanPayload, 'cookie sanitized');
    });

    QUnit.test('localStorage test', function(assert) {
        window.localStorage.setItem('test', rawSanPayload);
        assert.notEqual(localStorage.getItem('test'), rawSanPayload,
                        'localStorage sanitized');
    });

    QUnit.test('sessionStorage test', function(assert) {
        window.sessionStorage.setItem('test', rawSanPayload);
        assert.notEqual(sessionStorage.getItem('test'), rawSanPayload,
                        'sessionStorage sanitized');
    });

    QUnit.test('appendChild test', function(assert) {
        var scriptEl = createScriptEl();
        document.body.appendChild(scriptEl);
        assert.ok(evilVar === 0, 'appendChild sanitized');
    });

    QUnit.test('insertAdjacentElement test', function(assert) {
        var scriptEl = createScriptEl();
        testDiv.insertAdjacentElement('afterend', scriptEl);
        assert.ok(evilVar === 0, 'insertAdjacentElement sanitized');
    });
    
    QUnit.test('replaceChild test', function(assert) {
        var scriptEl = createScriptEl();
        document.body.replaceChild(scriptEl, testDiv);
        assert.ok(evilVar === 0, 'replaceChild sanitized');
    });

    QUnit.test('insertBefore test', function(assert) {
        var scriptEl = createScriptEl();
        document.body.insertBefore(scriptEl, document.body.childNodes[0]);
        assert.ok(evilVar === 0, 'insertBefore sanitized');
    });

    QUnit.test('embed element test', function(assert) {
        var embedEl = document.createElement('embed');
        embedEl.src = hash;
        embedEl.style.display = 'none';
        document.body.appendChild(embedEl);
        assert.ok(!embedEl.hasAttribute('src'), 'embed src sanitized');
    });

    QUnit.test('iframe element test', function(assert) {
        var iframeEl = document.createElement('iframe');
        iframeEl.src = hash;
        iframeEl.srcdoc = hash;
        iframeEl.style.display = 'none';
        document.body.appendChild(iframeEl);
        assert.ok(!iframeEl.hasAttribute('src'), 'iframe src sanitized');
        assert.ok(!iframeEl.hasAttribute('srcdoc'), 'iframe srcdoc sanitized');
    });

    QUnit.test('applet element test', function(assert) {
        var appletEl = document.createElement('applet');
        appletEl.code = hash;
        appletEl.codebase = hash;
        appletEl.archive = hash;
        appletEl.object = hash;
        appletEl.style.display = 'none';
        document.body.appendChild(appletEl);
        assert.ok(!appletEl.hasAttribute('code'), 'applet code sanitized');
        assert.ok(!appletEl.hasAttribute('codebase'),
                  'applet codebase sanitized');
        assert.ok(!appletEl.hasAttribute('archive'),
                  'applet archive sanitized');
        assert.ok(!appletEl.hasAttribute('object'), 'applet object sanitized');
    });

    QUnit.test('createContextualFragment test', function(assert) {
        var evilTagString = '<script>' + hash + '</script>';
        var goodTagString = '<script> var goodVar = 1; </script>';
        var createDocumentFragement = function (tagString) {
            var range = document.createRange();
            var documentFragment = range.createContextualFragment(tagString);
            document.body.appendChild(documentFragment);
        };
        createDocumentFragement(evilTagString);
        createDocumentFragement(goodTagString);
        assert.ok(evilVar === 0, 'createContextualFragment sanitized');
        assert.ok(goodVar === 1, 'createContextualFragment sanitized');
    });

    sinkTest(eval, 'eval');
    sinkTest(setTimeout, 'setTimeout');
    sinkTest(setInterval, 'setInterval');

    addListener.call(window, 'message', function(ev) {
        QUnit.test('window.onmessage test', function(assert) {
            var _origin = ev.origin || ev.originalEvent.origin;
            if (_origin !== window.location.origin) {
                assert.equal(ev.data, sanPayload, 'message sanitized');
            } else {
                assert.notEqual(ev.data, sanPayload, 
                                'message not sanitized (same origin)');
            }
        });
    });

    addListener.call(window, 'load', function() {
        var frames = document.getElementsByTagName('iframe');
        var fIndex = frames.length;
        while (fIndex--) {
            (function (currentFrame) {
                var frameTest = function () {
                    QUnit.test('iframe window.name test', function(assert) {
                            assert.equal(currentFrame.name,
                                         sanPayload, 'iframe window.name sanitized');
                    });
                    QUnit.test('iframe location.hash test', function(assert) {
                            assert.equal(currentFrame.location.hash.slice(1),
                                         sanPayload, 'iframe location.hash sanitized');
                    });
                    QUnit.test('iframe document.title test', function(assert) {
                            assert.equal(currentFrame.document.title,
                                         sanPayload, 'iframe document.title sanitized');
                    });
                    QUnit.test('iframe location.search test', function(assert) {
                            assert.equal(currentFrame.location.search.slice(5),
                                         sanPayload, 'iframe location.search sanitized');
                    });
                    nativeSetTimeout(function() {
                        QUnit.test('deferred frame window.name test', function(assert) {
                                assert.equal(currentFrame.name,
                                             sanPayload, 'iframe window.name sanitized (deferred)');
                        });
                        QUnit.test('deferred frame location.hash test', function(assert) {
                                assert.equal(currentFrame.location.hash.slice(1),
                                             sanPayload, 'iframe location.hash sanitized (deferred)');
                        });
                    }, 2000);
                };
                nativeSetTimeout(frameTest, 2000);
            }(frames[fIndex].contentWindow));
        }
    });
})();

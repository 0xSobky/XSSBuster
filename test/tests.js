(function() {
    var rawSanPayload = 'evilVar=1//svg/alert(1)';
    var sanPayload = encodeURIComponent('evilVar=1//svg/alert(1)');
    /*
     * Registers a new cross-browser event listener.
     *
     * @param {object}, a target object to bind the event listener to.
     * @param evName {string}, the name of the event to register.
     * @param callback {function}, a callback function for the event listener.
     * @return {function}.
     */
    var addListener = (function() {
        return (addEventListener) ? addEventListener :
            // for IE8 and earlier versions support
            function (evName, callback) {
                attachEvent.call(this, 'on' + evName, callback);
            };
    })();
    /*
     * Tests any given sink function.
     *
     * @param fn {function}, a sink function.
     * @param name {string}, a sink function's name.
     * @return void.
     */
    var sinkTest = function(fn, name) {
        fn(location.hash.slice(1));
        fn('var goodVar = 1;');
        QUnit.test(name + ' test', function(assert) {
            assert.ok(evilVar === 0, name + ' sanitized');
            assert.ok(goodVar === 1, name + ' functional');
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

    addListener.call(window, 'message', function(ev) {
        QUnit.test('window.onmessage test', function(assert) {
            var _origin = ev.origin || ev.originalEvent.origin;
            if (_origin !== window.location.origin) {
                assert.equal(ev.data, sanPayload, 'message sanitized');
            } else {
                assert.notEqual(ev.data, sanPayload, 'message not sanitized (same origin)');
            }
        });
    });

    QUnit.test('Function constructor test', function(assert) {
        var fn = new Function('');
        assert.ok(fn instanceof Function, 'fn instanceof Function');
    });

    QUnit.test('document.cookie test', function(assert) {
        document.cookie = rawSanPayload;
        assert.notEqual(document.cookie, rawSanPayload, 'cookie sanitized');
    });

    QUnit.test('localStorage test', function(assert) {
        localStorage.setItem('test', rawSanPayload);
        assert.notEqual(localStorage.getItem('test'), rawSanPayload,
                            'localStorage sanitized');
    });

    QUnit.test('sessionStorage test', function(assert) {
        sessionStorage.setItem('test', rawSanPayload);
        assert.notEqual(sessionStorage.getItem('test'), rawSanPayload,
                            'sessionStorage sanitized');
    });

    nativeSetTimeout(function() {
        /*
         * Initiates a new test for all child frames.
         *
         * @param testName {string}, an expressive per-test title.
         * @param testMessage {string}, a test-success message.
         * @param prop {string}, the property name to check.
         * @return void.
         */
        var framesTest = function(testName, testMessage, prop) {
            QUnit.test(testName, function(assert) {
                var frames = document.getElementsByTagName('iframe');
                var fIndex = frames.length;
                while (fIndex--) {
                    assert.equal(nativeEval('window.frames['+fIndex+'].'+prop),
                                     sanPayload, testMessage)
                }
            });
        };
        framesTest('frames window.name test', 'iframe window.name sanitized',
                       'name');
        framesTest('frames location.hash test', 'iframe location.hash sanitized',
                       'location.hash.slice(1)');
        framesTest('frames document.title test', 'iframe document.title sanitized',
                       'document.title');
        framesTest('frames location.search test',
                       'iframe location.search sanitized',
                           'location.search.slice(5)', sanPayload);
        nativeSetTimeout(function() {
            framesTest('deferred frames location.hash test',
                       'iframe location.hash sanitized', 'location.hash.slice(1)');
            framesTest('deferred frames window.name test',
                           'iframe window.name sanitized', 'name');
        }, 2000);
    }, 2000);

    sinkTest(eval, 'eval');
    sinkTest(setTimeout, 'setTimeout');
    sinkTest(setInterval, 'setInterval');
})();

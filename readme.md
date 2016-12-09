# XSSBuster
**XSSB** is a proactive DOM sanitizer, defending against client-side injection attacks.

# The Problem:
With every unaudited third-party JS library you include into your DOM, the risk of accidental DOM-based cross-site-scripting issues rises linearly. It being for advertisement, web analytics, social widgets, et al., all sorts of third-party code is susceptible to injection attacks.

Examples of this are:
* [http://www.troyhunt.com/2015/07/how-i-got-xssd-by-my-ad-network.html](http://www.troyhunt.com/2015/07/how-i-got-xssd-by-my-ad-network.html)
* [https://blogs.dropbox.com/tech/2015/09/csp-the-unexpected-eval/](https://blogs.dropbox.com/tech/2015/09/csp-the-unexpected-eval)
* [http://www.fuzzysecurity.com/tutorials/14.html](http://www.fuzzysecurity.com/tutorials/14.html)
* [http://blog.mindedsecurity.com/2011/04/god-save-omniture-quine.html](http://blog.mindedsecurity.com/2011/04/god-save-omniture-quine.html)
* [https://hackerone.com/reports/125386#activity-888336](https://hackerone.com/reports/125386#activity-888336)

# The Solution:
**XSSB** mainly utilizes [taint checking](https://en.wikipedia.org/wiki/Taint_checking) to guard against accidental mistakes and poor security practices commonly employed by JS libraries that may lead to DOM-based XSS vulnerabilities.

So, basically, **XSSB** offers you the freedom to deploy any given third-party code into your DOM while at the same time covering your DOM's back!

# Usage Instructions:
Simply place the script element of _XSSBuster.js_ right before any other third-party scripts you include into your webpage(s), typically at the very top of the head tag:
```html
<head>
    <title>Example</title>
    <script type="text/javascript" src="XSSBuster.js"></script>
    <script type="text/javascript" src="thirdParty-library.js"></script>
</head>
```
#### Notes:
* Make sure to host _XSSBuster.js_ on the same origin as the hosting webpage or use the _"X-XSS-Protection: 0"_ HTTP header to guard against the potential abuse of browsers' integrated XSS auditors.
* For the minified version, see [_XSSB-min.js_](/src/XSSB-min.js).

# Demo:
A live demo can be found at: [https://xssb.herokuapp.com](https://xssb.herokuapp.com).

# Performance:

Based on tests, **XSSB** only takes [10 milliseconds on average](/perf/perf.html) to do all required security checks besides the registration of a few necessary event listeners.

# Compatibility:
**XSSB** is compatible with the latest versions of all major web browsers (Firefox, Chrome, IE, Edge, Safari, and Opera) as well as most legacy web browsers through fallback functionality.

# Known Issues:
* **XSSB** only allows for [Basic Latin](https://en.wikipedia.org/wiki/Basic_Latin_(Unicode_block)) characters within the pathname, search query and hash of the hosting webpage's URL; that somewhat also applies to HTML5 messaging.... If your web application deals with a different set of characters, you may consider [base64](https://en.wikipedia.org/wiki/Base64) encoding as a workaround.
* **XSSB** overrides security-sensitive functions like `eval` in order to enforce taint checking. A side effect of this is that `eval` will behave more like jQuery's [`globalEval`](https://api.jquery.com/jquery.globaleval/) than the native implementation of `eval` in most web browsers.

# Credits:
* [@0xSobky](https://twitter.com/0xsobky)

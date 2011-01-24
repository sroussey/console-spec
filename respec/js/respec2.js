
// XXX TODO
//  - note that only the high-level plugins are run automatically, this means we might need a 
//    specific syntax for profiles? Or maybe simply make some default configs to be overridden
//  - better error handling
//  - support better templating with proxies for local access (also use proxy for CSS inlining)
//  - unit testing needs to be set up
//  - get a proper space at dev.w3.org/respec2
//  - commit!

//  - need to port everything in v1:
//      X extractConfig (might not be needed)
//      X makeTemplate
//          X rootAttr
//          X addCSS (might not be needed in the same way)
//          X makeHeaders
//          X makeAbstract
//          X makeSotD (require a custom paragraph if the document is on track)
//          X makeConformance
//      X dfn 
//      X inlines (references based on files, loaded async)
//      . webIDL
//      . examples
//      X informative
//      X fixHeaders
//      X makeTOC
//      X idHeaders
//      X unHTML5
//      X removeRespec
//      X interactivity, especially saving
//      . Shane's stuff
//  X switch to Template
//  - include ExceptionHub (as a module)
//  - cross-browser testing
//  - list reported v1 issues
//  - configuration to show progress/no progress
//  - move over v1 TODO
//  - all configuration is now entirely per plugin
//  - remove reliance on CSS generated content, modify the DOM and style the result directly instead
//  X port over simplate
//  - show processing progress using a nice little bubble of sorts that's removed when processing is complete
//    This means that we can't just undisplay the body to optimise the code, but we can still undisplay all
//    body > div.section
//  - make nicer looking error/warning messages
//  - have a lint plugin for validation: show errors on things that will break pubrules
//  X async the stylesheet
//  X only go through proxy when online
//  X load templates into a separate document

// SAVING
//  - FF extension (Jetpack?)
//  - chrome extension
//  - Widgeon widget

// DOCS
//  - go through docs, rewrite completely (one doc per plugin)
//  - tutorial
//  - document the code too

// DIFFERENCES FROM v1
//  - the respec style sheet gets injected automatically
//  - expected to work in IE
//  - more modular, extensible: essentially a plugin system that happens to modify documents
//  - unit tests
//  - different script includes
//  - different way of configuring it

// THINGS THAT HAVE CHANGED IN v1 NOT YET PORTED OVER

if (!window.console) {
    var fallback = window.opera ? window.opera.postError : function (str) {};
    window.console = { log: fallback, warn: fallback, error: fallback };
}

// @@ CONFIG
//      - respecBase
(function (GLOBAL) {
    GLOBAL.warn = function (str) {
        console.warn("W: " + str);
    };

    GLOBAL.error = function (str) {
        console.error("E: " + str);
    };

    GLOBAL.progress = function (str) {
        if (console) console.log("P: " + str);
    };

    GLOBAL.respec2 = function (plugins, config, afterEnd) {
        if (!config) config = {};
        // define baseUrl based on where I am
        var scripts = document.getElementsByTagName("script");
        var baseUrl = "";
        for (var i = 0, n = scripts.length; i < n; i++) {
            var src = scripts[i].src;
            if (!src) continue;
            if (/\/respec2\.js$/.test(src)) baseUrl = src.replace(/respec2\.js$/, "")
        }
        config.respecBase = baseUrl.replace(/js\/$/, "");

        // produce the proper require params
        var reqPrm = {
            baseUrl:    baseUrl,
            deps:       plugins,
            callback:   function cb () {
                var plugs = Array.prototype.slice.call(arguments);
                var pipeline;
                pipeline = function () {
                    if (!plugs.length) return;
                    var plug = plugs.shift();
                    if (plug.run) plug.run.call(plug, config, document, pipeline);
                    else pipeline();
                };
                pipeline();
                if (afterEnd) afterEnd.apply(GLOBAL, Array.prototype.slice.call(arguments));
            },
        };

        // load require.js
        var el = document.createElement("script");
        el.src = baseUrl + "require.js";
        el.className = "remove";
        el.onload = function () { require(reqPrm); };
        document.getElementsByTagName("head")[0].appendChild(el);
    };
})(this);

// XXX untested
// XXX
//  - still blows up on double quotes :)
require.def(
    "core/simplate",
    ["core/utils"],
    function (utils) {
        return {
            cache:  {},

            // get a string and return a function that is a template
            parseTemplate:          function (str) {
                // String.prototype.replaceAll = function (src, rep) { return this.split(src).join(rep); };
                // escape string
                var esc = function (str) {
                    return str.replace(/\\/g, "\\\\")
                              .replace(/"/g, "\\\"");
                };
                if (/\[%/.test(str)) {
                    str = str.replace(/^.*?\[%/, esc)
                             .replace(/%](?!.*%]).*?$/, esc)
                             .replace(/%].*?\[%/, esc);
                }
                else {
                    str = esc(str);
                }
                // compile to JS
                var code = "try {\n" +
                            "    var $__simplOut = [];\n"                    +
                            "    with (data) {\n"                           +
                            '        $__simplOut.push("'                     +
                            str
                                .replace( /[\r\t\n]/g,          " ")
                                .replace( /\[%/g,               "\t")
                                .replace( /((?:^|%])[^\t]*)/g,  "$1\r")
                                .replace( /\t=\s*(.*?)\s*%]/g,        "\",$1,\"")
                                .replace( /\t/g,                "\");\n")
                                .replace( /%]/g,                '        $__simplOut.push("')
                                .replace( /\r/g,                "")     +
                            "\");\n}\n"                                 +
                            "    return $__simplOut.join('');\n"    +
                            "}\ncatch (e) {\n    error('template failure: ' + e);\n}";
                // console.log(code);
                var func = new Function("data", code);
                if (!func) error("Failed to parse template");
                return func;
            },

            // get a string, parse the template, and cache it
            // the name is used as the cache key
            loadTemplate:           function (name, str) {
                if (this.cache[name]) return this.cache[name];
                this.cache[name] = this.parseTemplate(str);
                return this.cache[name];
            },
            
            // get an ID, parse the template, and cache it
            // the name is used as the cache key, defaults to the ID
            loadTemplateByID:       function (id, name) {
                var el = document.getElementById(id);
                if (!el) return null;
                if (!name) name = id;
                return this.loadTemplate(name, el.innerHTML);
            },

            // looks for all templates in the current document, and loads them
            loadAllTemplates:       function (doc) {
                if (!doc) doc = document;
                var scripts = $('script', doc);
                for (var i = 0; i < scripts.length; i++) {
                    var s = scripts[i];
                    if (s.getAttribute('type') != 'application/x-simplate' || ! s.getAttribute('id')) continue;
                    // XXX why not also handle src?
                    // eliminate comment/CDATA if it's used
                    var tpl = s.innerHTML;
                    // XXX urgh! do feature testing instead (or drop support for this UA)
                    if (/(NetFront|PlayStation)/i.test(navigator.userAgent)) {
                        tpl = tpl.replace(/&lt;/g, '<');
                        tpl = tpl.replace(/&gt;/g, '>');
                        tpl = tpl.replace(/&quot;/g, '"');
                        tpl = tpl.replace(/&apos;/g, "'");
                        tpl = tpl.replace(/&amp;/g, '&');
                    }
                    tpl = tpl.replace(/^\s*<!--/, '');
                    tpl = tpl.replace(/-->\s*$/, '');
                    tpl = tpl.replace(/^\s*<!\[CDATA\[/, '');
                    tpl = tpl.replace(/]]>\s*$/, '');
                    this.loadTemplate(s.getAttribute('id'), tpl);
                }
            },

            // loads simplates off the web
            loadRemote:     function (uri, doc, cb) {
                var self = this;
                utils.proxyLoad(uri, function (data) {
                    if (!data) error("Failed to load templates from " + uri);
                    var ifr = document.createElement("iframe");
                    ifr.style.display = "none";
                    ifr.className = "remove";
                    ifr.src = "about:blank";
                    $("body", doc).append(ifr);
                    var iDoc = ifr.contentWindow.document;
                    iDoc.documentElement.innerHTML = data;
                    self.loadAllTemplates(iDoc);
                    cb();
                });
            },

            // runs a template by name, with a given set of vars
            // if output is specified, it's the ID of an element to fill
            exec:   function (name, vars, output) {
                if (!this.cache[name]) return null;
                if (!vars) vars = {};
                var obj = this;
                vars.CALL = function (tpl, prm) {
                    if (!prm) prm = {};
                    prm.CTX = prm;
                    return obj.exec(tpl, prm);
                };
                // alert("code: " + this.cache[name]);
                var out = this.cache[name](vars);
                if (output) {
                    var el = $("#" + output)[0];
                    if (el) el.innerHTML = out;
                }
                return out;
            },
            
            ieDummy: 1
        };
    }
);

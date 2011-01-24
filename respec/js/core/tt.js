// XXX untested
require.def(
    "core/tt",
    ["core/utils"],
    function (utils) {
        return {
            tt:     new Template(),
            cache:  {},

            // looks for all templates in the current document, and loads them
            loadAllTemplates:       function (doc) {
                if (!doc) doc = document;
                var self = this;
                $('script', doc).each(function (i, s) {
                    var $s = $(s);
                    if ($s.attr('type') != 'application/x-tt' || ! $s.attr('id')) return;
                    // XXX we could also handle src
                    // eliminate comment/CDATA if it's used
                    var tpl = $s.html();
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
                    self.cache[$s.attr('id')] = tpl;
                });
            },

            // loads simplates off the web
            loadRemote:     function (uri, doc, cb) {
                var self = this;
                utils.proxyLoad(uri, function (data) {
                    if (!data) error("Failed to load templates from " + uri);
                    var $ifr = $("<iframe/>").css({display: "none"}).attr("src", "about:blank").appendTo($("body", doc));
                    // ifr.className = "remove";
                    var iDoc = $ifr[0].contentWindow.document;
                    iDoc.documentElement.innerHTML = data;
                    self.loadAllTemplates(iDoc);
                    $ifr.remove();
                    cb();
                });
            },

            // runs a template by name, with a given set of vars
            // if output is specified, it's the ID of an element to fill
            exec:   function (uri, vars, output) {
                progress("TT called with " + uri);
                if (!this.cache[uri]) return null;
                // alert("code: " + this.cache[uri]);
                var out;
                try {
                    progress("before process");
                    out = this.tt.process(this.cache[uri], vars);
                    progress("after process");
                }
                catch (e) {
                    warn("ERROR: " + e);
                    progress("CODE: " + this.tt.interpreterOutput);
                }
                if (output) $("#" + output).html(out);
                return out;
            },
            
            ieDummy: 1
        };
    }
);

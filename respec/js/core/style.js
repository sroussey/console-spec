// XXX untested
// @@ CONFIG
//      - noReSpecCSS
//      - extraCSS
require.def(
    "core/style",
    ["core/utils"],
    function (utils) {
        return {
            run:    function (conf, doc, cb) {
                progress("inserting ReSpec CSS");
                if (!conf.noReSpecCSS) conf.noReSpecCSS = false;
                if (!conf.extraCSS) conf.extraCSS = [];
                if (!conf.noReSpecCSS) conf.extraCSS.push(conf.respecBase + "css/respec2.css");
                var $placeHolder = $("<style/>").appendTo($("head", $(doc)));
                utils.proxyLoadMany(conf.extraCSS, function (styles) {
                    $.each(styles, function (i, it) {
                        // currently, we always inline
                        $placeHolder.before($("<style/>").attr("type", "text/css").text(it));
                    });
                    $placeHolder.remove();
                    progress("inserting ReSpec CSS: done");
                });
                cb();
            },
            ieDummy: 1
        };
    }
);

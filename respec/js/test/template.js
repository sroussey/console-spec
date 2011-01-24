
require.def(
    "test/template",
    ["core/simplate"],
    function (simplate) {
        return {
            run:    function (conf, doc, cb) {
                simplate.loadRemote(conf.respecBase + "js/templates/test.html", doc, function () {
                    simplate.exec("tmpl-simplest", {}, "test-out");
                    cb();
                });
            },
        };
    }
);

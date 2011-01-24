
require.def(
    "test/basic2",
    [],
    function () {
        return {
            dahut:  true,
            run:    function (config, doc, cb) {
                alert("running basic 2!");
                cb();
            },
        };
    }
);

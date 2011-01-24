
require.def(
    "test/basic",
    [],
    function () {
        return {
            dahut:  true,
            run:    function (config, doc, cb) {
                alert("running basic!");
                cb();
            },
        };
    }
);

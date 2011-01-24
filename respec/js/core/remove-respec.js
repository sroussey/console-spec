// XXX untested
require.def(
    "core/remove-respec",
    [],
    function () {
        return {
            run:    function (conf, doc, cb) {
                progress("removing ReSpec markup");
                $(".remove, script[data-requiremodule]", $(doc)).remove();
                cb();
            },
            ieDummy: 1
        };
    }
);

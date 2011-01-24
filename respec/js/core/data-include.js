require.def(
    "core/data-include",
    ["core/utils"],
    function (utils) {
        return {
            run:    function (conf, doc, cb) {
                progress("running data include");
                this.doc = doc;
                this.cb = cb;
                
                // Process each, in turn.
                // Invoke callback on last node.
                this.processNodes();
            },
            // Process the first found node. When no nodes found
            // invoke callback. This ensure that included data
            // may itself include data, and that no further processing
            // occurs until data inclusion is complete.
            processNodes:   function () {
    	        var root = $(this.doc.documentElement);
                var nodeList = root.find("[data-include]");
                if (nodeList.length == 0) {
                    progress("done with data includes");
                    this.cb();
                } else {
                    var node = nodeList.get(0);
                    var uri = node.getAttribute('data-include');
                    
                    // Remove data-include attribute so that it is not processed
                    // a second time.
                    node.removeAttribute('data-include');
                    progress("process data include: " + uri);
                    this.proxyLoad(uri, this.updateNode(uri, node));
                }
            },
            
            cb:   null,
            doc:  null,
            
            // Define internal proxyLoad to support QUnit mocking
            proxyLoad: function(src, cb) {
                utils.proxyLoad(src, cb);
            },
            
            // Update the node with the returned data and call
            // the next node in the list, or the callback when done.
            updateNode:    function (uri, node) {
                var self = this;
                return function (data) {
                    //alert("uri: " + uri + ", node: " + node + ", data: " + data)
                    if (data) {
                        var flist = node.getAttribute('data-oninclude');
                        node.removeAttribute('data-oninclude') ;
                        data = utils.runTransforms(data, flist);
                        $(node).html(data);
                    }
                    progress("data include (" + uri + "): done");
                    
                    // Find next node to process.
                    self.processNodes();
                };
            },
            ieDummy: 1
        };
    }
);

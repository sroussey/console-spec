// XXX untested
// @@@ CONF
//  - normativeReferences
//  - informativeReferences
//  - refNote
  
require.def(
    "w3c/bibref",
    ["core/utils"],
    function (utils) {
        return {
            run:    function (conf, doc, cb) {
                progress("inserting bibrefs");
                Array.prototype.unique =
                  function() {
                    var a = [];
                    var l = this.length;
                    for(var i=0; i<l; i++) {
                      for(var j=i+1; j<l; j++) {
                        // If this[i] is found later in the array
                        if (this[i] === this[j])
                          j = ++i;
                      }
                      a.push(this[i]);
                    }
                    return a;
                  };
                if (!conf.normativeReferences) conf.normativeReferences = [];
                if (!conf.informativeReferences) conf.informativeReferences = [];
                
                // use the refs detected during inlines (put in conf) to build the refs section
                var informs = conf.informativeReferences.slice().unique(), norms = conf.normativeReferences.slice().unique();
                if (!informs.length && !norms.length) {
                    cb();
                    return;
                }
                var keep = [];
                for (var i = 0; i < informs.length; i++) {
                    if (!$.inArray(informs[i], norms) > -1) keep.push(informs[i]);
                }
                informs = keep;
                
                var $refsec = $("<section id='references' class='appendix'/>").appendTo($("body"), doc)
                                                                              .append("<h2>References</h2>");
                if (conf.refNote) $refsec.html("<p/>").find("p").html(refNote);
                
                var types = ["Normative", "Informative"];
                for (var i = 0; i < types.length; i++) {
                    var type = types[i];
                    var refList = (type == "Normative") ? norms : informs;
                    if (refList.length == 0) continue;
                    var $sec = $("<section/>").appendTo($refsec)
                                              .attr("id", type.toLowerCase() + "-references")
                                              .append("<h3>")
                                              .find("h3")
                                                .text(type + " references")
                                              .end();
                    refList.sort();
                    var $dl = $("<dl class='bibliography'/>").appendTo($sec);
                    for (var j = 0, n = refList.length; j < n; j++) {
                        var ref = refList[j];
                        $("<dt/>").attr({id: "bib-" + ref}).appendTo($dl).text("[" + ref + "]");
                        var $dd = $("<dd><em>waiting for reference to load...</em></dd>").appendTo($dl);
                        utils.proxyLoad(conf.respecBase + "bibref/" + ref + ".html", this._makeCB(ref));
                    }
                }
                
                cb();
            },
            
            _makeCB:    function (id) {
                return function (data) {
                    $("#bib-" + id).next().html(data);
                };
            },
            ieDummy: 1
        };
    }
);

// XXX untested
require.def(
    "core/webidl",
    ["core/tt", "core/utils"],
    function (tt, utils) {
        return {
            run:    function (conf, doc, cb) {
                progress("processing WebIDL");

                // --- RUN THE TEMPLATES
                progress("loading TT for webIDL");
                tt.loadRemote(conf.respecBase + "js/templates/core-webidl.html", doc, function () {
                    var infNames = [];

                    $(".idl", doc).each(function (i, idl) {
                        var w = new WebIDLProcessor({
                            noIDLSorting:   conf.noIDLSorting,
                            noIDLIn:        conf.noIDLIn,
                            tt:             tt,
                            infNames:       infNames,
                            doc:            doc
                        });

                        var inf = w.definition($(idl));
                        var $pre = $("<pre class='idl'/>");

                        $pre.append(w.writeAsWebIDL(inf));
                        $(idl).replaceWith($pre);
                        
                        var sections = w.writeAsHTML(inf);
                        for (var i = sections.length - 1; i >= 0; i--) {
                            $pre.after(sections[i]);
                        }
                    });

                    doc.normalize();
                    $("a:not([href])", doc).each(function (i, ant) {
                        var $ant = $(ant);
                        if ($ant.hasClass("externalDFN")) return;
                        var name = $ant.text();
                        if ($.inArray(name, infNames) >= 0) {
                            $ant.attr("href", "#idl-def-" + name)
                                .addClass("idlType")
                                .html($("<code/>").text(name));
                        }
                    });

                    cb();
                });
            },
            ieDummy: 1
        };
    }
);

function WebIDLProcessor (cfg) {
    this.parent = { type: "module", name: "outermost", refId: "outermost", members: [] };
    if (!cfg) cfg = {};
    for (var k in cfg) this[k] = cfg[k];
};

WebIDLProcessor.prototype = {
    definition:    function ($idl) {
        var str = $idl.attr("title");
        var matched = /(typedef|implements)/.exec(str);
        str += matched ? ";" : "{};";
        progress("idl definition: " + str);
        try {
            var def = window.WebIDLParser.parse(str, "definition");
            if (!def.members) def.members = [];
            def.refId = this._id(def.name || def.target);
            def.parentId = this.parent.refId;
            if (def.refId == undefined) warn("definition has no refId");
            if ($.inArray(def.refId, this.infNames) >= 0) warn('duplicate definition of WebIDL ID: ' + def.refId);
            this.infNames.push(def.refId);
            this.parent.members.push(def); // this should be done at the caller level
            this.processMembers(def, $idl);
            
            // Extract a description, unless it's a <dl>
            if (!$idl.is("dl")) def.description = $idl.html();
            return def;
        } catch (e) {
            warn("ERROR: " + e);
            return {};
        }
    },
    
    processMembers:    function (obj, $el) {
        var exParent = this.parent;
        this.parent = obj;
        var wip = this;
        $el.children("dt").each(function (i, dt) {
            var $dd = $(dt).next("dd"); // we take a simple road
            var str = $(dt).text();
            progress("idl member of " + obj.type + ": " + str);
            var mem;
            switch (obj.type) {
            case "module":
                wip.moduleMember($(dt), $dd);
                return;
            case "interface":
                mem = wip.interfaceMember($(dt), $dd);
                break;
            case "exception":
                mem = wip.exceptionMember($(dt), $dd);
                break;
            default:
                error("Unexpected " + obj.type + ": " + str);
                break;
            }
            if (!mem.refId) mem.refId = wip._id(mem.name);
            if (!mem.refId) warn("member has no refId");
            if ($.inArray(mem.refId, this.infNames) >= 0) warn('duplicate definition of WebIDL ID: ' + mem.refId);
            mem.parentId = obj.refId;
            wip.infNames.push(mem.refId);
            if (!mem.description)  mem.description = $dd.html();
            wip.parent.members.push(mem);
        });
        this.parent = exParent;
    },
    
    moduleMember:    function ($dt, $dd) {
        var wip = this;
        $dd.children("[title]").each(function (i, el){
            wip.definition($(el));
        });
        this.parent.description = $dt.text();
    },
    
    exceptionMember:    function ($dt, $dd) {
        var str = $dt.text() + ";";
        var mem = window.WebIDLParser.parse(str, "exMember");
        if (!mem.members) mem.members = [];
        
        return mem;
    },
    
    interfaceMember:    function ($dt, $dd) {
        var str = $dt.text() + ";";
        var mem = window.WebIDLParser.parse(str, "ifMember");
        if (!mem.members) mem.members = [];

        var $extPrm = $dd.find("dl.parameters:first").remove();
        var $excepts = $dd.find(".exception").remove();
        var $sgrs = $dd.find(".getraises, .setraises").remove();

        switch (mem.type) {
        case "const":
            break;
        case "stringifier":
            break;
        case "attribute":
            if (!mem.setraises) mem.setraises = [];
            if (!mem.getraises) mem.getraises = [];
            if (!mem.raises) mem.raises = [];
            $sgrs.each(function (i, el) {
                var $el = $(el);
                var exc = {
                    name:     $el.attr("title")
                };
                
                // Descriptions go into mem.raises array
                if (el.localName.toLowerCase() == "dl") {
                    exc.type = "codelist";
                    exc.description = [];
                    $el.children("dt").each(function (i, dt) {
                        var $dd = $(dt).next("dd");
                        var c = { name: $(dt).text() };
                        c.description = $dd.html();
                        exc.description.push(c);
                    });
                }
                else if (el.localName.toLowerCase() == "div") {
                    exc.type = "simple";
                    exc.description = $el.html();
                }
                else {
                    error("Do not know what to do with exceptions being raised defined outside of a div or dl.");
                }
                $el.remove();
                exc.onSet = $el.hasClass("setraises");
                exc.onGet = $el.hasClass("getraises");
                if (exc.onSet) mem.setraises.push(exc);
                if (exc.onGet) mem.setraises.push(exc);
                mem.raises.push(exc);
            });
            break;
        case "operation":
            // Exceptions
            if (!mem.raises) mem.raises = [];
            $excepts.each(function (i, el) {
                var $el = $(el);
                var exc = { name: $el.attr("title") };
                if (el.localName.toLowerCase() == "dl") {
                    exc.type = "codelist";
                    exc.description = [];
                    $el.children("dt").each(function (i, dt) {
                        var $dd = $(dt).next("dd");
                        var c = { name: $(dt).text() };
                        c.description = $dd.html();
                        exc.description.push(c);
                    });
                }
                else if (el.localName.toLowerCase() == "div") {
                    exc.type = "simple";
                    exc.description = $el.html();
                }
                else {
                    error("Do not know what to do with exceptions being raised defined outside of a div or dl.");
                }
                $el.remove();
                mem.raises.push(exc);
            });
            
            // Parameters
            if (!mem.arguments) mem.arguments = [];
            for (var i = 0; i < mem.arguments.length; i++) {
                if (mem.arguments[i].description == null) mem.arguments[i].description = "";
            }

            $extPrm.children("dt").each(function (i, dt) {
                var $dt = $(dt);
                var $dd = $dt.next("dd"); // we take a simple road
                var prm = $dt.text();
                p = window.WebIDLParser.parse(prm, "Argument");
                p.description = $dd.html();
                mem.arguments.push(p);
            });
            $extPrm.remove();
            break;
        default:
            // NOTHING MATCHED
            error("Expected interface member, got: " + str);
            break;
        }
        return mem;
    },
    
    writeAsHTML: function (obj) {
        var results = [];   // Array of elements
        switch (obj.type) {
        case "exception":
        case "interface":
            var types = ["const", "operation", "attribute", "field"];
            
            // Display sections in a specific order, and potentially sort the contents
            for (var i = 0; i < types.length; i++) {
                var type = types[i];
                var things = obj.members.filter(function (it) { return it.type == type; });
                if (things.length == 0) continue;
                
                var secTitle;
                switch (type) {
                case 'attribute': secTitle = 'Attributes'; break;
                case 'operation': secTitle = 'Methods'; break;
                case 'const': secTitle = 'Constants'; break;
                case 'field': secTitle = 'Fields'; break;
                }
                var $dl = $("<dl/>");
                if (!this.noIDLSorting) {
                    things.sort(function (a, b) {
                        if (a.name < b.name) return -1;
                        if (a.name > b.name) return 1;
                        return 0;
                    });
                }
                
                for (var j = 0; j < things.length; j++) {
                    // Normalize types
                    var el = things[j];
                    if (el.idlType) el.htmlType = this.writeHtmlType(el.idlType);
                    
                    if (el.arguments) {
                        for (var a = 0; a < el.arguments.length; a++) {
                            var arg = el.arguments[a];
                            if (arg.type) arg.htmlType = this.writeHtmlType(arg.type);
                        }
                    }
                    var src = this.tt.exec("webidl-" + type, things[j]);
                    $dl.append($(src));
                }
                var $section = $("<section/>")
                    .append($("<h2/>").text(secTitle))
                    .append($dl);
                results.push($section);
            }
            break;

        case "implements":
            obj.htmlType = this.writeHtmlType(obj['implements']);
            var src = this.tt.exec("webidl-implements", obj);
            results.push($(src));
            break;

        case "module":
            var $df = $(this.doc.createDocumentFragment());
            
            if (obj.description) results.push($("<div>" + obj.description + "</div>"));

            for (idx = 0; idx < obj.members.length; idx++) {
                var it = obj.members[idx];
                var $sec = $("<section/>")
                    .append($("<h2/>").text(it.type + ' ' + (it.name || it.target)));
                var idlHtml = this.writeAsHTML(it);
                for (var i = 0; i < idlHtml.length; i++) {
                    $sec.append(idlHtml[i]);
                }
                results.push($sec);
            }
            break;

        case "typedef":
            obj.htmlType = this.writeHtmlType(obj.idlType);
            var src = this.tt.exec("webidl-typedef", obj);
            results.push($(src));
            break;

        default:
            warn("Unexpected type " + obj.type + ": " + obj.refId);
            break;
        }

        return results;
    },
    
    writeHtmlType:   function (idlType) {
        if (typeof(idlType) == "string") {
            return idlType;
        } else if (idlType.sequence) {
            return "sequence&lt;" + idlType.idlType.idlType + "&gt;";
        } else {
            return idlType.idlType;
        }
    },
    
    writeAsWebIDL: function (obj, indent) {
        if (!indent) indent = 0;
        
        switch (obj.type) {
        case "exception":
            var $span = $("<span class='idlInterface'/>").attr("id", 'idl-def-' + obj.refId)
                .append(this.writeExtAttrs(obj.extAttrs, indent))
                .append(this._idn(indent) + "exception ")
                .append($("<span class='idlExceptionID'/>").text(obj.name))
                .append(" {\n");

            // we process attributes and methods in place
            var maxAttr = 0, maxOp = 0, maxConst = 0;
            for (var idx = 0; idx < obj.members.length; idx++) {
                var it = obj.members[idx];
                var len = this.idlTypeLength(it.idlType);
                if (it.type == "field") maxAttr = (len > maxAttr) ? len : maxAttr;
                else if (it.type == "const") maxConst = (len > maxConst) ? len : maxConst;
                else error("Unknown exception member" + it.type + ": " + it.name + inspect(it));
            }
            var curLnk = "widl-" + obj.refId + "-";
            for (var i = 0; i < obj.members.length; i++) {
                var ch = obj.members[i];
                if (ch.type == "field") $span.append(this.writeField(ch, maxAttr + 1, indent + 1, curLnk));
                else if (ch.type == "const") $span.append(this.writeConst(ch, maxConst + 1, indent + 1, curLnk));
            }
            $span.append(this._idn(indent) + "};\n");
            return $span;

        case "implements":
            return $("<span class='idlImplements'/>")
                .attr("id", "idl-def-" + obj.refId)
                .append(this._idn(indent))
                .append($("<a/>").text(obj.target))
                .append(" implements ")
                .append($("<a class='idlType'/>").append($("<code/>").append(this.writeDatatype(obj['implements']))))
                .append(";\n");

        case "interface":
            var $span = $("<span class='idlInterface'/>").attr("id", 'idl-def-' + obj.refId)
                .append(this.writeExtAttrs(obj.extAttrs, indent))
                .append(this._idn(indent) + "interface ")
                .append($("<span class='idlInterfaceID'/>").text(obj.name));

            if (obj.inheritance && obj.inheritance.length) {
                var classes = 
                    obj.inheritance.map(function (it) {
                         return "<span class='idlSuperclass'><a>" + it + "</a></span>";
                     });
                $span.append(" : " + classes.join(", "));
            }
            $span.append(" {\n");

            // we process attributes and methods in place
            var maxAttr = 0, maxOp = 0, maxConst = 0, hasRO = false;
            for (var idx = 0; idx < obj.members.length; idx++) {
                var it = obj.members[idx];
                var len = this.idlTypeLength(it.idlType);
                if (it.type == "attribute") maxAttr = (len > maxAttr) ? len : maxAttr;
                else if (it.type == "operation") maxOp = (len > maxOp) ? len : maxOp;
                else if (it.type == "const") maxConst = (len > maxConst) ? len : maxConst;
                else error("Unknown interface member" + it.type + ": " + it.name + inspect(it));
                if (it.type == "attribute" && it.readonly) hasRO = true;
            }
            var curLnk = "widl-" + obj.refId + "-";
            for (var i = 0; i < obj.members.length; i++) {
                var ch = obj.members[i];
                if (ch.type == "attribute") $span.append(this.writeAttribute(ch, maxAttr + 1, indent + 1, curLnk, hasRO));
                else if (ch.type == "operation") $span.append(this.writeMethod(ch, maxOp + 1, indent + 1, curLnk));
                else if (ch.type == "const") $span.append(this.writeConst(ch, maxConst + 1, indent + 1, curLnk));
            }
            $span.append(this._idn(indent) + "};\n");
            return $span;

        case "module":
            var $span = $("<span class='idlModule'/>")
                .attr("id", "idl-def-" + obj.refId)
                .append(this.writeExtAttrs(obj.extAttrs, indent))
                .append(this._idn(indent) + "module ")
                .append($("<span class='idModuleId'/>").text(obj.name))
                .append(" {\n");
            for (var idx = 0; idx < obj.members.length; idx++) {
                var it = obj.members[idx];
                $span.append(this.writeAsWebIDL(it, indent + 1));
            }
            $span.append(this._idn(indent) + "};\n");
            return $span;

        case "typedef":
            return $("<span class='idlTypedef'/>")
                .attr("id", "idl-def-" + obj.refId)
                .append(this._idn(indent) + "typedef")
                .append(" ")
                .append($("<span class='idlTypedefType'/>").append(this.writeDatatype(obj.idlType)))
                .append(" ")
                .append($("<span class='idlTypedefID'/>").text(obj.name))
                .append(";\n");

        default:
            $("<p>").text("IDL for " + obj.type + ": " + obj.name).after(inspect(obj, 3));
        }  
    },

    writeField:    function (attr, max, indent, curLnk) {
        var $span = $("<span class='idlField'>");
        $span.append(this.writeExtAttrs(attr.extAttrs, indent))
            .append(this._idn(indent));

        var pad = max - this.idlTypeLength(attr.idlType);
        var padStr = "";
        for (var i = 0; i < pad; i++) padStr += " ";

        $span.append($("<span class='idlFieldType'/>").append(this.writeDatatype(attr.idlType)))
            .append(padStr)
            .append($("<span class='idlFieldName'/>")
                .append($("<a/>")
                    .attr("href", "#" + curLnk + attr.refId)
                    .text(attr.name)))
            .append(";\n");
        return $span;
    },

    writeAttribute:    function (attr, max, indent, curLnk, hasRO) {
        var pad = max - this.idlTypeLength(attr.idlType);
        var padStr = "";
        for (var i = 0; i < pad; i++) padStr += " ";
        var $idlAttrType = this.writeDatatype(attr.idlType);

        var $span = $("<span class='idlAttribute'>")
            .append(this.writeExtAttrs(attr.extAttrs, indent))
            .append(this._idn(indent));

        if (hasRO) {
            if (attr.readonly) $span.append("readonly ");
            else               $span.append("         ");
        }
        $span.append("attribute ")
            .append($("<span class='idlAttrType'/>").append($idlAttrType))
            .append(padStr)
            .append($("<span class='idlAttrName'/>")
                .append($("<a/>")
                    .attr("href", "#" + curLnk + attr.refId)
                    .text(attr.name)));

        if (attr.getraises.length) {
            raises = " getraises ("
                + attr.getraises.map(function (it) {
                    return "<span class='idlRaises'><a>" + it.name + "</a></span>";
                  }).join(", ")
                + ")";
            $span.append(raises);
        }
        
        if (attr.setraises.length) {
            raises = " setraises ("
                + attr.setraises.map(function (it) {
                    return "<span class='idlRaises'><a>" + it.name + "</a></span>";
                  }).join(", ")
                + ")";
            $span.append(raises);
        }
        
        $span.append(";\n");
        return $span;
    },
    
    writeMethod:    function (meth, max, indent, curLnk) {
        var pad = max - this.idlTypeLength(meth.idlType);
        var padStr = "";
        for (var i = 0; i < pad; i++) padStr += " ";

        var $span = $("<span class='idlMethod'>")
            .append(this.writeExtAttrs(meth.extAttrs, indent))
            .append(this._idn(indent))
            .append($("<span class='idlMethType'/>").append(this.writeDatatype(meth.idlType)))
            .append(padStr)
            .append($("<span class='idlMethName'/>")
                .append(
                    $("<a/>")
                        .attr("href", "#" + curLnk + meth.refId)
                        .text(meth.name)))
            .append(" (");
        var self = this;
        for (var i = 0; i < meth.arguments.length; i++) {
            var it = meth.arguments[i];
            var optional = it.optional ? "optional " : "";
            var variadic = it.variadic ? "..." : "";
            var inp = this.noIDLIn ? "" : " in ";
            var $prm = $("<span class='idlParam'>")
                .append(this.writeExtAttrs(it.extAttrs, null))
                .append(inp + optional);
            var $ptype = $("<span class='idlParamType'/>").append(this.writeDatatype(it.type));
            $prm.append($ptype)
                .append(variadic)
                .append(" ")
                .append($("<span class='idlParamName'/>").text(it.name));
            $span.append($prm);
            if (i < meth.arguments.length - 1) $span.append(", ");
        }
        $span.append(")");
        if (meth.raises.length) {
            raises = " raises ("
                + meth.raises.map(function (it) {
                    return "<span class='idlRaises'><a>" + it.name + "</a></span>";
                  }).join(", ")
                + ")";
            $span.append(raises);
        }
        
        $span.append(";\n");

        return $span;
    },
    
    writeConst:    function (cons, max, indent, curLnk) {
        var pad = max - this.idlTypeLength(cons.idlType);
        var padStr = "";
        for (var i = 0; i < pad; i++) padStr += " ";
        var $idlConstType = this.writeDatatype(cons.idlType);
        var $ctype = $("<span class='idlConstType'/>").append($idlConstType);
        var $cname = $("<span class='idlConstName'/>")
            .append($("<a/>").attr("href", "#" + curLnk + cons.refId).text(cons.name));
        var $span = $("<span class='idlConst'/>")
            .append(this._idn(indent))
            .append("const ")
            .append($ctype)
            .append(padStr)
            .append($cname)
            .append(" = ")
            .append($("<span class='idlConstValue'/>").text(cons.value))
            .append(";\n");
        return $span;
    },

    writeDatatype:    function (idlType) {
        if (idlType.sequence) {
            return $("<span/>").append("sequence&lt;")
                .append(this.writeDatatype(idlType.idlType))
                .append("&gt;");
        }
        else {
            var nullable = idlType.nullable ? "?" : "";
            var arr = idlType.array ? "[]" : "";
            var name = idlType.idlType || idlType;
            return $("<span/>")
                .append($("<a/>").text(name))
                .append("" + arr + nullable);
        }
    },
    
    idlTypeLength:     function (idlType) {
        if (idlType.sequence) {
            return this.idlTypeLength(idlType.idlType) + 10;
        } else if (idlType.idlType) {
            var len = idlType.idlType.length;
            if (idlType.nullable) len = len + 1;
            if (idlType.array) len = len + 2;
            return len;
        } else {
            return idlType.length;
        }
    },
    
    writeExtAttrs:      function(extAttrs, indent) {
        if (!extAttrs) return "";
        var attrs = this._idn(indent) + "[";
        attrs += extAttrs.map(function (a) {
            return "<span class='extAttr'>" + a.name + "</span>";
        }).join(", ");
        attrs += "]";
        if (indent != null) attrs += "\n";
        return attrs;
    },

    _idn:    function (lvl) {
        var str = "";
        for (var i = 0; i < lvl; i++) str += "    ";
        return str;
    },

    // An ID must be an xsd:ID
    _id:    function (id) {
        return id.replace(/[^a-zA-Z0-9_-]/g, "");
    }
};

function inspect(obj, maxLevels, level)
{
  var str = '', type, msg;

    // Start Input Validations
    // Don't touch, we start iterating at level zero
    if(level == null)  level = 0;

    // At least you want to show the first level
    if(maxLevels == null) maxLevels = 1;
    if(maxLevels < 1)     
        return '<font color="red">Error: Levels number must be > 0</font>';

    // We start with a non null object
    if(obj == null)
    return '<font color="red">Error: Object <b>NULL</b></font>';
    // End Input Validations

    // Each Iteration must be indented
    str += '<ul>';

    // Start iterations for all objects in obj
    for(property in obj)
    {
      try
      {
          // Show "property" and "type property"
          type =  typeof(obj[property]);
          str += '<li>(' + type + ') ' + property + 
                 ( (obj[property]==null)?(': <b>null</b>'):('"' + obj[property] +'"')) + '</li>';

          // We keep iterating if this property is an Object, non null
          // and we are inside the required number of levels
          if((type == 'object') && (obj[property] != null) && (level+1 < maxLevels))
          str += inspect(obj[property], maxLevels, level+1);
      }
      catch(err)
      {
        // Is there some properties in obj we can't access? Print it red.
        if(typeof(err) == 'string') msg = err;
        else if(err.message)        msg = err.message;
        else if(err.description)    msg = err.description;
        else                        msg = 'Unknown';

        str += '<li><font color="red">(Error) ' + property + ': ' + msg +'</font></li>';
      }
    }

      // Close indent
      str += '</ul>';

    return str;
}

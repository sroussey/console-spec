
require.def(
    "core/utils",
    [],
    function () {
        var proxyCache = {};
        window.addEventListener("message", function (ev) {
            var id = ev.data.substring(0, ev.data.indexOf(","));
            var data = ev.data.substring(ev.data.indexOf(",") + 1);
            if (data) proxyCache[id](data);
            else      proxyCache[id](null);
            $("#rs-ifr-" + id).remove();
        }, false);

        var utils = {
            // --- DATE MANIPULATION --------------------------------------------------------------------------
            humanMonths: ["January", "February", "March", "April", "May", "June", "July",
                               "August", "September", "October", "November", "December"],

            parseSimpleDate:    function (str) {
                return new Date(str.substr(0, 4), (str.substr(5, 2) - 1), str.substr(8, 2));
            },

            parseLastModified:    function (str) {
                return new Date(str.substr(6, 4), (str.substr(0, 2) - 1), str.substr(3, 2));
            },

            humanDate:  function (date) {
                return this.lead0(date.getDate()) + " " + this.humanMonths[date.getMonth()] + " " + date.getFullYear();
            },

            concatDate: function (date) {
                return "" + date.getFullYear() + this.lead0(date.getMonth() + 1) + this.lead0(date.getDate());
            },

            lead0:  function (str) {
                str = "" + str;
                return (str.length == 1) ? "0" + str : str;
            },

            // --- STYLE HELPERS ------------------------------------------------------------------------------
            // XXX untested
            // vendorise:  function (obj, k, v) {
            //     obj.k = v;
            //     $.each(["moz", "o", "webkit"], function (i, ven) {
            //         obj["-" + ven + "-" + k] = v;
            //     });
            // },
            
            linkCSS:  function (doc, styles) {
    	        if (styles.constructor != Array) styles = [styles];
                $.each(styles, function (i, css) { 
                    $('head', doc).append($("<link/>").attr({
                        rel: 'stylesheet', href: css, type: 'text/css', media: "all", charset: 'utf-8'
                    }));
                });
            },
            
            
            // --- XPATH -------------------------------------------------------------------------------------
            // XXX untested
            //  I'm not sure how portable this is, but it might be workable
            findNodes:    function (xpath, ctx, doc) {
                if (!ctx) ctx = doc;
                var ns = {};
                var snap = doc.evaluate(xpath,
                                        ctx,
                                        function (pfx) { return ns[pfx] || null; }, 
                                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
                                        null);
                var res = [];
                for (var i = 0; i < snap.snapshotLength; i++) res.push(snap.snapshotItem(i));
                return res;
            },
            
            
            // --- PROXY LOADING ------------------------------------------------------------------------------
            // XXX untested
            proxyCount: 0,
            proxyLoad:  function (src, cb) {
                if (document.location.href.indexOf("file:") == 0) {
                    var proxyID = "prox-" + this.proxyCount;
                    this.proxyCount++;
                    proxyCache[proxyID] = cb;
                    var $ifr = $("<iframe/>").attr({
                                                src:    src.replace(/[^\/]+$/, "local-proxy.html"),
                                                id:     "rs-ifr-" + proxyID
                                             })
                                             .css("display", "none");
                    $ifr.load(function () {
                        try {
                            $ifr[0].contentWindow.postMessage(proxyID + "," + src, "*");
                        }
                        catch (e) {
                            error("Could not load through proxy: " + e);
                        }
                    });
                    $ifr.appendTo($("body", document));
                }
                else {
                    $.get(src, cb);
                }
            },
            // XXX untested
            proxyLoadMany:  function (srcs, cb) {
                if (srcs.length == 0) cb([]);
                var loaded = 0;
                var things = [];
                var self = this;
                $.each(srcs, function (i, it) {
                    self.proxyLoad(it, function (data) {
                        loaded++;
                        things.push(data);
                        if (loaded == srcs.length) cb(things);
                    });
                });
            },

            // --- RESPEC UI ------------------------------------------------------------------------------
            // XXX untested
            $saveMenu:  null,
            showSaveOptions:    function () {
                var self = this;
                this.$saveMenu = $("<div/>")
                    .css({
                          position: "fixed", width: "400px", top: "10px", padding: "1em", 
                          border: "5px solid #90b8de", background: "#fff"
                          })
                    .appendTo($("body"))
                    .append("<h4>ReSpec Actions Console</h4>")
                    .end();
                
                for (var i = 0; i < this.saveActions.length; i++) {
                    this.$saveMenu.append(this.saveActions[i]);
                }
            },

            // XXX untested
            // Register an action within save menu
            saveActions: [],
            registerSaveAction:     function(label, cb) {
                var self = this;
                this.saveActions.push($("<button>" + label + "</button>")
                .click(function () {self.hideSaveOptions; cb()}));
            },
            
            // XXX untested
            hideSaveOptions:    function () {
                if (!this.$saveMenu) return;
                this.$saveMenu.remove();
            },
            
            // --- HTML SERIALISATION ------------------------------------------------------------------------------
            // XXX untested
            toHTMLSource:    function () {
                var doc = window.open().document;
                doc.write("<pre>" + this.esc(this.stringifyHTML()) + "</pre>");
                doc.close();
                // for some reason no variant on this seems to work, too tired to investigate
                // $("body", doc).append("<pre/>")
                //               .find("pre")
                //                 .text(this.stringifyHTML());
                // doc.close();
            },
            
            // XXX untested
            stringifyHTML:  function () {
                var str = "<!DOCTYPE html";
                var dt = document.doctype;
                if (dt && dt.publicId) {
                    str += " PUBLIC '" + dt.publicId + "' '" + dt.systemId + "'";
                }
                else { // when HTML5 is allowed we can remove this
                    str += " PUBLIC '-//W3C//DTD HTML 4.01 Transitional//EN' 'http://www.w3.org/TR/html4/loose.dtd'";
                }
                str += ">\n";
                str += "<html";
                var ats = document.documentElement.attributes;
                for (var i = 0; i < ats.length; i++) {
                    var an = ats[i].name;
                    //if (an == "xmlns" || an == "xml:lang") continue;
                    str += " " + an + "=\"" + this.esc(ats[i].value) + "\"";
                }
                str += ">\n";
                str += document.documentElement.innerHTML;
                str += "</html>";
                return str;
            },
            
            // --- BASIC STRING ------------------------------------------------------------------------------
            esc:    function (s) {
                return s.replace(/&/g,'&amp;')
                        .replace(/>/g,'&gt;')
                        .replace(/"/g,'&quot;')
                        .replace(/</g,'&lt;');
            },
            
            norm: function (str) {
                str = str.replace(/^\s+/, "").replace(/\s+$/, "");
                return str.split(/\s+/).join(" ");
            },
            
            // Run list of transforms over content and return result.
            runTransforms: function (content, flist) {
                if (flist) {
                    var methods = flist.split(/\s+/) ;
                    for (var j = 0; j < methods.length; j++) {
                        var call = 'content = ' + methods[j] + '(this,content)' ;
                        try {
                            eval(call) ;
                        } catch (e) {
                            warning('call to ' + call + ' failed with ' + e) ;
                        }
                    }
                }
                return content;
            },
            ieDummy: 1
        };
        
        // XXX untested
        $.fn.renameElement = function (name) {
            return this.each(function () {
                var $newEl = $(this.ownerDocument.createElement(name));
                // $newEl.attr($(this).attr());
                for (var i = 0, n = this.attributes.length; i < n; i++) {
                    var at = this.attributes[i];
                    $newEl[0].setAttributeNS(at.namespaceURI, at.name, at.value);
                }
                $(this).contents().clone().appendTo($newEl);
                $(this).replaceWith($newEl);
            });
        };

        // XXX untested
        $.fn.makeID = function (pfx, txt) {
            // doesn't work like a real jq plugin
            var $el = $(this);
            if ($el.attr("id")) return $el.attr("id");
            var id = "";
            if (!txt) {
                if ($el.attr("title")) txt = $el.attr("title");
                else                   txt = $el.text();
            }
            
            txt = txt.replace(/^\s+/, "").replace(/\s+$/, "");
            id += txt;
            id = id.toLowerCase();
            id = id.split(/[^-.0-9a-z_]/).join("-").replace(/^-+/, "").replace(/-+$/, "");
            if (id.length > 0 && /^[^a-z]/.test(id)) id = "x" + id;
            if (id.length == 0) id = "generatedID";
            if (pfx) id = pfx + "-" + id;
            var inc = 1;
            var doc = $el[0].ownerDocument;
            if (doc.getElementById(id)) {
                while (doc.getElementById(id + "-" + inc)) inc++;
                id = id + "-" + inc;
            }
            $el.attr("id", id);
            return id;
        };
        
        // XXX untested
        $.fn.dfnTitle = function () {
            // doesn't work like a real jq plugin
            var $dfn = $(this);
            var title;
            if ($dfn.attr("title")) title = $dfn.attr("title");
            else if ($dfn.contents().length == 1 && $dfn.children("abbr, acronym").length == 1 &&
                     $dfn.find(":first-child").attr("title")) title = $dfn.find(":first-child").attr("title");
            else title = $dfn.text();
            title = utils.norm(title);
            return title;
        };
        
        // XXX untested
        // Either append v in a space-separated-list style to attribute a, or create a new attribute
        $.fn.attrAppend = function (a, v) {
            var val = $(this).attr(a);
            val = val ? (val + ' ' + v) : v;
            $(this).attr(a, val);
            return this
        };
        
        // Register default save option
        utils.registerSaveAction("Save as HTML Source", function () {
            utils.hideSaveOptions(); utils.toHTMLSource();
        });

        shortcut.add("Ctrl+Shift+Alt+S", function () { utils.showSaveOptions(); });
        shortcut.add("Esc", function () { utils.hideSaveOptions(); });
        
        return utils;
    }
);


/**
 * http://www.openjs.com/scripts/events/keyboard_shortcuts/
 * Version : 2.01.B
 * By Binny V A
 * License : BSD
 */
shortcut = {
	'all_shortcuts':{},//All the shortcuts are stored in this array
	'add': function(shortcut_combination,callback,opt) {
		//Provide a set of default options
		var default_options = {
			'type':'keydown',
			'propagate':false,
			'disable_in_input':false,
			'target':document,
			'keycode':false
		}
		if(!opt) opt = default_options;
		else {
			for(var dfo in default_options) {
				if(typeof opt[dfo] == 'undefined') opt[dfo] = default_options[dfo];
			}
		}

		var ele = opt.target;
		if(typeof opt.target == 'string') ele = document.getElementById(opt.target);
		var ths = this;
		shortcut_combination = shortcut_combination.toLowerCase();

		//The function to be called at keypress
		var func = function(e) {
			e = e || window.event;
			
			if(opt['disable_in_input']) { //Don't enable shortcut keys in Input, Textarea fields
				var element;
				if(e.target) element=e.target;
				else if(e.srcElement) element=e.srcElement;
				if(element.nodeType==3) element=element.parentNode;

				if(element.tagName == 'INPUT' || element.tagName == 'TEXTAREA') return;
			}
	
			//Find Which key is pressed
			if (e.keyCode) code = e.keyCode;
			else if (e.which) code = e.which;
			var character = String.fromCharCode(code).toLowerCase();
			
			if(code == 188) character=","; //If the user presses , when the type is onkeydown
			if(code == 190) character="."; //If the user presses , when the type is onkeydown

			var keys = shortcut_combination.split("+");
			//Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
			var kp = 0;
			
			//Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
			var shift_nums = {
				"`":"~",
				"1":"!",
				"2":"@",
				"3":"#",
				"4":"$",
				"5":"%",
				"6":"^",
				"7":"&",
				"8":"*",
				"9":"(",
				"0":")",
				"-":"_",
				"=":"+",
				";":":",
				"'":"\"",
				",":"<",
				".":">",
				"/":"?",
				"\\":"|"
			}
			//Special Keys - and their codes
			var special_keys = {
				'esc':27,
				'escape':27,
				'tab':9,
				'space':32,
				'return':13,
				'enter':13,
				'backspace':8,
	
				'scrolllock':145,
				'scroll_lock':145,
				'scroll':145,
				'capslock':20,
				'caps_lock':20,
				'caps':20,
				'numlock':144,
				'num_lock':144,
				'num':144,
				
				'pause':19,
				'break':19,
				
				'insert':45,
				'home':36,
				'delete':46,
				'end':35,
				
				'pageup':33,
				'page_up':33,
				'pu':33,
	
				'pagedown':34,
				'page_down':34,
				'pd':34,
	
				'left':37,
				'up':38,
				'right':39,
				'down':40,
	
				'f1':112,
				'f2':113,
				'f3':114,
				'f4':115,
				'f5':116,
				'f6':117,
				'f7':118,
				'f8':119,
				'f9':120,
				'f10':121,
				'f11':122,
				'f12':123
			}
	
			var modifiers = { 
				shift: { wanted:false, pressed:false},
				ctrl : { wanted:false, pressed:false},
				alt  : { wanted:false, pressed:false},
				meta : { wanted:false, pressed:false}	//Meta is Mac specific
			};
                        
			if(e.ctrlKey)	modifiers.ctrl.pressed = true;
			if(e.shiftKey)	modifiers.shift.pressed = true;
			if(e.altKey)	modifiers.alt.pressed = true;
			if(e.metaKey)   modifiers.meta.pressed = true;
                        
			for(var i=0; k=keys[i],i<keys.length; i++) {
				//Modifiers
				if(k == 'ctrl' || k == 'control') {
					kp++;
					modifiers.ctrl.wanted = true;

				} else if(k == 'shift') {
					kp++;
					modifiers.shift.wanted = true;

				} else if(k == 'alt') {
					kp++;
					modifiers.alt.wanted = true;
				} else if(k == 'meta') {
					kp++;
					modifiers.meta.wanted = true;
				} else if(k.length > 1) { //If it is a special key
					if(special_keys[k] == code) kp++;
					
				} else if(opt['keycode']) {
					if(opt['keycode'] == code) kp++;

				} else { //The special keys did not match
					if(character == k) kp++;
					else {
						if(shift_nums[character] && e.shiftKey) { //Stupid Shift key bug created by using lowercase
							character = shift_nums[character]; 
							if(character == k) kp++;
						}
					}
				}
			}
			
			if(kp == keys.length && 
						modifiers.ctrl.pressed == modifiers.ctrl.wanted &&
						modifiers.shift.pressed == modifiers.shift.wanted &&
						modifiers.alt.pressed == modifiers.alt.wanted &&
						modifiers.meta.pressed == modifiers.meta.wanted) {
				callback(e);
	
				if(!opt['propagate']) { //Stop the event
					//e.cancelBubble is supported by IE - this will kill the bubbling process.
					e.cancelBubble = true;
					e.returnValue = false;
	
					//e.stopPropagation works in Firefox.
					if (e.stopPropagation) {
						e.stopPropagation();
						e.preventDefault();
					}
					return false;
				}
			}
		}
		this.all_shortcuts[shortcut_combination] = {
			'callback':func, 
			'target':ele, 
			'event': opt['type']
		};
		//Attach the function with the event
		if(ele.addEventListener) ele.addEventListener(opt['type'], func, false);
		else if(ele.attachEvent) ele.attachEvent('on'+opt['type'], func);
		else ele['on'+opt['type']] = func;
	},

	//Remove the shortcut - just specify the shortcut and I will remove the binding
	'remove':function(shortcut_combination) {
		shortcut_combination = shortcut_combination.toLowerCase();
		var binding = this.all_shortcuts[shortcut_combination];
		delete(this.all_shortcuts[shortcut_combination])
		if(!binding) return;
		var type = binding['event'];
		var ele = binding['target'];
		var callback = binding['callback'];

		if(ele.detachEvent) ele.detachEvent('on'+type, callback);
		else if(ele.removeEventListener) ele.removeEventListener(type, callback, false);
		else ele['on'+type] = false;
	}
}

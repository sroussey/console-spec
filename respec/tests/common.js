
$(function () {
    // get the globals despite having an exports object
    $.extend(window, exports.QUnit);
    
    // make an h1 to match the title
    $('body').prepend("<div id='header'><h1></h1></div>")
             .find("h1")
                .text(document.title);

    // add CSS dependencies
    $.each(["qunit.css", "tests.css"], function (i, css) {
        $('head').append($("<link/>").attr({
            rel: 'stylesheet', href: css, type: 'text/css', media: 'all', charset: 'utf-8'
        }));
    });

    // nav
    // XXX for now all goes in generic, but we're ready for the change when we need it
    var navConf = [
        ["Core", [
            ["Utils", "core-utils.html"],
            ["Default Root Attr", "core-default-root-attr.html"],
            ["Data Transform", "core-data-transform.html"],
            ["Data Include", "core-data-include.html"],
            ["Figure", "core-figure.html"],
            ["Structure", "core-structure.html"],
            ["WebIDL", "core-webidl.html"],
            // ["Basics", "basics.html"],
            // ["Simplate", "simplate.html"],
            // ["Root Attributes", "root-attr.html"],
            // ["Styling", "styling.html"],
            // ["Structure", "structure.html"],
        ]],
        ["W3C", [
            ["Style", "w3c-style.html"],
        ]]
    ];
    var nav = $("#container").prepend("<div id='nav'/>").children(":first");
    $.each(navConf, function (i, subnav) {
        var id = subnav[0].toLowerCase();
        var ul = nav.append("<h3/>").children(":last").text(subnav[0]).end()
                    .append("<ul/>").children(":last").attr("id", "nav-" + id);
        $.each(subnav[1], function (j, item) {
            ul.append("<li><a></a></li>").find("li:last a").attr("href", item[1]).text(item[0]);
        });
    })

    // XXX this doesn't run at the right time for QUnit, for whatever reason — it defines
    //     the functions, but it doesn't work
    // $.loadScripts(["qunit.js"], function () {
    //     if (window["runTests"]) runTests();
    //     else                    alert("No runTests() to run.");
    // });
        
});

function makeDoc (head, body) {
    // XXX this is probably wrong in more ways than one, and unlikely to be portable
    var xns = "http://www.w3.org/1999/xhtml";
    var doc = document.implementation.createDocument(xns, "html", null);
    var h = doc.createElementNS(xns, "head");
    doc.documentElement.appendChild(h);
    h.innerHTML = head;
    var b = doc.createElementNS(xns, "body");
    doc.documentElement.appendChild(b);
    b.innerHTML = body;
    return doc;
}


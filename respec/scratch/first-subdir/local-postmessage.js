
if (!window["console"]) {
    console = { log: function () {} };
}

function update (target, msg) {
    document.getElementById(target).textContent = msg;
}

function testWithXHR (src) {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", src, false);
        xhr.send(null);
        if (xhr.status == 200)  update("xhr", "Success!");
        else                    update("xhr", "Error: " + xhr.status + ", " + xhr.statusText);
    }
    catch (e) {
        update("xhr", "Error: " + e);
    }
}

function testWithIframe (src) {
        var ifr = document.createElement("iframe");
        ifr.src = src;
        ifr.style.display = "none";
        ifr.onload = function () {
            try {
                console.log(ifr.contentWindow.document);
                if (ifr.contentWindow.document.documentElement.textContent) update("ifr", "Success!");
                else                            update("ifr", "Error: no document");
            }
            catch (e) {
                update("ifr", "Error: " + e);
            }
        };
        document.body.appendChild(ifr);
}

function testWithPM (src) {
    var ifr = document.createElement("iframe");
    ifr.src = src.replace(/[^\/]+$/, "local-proxy.html");
    ifr.style.display = "none";
    ifr.onload = function () {
        try {
            ifr.contentWindow.postMessage(src, "*");
        }
        catch (e) {
            update("pm", "Error: " + e);
        }
    };
    document.body.appendChild(ifr);
}

function receiveContent (ev) {
    if (ev.data) update("pm", "Success!");
    else         update("pm", "Error: no data");
    document.getElementById("log").textContent = ev.data;
}
window.addEventListener("message", receiveContent, false);

// var src = "../local-subdir/test.css";
var src = "../local-subdir/test.html";
testWithXHR(src);
testWithIframe(src);
testWithPM(src);



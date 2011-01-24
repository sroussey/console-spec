
window.addEventListener("message", function dataRequested (ev) {
    var src = ev.data.replace(/^.*\//, "");
    var back = ev.source;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", src, true);
    xhr.onreadystatechange = function () {
        if (xhr.responseText)   back.postMessage(xhr.responseText, "*");
        else                    back.postMessage("", "*");
    };
    xhr.send(null);
}, false);



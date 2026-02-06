(function () {
    const params = new URLSearchParams(location.search);
    const hasP = params.has("p");

    const self = document.currentScript;
    if (self) self.remove();

    function loadScript(src) {
        const s = document.createElement("script");
        s.src = src;
        s.defer = true;
        document.head.appendChild(s);
    }

    function loadStyle(href) {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = href;
        document.head.appendChild(l);
    }

    if (hasP) {
        document.getElementById("generator")?.remove();
        loadScript("puzzle.js");
        loadStyle("puzzle-style.css");
    } else {
        loadScript("generator.js");
        loadStyle("generator-style.css");
    }
})();
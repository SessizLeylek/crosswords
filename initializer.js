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

    if (hasP) {
        document.getElementById("generator")?.remove();
        loadScript("puzzle.js");
    } else {
        loadScript("generator.js");
    }
})();
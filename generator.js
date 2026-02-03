const ta = document.getElementById('clue-pairs');

async function insertPreset() {
    const presetSelect = document.getElementById('preset-select');
    const response = await fetch(`presets/${presetSelect.value}.ini`);
    const text = await response.text();
    ta.value += (ta.value ? "\n" : "") + text;
    updateText();
}

function clearList() {
    ta.value = "";
    updateText();
}

async function shareLink(link)
{
    await navigator.share({
        title: document.title,
        text: "Check this out",
        url: link
    });
}

function showPuzzleLink(puzzleCode)
{
    const puzzleLinkElem = document.getElementById("puzzle-link");
    const url = `https://sessizleylek.github.io/crosswords?p=${encodeURIComponent(puzzleCode)}`;
    puzzleLinkElem.innerHTML = `Your crossword puzzle is ready!<br><a href="${url}" target="_blank">Click here to view it</a>`;

    if (navigator.share) {
        puzzleLinkElem.innerHTML += ` or <a href="#" onclick="shareLink('${url}')">share it with your friends!</a>`;
    }

}

function generateCrossword()
{
    showPuzzleLink("EXAMPLECODE123");
}

// TEXT HIGHLIGHTING LOGIC
const hl = document.getElementById("hl");

function syncBounds() {
    const r = ta.getBoundingClientRect();
    const cs = getComputedStyle(ta);

    const sizeOffset = -4;

    hl.style.top = r.top + window.scrollY + "px";
    hl.style.left = r.left + window.scrollX + "px";
    hl.style.width = (r.width + sizeOffset) + "px";
    hl.style.height = (r.height + sizeOffset) + "px";

    hl.scrollTop  = ta.scrollTop;
    hl.scrollLeft = ta.scrollLeft;

    hl.style.padding = cs.padding;
    hl.style.borderRadius = cs.borderRadius;
    hl.style.boxSizing = cs.boxSizing;

    hl.style.font = cs.font;
    hl.style.lineHeight = cs.lineHeight;
}

function updateText() {
    const lines = ta.value.split("\n");

    hl.innerHTML = lines.map(line => {
        const idx = line.indexOf("=");

        if (idx === -1) {
            return `<span class="mark">${escapeHtml(line)}</span>`;
        }

        return (
            `<span class="mark">${escapeHtml(line.slice(0, idx))}</span>` +
            escapeHtml(line.slice(idx))
        );
    }).join("\n");
}


function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

ta.addEventListener("input", () => {
    updateText(); 
    syncBounds();
});
ta.addEventListener("scroll", syncBounds);
window.addEventListener("resize", syncBounds);
window.addEventListener("scroll", syncBounds);
new ResizeObserver(syncBounds).observe(ta);

syncBounds();
updateText();
// END OF TEXT HIGHLIGHTING LOGIC
//alert("Not implemented yet.");

const params = new URLSearchParams(location.search);
const hasP = params.has("p");
const puzzleCode = hasP ? params.get("p") : null;

if (puzzleCode) {
    const c = parsePuzzleCode(puzzleCode);
    const g = generateGrid(c);
    buildPuzzle(g.width, g.height, g.grid);
} else {
    alert("No puzzle code provided.");
}

function decodeBase64Url(base64url) {
    // base64url -> base64
    let base64 = base64url
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    // restore padding
    while (base64.length % 4 !== 0) {
        base64 += '=';
    }

    // base64 -> binary string
    const binary = atob(base64);

    // binary -> Uint8Array
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer; // ArrayBuffer
}

function parsePuzzleCode(code) {
    const buffer = decodeBase64Url(code);
    const view = new DataView(buffer);

    const placements = [];

    let offset = 0;
    const wordCount = view.getUint8(offset++);

    for (let i = 0; i < wordCount; i++) {
        const x = view.getUint8(offset++);
        const y = view.getUint8(offset++);
        const dir = view.getUint8(offset++);

        placements.push({ x: x, y: y, direction: dir, word: null, clue: null });
    }

    const decoder = new TextDecoder("utf-8");

    function readNextString() {
        const start = offset;
        while (offset < view.byteLength && view.getUint8(offset) !== 0) offset++;

        const str = decoder.decode(new Uint8Array(buffer.slice(start, offset)));
        offset++; // skip null
        return str;
    }

    for (const placement of placements) {
        placement.word = readNextString();
    }

    for (const placement of placements) {
        placement.clue = readNextString();
    }

    console.log("Parsed placements:", placements);

    return placements;
}

function generateGrid(placements) {
    // Determine grid size
    let maxX = 0;
    let maxY = 0;
    for (const p of placements) {
        if (p.direction === 0) { // across
            maxX = Math.max(maxX, p.x + p.word.length);
            maxY = Math.max(maxY, p.y + 1);
        }
        else { // down
            maxX = Math.max(maxX, p.x + 1);
            maxY = Math.max(maxY, p.y + p.word.length);
        }
    }

    // Initialize grid
    const grid = [];
    for (let y = 0; y < maxY; y++) {
        for (let x = 0; x < maxX; x++) {
            grid.push(0); // empty cell
        }
    }

    // Place words in grid
    for (const p of placements) {
        for (let i = 0; i < p.word.length; i++) {
            const x = p.x + (p.direction === 0 ? i : 0);
            const y = p.y + (p.direction === 1 ? i : 0);
            const index = y * maxX + x;
            grid[index] = p.word.charCodeAt(i);
        }
    }

    return { width: maxX, height: maxY, grid: grid };
}

function buildPuzzle(width, height, layout) {
    const container = document.createElement("div");
    container.id = "crossword";
    document.body.appendChild(container);

    if (layout.length !== width * height)
        throw new Error("layout size mismatch");

    container.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${height}, 1fr)`;
    container.innerHTML = "";

    for (let i = 0; i < layout.length; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";

        if (layout[i] === 0) {
            cell.classList.add("void");
        } else {
            cell.dataset.index = i;
            cell.textContent = ""; // letter goes here
        }

        container.appendChild(cell);
    }
}


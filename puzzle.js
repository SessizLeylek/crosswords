//alert("Not implemented yet.");

const params = new URLSearchParams(location.search);
const hasP = params.has("p");
const puzzleCode = hasP ? params.get("p") : null;

if (!puzzleCode) {
    alert("No puzzle code provided in URL.");
}

const gridScale = { x: 0, y: 0 };
const placements = [];      // { x, y, direction, word, clue }
const referenceGrid = [];   // { accross, down } references to placements, 0..n-1 placement index
const solutionGrid = [];    // the grid rendered to the user, 0 empty, char codes for letters
const cellMap = [];         // map of cell elements for easy access

parsePuzzleCode(puzzleCode); 
const g = generateGrids(placements);
buildPuzzle();

const clueTextDiv = document.getElementById("clue-text");

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
}

function generateGrids(placements) {
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
    for (let y = 0; y < maxY; y++) {
        const rowRef = [];
        const rowSol = [];
        for (let x = 0; x < maxX; x++) {
            rowRef.push({ accross: -1, down: -1 }); // no reference
            rowSol.push(0); // empty cell
        }
        referenceGrid.push(rowRef);
        solutionGrid.push(rowSol);
    }

    // Place words in grid
    for (let i = 0; i < placements.length; i++) {
        const p = placements[i];
        for (let j = 0; j < p.word.length; j++) {
            const x = p.x + (p.direction === 0 ? j : 0);
            const y = p.y + (p.direction === 1 ? j : 0);
            solutionGrid[y][x] = "";
            if (p.direction === 0) {
                referenceGrid[y][x].accross = i;
            } else {
                referenceGrid[y][x].down = i;
            }
        }
    }

    gridScale.x = maxX;
    gridScale.y = maxY;
}

function buildPuzzle() {
    // puzzle generation
    const crosswordDiv = document.createElement("div");
    crosswordDiv.id = "crossword";
    document.querySelector(".container").appendChild(crosswordDiv);

    crosswordDiv.style.gridTemplateColumns = `repeat(${gridScale.x}, 1fr)`;
    crosswordDiv.style.gridTemplateRows = `repeat(${gridScale.y}, 1fr)`;
    crosswordDiv.innerHTML = "";

    refreshPuzzleScale();

    for (let y = 0; y < solutionGrid.length; y++) {
        const cellMapRow = [];

        for (let x = 0; x < solutionGrid[0].length; x++) {
            const cell = document.createElement("div");
            cell.className = "cell";

            cellMapRow.push(cell);
    
            if (solutionGrid[y][x] === 0) {
                cell.classList.add("void");
            } else {
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.textContent = solutionGrid[y][x] ? String.fromCharCode(solutionGrid[y][x]) : ""; 
                cell.addEventListener("click", () => {
                    onCellSelect(cell, true);
                });
            }
    
            crosswordDiv.appendChild(cell);
        }

        cellMap.push(cellMapRow);
    }

    // clue text
    const clueDiv = document.createElement("div");
    clueDiv.id = "clue-text";
    document.querySelector(".container").appendChild(clueDiv);
}

function refreshPuzzleScale() {
    const vw = window.innerWidth * 0.9;
    const vh = window.innerHeight - 100;
    const scaleFactor = Math.min(vw / gridScale.x, vh / gridScale.y);
    document.documentElement.style.setProperty('--puzzle-width', `${gridScale.x * scaleFactor}px`);
    document.documentElement.style.setProperty('--puzzle-height', `${gridScale.y * scaleFactor}px`);
    document.documentElement.style.setProperty('--scale-factor', scaleFactor);
}

var previousSelectedCell = null;
var selectedDirection = 0; // 0 accross, 1 down
const previousHighlightedCells = [];
function onCellSelect(cell, resetDirection = false) {
    // select cell, deselect previous
    const isSelectedAgain = cell.classList.contains("selected");
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    const cellReferences = referenceGrid[y][x];

    if (previousSelectedCell && previousSelectedCell !== cell) {
        deselectCurrentCell();
    }

    clearHighlights();

    if (isSelectedAgain) {
        // cycle direction
        selectedDirection++;
        if (selectedDirection > 1 || selectedDirection === 1 && cellReferences.down === -1) {
            // all directions are cycled, deselect cell
            previousSelectedCell = null;
            selectedDirection = 0;

            cell.classList.remove("selected");
            return;
        }
    } else if (resetDirection) {
        // new cell is selected, reset direction
        // if accross is available, select it by default
        if (cellReferences.accross !== -1) {
            selectedDirection = 0; 
        } else {
            selectedDirection = 1;
        }
    }

    const placement = placements[selectedDirection ? cellReferences.down : cellReferences.accross];

    clueTextDiv.textContent = placement ? placement.clue : "";

    if (!placement) {
        console.error("No placement found for selected cell and direction.");
        return;
    }
    
    if (!isSelectedAgain) {
        previousSelectedCell = cell;
        cell.classList.add("selected");
    }
    
    // highlight word
    for (let i = 0; i < placement.word.length; i++) {
        const cx = placement.x + (placement.direction === 0 ? i : 0);
        const cy = placement.y + (placement.direction === 1 ? i : 0);
        const cell = cellMap[cy][cx];
        if (cell && cell !== previousSelectedCell) {
            cell.classList.add("highlighted");
            previousHighlightedCells.push(cell);
        }
    }
}

function deselectCurrentCell() {
    previousSelectedCell.classList.remove("selected");
    previousSelectedCell = null;
}

function clearHighlights() {
    // clear previous highlights
    for (const c of previousHighlightedCells) {
        c.classList.remove("highlighted");
    }
    previousHighlightedCells.length = 0;

    clueTextDiv.textContent = "";
}

function selectNextCell(delta = 1) {
    if (!previousSelectedCell) return;

    const x = parseInt(previousSelectedCell.dataset.x);
    const y = parseInt(previousSelectedCell.dataset.y);

    let nextCell = null;
    if (selectedDirection === 0) { // across
        nextCell = cellMap[y][x + delta];
    } else { // down
        nextCell = cellMap[y + delta] ? cellMap[y + delta][x] : null;
    }

    if (!nextCell || nextCell.classList.contains("void")) {
        deselectCurrentCell();
        clearHighlights();
        return;
    }

    onCellSelect(nextCell);
}

document.addEventListener("keydown", (e) => {
    if (!previousSelectedCell) return;

    if (e.key.length === 1 && /^\p{L}$/u.test(e.key))
    {
        // Type letter
        previousSelectedCell.textContent = e.key.toUpperCase();
        selectNextCell();
    } else if (e.key === "Backspace") {
        // Delete letter
        if (previousSelectedCell.textContent === "") {
            selectNextCell(-1);
        }

        if (previousSelectedCell) {
            previousSelectedCell.textContent = "";
        }
    }
});

window.addEventListener("resize", refreshPuzzleScale);

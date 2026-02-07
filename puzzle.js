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

let solvedCount = 0;
const startTime = Date.now()

parsePuzzleCode(puzzleCode);
const g = generateGrids(placements);
buildPuzzle();

const clueTextDiv = document.getElementById("clue-text");

const audioCtx = new AudioContext();
const sounds = {};

async function loadSound(name, url) {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    sounds[name] = await audioCtx.decodeAudioData(buf);
}

function playSound(name) {
    const src = audioCtx.createBufferSource();
    src.buffer = sounds[name];
    src.connect(audioCtx.destination);
    src.start();
}

async function loadAllSounds() {
    await Promise.all([
        loadSound("type0", "res/type0.ogg"),
        loadSound("type1", "res/type1.ogg"),
        loadSound("type2", "res/type2.ogg"),
        loadSound("click", "res/click.ogg"),
        loadSound("solve", "res/solve.ogg"),
        loadSound("success", "res/success.ogg"),
    ]);
}
loadAllSounds();

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
                    playSound("click");
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

    // keyboard, if window is vertical
    if (window.innerWidth * 1.5 < window.innerHeight) {
        // detect language
        const keyMap = [
            { k: "tr", chars: "ĞİŞÖÇÜ" },                           // Turkish
            { k: "pl", chars: "ĄĆĘŁŃÓŚŻŹ" },                        // Polish
            { k: "de", chars: "ÄÖÜẞ" },                             // German
            { k: "es", chars: "Ñ" },                              // Spanish
            { k: "pt", chars: "ÃÕÇÂÊÔ" },                           // Portugese
            { k: "fr", chars: "ŒÆÊËÎÏÛÙÇ" },                        // French
            { k: "it", chars: "ÀÈÌÒÙ" },                            // Italian
            { k: "en", chars: "ABCDEFGHIJKLMNOQPRSTUVWXYZ" },       // (fallback Latin)
            { k: "uk", chars: "ІЇЄҐ" },                             // Ukrainian
            { k: "sr", chars: "ЉЊЋЂЏ" },                            // Serbian
            { k: "mk", chars: "ЃЌЉЊЅ" },                            // Macedonian
            { k: "kz", chars: "ӘҒҚҢӨҰҮҺІ" },                        // Kazakh
            { k: "mn", chars: "ӨҮ" },                               // Mongolian
            { k: "ru", chars: "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ" },// (fallback Cyrillic)
            { k: "el", chars: "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ" },         // Greek
        ];

        let keyboard = "";

        let allWords = "";
        for (const p of placements) {
            allWords += p.word;
        }

        for (const { k, chars } of keyMap) {
            if ([...chars].some(c => allWords.includes(c))) {
                keyboard = k;
                break;
            }
        }

        // english check
        if (keyboard === "") {
            alert("Invalid characters detected in word list!");
            return;
        }
        console.log("detected language: ", keyboard);

        const layoutMap = {
            "tr": ["QWERTYUIOPĞÜ", "ASDFGHJKLŞİ", "ZXCVBNMÖÇ"],
            "pl": ["QWERTYUIOPĘÓ", "ASDFGHJKLĄŚŁ", "ZXCVBNMĆŃŻŹ"],
            "de": ["QWERTYUIOPÜ", "ASDFGHJKLÄÖ", "ZXCVBNMß"],
            "es": ["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"],
            "pt": ["QWERTYUIOPÃÂ", "ASDFGHJKLÇÊ", "ZXCVBNMÕÔ"],
            "fr": ["QWERTYUIOPÊË", "ASDFGHJKLÇÎÏ", "ZXCVBNMÛÙŒÆ"],
            "it": ["QWERTYUIOPÈ", "ASDFGHJKLÀ", "ZXCVBNMÙÌÒ"],
            "en": ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"],
            "uk": ["ЙЦУКЕНГШЩЗХЪЄ", "ФЫВАПРОЛДЖІ", "ЯЧСМИТЬБЮЇҐ"],
            "sr": ["ЉЊЕРТЗУИОПШ", "АСДФГХЈКЛЧЋ", "ЗЂЦВБНМЏ"],
            "mk": ["ЉЊЕРТЅУИОПШ", "АСДФГХЈКЛЌЃ", "ЗЏЦВБНМ"],
            "kz": ["ЙЦУКЕНГШЩЗХЪҒҚ", "ФЫВАПРОЛДЖЭӘӨІ", "ЯЧСМИТЬБЮҢҰҮҺ"],
            "mn": ["ЙЦУКЕНГШЩЗХҮ", "ФӨВАПРОЛДЖ", "ЯЧСМИТЬБЮ"],
            "ru": ["ЙЦУКЕНГШЩЗХЪ", "ФЫВАПРОЛДЖЭ", "ЯЧСМИТЬБЮ"],
            "el": ["ΣΕΡΤΥΘΙΟΠ", "ΑΣΔΦΓΗΞΚΛ", "ΖΧΨΩΒΝΜ"],
        };

        const decidedLayout = layoutMap[keyboard];

        const keyboardDiv = document.createElement("div");
        const keyboardFirstRowDiv = document.createElement("div");
        const keyboardSecondRowDiv = document.createElement("div");
        const keyboardThirdRowDiv = document.createElement("div");
        document.querySelector(".container").appendChild(keyboardDiv);
        keyboardDiv.appendChild(keyboardFirstRowDiv);
        keyboardDiv.appendChild(keyboardSecondRowDiv);
        keyboardDiv.appendChild(keyboardThirdRowDiv);

        keyboardDiv.className = "keyboard";
        keyboardFirstRowDiv.className = "keyboard-row";
        keyboardSecondRowDiv.className = "keyboard-row";
        keyboardThirdRowDiv.className = "keyboard-row";
        keyboardFirstRowDiv.style.gridTemplateColumns = `repeat(${decidedLayout[0].length}, 1fr)`;
        keyboardSecondRowDiv.style.gridTemplateColumns = `repeat(${decidedLayout[1].length}, 1fr)`;
        keyboardThirdRowDiv.style.gridTemplateColumns = `repeat(${decidedLayout[2].length}, 1fr)`;

        const generateRow = (rowDiv, n) => {for (let i = 0; i < decidedLayout[n].length; i++) {
            const keyButton = document.createElement("div");
            rowDiv.appendChild(keyButton);
            keyButton.className = "key-button";

            keyButton.textContent = decidedLayout[n][i];
            keyButton.addEventListener("click", () => {
                if (!previousSelectedCell) return;
                typeLetter(decidedLayout[n][i]);
            });
        }};

        generateRow(keyboardFirstRowDiv, 0);
        generateRow(keyboardSecondRowDiv, 1);
        generateRow(keyboardThirdRowDiv, 2);
    }
}

function refreshPuzzleScale() {
    const vw = Math.min(window.innerWidth, window.innerHeight * 0.9) - 40;
    const vh = window.innerHeight * 0.9 - 88;
    const scaleFactor = Math.min(vw / gridScale.x, vh / gridScale.y);
    document.documentElement.style.setProperty('--puzzle-width', `${gridScale.x * scaleFactor}px`);
    document.documentElement.style.setProperty('--puzzle-height', `${gridScale.y * scaleFactor}px`);
    document.documentElement.style.setProperty('--scale-factor', scaleFactor);

    console.log("height ", window.innerHeight);
}

var previousSelectedCell = null;
var selectedDirection = 0; // 0 accross, 1 down
const previousHighlightedCells = [];
function onCellSelect(cell, resetDirection = false) {
    // select cell, deselect previous
    const isSelectedAgain = cell.classList.contains("selected");
    const isSolved = cell.classList.contains("solved");
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    const cellReferences = referenceGrid[y][x];

    if (previousSelectedCell && previousSelectedCell !== cell) {
        deselectCurrentCell();
    }

    clearHighlights();

    if (isSolved) return;

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

    let nextCell = previousSelectedCell;
    do {
        const x = parseInt(nextCell.dataset.x);
        const y = parseInt(nextCell.dataset.y);

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
    } while (nextCell.classList.contains("solved")); // skip if is solved

    onCellSelect(nextCell);
}

function checkIfSolved() {
    const x = parseInt(previousSelectedCell.dataset.x);
    const y = parseInt(previousSelectedCell.dataset.y);
    const cellReferences = referenceGrid[y][x];
    const placement = placements[selectedDirection ? cellReferences.down : cellReferences.accross];

    let correctLetterCount = 0;
    const iteratedCells = [];
    for (let i = 0; i < placement.word.length; i++) {
        const cx = placement.x + (placement.direction === 0 ? i : 0);
        const cy = placement.y + (placement.direction === 1 ? i : 0);
        const cell = cellMap[cy][cx];
        if (cell && cell.textContent === placement.word[i]) {
            correctLetterCount++;
            iteratedCells.push(cell);
        }
    }

    if (correctLetterCount === placement.word.length) {
        solvedCount++;
        if (solvedCount === placements.length) {
            const elapsedTime = ((Date.now() - startTime) * 0.001).toFixed(1);
            showSuccessDialog(elapsedTime);
            playSound("success");
        } else {
            playSound("solve");
        }

        for (const c of iteratedCells) {
            c.classList.add("solved");
        }
    }
}

function showSuccessDialog(completionTime) {
    if (document.getElementById('success-overlay')) return;

    // inject CSS once
    if (!document.getElementById('success-dialog-style')) {
        const style = document.createElement('style');
        style.id = 'success-dialog-style';
        style.textContent = `
        #success-overlay {
            position: fixed;
            inset: 0;
            background: #88f1;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background .25s ease;
            backdrop-filter: blur(4px);
        }

        #success-overlay.show {
            background: #88f9;
        }

        #success-dialog {
            background: #114;
            color: #eef;
            padding: 10vh 10vw;
            border-radius: 6px;
            min-width: 200px;    
            max-width: 70vw;
            max-height: 50vh;
            text-align: center;
            opacity: 0;
            transform: translateY(30px);
            transition: opacity .25s ease, transform .25s ease;
        }

        #success-overlay.show #success-dialog {
            opacity: 1;
            transform: translateY(0);
        }

        #success-title {
            font-size: calc(min(14vh, 9vw));
        }

        #success-text {
            font-size: calc(min(3.5vh, 3vw));
            padding: 24px;
        }

        #success-ok {
            background: #88f;
            color: #eef;
            border-radius: 6px;
            border: none;
            padding: 6px 24px;
            font-size: calc(min(8vh, 6vw));
        }
    `;
        document.head.appendChild(style);
    }

    const html = `
    <div id="success-overlay">
      <div id="success-dialog">
        <h2 id="success-title">Congratulations!</h2>
        <p id="success-text">You completed the crossword in ${completionTime} seconds.</p>
        <button id="success-ok">OK</button>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML('beforeend', html);

    // force next frame so transition actually runs
    requestAnimationFrame(() =>
        document.getElementById('success-overlay').classList.add('show')
    );

    document.getElementById('success-ok').onclick = () => {
        const overlay = document.getElementById('success-overlay');
        overlay.classList.remove('show');
        overlay.addEventListener('transitionend', () => overlay.remove(), {
            once: true
        });
    };
}

function typeLetter(letter) {
    previousSelectedCell.textContent = letter;
    checkIfSolved();
    selectNextCell();

    playSound("type"+Math.floor(Math.random() * 3));
}

document.addEventListener("keydown", (e) => {
    if (!previousSelectedCell) return;

    if (e.key.length === 1 && /^\p{L}$/u.test(e.key)) {
        // Type letter
        typeLetter(e.key.toUpperCase());
    } else if (e.key === "Backspace") {
        // Delete letter
        if (previousSelectedCell.textContent === "") {
            selectNextCell(-1);
        }

        if (previousSelectedCell) {
            previousSelectedCell.textContent = "";
        }
    } else if (e.key === "ArrowLeft") {
        selectedDirection = 0;
        selectNextCell(-1);
    } else if (e.key === "ArrowRight") {
        selectedDirection = 0;
        selectNextCell(+1);
    } else if (e.key === "ArrowUp") {
        selectedDirection = 1;
        selectNextCell(-1);
    } else if (e.key === "ArrowDown") {
        selectedDirection = 1;
        selectNextCell(+1);
    }
});

window.addEventListener("resize", refreshPuzzleScale);

let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audioCtx.resume();
}

document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });

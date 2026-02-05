const ta = document.getElementById('clue-pairs');

async function insertPreset() {
    const presetSelect = document.getElementById('preset-select');
    const response = await fetch(`presets/${presetSelect.value}.ini`);
    const text = await response.text();
    ta.value = text;
    updateText();
}

function clearList() {
    ta.value = "";
    updateText();
}

async function shareLink(link) {
    await navigator.share({
        title: document.title,
        text: "Check this out",
        url: link
    });
}

function showPuzzleLink(puzzleCode) {
    const puzzleLinkElem = document.getElementById("puzzle-link");
    const url = `https://sessizleylek.github.io/crosswords?p=${encodeURIComponent(puzzleCode)}`;
    puzzleLinkElem.innerHTML = `Your crossword puzzle is ready!<br><a href="${url}" target="_blank">Click here to view it</a>`;

    if (navigator.share) {
        puzzleLinkElem.innerHTML += ` or <a href="#" onclick="shareLink('${url}')">share it with your friends!</a>`;
    }

}

function generateCrossword() {
    const button = document.getElementById("generate-button");
    button.disabled = true;
    button.textContent = "Generating...";

    // Parse input as KEY=CLUE pairs
    const lines = ta.value.split("\n");
    const keys = lines.map(line => line.split("=")[0].trim().toUpperCase());
    const values = lines.map(line => line.split("=")[1].trim() || "");

    const puzzleCode = generatePuzzleCode(keys, values);
    showPuzzleLink(puzzleCode);

    button.disabled = false;
    button.textContent = "Generate Crossword";
}

// Puzzle code spec:
// base64url of:
// 8 bytes: number of keys/clues
// For each key/clue:
// 8 * 2 bytes: x, y
// 8 bytes: clue direction (0 for across, 1 for down)
// null-terminated utf8 string: key
// null-terminated utf8 string: clue text

function generatePuzzleCode(keys, values) {
    // Keep indices so keys/values stay linked after shuffling
    const indexArray = keys.map((_, i) => i);

    // Fixed-size working grid; stores which placement index occupies each cell
    const gridSize = 20;
    const occupancy = Array.from({ length: gridSize }, () => new Array(gridSize).fill(-1));
    const placements = [];

    // Shuffle placement order to avoid deterministic layouts
    for (let i = indexArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexArray[i], indexArray[j]] = [indexArray[j], indexArray[i]];
    }

    const characterAt = (x, y) => {
        const occ = occupancy[y][x];
        if (occ === -1) return null;
        const placement = placements[occ];
        const key = keys[placement.idx];
        const charIndex = placement.dir === 0 ? (x - placement.x) : (y - placement.y);
        return key[charIndex];
    }

    let initialPlacement = true;
    for (const idx of indexArray) {
        if (placements.length >= 50) break; // Limit to 50 placements for storage size reasons

        let skipPlacements = false;

        const key = keys[idx];
        const len = key.length;

        // First word is placed randomly to seed the crossword
        if (initialPlacement) {
            let randomDirection = Math.floor(Math.random() * 2);
            let randomX = Math.floor(Math.random() * gridSize / 2 + gridSize / 4);
            let randomY = Math.floor(Math.random() * gridSize / 2 + gridSize / 4);

            // Clamp so the word fits inside the grid
            if (randomDirection === 0 && randomX + len > gridSize) randomX = gridSize - len;
            if (randomDirection === 1 && randomY + len > gridSize) randomY = gridSize - len;

            placements.push({ x: randomX, y: randomY, dir: randomDirection, idx });
            for (let k = 0; k < len; k++) {
                const x = randomX + (randomDirection === 0 ? k : 0);
                const y = randomY + (randomDirection === 1 ? k : 0);
                occupancy[y][x] = 0;
            }
            initialPlacement = false;
            continue;
        }

        // Try to place new words by intersecting existing ones
        for (const placed of placements) {
            if (skipPlacements) break;

            // Iterate letters of the already placed word
            for (let i = 0; i < keys[placed.idx].length; i++) {
                if (skipPlacements) break;
                const placedChar = keys[placed.idx][i];

                // Iterate letters of the new word
                for (let j = 0; j < len; j++) {
                    if (skipPlacements) break;
                    if (placedChar !== key[j]) continue;

                    // Compute perpendicular crossing position
                    let candidateX, candidateY, candidateDir;
                    if (placed.dir === 0) {
                        candidateX = placed.x + i;
                        candidateY = placed.y - j;
                        candidateDir = 1;
                    } else {
                        candidateX = placed.x - j;
                        candidateY = placed.y + i;
                        candidateDir = 0;
                    }

                    // Reject placements that start outside grid
                    if (candidateX < 0 || candidateY < 0) continue;
                    if (candidateDir === 0 && candidateX + len > 64) continue;
                    if (candidateDir === 1 && candidateY + len > 64) continue;

                    // Check that the entire word fits and doesn't collide
                    let fits = true;
                    for (let k = -1; k < len + 1; k++) {
                        const x = candidateX + (candidateDir === 0 ? k : 0);
                        const y = candidateY + (candidateDir === 1 ? k : 0);

                        if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) {
                            if (k >= 0 && k < len) { fits = false; break; }
                            else { continue; }
                        }

                        const occ = occupancy[y][x];

                        if (k === -1 || k === len) {
                            // Ensure there's a blank cell before and after the word
                            if (occ !== -1) { fits = false; break; }
                            continue;
                        }

                        // Ensure no conflicting letters
                        if (occ !== -1 && key[k] !== characterAt(x, y)) { fits = false; break; }

                        // Ensure adjacent cells don't have any other placement (except at the crossing point)
                        let allowedOcc = occ;
                        if (candidateDir === 0) {
                            if (y > 0) {
                                const aboveOcc = occupancy[y - 1][x];
                                if (aboveOcc !== -1 && aboveOcc !== allowedOcc) { fits = false; break; }
                            }
                            if (y < gridSize - 1) {
                                const belowOcc = occupancy[y + 1][x];
                                if (belowOcc !== -1 && belowOcc !== allowedOcc) { fits = false; break; }
                            }
                        } else {
                            if (x > 0) {
                                const leftOcc = occupancy[y][x - 1];
                                if (leftOcc !== -1 && leftOcc !== allowedOcc) { fits = false; break; }
                            }
                            if (x < gridSize - 1) {
                                const rightOcc = occupancy[y][x + 1];
                                if (rightOcc !== -1 && rightOcc !== allowedOcc) { fits = false; break; }
                            }
                        }

                    }

                    // Commit placement once a valid intersection is found
                    if (fits) {
                        let placementIndex = placements.push({ x: candidateX, y: candidateY, dir: candidateDir, idx }) - 1;
                        for (let k = 0; k < len; k++) {
                            const x = candidateX + (candidateDir === 0 ? k : 0);
                            const y = candidateY + (candidateDir === 1 ? k : 0);
                            occupancy[y][x] = placementIndex;
                        }
                        skipPlacements = true;
                        break;
                    }
                }
            }
        }
    }

    // Compute bounding box to crop unused grid space
    let minX = gridSize, minY = gridSize, maxX = 0, maxY = 0;
    for (const placement of placements) {
        const len = keys[placement.idx].length;
        minX = Math.min(minX, placement.x);
        minY = Math.min(minY, placement.y);
        if (placement.dir === 0) {
            maxX = Math.max(maxX, placement.x + len - 1);
            maxY = Math.max(maxY, placement.y);
        } else {
            maxX = Math.max(maxX, placement.x);
            maxY = Math.max(maxY, placement.y + len - 1);
        }
    }

    if (placements.length === 0) {
        alert("No words could be placed in the crossword. Try adding more words or different words.");
        return;
    }

    // Create compact grid representation
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // PLACEMENT DATA
    const placementMetadataSize = placements.length * 3 + 1; // x, y, dir, plus number of placements
    const placementMetadata = new Uint8Array(placementMetadataSize);
    let placementOffset = 0;

    placementMetadata[placementOffset++] = placements.length; // Store number of placements at the start
    for (const placement of placements) {
        placementMetadata[placementOffset++] = placement.x - minX;
        placementMetadata[placementOffset++] = placement.y - minY;
        placementMetadata[placementOffset++] = placement.dir;
    }

    /*  Only more efficient for less than about 16 words, keeping for reference
        If decided to be implemented, must add clue metadata since it cant be derived from cell data
    // CELL DATA
    const cellData = new Uint16Array(width * height);
    cellData.fill(0);

    // Map cropped grid back into linear buffer
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const occ = occupancy[y][x];
            if (occ !== -1) {
                const adjustedX = x - minX;
                const adjustedY = y - minY;
                cellData[adjustedY * width + adjustedX] = keys[placements[occ].idx].charCodeAt(0);
            }
        }
    }*/
    
    // Precompute buffer size to avoid reallocations
    const encoder = new TextEncoder();
    let totalTextLength = 0;
    for (const placement of placements) {
        totalTextLength += encoder.encode(keys[placement.idx]).length + 1;
        totalTextLength += encoder.encode(values[placement.idx]).length + 1;
    }
    
    // Serialize puzzle into a single binary blob
    const bufferSize = placementMetadata.length + totalTextLength;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    let offset = 0;
    
    console.log("Buffer size:", bufferSize);

    // Store grid dimensions, can be derived from placements instead
    // view.setUint8(offset, width); offset += 1;
    // view.setUint8(offset, height); offset += 1;

    // Store grid cells
    // new Uint16Array(buffer, offset, cellData.length).set(cellData);
    // offset += cellData.byteLength;

    // Store metadata
    new Uint8Array(buffer, offset, placementMetadata.length).set(placementMetadata);
    offset += placementMetadata.length;

    // Store key and clue texts
    for (const placement of placements) {
        const encodedKey = encoder.encode(keys[placement.idx]);
        new Uint8Array(buffer, offset, encodedKey.length).set(encodedKey);
        offset += encodedKey.length;
        view.setUint8(offset, 0);
        offset += 1;
    }
    for (const placement of placements) {
        const encodedClue = encoder.encode(values[placement.idx]);
        new Uint8Array(buffer, offset, encodedClue.length).set(encodedClue);
        offset += encodedClue.length;
        view.setUint8(offset, 0);
        offset += 1;
    }

    // Encode binary data into URL-safe form
    const uint8Buffer = new Uint8Array(buffer);
    const base64url = btoa(String.fromCharCode(...uint8Buffer))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    console.log("Generated puzzle code:", base64url, " length:", base64url.length);
    return base64url;
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

    hl.scrollTop = ta.scrollTop;
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

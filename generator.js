const ta = document.getElementById('clue-pairs');

function mockInsertPreset()
{
    ta.value = `
ALBERTEINSTEIN=The Discoverer of the Theory of Relativity
MARIECURIE=The Discoverer of Radioactivity
ISAACNEWTON=The Discoverer of Gravity
NIKOLATESLA=The Inventor of the Alternating Current
LEONARDO=The Painter of the Mona Lisa
PEACH=The princess Mario is looking for in the 1986 game 
LINK=The protagonist of The Legend of Zelda who wields the Master Sword 
SAMUS=The bounty hunter inside the suit in the Metroid series 
ALUCARD=The son of Dracula who explores the castle in Symphony of the Night 
KRATOS=The Ghost of Sparta who slaughtered the Olympian gods 
GORDONFREEMAN=The silent protagonist of Half-Life who carries a crowbar 
SOLIDSNAKE=The legendary soldier from Metal Gear who mastered tactical espionage 
SANS=The lazy skeleton from Undertale who judges your actions 
MASTERCHIEF=The Spartan soldier designated as John-117 in the Halo series 
ARTHUR=The knight who loses his armor when hit in Ghosts n Goblins 
MEGAMAN=The Blue Bomber created by Dr. Light to stop Dr. Wily 
SIMON=The whip-wielding member of the Belmont clan in the first Castlevania 
CLOUD=The former Soldier carrying the Buster Sword in Final Fantasy VII 
SNAKE=The protagonist of the Metal Gear series often found in a box 
CRASH=The mutated bandicoot who breaks crates and eats Wumpa fruit 
SPYRO=The small purple dragon who breathes fire and collects gems 
BOWSER=The King of the Koopas who constantly kidnaps Princess Peach 
DONKEYKONG=The giant gorilla who originally kidnapped Pauline in 1981 
SONIC=The blue hedgehog known for his incredible speed and gold rings 
GLADOS=The passive-aggressive AI that runs the Aperture Science facility
HORNET=The protector of Hallownest who uses a needle and thread 
SHOVELKNIGHT=The blue hero who carries a garden tool instead of a sword 
MADELINE=The protagonist who climbs Mount Celeste while battling her anxiety 
MEATBOY=The sentient cube of raw beef who rescues Bandage Girl 
ISAAC=The child who escapes his mother by hiding in a basement 
CYBERPUNK=The genre and setting for the mercenary V in Night City 
GUYBRUSH=The wannabe pirate from Monkey Island who can hold his breath for ten minutes 
MORRIGAN=The shape-shifting Witch of the Wilds from the Dragon Age series 
LARACROFT=The tomb raider who survived a shipwreck on the island of Yamatai 
GALE=The wizard from Waterdeep who has a dangerous orb in his chest 
ALOY=The Nora machine hunter who discovers the secrets of the Old Ones 
NATHANDRAKE=The treasure hunter who claims to be a descendant of Sir Francis Drake 
GERALT=The White Wolf who hunts monsters for coin in The Witcher 
DOOMSLAYER=The unstoppable marine who rips and tears through the legions of Hell 
RYU=The wandering martial artist searching for the answer in the heart of battle 
CHUNLI=The Interpol officer known for her lightning kicks 
PACMAN=The yellow orb that eats pellets and avoids ghosts in a maze 
QBERT=The orange creature who jumps on cubes to change their color 
DIGDUG=The protagonist who defeats underground monsters by inflating them 
FALCO=The ace pilot and rival to Fox McCloud in Star Fox 
TREVOR=The unstable bank robber from the trio in Grand Theft Auto V 
JOKER=The leader of the Phantom Thieves of Hearts from Persona 5 
ESPIO=The chameleon ninja who belongs to Team Chaotix 
SHEPARD=The Commander of the Normandy who must save the galaxy from Reapers
    `.trim();
    updateText();
}

async function insertPreset() {
    mockInsertPreset();
    return; // TODO: Remove this when actual presets are implemented

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
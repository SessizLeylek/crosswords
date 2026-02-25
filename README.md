# Crossword Generator (Client-Side, Shareable)

A zero-backend crossword generator that runs entirely in the browser.
You paste `KEY=CLUE` pairs, it auto-builds a crossword, serializes it into a compact binary format, base64url-encodes it, and gives you a shareable link.

No server. No storage. Just URLs.

---

## What this does

* Takes newline-separated `WORD=CLUE` pairs
* Generates a crossword by intersecting words
* Crops unused grid space
* Serializes placements + text into a binary blob
* Encodes it as base64url
* Produces a link like
  `https://sessizleylek.github.io/crosswords?p=...`

---

## Input format

```
APPLE=A fruit
BINARY=Base-2 number system
PUZZLE=Something annoying to write correctly
```

Rules:

* One entry per line
* First `=` splits key and clue
* Keys must be uppercased
* Empty clue is allowed

---

## How crossword generation works

* First word is placed randomly near center
* Subsequent words:

  * Must intersect an existing word
  * Must not collide or touch illegally
  * Must respect crossword adjacency rules
* Max **250 placed words** 
* Placement order is shuffled → non-deterministic layouts

---

## Puzzle code format

The generated puzzle code is:

```
base64url(
  [1 byte]   number of placements (N)
  For each placement:
    [1 byte] x
    [1 byte] y
    [1 byte] direction (0 = across, 1 = down)

  For each placement:
    null-terminated UTF-8 key

  For each placement:
    null-terminated UTF-8 clue
)
```

## License

Do whatever the hell you want with it.

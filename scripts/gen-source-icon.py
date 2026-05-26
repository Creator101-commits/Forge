#!/usr/bin/env python3
"""
Generate a 1024x1024 source PNG for Forge's app icon using only the stdlib.
Run once: `python3 scripts/gen-source-icon.py` -> src-tauri/icons/source.png
Then: `pnpm tauri icon src-tauri/icons/source.png` to produce all platform variants.
"""
from __future__ import annotations
import os
import struct
import zlib
from pathlib import Path

SIZE = 1024
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src-tauri" / "icons" / "source.png"


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def pixel(x: int, y: int) -> tuple[int, int, int, int]:
    # Dark charcoal background with a teal "F" mark.
    bg = (16, 22, 26, 255)
    # Subtle radial vignette toward bottom right.
    cx, cy = SIZE * 0.5, SIZE * 0.5
    dx, dy = (x - cx) / SIZE, (y - cy) / SIZE
    d = (dx * dx + dy * dy) ** 0.5
    v = max(0.0, min(1.0, 1.0 - d * 0.8))
    r = lerp(11, bg[0], v)
    g = lerp(14, bg[1], v)
    b = lerp(16, bg[2], v)

    # Stylized "F" stroke (a rounded rectangle base + crossbars).
    # All coords in icon-relative units 0..1.
    u, w = x / SIZE, y / SIZE
    in_stroke = False
    # vertical bar
    if 0.32 <= u <= 0.42 and 0.22 <= w <= 0.78:
        in_stroke = True
    # top bar
    if 0.32 <= u <= 0.74 and 0.22 <= w <= 0.32:
        in_stroke = True
    # mid bar
    if 0.32 <= u <= 0.66 and 0.46 <= w <= 0.55:
        in_stroke = True

    if in_stroke:
        # teal accent
        return (45, 212, 191, 255)
    return (r, g, b, 255)


def write_png(path: Path, size: int) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            r, g, b, a = pixel(x, y)
            raw.extend((r, g, b, a))
    compressed = zlib.compress(bytes(raw), 9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", compressed))
        f.write(chunk(b"IEND", b""))


if __name__ == "__main__":
    write_png(OUT, SIZE)
    print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes)")

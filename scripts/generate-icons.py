#!/usr/bin/env python3
"""Generate PWA icons without external dependencies."""

import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "assets"


def png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def write_png(path: Path, size: int) -> None:
    pixels = bytearray()
    cx = cy = size // 2
    radius = size * 0.42

    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx * dx + dy * dy)

            if dist <= radius:
                t = (dx + dy) / (size * 0.9)
                r = min(255, int(255 * (0.55 + 0.45 * max(0.0, 1.0 - abs(t - 0.2)))))
                g = min(255, int(255 * (0.35 + 0.35 * max(0.0, 1.0 - abs(t)))))
                b = min(255, int(255 * (0.75 + 0.25 * max(0.0, 1.0 + t))))
                if dist > radius - 2:
                    r, g, b = 244, 240, 255
            else:
                r, g, b = 15, 10, 26

            row.extend((r, g, b, 255))
        pixels.extend(row)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    compressed = zlib.compress(bytes(pixels), 9)
    png = b"\x89PNG\r\n\x1a\n"
    png += png_chunk(b"IHDR", ihdr)
    png += png_chunk(b"IDAT", compressed)
    png += png_chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    write_png(ROOT / "icon-192.png", 192)
    write_png(ROOT / "icon-512.png", 512)
    print("Generated icon-192.png and icon-512.png")


if __name__ == "__main__":
    main()
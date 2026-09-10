#!/usr/bin/env python3
"""Generate the print QR code for Everglow yard signs, door hangers, and truck panels.

The QR is written as a plain black-on-transparent SVG made of one path, so it
scales to any size without resampling and drops straight into a print layout.

Usage:
    pip install segno
    python3 tools/make_qr.py                       # default: quote page + yard-sign tracking
    python3 tools/make_qr.py --url https://... --out assets/print/qr-truck.svg

Rules that are not negotiable if you want the thing to actually scan:
  * dark modules on a LIGHT background (never invert)
  * a quiet zone of at least 4 modules of clear light space on all sides
  * error correction M or better, so mud, snow, and a scuff still scan
"""

import argparse
import pathlib
import sys

try:
    import segno
except ImportError:
    sys.exit("segno is not installed. Run: pip install segno")

DEFAULT_URL = "https://everglowlighting.com/quote.html?utm_source=yard_sign&utm_medium=print"
DEFAULT_OUT = "assets/print/qr-yard-sign.svg"


def build(url: str, out: pathlib.Path, error: str, border: int) -> None:
    qr = segno.make(url, error=error)
    out.parent.mkdir(parents=True, exist_ok=True)
    qr.save(
        str(out),
        kind="svg",
        scale=10,
        border=border,
        dark="#0B1220",     # Midnight, not pure black -- matches the brand ground
        light=None,         # transparent; the layout supplies the Snow panel
        svgclass=None,
        lineclass=None,
        omitsize=True,      # no width/height attrs, so CSS/print sizing wins
    )
    version, mod_count = qr.version, qr.symbol_size(scale=1, border=0)[0]
    print(f"wrote {out}")
    print(f"  url      {url}")
    print(f"  version  {version}  ({mod_count}x{mod_count} modules)  ecc {error.upper()}  quiet zone {border}")
    print(f"  at 6.2in wide each module is {6.2 / (mod_count + 2 * border):.3f}in "
          f"-> comfortable scan range about {6.2 * 10 / 12:.0f} ft")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--url", default=DEFAULT_URL, help="destination URL encoded in the QR")
    p.add_argument("--out", default=DEFAULT_OUT, type=pathlib.Path, help="output SVG path")
    p.add_argument("--error", default="m", choices=["l", "m", "q", "h"], help="error correction level")
    p.add_argument("--border", default=4, type=int, help="quiet zone in modules (4 is the spec minimum)")
    a = p.parse_args()
    build(a.url, a.out, a.error, a.border)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Convert a markdown file to a styled PDF via headless Chrome."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import markdown
from markdown.extensions.tables import TableExtension

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <style>
    @page {{
      margin: 18mm 16mm;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #1a1a1a;
      max-width: 100%;
    }}
    h1 {{
      font-size: 22pt;
      margin: 0 0 12pt;
      color: #6327FF;
      border-bottom: 2px solid #6327FF;
      padding-bottom: 6pt;
    }}
    h2 {{
      font-size: 15pt;
      margin: 20pt 0 8pt;
      color: #4c1d95;
      page-break-after: avoid;
    }}
    h3 {{
      font-size: 12pt;
      margin: 14pt 0 6pt;
      page-break-after: avoid;
    }}
    p, li {{
      orphans: 3;
      widows: 3;
    }}
    code {{
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 9.5pt;
      background: #f3f0ff;
      padding: 1px 4px;
      border-radius: 4px;
    }}
    pre {{
      background: #f8f7fc;
      border: 1px solid #ddd6fe;
      border-radius: 8px;
      padding: 10pt 12pt;
      overflow-x: auto;
      font-size: 9pt;
      line-height: 1.45;
      page-break-inside: avoid;
    }}
    pre code {{
      background: none;
      padding: 0;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0 14pt;
      font-size: 10pt;
      page-break-inside: avoid;
    }}
    th, td {{
      border: 1px solid #d4d4d8;
      padding: 6pt 8pt;
      text-align: left;
      vertical-align: top;
    }}
    th {{
      background: #ede9fe;
      font-weight: 600;
    }}
    tr:nth-child(even) td {{
      background: #fafafa;
    }}
    blockquote {{
      margin: 10pt 0;
      padding: 8pt 12pt;
      border-left: 4px solid #6327FF;
      background: #faf5ff;
      color: #444;
    }}
    hr {{
      border: none;
      border-top: 1px solid #e4e4e7;
      margin: 16pt 0;
    }}
    ul, ol {{
      padding-left: 18pt;
    }}
    a {{
      color: #6327FF;
      text-decoration: none;
    }}
  </style>
</head>
<body>
{body}
</body>
</html>
"""

CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
]


def find_chrome() -> str:
    for path in CHROME_PATHS:
        if Path(path).exists():
            return path
    raise FileNotFoundError("Chrome/Chromium not found. Install Google Chrome to generate PDF.")


def md_to_html(md_path: Path) -> str:
    text = md_path.read_text(encoding="utf-8")
    body = markdown.markdown(
        text,
        extensions=["fenced_code", "tables", "nl2br", TableExtension()],
    )
    return HTML_TEMPLATE.format(title=md_path.stem, body=body)


def html_to_pdf(html_path: Path, pdf_path: Path) -> None:
    chrome = find_chrome()
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--print-to-pdf={pdf_path.resolve()}",
        f"file://{html_path.resolve()}",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not pdf_path.exists():
        raise RuntimeError(result.stderr or result.stdout or "PDF generation failed")


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert markdown to PDF")
    parser.add_argument("input", type=Path, help="Input .md file")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output .pdf file (default: same name as input)",
    )
    args = parser.parse_args()

    md_path: Path = args.input
    if not md_path.exists():
        print(f"File not found: {md_path}", file=sys.stderr)
        return 1

    pdf_path = args.output or md_path.with_suffix(".pdf")
    html_path = md_path.with_suffix(".html")

    html_path.write_text(md_to_html(md_path), encoding="utf-8")
    html_to_pdf(html_path, pdf_path)

    print(f"Created {pdf_path} ({pdf_path.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

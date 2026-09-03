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
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <style>
    @page {{
      size: A4;
      margin: 18mm 16mm 25mm;
      @bottom-left {{
        content: "Cleft - Project Summary";
        color: #6f6791;
        font-size: 8pt;
      }}
      @bottom-center {{
        content: "Page " counter(page) " of " counter(pages);
        color: #6f6791;
        font-size: 8pt;
      }}
    }}
    body {{
      font-family: "Noto Sans Thai", Thonburi, Tahoma, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 10.5pt;
      line-height: 1.62;
      color: #211a2e;
      max-width: 100%;
    }}
    h1 {{
      font-size: 24pt;
      line-height: 1.25;
      margin: 0 0 16pt;
      color: #5636c9;
      border-bottom: 2px solid #6d4de6;
      padding-bottom: 9pt;
    }}
    h2 {{
      font-size: 15.5pt;
      margin: 22pt 0 8pt;
      color: #5636c9;
      page-break-after: avoid;
    }}
    h3 {{
      font-size: 12.5pt;
      margin: 14pt 0 6pt;
      color: #33294a;
      page-break-after: avoid;
    }}
    p {{
      orphans: 3;
      widows: 3;
    }}
    li {{
      break-inside: avoid;
      page-break-inside: avoid;
    }}
    li + li {{
      margin-top: 2pt;
    }}
    code {{
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 9.5pt;
      background: #f2eefc;
      padding: 1px 4px;
      border-radius: 4px;
    }}
    pre {{
      background: #f7f5fc;
      border: 1px solid #d9d1ef;
      border-radius: 8px;
      padding: 10pt 12pt;
      overflow-x: visible;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-size: 9pt;
      line-height: 1.45;
      break-inside: avoid;
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
      break-inside: auto;
    }}
    th, td {{
      border: 1px solid #d4d4d8;
      padding: 6pt 8pt;
      text-align: left;
      vertical-align: top;
    }}
    th {{
      background: #eeeafd;
      font-weight: 600;
    }}
    tr:nth-child(even) td {{
      background: #faf9fd;
    }}
    thead {{
      display: table-header-group;
    }}
    tr {{
      break-inside: avoid;
    }}
    blockquote {{
      margin: 10pt 0;
      padding: 8pt 12pt;
      border-left: 4px solid #6d4de6;
      background: #f7f5fc;
      color: #444;
    }}
    hr {{
      border: none;
      border-top: 1px solid #e4e4e7;
      margin: 16pt 0;
    }}
    ul, ol {{
      padding-left: 20pt;
    }}
    a {{
      color: #6d4de6;
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
        "--no-pdf-header-footer",
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

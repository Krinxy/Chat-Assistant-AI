#!/usr/bin/env python3
"""Repository coverage gate and report generator.

Scans common coverage outputs across Python/Node/.NET and enforces a minimum threshold.
Generates a dark-mode HTML report with timestamp.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import Callable
from defusedxml import ElementTree as ET


@dataclass
class CoverageResult:
    component: str
    source: str
    percent: float


def _to_percent(value: object, source: Path, field: str) -> float:
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"", "unknown", "n/a", "nan"}:
            raise ValueError(f"{field} is not numeric in {source}: {value!r}")
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} is not numeric in {source}: {value!r}") from exc


def parse_python_coverage_xml(path: Path) -> float:
    root = ET.parse(path).getroot()
    line_rate = root.attrib.get("line-rate")
    if line_rate is None:
        raise ValueError(f"line-rate missing in {path}")
    return _to_percent(line_rate, path, "line-rate") * 100.0


def parse_node_coverage_summary(path: Path) -> float:
    data = json.loads(path.read_text(encoding="utf-8"))
    pct = data["total"]["lines"]["pct"]
    return _to_percent(pct, path, "total.lines.pct")


def parse_cobertura_xml(path: Path) -> float:
    root = ET.parse(path).getroot()
    line_rate = root.attrib.get("line-rate")
    if line_rate is None:
        raise ValueError(f"line-rate missing in {path}")
    return _to_percent(line_rate, path, "line-rate") * 100.0


def _append_if_parseable(
    results: list[CoverageResult],
    component: str,
    source: Path,
    parser: Callable[[Path], float],
) -> None:
    try:
        percent = parser(source)
    except (KeyError, ValueError, json.JSONDecodeError) as exc:
        print(f"Skipping invalid coverage file {source}: {exc}")
        return
    results.append(CoverageResult(component, str(source), percent))


def collect_results(repo_root: Path) -> list[CoverageResult]:
    results: list[CoverageResult] = []

    for candidate in [repo_root / "coverage" / "coverage-python.xml", repo_root / "coverage.xml"]:
        if candidate.exists():
            _append_if_parseable(results, "python", candidate, parse_python_coverage_xml)
            break

    node_summary = repo_root / "coverage" / "coverage-summary.json"
    if node_summary.exists():
        _append_if_parseable(results, "node", node_summary, parse_node_coverage_summary)

    for cob in repo_root.rglob("coverage.cobertura.xml"):
        if "node_modules" in cob.parts:
            continue
        _append_if_parseable(results, "dotnet", cob, parse_cobertura_xml)

    return results


def reset_coverage_folder(coverage_dir: Path, keep: set[str]) -> None:
    coverage_dir.mkdir(parents=True, exist_ok=True)
    for child in coverage_dir.iterdir():
        if child.name in keep:
            continue
        if child.is_file() or child.is_symlink():
            child.unlink(missing_ok=True)
        elif child.is_dir():
            for nested in sorted(child.rglob("*"), reverse=True):
                if nested.is_file() or nested.is_symlink():
                    nested.unlink(missing_ok=True)
                elif nested.is_dir():
                    nested.rmdir()
            child.rmdir()


def write_dark_report(report_path: Path, threshold: float, results: list[CoverageResult]) -> None:
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    rows = []

    for result in results:
        status = "PASS" if result.percent >= threshold else "FAIL"
        status_class = "pass" if status == "PASS" else "fail"
        rows.append(
            "<tr>"
            f"<td>{result.component}</td>"
            f"<td>{result.percent:.2f}%</td>"
            f"<td>{result.source}</td>"
            f'<td class="{status_class}">{status}</td>'
            "</tr>"
        )

    overall_text = "No coverage reports found"
    overall_class = "fail"
    if results:
        overall = sum(r.percent for r in results) / len(results)
        overall_ok = overall >= threshold
        overall_class = "pass" if overall_ok else "fail"
        overall_text = f"Overall average: {overall:.2f}%"

    html = f"""<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
  <title>Coverage Report</title>
  <style>
    :root {{
      color-scheme: dark;
      --bg: #0f1115;
      --panel: #161a22;
      --text: #e6e8ef;
      --muted: #9aa3b2;
      --pass: #44d17a;
      --fail: #ff6b6b;
      --line: #2a3040;
    }}
    body {{
      margin: 0;
      font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 24px;
    }}
    .card {{
      max-width: 1000px;
      margin: 0 auto;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 20px;
    }}
    h1 {{ margin: 0 0 8px; }}
    .meta {{ color: var(--muted); margin-bottom: 16px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border-bottom: 1px solid var(--line); padding: 10px; text-align: left; }}
    th {{ color: var(--muted); font-weight: 600; }}
    .pass {{ color: var(--pass); font-weight: 700; }}
    .fail {{ color: var(--fail); font-weight: 700; }}
    .overall {{ margin-top: 16px; font-size: 1.05rem; }}
  </style>
</head>
<body>
  <section class=\"card\">
    <h1>Coverage Report</h1>
    <div class=\"meta\">Generated: {generated_at}</div>
    <div class=\"meta\">Minimum threshold: {threshold:.1f}%</div>
    <table>
      <thead>
        <tr>
          <th>Component</th>
          <th>Coverage</th>
          <th>Source</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {''.join(rows) if rows else '<tr><td colspan="4">No coverage files found</td></tr>'}
      </tbody>
    </table>
    <div class=\"overall {overall_class}\">{overall_text}</div>
  </section>
</body>
</html>
"""
    report_path.write_text(html, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Coverage gate for repository")
    parser.add_argument("--threshold", type=float, default=80.0)
    parser.add_argument("--report", default="coverage/coverage-report.html")
    args = parser.parse_args()

    repo_root = Path.cwd()
    report_path = repo_root / args.report
    coverage_dir = report_path.parent

    results = collect_results(repo_root)

    keep_files = {report_path.name, Path(__file__).name}
    reset_coverage_folder(coverage_dir, keep_files)
    write_dark_report(report_path, args.threshold, results)

    print(f"Coverage report generated: {report_path}")

    if not results:
        print("No coverage report files found. Failing coverage gate.")
        return 1

    failed = [r for r in results if r.percent < args.threshold]
    overall = sum(r.percent for r in results) / len(results)

    for result in results:
        print(f"{result.component}: {result.percent:.2f}% ({result.source})")

    if failed:
        print("Coverage threshold failed for:")
        for result in failed:
            print(f" - {result.component}: {result.percent:.2f}% < {args.threshold:.2f}%")
        return 1

    if overall < args.threshold:
        print(f"Overall average coverage {overall:.2f}% is below {args.threshold:.2f}%")
        return 1

    print("Coverage threshold passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

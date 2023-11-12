import { Position } from "vscode";
import type { ScanPatterns } from "./regex";
import type { NameAndPos } from "./model";

/**
 * Scan all definitions and references in the given content.
 * No deduplication or check is performed.
 */
export function scanFile(
  content: string,
  patterns: ScanPatterns,
  repo: {
    defs: NameAndPos[];
    refs: NameAndPos[];
  }
) {
  const defs = [] as NameAndPos[];
  const refs = [] as NameAndPos[];
  content.split("\n").forEach((line, lineIndex) => {
    scanLine(line, lineIndex, patterns, repo);
  });
  return { defs, refs };
}

/**
 * Scan all definitions and references in the given line.
 * No deduplication or check is performed.
 */
export function scanLine(
  line: string,
  lineIndex: number,
  patterns: ScanPatterns,
  repo: {
    defs: NameAndPos[];
    refs: NameAndPos[];
  }
) {
  // find all defs
  appendMatched(repo.defs, line, lineIndex, patterns.def);

  // find all refs
  appendMatched(repo.refs, line, lineIndex, patterns.ref);
}

export function appendMatched(
  repo: NameAndPos[],
  line: string,
  lineIndex: number,
  pattern: RegExp
) {
  for (const m of line.matchAll(pattern)) {
    const name = m[1]; // the first capture group is the name
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const pos = new Position(lineIndex, m.index!);
    repo.push({ name, pos });
  }
}

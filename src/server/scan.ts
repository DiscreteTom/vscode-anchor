import type { Range } from "vscode-languageserver/node";

export type ScanCallback = (
  /**
   * The name is the content of the first capture group.
   */
  name: string,
  range: Range
) => void;

/**
 * Scan all definitions and references in the given content.
 */
export function scanFile(text: string, pattern: RegExp, cb: ScanCallback) {
  text.split("\n").forEach((line, lineIndex) => {
    scanLine(line, lineIndex, pattern, cb);
  });
}

/**
 * Scan all definitions and references in the given line.
 */
export function scanLine(
  line: string,
  lineIndex: number,
  pattern: RegExp,
  cb: ScanCallback
) {
  for (const m of line.matchAll(pattern)) {
    cb(
      m[1], // the first capture group
      {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        start: { line: lineIndex, character: m.index! },
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        end: { line: lineIndex, character: m.index! + m[0].length },
      }
    );
  }
}

import type { Position, Range } from "vscode-languageserver/node";

export function buildMarkupContent(content: string[][]) {
  return content.map((l) => l.join("\n")).join("\n\n---\n\n"); // separator
}

/**
 * Compare a position and a range.
 * @returns -1 if pos is before range, 0 if pos is in range, 1 if pos is after range
 */
export function comparePosAndRange(pos: Position, range: Range) {
  if (pos.line < range.start.line) {
    return -1;
  }
  if (pos.line > range.end.line) {
    return 1;
  }
  if (pos.character < range.start.character) {
    return -1;
  }
  if (pos.character > range.end.character) {
    return 1;
  }
  return 0;
}

export function posInRange(pos: Position, range: Range) {
  return comparePosAndRange(pos, range) === 0;
}

// TODO: https://github.com/microsoft/TypeScript/issues/44227
declare global {
  interface RegExpIndicesArray extends Array<[number, number]> {
    groups?: {
      [key: string]: [number, number];
    };

    // eslint-disable-next-line @typescript-eslint/naming-convention
    0: [number, number];
  }

  interface RegExpMatchArray {
    indices?: RegExpIndicesArray;
  }

  interface RegExpExecArray {
    indices?: RegExpIndicesArray;
  }

  interface RegExp {
    readonly hasIndices: boolean;
  }
}

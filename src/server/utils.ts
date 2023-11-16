import type { Position, Range } from "vscode-languageserver/node";

export function fileUri2relative(uri: string, workspaceFolders: string[]) {
  // TODO: find the longest match?
  for (const folder of workspaceFolders) {
    if (uri.startsWith(folder)) {
      return uri.slice(folder.length + 1); // +1 for the slash
    }
  }
  return uri;
}

export function buildMarkupContent(content: string[][]) {
  return content.map((l) => l.join("\n")).join("\n\n---\n\n"); // separator
}

export function debounce<Params extends unknown[]>(
  delay: number,
  cb: (...args: Params) => void
) {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  return (...args: Params) => {
    clearTimeout(timeoutHandle);
    timeoutHandle = setTimeout(() => {
      cb(...args);
    }, delay);
  };
}

export function posInRange(pos: Position, range: Range) {
  return (
    pos.line >= range.start.line &&
    pos.line <= range.end.line &&
    pos.character >= range.start.character &&
    pos.character <= range.end.character
  );
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

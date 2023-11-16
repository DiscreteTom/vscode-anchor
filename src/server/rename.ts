import type {
  PrepareRenameParams,
  Range,
  RenameParams,
  RequestHandler,
  ServerRequestHandler,
  TextDocuments,
  WorkspaceEdit,
} from "vscode-languageserver/node";
import { state } from "./state";
import type { TextDocument } from "vscode-languageserver-textdocument";

export function prepareRenameHandler(
  documents: TextDocuments<TextDocument>
): RequestHandler<
  PrepareRenameParams,
  | Range
  | {
      range: Range;
      placeholder: string;
    }
  | {
      defaultBehavior: boolean;
    }
  | null
  | undefined,
  void
> {
  return (params) => {
    // make sure file scanner is ready
    const scanner = state.fileScanner;
    if (scanner === undefined) return;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const line = documents.get(params.textDocument.uri)!.getText({
      start: { line: params.position.line, character: 0 },
      end: { line: params.position.line + 1, character: 0 },
    });

    // get all defs/refs in this line
    const matches = [] as { name: string; range: Range; nameRange: Range }[];
    scanner.scanLine(
      line,
      params.position.line,
      scanner.definitionRegex,
      (name, range, nameRange) => {
        matches.push({ name, range, nameRange });
      }
    );
    scanner.scanLine(
      line,
      params.position.line,
      scanner.referenceRegex,
      (name, range, nameRange) => {
        matches.push({ name, range, nameRange });
      }
    );

    // find the match that contains the cursor
    for (const m of matches) {
      if (
        m.range.start.character <= params.position.character &&
        m.range.end.character >= params.position.character
      ) {
        return m.nameRange;
      }
    }

    // if no match contains the cursor, return undefined
    return;
  };
}

export const renameProvider: ServerRequestHandler<
  RenameParams,
  WorkspaceEdit | null | undefined,
  never,
  void
> = (params) => {
  const defs = state.uri2defs.get(params.textDocument.uri) ?? [];
  const refs = state.uri2refs.get(params.textDocument.uri) ?? [];

  if (defs.length === 0 && refs.length === 0) {
    return null;
  }

  // TODO: sort and use binary search?
  for (const s of defs) {
    if (s.range.start.line === params.position.line) {
      if (
        s.range.start.character <= params.position.character &&
        s.range.end.character >= params.position.character
      ) {
        const res = {
          changes: {
            [params.textDocument.uri]: [
              {
                range: s.nameRange,
                newText: params.newName,
              },
            ],
          },
        };
        state.uri2refs.forEach((refs, uri) => {
          refs.forEach((ref) => {
            if (ref.name === s.name) {
              if (!res.changes[uri]) {
                res.changes[uri] = [];
              }
              res.changes[uri].push({
                range: ref.nameRange,
                newText: params.newName,
              });
            }
          });
        });
        return res;
      }
    }
    // TODO: optimize code
    for (const s of refs) {
      if (s.range.start.line === params.position.line) {
        if (
          s.range.start.character <= params.position.character &&
          s.range.end.character >= params.position.character
        ) {
          const def = state.name2defs.get(s.name);
          if (!def) {
            return null;
          }
          const res = {
            changes: {
              [params.textDocument.uri]: [
                {
                  range: def[0].nameRange,
                  newText: params.newName,
                },
              ],
            },
          };
          state.uri2refs.forEach((refs, uri) => {
            refs.forEach((ref) => {
              if (ref.name === s.name) {
                if (!res.changes[uri]) {
                  res.changes[uri] = [];
                }
                res.changes[uri].push({
                  range: ref.nameRange,
                  newText: params.newName,
                });
              }
            });
          });
          return res;
        }
      }
    }
    if (s.range.start.line > params.position.line) break;
  }
};

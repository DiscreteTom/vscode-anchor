import type {
  RenameParams,
  ServerRequestHandler,
  WorkspaceEdit,
} from "vscode-languageserver/node";
import { state } from "./state";

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

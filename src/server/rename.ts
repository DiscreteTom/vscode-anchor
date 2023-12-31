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
import { posInRange } from "./utils";

export function prepareRenameProvider(
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
      if (posInRange(params.position, m.range)) {
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

  // find the definition that needs to be renamed
  // TODO: sort and use binary search?
  let def = undefined as
    | undefined
    | { name: string; range: Range; nameRange: Range; uri: string };
  for (const d of defs) {
    if (posInRange(params.position, d.range)) {
      def = { ...d, uri: params.textDocument.uri };
      break;
    }
  }
  if (def === undefined) {
    for (const r of refs) {
      if (posInRange(params.position, r.range)) {
        const nameDef = state.name2defs.get(r.name)?.[0];
        if (nameDef === undefined) {
          // no definition for this reference
          return null;
        }
        def = { ...nameDef, name: r.name };
        break;
      }
    }
  }

  if (def === undefined) return null;

  // theDef is not undefined here
  const theDef = def;

  // execute the rename
  // first, rename the def
  const res = {
    changes: {
      [theDef.uri]: [
        {
          range: theDef.nameRange,
          newText: params.newName,
        },
      ],
    },
  };
  // then rename refs
  state.uri2refs.forEach((refs, uri) => {
    refs.forEach((ref) => {
      if (ref.name === theDef.name) {
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
};

import type { Range, ReferenceParams } from "vscode-languageserver/node";
import { state } from "./state";

export function referenceProvider(params: ReferenceParams) {
  const defs = state.uri2defs.get(params.textDocument.uri) ?? [];
  if (defs.length === 0) {
    return;
  }

  // TODO: sort, use binary search
  for (const d of defs) {
    if (
      d.range.start.line === params.position.line &&
      d.range.start.character <= params.position.character &&
      d.range.end.character >= params.position.character
    ) {
      const res = [] as { uri: string; range: Range }[];
      state.uri2refs.forEach((refs, uri) => {
        refs.forEach((r) => {
          if (r.name === d.name) {
            res.push({ uri, range: r.range });
          }
        });
      });
      return res;
    }
  }
}

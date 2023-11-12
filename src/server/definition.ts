import type { DefinitionParams } from "vscode-languageserver/node";
import { state } from "./state";

export function definitionProvider(params: DefinitionParams) {
  const refs = state.uri2refs.get(params.textDocument.uri) ?? [];
  if (refs.length === 0) {
    return;
  }

  // TODO: sort, use binary search
  for (const r of refs) {
    if (
      r.range.start.line === params.position.line &&
      r.range.start.character <= params.position.character &&
      r.range.end.character >= params.position.character
    ) {
      const def = state.name2defs.get(r.name)?.at(0);
      if (def === undefined) {
        return;
      }
      return {
        uri: def.uri,
        range: def.range,
      };
    }
  }
}

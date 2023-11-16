import type { DefinitionParams } from "vscode-languageserver/node";
import { state } from "./state";
import { posInRange } from "./utils";

export function definitionProvider(params: DefinitionParams) {
  const refs = state.uri2refs.get(params.textDocument.uri) ?? [];
  if (refs.length === 0) {
    return;
  }

  // TODO: sort, use binary search
  for (const r of refs) {
    if (posInRange(params.position, r.range)) {
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

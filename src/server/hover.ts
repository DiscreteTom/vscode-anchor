import type { HoverParams } from "vscode-languageserver/node";
import { buildMarkupContent, fileUri2relative, posInRange } from "./utils";
import { Kind } from "./model";
import { state } from "./state";

export function hoverProvider(params: HoverParams) {
  const defs = (state.uri2defs.get(params.textDocument.uri) ?? []).map((d) => ({
    ...d,
    type: Kind.def,
  }));
  const refs = (state.uri2refs.get(params.textDocument.uri) ?? []).map((d) => ({
    ...d,
    type: Kind.ref,
  }));
  if (defs.length === 0 && refs.length === 0) {
    // console.log(`no defs or refs in ${params.textDocument.uri}`);
    return;
  }

  const sorted = [...defs, ...refs].sort((a, b) =>
    a.range.start.line === b.range.start.line
      ? a.range.start.character - b.range.start.character
      : a.range.start.line - b.range.start.line
  );

  // TODO: use binary search
  for (const s of sorted) {
    if (s.range.start.line === params.position.line) {
      if (posInRange(params.position, s.range)) {
        if (s.type === Kind.def) {
          return {
            contents: {
              kind: "markdown" as const,
              value: buildMarkupContent([
                ["```ts", JSON.stringify(s.name), "```"],
                [`Code Anchor definition.`],
              ]),
            },
            range: s.range,
          };
        }
        // else, ref
        const def = (state.name2defs.get(s.name) ?? []).at(0);
        return {
          contents: {
            kind: "markdown" as const,
            value: buildMarkupContent([
              ["```ts", JSON.stringify(s.name), "```"],
              def === undefined
                ? [`The anchor for ${JSON.stringify(s.name)} is not defined`]
                : [
                    `From: [${fileUri2relative(
                      def.uri,
                      state.workspaceFolders
                    )}](${def.uri}).`,
                  ],
              def === undefined
                ? [`Code Anchor reference.`]
                : [
                    `Code Anchor reference. [Go to definition](${def.uri}#L${
                      def.range.start.line + 1
                    },${def.range.start.character + 1}) (ctrl+click).`,
                  ],
            ]),
          },
          range: s.range,
        };
      }
    }
    if (s.range.start.line > params.position.line) break;
  }
}

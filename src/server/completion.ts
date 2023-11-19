import type {
  CompletionItem,
  CompletionParams,
  TextDocuments,
} from "vscode-languageserver/node";
import { CompletionItemKind } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { state } from "./state";
import { fileUri2relative } from "../common";

export function completionProvider(documents: TextDocuments<TextDocument>) {
  return (params: CompletionParams) => {
    const completionPrefixRegex = state.completionPrefixRegex;
    if (completionPrefixRegex === undefined) return [];

    // get prefix in current line
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const prefix = documents.get(params.textDocument.uri)!.getText({
      start: { line: params.position.line, character: 0 },
      end: { line: params.position.line, character: params.position.character },
    });

    completionPrefixRegex.lastIndex = 0;
    // use matchAll in case current line has multiple refs
    // pick the last one which is the closest to the cursor
    const prefixMatch = [...prefix.matchAll(completionPrefixRegex)].at(-1);
    if (prefixMatch === undefined) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const defPrefix = prefix.slice(prefixMatch.index! + prefixMatch[0].length);

    const result: CompletionItem[] = [];

    for (const [name, defs] of state.name2defs.entries()) {
      if (!name.startsWith(defPrefix)) {
        continue;
      }
      result.push({
        label: name,
        kind: CompletionItemKind.Constant,
        labelDetails: {
          description: fileUri2relative(defs[0].uri, state.workspaceFolders),
        },
        detail: "Code Anchor definition",
        filterText: name,
      });
    }

    return result;
  };
}

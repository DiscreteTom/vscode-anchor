import type {
  CompletionItem,
  CompletionParams,
  TextDocuments,
} from "vscode-languageserver/node";
import { CompletionItemKind } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { state } from "./state";
import { fileUri2relative } from "./utils";

export function completionProvider(documents: TextDocuments<TextDocument>) {
  return (params: CompletionParams) => {
    const completionPrefixPattern = state.completionPrefixPattern;
    if (completionPrefixPattern === undefined) return [];

    // get prefix in current line
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const prefix = documents.get(params.textDocument.uri)!.getText({
      start: { line: params.position.line, character: 0 },
      end: { line: params.position.line, character: params.position.character },
    });

    const prefixMatch = completionPrefixPattern.exec(prefix);
    if (prefixMatch === null) {
      return [];
    }

    const defPrefix = prefix.slice(prefixMatch.index + prefixMatch[0].length);

    const result: CompletionItem[] = [];

    for (const [name, def] of state.name2defs.entries()) {
      if (!name.startsWith(defPrefix)) {
        continue;
      }
      result.push({
        label: name,
        kind: CompletionItemKind.Constant,
        labelDetails: {
          description: fileUri2relative(def[0].uri, state.workspaceFolders),
        },
        detail: "Code Anchor definition",
        filterText: name,
      });
    }

    return result;
  };
}

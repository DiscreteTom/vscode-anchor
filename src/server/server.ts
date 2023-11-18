import type {
  DiagnosticSeverity,
  InitializeParams,
} from "vscode-languageserver/node";
import {
  createConnection,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver/node";
import { state } from "./state";
import { TextDocument } from "vscode-languageserver-textdocument";
import { semanticTokenProvider } from "./semanticToken";
import { hoverProvider } from "./hover";
import { definitionProvider } from "./definition";
import { referenceProvider } from "./reference";
import { completionProvider } from "./completion";
import { prepareRenameProvider, renameProvider } from "./rename";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize(async (params: InitializeParams) => {
  const options = params.initializationOptions as {
    definitionPattern: string;
    referencePattern: string;
    completionPrefixPattern: string;
    completionTriggerCharacters: string[];
    diagnosticSeverity: DiagnosticSeverity;
    allowUnusedDefinitions: boolean;
    updateFileDebounceLatency: number;
    vscodeRootPath: string;
  };
  const workspaceFolders = params.workspaceFolders?.map((f) => f.uri) ?? [];

  console.log(`initialization options: ${JSON.stringify(options)}`);
  console.log(`workspace folders: ${JSON.stringify(workspaceFolders)}`);

  await state.init({
    ...options,
    documents,
    workspaceFolders,
  });

  return {
    capabilities: {
      renameProvider: {
        prepareProvider: true,
      },
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      completionProvider: {
        triggerCharacters: options.completionTriggerCharacters,
        resolveProvider: false,
      },
      semanticTokensProvider: {
        legend: {
          // [[semantic token legends]]
          tokenTypes: ["class", "type"],
          tokenModifiers: ["defaultLibrary"],
        },
        full: {
          delta: false, // TODO: support delta?
        },
      },
      definitionProvider: true,
      referencesProvider: true,
    },
  };
});

connection.languages.semanticTokens.on(semanticTokenProvider);
connection.onHover(hoverProvider);
connection.onDefinition(definitionProvider);
connection.onReferences(referenceProvider);
connection.onCompletion(completionProvider(documents));
connection.onRenameRequest(renameProvider);
connection.onPrepareRename(prepareRenameProvider(documents));

async function updateClient() {
  connection.languages.semanticTokens.refresh();
  state.refreshDiagnostic();
  const ps = [] as Promise<void>[];
  state.uri2diagnostics.forEach((diagnostics, uri) => {
    ps.push(connection.sendDiagnostics({ uri, diagnostics }));
  });
  await Promise.all(ps);

  // construct tree
  const treeData = [] as {
    name: string;
    uri: string;
    // deep copy range
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    refs: {
      uri: string;
      range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
    }[];
  }[];
  state.name2defs.forEach((defs, name) => {
    if (defs.length === 1) {
      treeData.push({
        name,
        uri: defs[0].uri,
        range: {
          start: {
            line: defs[0].range.start.line,
            character: defs[0].range.start.character,
          },
          end: {
            line: defs[0].range.end.line,
            character: defs[0].range.end.character,
          },
        },
        refs: (state.name2refs.get(name) ?? []).map((r) => ({
          uri: r.uri,
          range: {
            start: {
              line: r.range.start.line,
              character: r.range.start.character,
            },
            end: {
              line: r.range.end.line,
              character: r.range.end.character,
            },
          },
        })),
      });
    }
  });
  connection.sendRequest("code-anchor/refreshTree", treeData);
}

connection.onRequest("code-anchor/init", async () => {
  await updateClient();
  console.log(`init done`);
});

connection.onRequest("code-anchor/refresh", async () => {
  state.clearAll();
  await updateClient();
  await state.refresh();
  await updateClient();
  console.log(`refresh done`);
});

connection.onRequest(
  "code-anchor/refreshSettings",
  async (params: {
    definitionPattern: string;
    referencePattern: string;
    completionPrefixPattern: string;
    completionTriggerCharacters: string[];
    diagnosticSeverity: DiagnosticSeverity;
    allowUnusedDefinitions: boolean;
    updateFileDebounceLatency: number;
  }) => {
    console.log(`refresh settings: ${JSON.stringify(params)}`);
    await state.init({
      ...params,
      documents,
      vscodeRootPath: state.vscodeRootPath,
      workspaceFolders: [...state.workspaceFolders], // copy
    });
    await updateClient();
  }
);

documents.listen(connection);
documents.onDidOpen((_event) => {
  // console.log(`open ${event.document.uri}`);
  // since we already scan all files in the workspace, we don't need to update the file here
  // state.updateFile(event.document.uri);
});

const timeoutMap = new Map<string, ReturnType<typeof setTimeout>>();
documents.onDidChangeContent((change) => {
  // uri-aware debounce
  const timeoutHandle = timeoutMap.get(change.document.uri);
  if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);

  const timeout = state.updateFileDebounceLatency;
  timeoutMap.set(
    change.document.uri,
    setTimeout(() => {
      console.log(
        `change (debounced after ${timeout}ms) ${change.document.uri}`
      );
      state.updateFile(change.document.uri, change.document.getText());
      updateClient();
    }, state.updateFileDebounceLatency)
  );
});

connection.listen();

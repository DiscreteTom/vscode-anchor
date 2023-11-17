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

function updateClient() {
  connection.languages.semanticTokens.refresh();
  state.refreshDiagnostic();
  state.uri2diagnostics.forEach((diagnostics, uri) => {
    connection.sendDiagnostics({ uri, diagnostics });
  });
}

connection.onRequest("code-anchor/init", async () => {
  updateClient();
  console.log(`init done`);
});

connection.onRequest("code-anchor/refresh", async () => {
  state.clearAll();
  updateClient();
  await state.refresh();
  updateClient();
  console.log(`refresh done`);
});

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
  timeoutMap.set(
    change.document.uri,
    setTimeout(() => {
      console.log(`change (debounced) ${change.document.uri}`);
      state.updateFile(change.document.uri, change.document.getText());
      updateClient();
    }, 200)
  );
});

connection.listen();

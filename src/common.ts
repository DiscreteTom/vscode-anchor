// common types & functions for server/client

export type ServerInitializationOptions = {
  definitionPattern: string;
  referencePattern: string;
  completionPrefixPattern: string;
  completionTriggerCharacters: string[];
  /**
   * `DiagnosticSeverity`.
   */
  diagnosticSeverity: number;
  allowUnusedDefinitions: boolean;
  updateFileDebounceLatency: number;
  vscodeRootPath: string;
};

export type TreeData = {
  name: string;
  uri: string;
  // deep copy range to prevent unexpected serialization error
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

export function constructPosUri(
  fileUri: string,
  pos: { line: number; character: number }
) {
  // https://github.com/microsoft/vscode/issues/149523
  return `${fileUri}#L${pos.line + 1},${pos.character + 1}`;
}

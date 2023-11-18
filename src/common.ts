// common types for server/client

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

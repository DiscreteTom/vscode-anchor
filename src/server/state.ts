import type { Range } from "vscode-languageserver/node";
import {
  DiagnosticSeverity,
  type Diagnostic,
} from "vscode-languageserver/node";

export class State {
  /**
   * The key is file's uri.
   */
  diagnostics: Map<string, Diagnostic[]>;
  /**
   * The key is definition's name.
   * Duplicated definitions are also recorded but will send diagnostics.
   */
  defs: Map<string, { uri: string; range: Range }[]>;
  /**
   * The key is the file's uri.
   */
  refs: Map<string, { name: string; range: Range }[]>;

  constructor() {
    this.diagnostics = new Map();
    this.defs = new Map();
    this.refs = new Map();
  }

  appendDiagnostic(uri: string, diagnostic: Omit<Diagnostic, "source">) {
    const diagnostics = this.diagnostics.get(uri) ?? [];
    diagnostics.push({ ...diagnostic, source: "Code Anchor" });
    this.diagnostics.set(uri, diagnostics);
  }

  /**
   * If the definition is duplicated, append a diagnostic.
   */
  appendDefinition(name: string, uri: string, range: Range) {
    const defs = this.defs.get(name) ?? [];
    defs.push({ uri, range });
    this.defs.set(name, defs);
    if (defs.length > 1) {
      this.appendDiagnostic(uri, {
        severity: DiagnosticSeverity.Error,
        range,
        message: `duplicate definition: ${name}`,
      });
    }
  }

  appendReference(name: string, uri: string, range: Range) {
    const refs = this.refs.get(uri) ?? [];
    refs.push({ name, range });
    this.refs.set(uri, refs);
  }
}

export const state = new State();

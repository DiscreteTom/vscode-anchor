import type { Range, TextDocuments } from "vscode-languageserver/node";
import {
  DiagnosticSeverity,
  type Diagnostic,
} from "vscode-languageserver/node";
import { fileUri2relative } from "./utils";
import type { ScanResult } from "./scanner";
import { RegexScanner } from "./scanner";
import { RipGrepScanner } from "./scanner";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { Kind } from "./model";

export class State {
  folderScanner?: RipGrepScanner;
  fileScanner?: RegexScanner;
  completionPrefixRegex?: RegExp;
  severity: DiagnosticSeverity;
  allowUnusedDefinitions: boolean;
  readonly workspaceFolders: string[];
  readonly uri2diagnostics: Map<string, Diagnostic[]>;
  /**
   * Duplicated definitions are also recorded but will send diagnostics.
   */
  readonly name2defs: Map<
    string,
    { uri: string; range: Range; nameRange: Range }[]
  >;
  readonly uri2defs: Map<
    string,
    { name: string; range: Range; nameRange: Range }[]
  >;
  readonly name2refs: Map<
    string,
    { uri: string; range: Range; nameRange: Range }[]
  >;
  readonly uri2refs: Map<
    string,
    { name: string; range: Range; nameRange: Range }[]
  >;

  constructor() {
    this.workspaceFolders = [];
    this.uri2diagnostics = new Map();
    this.name2defs = new Map();
    this.uri2defs = new Map();
    this.name2refs = new Map();
    this.uri2refs = new Map();
    this.severity = DiagnosticSeverity.Information;
    this.allowUnusedDefinitions = false;
  }

  async init(props: {
    definitionPattern: string;
    referencePattern: string;
    completionPrefixPattern: string;
    diagnosticSeverity: DiagnosticSeverity;
    allowUnusedDefinitions: boolean;
    documents: TextDocuments<TextDocument>;
    vscodeRootPath: string;
    workspaceFolders: string[];
  }) {
    const definitionRegex = new RegExp(props.definitionPattern, "dg");
    const referenceRegex = new RegExp(props.referencePattern, "dg");
    this.completionPrefixRegex = new RegExp(props.completionPrefixPattern, "g");
    this.workspaceFolders.splice(0, this.workspaceFolders.length);
    this.workspaceFolders.push(...props.workspaceFolders);
    this.severity = props.diagnosticSeverity;
    this.allowUnusedDefinitions = props.allowUnusedDefinitions;

    // init scanners
    // these regex are re-used in different scanner
    // make sure to set lastIndex before using them
    // [[def/ref regex]]
    this.fileScanner = new RegexScanner({
      definitionRegex,
      referenceRegex,
      documents: props.documents,
    });
    this.folderScanner = new RipGrepScanner({
      definitionRegex,
      referenceRegex,
    });

    // if folder scanner init failed, we can still use file scanner
    // so we need to catch the error here
    try {
      await this.folderScanner.init(props.vscodeRootPath);
    } catch (e) {
      // delete folder scanner
      this.folderScanner = undefined;
      console.log(e);
    }

    // scan workspace folders
    this.clearAll();
    await this.refresh();
  }

  /**
   * Re-scan workspace folders.
   * Before calling this you might want to call `clearAll` to clear previous results.
   */
  async refresh() {
    const folderScanner = this.folderScanner;
    if (folderScanner === undefined) {
      console.log(`refresh: no folder scanner`);
      return;
    }

    console.time("refresh");
    (
      await Promise.all(
        this.workspaceFolders.map((f) => folderScanner.scanFolder(f))
      )
    ).forEach((rr) => rr.forEach((r) => this.appendResult(r)));
    console.log(`finish scan workspace folders`);
    console.timeEnd("refresh");
  }

  /**
   * Re-scan a single file.
   * If `text` is not provided, the file will be read from `documents`.
   */
  updateFile(uri: string, text?: string) {
    // clear states about the file
    // defs
    (this.uri2defs.get(uri) ?? []).forEach((d) => {
      this.name2defs.set(
        d.name,
        (this.name2defs.get(d.name) ?? []).filter((dd) => dd.uri !== uri)
      );
    });
    this.uri2defs.set(uri, []);
    // refs
    (this.uri2refs.get(uri) ?? []).forEach((r) => {
      this.name2refs.set(
        r.name,
        (this.name2refs.get(r.name) ?? []).filter((rr) => rr.uri !== uri)
      );
    });
    this.uri2refs.set(uri, []);

    // scan the file
    this.fileScanner?.scanFile(uri, text).forEach((r) => this.appendResult(r));
  }

  private appendResult(r: ScanResult) {
    if (r.kind === Kind.def)
      this.appendDefinition(r.uri, r.name, r.range, r.nameRange);
    else this.appendReference(r.uri, r.name, r.range, r.nameRange);
  }

  appendDiagnostic(uri: string, diagnostic: Omit<Diagnostic, "source">) {
    const diagnostics = this.uri2diagnostics.get(uri) ?? [];
    diagnostics.push({ ...diagnostic, source: "Code Anchor" });
    this.uri2diagnostics.set(uri, diagnostics);
  }

  private appendDefinition(
    uri: string,
    name: string,
    range: Range,
    nameRange: Range
  ) {
    const uri2def = this.uri2defs.get(uri) ?? [];
    uri2def.push({ name, range, nameRange });
    this.uri2defs.set(uri, uri2def);

    const name2def = this.name2defs.get(name) ?? [];
    name2def.push({ uri, range, nameRange });
    this.name2defs.set(name, name2def);
  }

  private appendReference(
    uri: string,
    name: string,
    range: Range,
    nameRange: Range
  ) {
    const uri2refs = this.uri2refs.get(uri) ?? [];
    uri2refs.push({ name, range, nameRange });
    this.uri2refs.set(uri, uri2refs);

    const name2refs = this.name2refs.get(name) ?? [];
    name2refs.push({ uri, range, nameRange });
    this.name2refs.set(name, name2refs);
  }

  clearAll() {
    this.clearDiagnostics();
    this.name2defs.clear();
    this.uri2defs.clear();
    this.name2refs.clear();
    this.uri2refs.clear();
  }

  clearDiagnostics() {
    // IMPORTANT: don't use `this.uri2diagnostics.clear()`
    // because the `uri` is used as the key in the `connection.sendDiagnostics` call.
    // if the uri has no diagnostics, send empty array to client to clear existing diagnostics.
    this.uri2diagnostics.forEach((ds) => ds.splice(0, ds.length));
  }

  refreshDiagnostic() {
    // clear diagnostics
    this.clearDiagnostics();

    // find duplicated definitions
    for (const [name, defs] of this.name2defs) {
      if (defs.length > 1) {
        defs.forEach((def) => {
          this.appendDiagnostic(def.uri, {
            severity: this.severity,
            range: def.range,
            message: `duplicate definition: ${JSON.stringify(
              name
            )}, found at ${defs
              .map(
                (d) =>
                  `${fileUri2relative(d.uri, this.workspaceFolders)}:${
                    d.range.start.line + 1
                  }:${d.range.start.character + 1}`
              )
              .join(", ")}`,
          });
        });
      }
    }

    // find undefined references
    for (const [uri, refs] of this.uri2refs) {
      refs.forEach((ref) => {
        if (!this.name2defs.has(ref.name)) {
          this.appendDiagnostic(uri, {
            severity: this.severity,
            range: ref.range,
            message: `undefined reference: ${JSON.stringify(ref.name)}`,
          });
        }
      });
    }

    if (!this.allowUnusedDefinitions) {
      // find definition with no references
      for (const [uri, defs] of this.uri2defs) {
        defs.forEach((def) => {
          if ((this.name2refs.get(def.name) ?? []).length === 0) {
            this.appendDiagnostic(uri, {
              severity: this.severity,
              range: def.range,
              message: `unused definition: ${JSON.stringify(def.name)}`,
            });
          }
        });
      }
    }
  }
}

export const state = new State();

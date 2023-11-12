import type { Range } from "vscode-languageserver/node";
import {
  DiagnosticSeverity,
  type Diagnostic,
} from "vscode-languageserver/node";
import { fileUri2relative } from "./utils";

// https://github.com/microsoft/TypeScript/issues/44227
declare global {
  interface RegExpIndicesArray extends Array<[number, number]> {
    groups?: {
      [key: string]: [number, number];
    };

    // eslint-disable-next-line @typescript-eslint/naming-convention
    0: [number, number];
  }

  interface RegExpMatchArray {
    indices?: RegExpIndicesArray;
  }

  interface RegExpExecArray {
    indices?: RegExpIndicesArray;
  }

  interface RegExp {
    readonly hasIndices: boolean;
  }
}

export class State {
  definitionPattern?: RegExp;
  referencePattern?: RegExp;
  completionPrefixPattern?: RegExp;
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
  readonly uri2refs: Map<
    string,
    { name: string; range: Range; nameRange: Range }[]
  >;

  constructor() {
    this.workspaceFolders = [];
    this.uri2diagnostics = new Map();
    this.name2defs = new Map();
    this.uri2defs = new Map();
    this.uri2refs = new Map();
  }

  setPatterns(patterns: {
    def: string;
    ref: string;
    completionPrefix: string;
  }) {
    this.definitionPattern = new RegExp(patterns.def, "dg");
    this.referencePattern = new RegExp(patterns.ref, "dg");
    this.completionPrefixPattern = new RegExp(patterns.completionPrefix);
  }

  setWorkspaceFolders(workspaceFolders: string[]) {
    this.workspaceFolders.splice(0, this.workspaceFolders.length);
    this.workspaceFolders.push(...workspaceFolders);
  }

  // TODO: accept multi diagnostics
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
    const refs = this.uri2refs.get(uri) ?? [];
    refs.push({ name, range, nameRange });
    this.uri2refs.set(uri, refs);
  }

  /**
   * Scan for definitions and references in the given text.
   * Update the state.
   * If `override` is `true`, clear all defs and refs in this line.
   */
  scanFile(
    uri: string,
    text: string,
    options: {
      override: boolean;
    }
  ) {
    const definitionPattern = this.definitionPattern;
    const referencePattern = this.referencePattern;

    if (definitionPattern === undefined || referencePattern === undefined) {
      return;
    }

    if (options.override) {
      // defs
      (this.uri2defs.get(uri) ?? []).forEach((d) => {
        this.name2defs.delete(d.name);
      });
      this.uri2defs.set(uri, []);

      // refs
      this.uri2refs.set(uri, []);
    }

    text.split("\n").forEach((line, lineIndex) => {
      // defs
      this.matchLine(
        line,
        lineIndex,
        definitionPattern,
        (name, range, nameRange) => {
          // console.log(`found def: ${JSON.stringify(name)}`);
          this.appendDefinition(uri, name, range, nameRange);
        }
      );

      // refs
      this.matchLine(
        line,
        lineIndex,
        referencePattern,
        (name, range, nameRange) => {
          // console.log(`found ref: ${JSON.stringify(name)}`);
          this.appendReference(uri, name, range, nameRange);
        }
      );
    });
  }

  refreshDiagnostic() {
    // clear diagnostics
    // IMPORTANT: don't use `this.uri2diagnostics.clear()`
    // because the `uri` is used as the key in the `connection.sendDiagnostics` call.
    // if the uri has no diagnostics, send empty array to client to clear existing diagnostics.
    this.uri2diagnostics.forEach((ds) => ds.splice(0, ds.length));

    // find duplicated definitions
    for (const [name, defs] of this.name2defs) {
      if (defs.length > 1) {
        defs.forEach((def) => {
          this.appendDiagnostic(def.uri, {
            severity: DiagnosticSeverity.Information, // TODO: make this configurable?
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
            severity: DiagnosticSeverity.Information,
            range: ref.range,
            message: `undefined reference: ${JSON.stringify(ref.name)}`,
          });
        }
      });
    }
  }

  private matchLine(
    line: string,
    lineIndex: number,
    pattern: RegExp,
    cb: (
      /**
       * The name is the content of the first capture group.
       */
      name: string,
      range: Range,
      nameRange: Range
    ) => void
  ) {
    for (const m of line.matchAll(pattern)) {
      cb(
        m[1], // the first capture group
        {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          start: { line: lineIndex, character: m.index! },
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          end: { line: lineIndex, character: m.index! + m[0].length },
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          start: { line: lineIndex, character: m.indices![1][0] },
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          end: { line: lineIndex, character: m.indices![1][1] },
        }
      );
    }
  }
}

export const state = new State();

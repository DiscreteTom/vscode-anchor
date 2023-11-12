import type { Range } from "vscode-languageserver/node";
import {
  DiagnosticSeverity,
  type Diagnostic,
} from "vscode-languageserver/node";

export class State {
  readonly uri2diagnostics: Map<string, Diagnostic[]>;
  /**
   * Duplicated definitions are also recorded but will send diagnostics.
   */
  readonly name2defs: Map<string, { uri: string; range: Range }[]>;
  readonly uri2defs: Map<string, { name: string; range: Range }[]>;
  readonly uri2refs: Map<string, { name: string; range: Range }[]>;

  constructor() {
    this.uri2diagnostics = new Map();
    this.name2defs = new Map();
    this.uri2defs = new Map();
    this.uri2refs = new Map();
  }

  // TODO: accept multi diagnostics
  appendDiagnostic(uri: string, diagnostic: Omit<Diagnostic, "source">) {
    const diagnostics = this.uri2diagnostics.get(uri) ?? [];
    diagnostics.push({ ...diagnostic, source: "Code Anchor" });
    this.uri2diagnostics.set(uri, diagnostics);
  }

  /**
   * If the definition is duplicated, append a diagnostic.
   */
  private appendDefinition(uri: string, name: string, range: Range) {
    const uri2def = this.uri2defs.get(uri) ?? [];
    uri2def.push({ name, range });
    this.uri2defs.set(uri, uri2def);

    const name2def = this.name2defs.get(name) ?? [];
    name2def.push({ uri, range });
    this.name2defs.set(name, name2def);

    if (name2def.length > 1) {
      this.appendDiagnostic(uri, {
        severity: DiagnosticSeverity.Error,
        range,
        message: `duplicate definition: ${name}`,
      });
    }
  }

  private appendReference(uri: string, name: string, range: Range) {
    const refs = this.uri2refs.get(uri) ?? [];
    refs.push({ name, range });
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
    patterns: { def: RegExp; ref: RegExp },
    options: {
      override: boolean;
    }
  ) {
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
      this.matchLine(line, lineIndex, patterns.def, (name, range) => {
        // console.log(`found def: ${JSON.stringify(name)}`);
        this.appendDefinition(uri, name, range);
      });

      // refs
      this.matchLine(line, lineIndex, patterns.ref, (name, range) => {
        // console.log(`found ref: ${JSON.stringify(name)}`);
        this.appendReference(uri, name, range);
      });
    });

    // TODO: update diagnostics
  }

  /**
   * If `override` is `true`, clear all defs and refs in this line.
   */
  // scanLine(
  //   uri: string,
  //   line: string,
  //   lineIndex: number,
  //   patterns: { def: RegExp; ref: RegExp },
  //   override = true
  // ) {
  //   if (override) {
  //     // defs
  //     const defsInUri = this.uri2defs.get(uri) ?? [];
  //     defsInUri
  //       .filter((d) => d.range.start.line === lineIndex)
  //       .forEach((d) => this.name2defs.delete(d.name));
  //     this.uri2defs.set(
  //       uri,
  //       defsInUri.filter((d) => d.range.start.line !== lineIndex)
  //     );

  //     // refs
  //     const refs = this.uri2refs.get(uri) ?? [];
  //     this.uri2refs.set(
  //       uri,
  //       refs.filter((ref) => ref.range.start.line !== lineIndex)
  //     );
  //   }

  //   // defs
  //   this.matchLine(line, lineIndex, patterns.def, (name, range) => {
  //     this.appendDefinition(uri, name, range);
  //   });
  //   // refs
  //   this.matchLine(line, lineIndex, patterns.ref, (name, range) => {
  //     this.appendReference(uri, name, range);
  //   });
  // }

  private matchLine(
    line: string,
    lineIndex: number,
    pattern: RegExp,
    cb: (
      /**
       * The name is the content of the first capture group.
       */
      name: string,
      range: Range
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
        }
      );
    }
  }
}

export const state = new State();
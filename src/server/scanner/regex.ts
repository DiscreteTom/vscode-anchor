import type { TextDocument } from "vscode-languageserver-textdocument";
import type { Range, TextDocuments } from "vscode-languageserver/node";
import type { ScanResult } from "./model";
import { Kind } from "../model";

/**
 * This scanner is used to scan a single file.
 */
export class RegexScanner {
  readonly definitionRegex: RegExp;
  readonly referenceRegex: RegExp;
  readonly documents: TextDocuments<TextDocument>;

  constructor(
    props: Pick<
      RegexScanner,
      "definitionRegex" | "referenceRegex" | "documents"
    >
  ) {
    this.definitionRegex = props.definitionRegex;
    this.referenceRegex = props.referenceRegex;
    this.documents = props.documents;
  }

  scanFile(uri: string): ScanResult[] {
    const res = [] as ScanResult[];

    (this.documents.get(uri)?.getText() ?? "")
      .split("\n")
      .forEach((line, lineIndex) => {
        // defs
        this.scanLine(
          line,
          lineIndex,
          this.definitionRegex,
          (name, range, nameRange) => {
            res.push({ uri, name, range, nameRange, kind: Kind.def });
          }
        );

        // refs
        this.scanLine(
          line,
          lineIndex,
          this.referenceRegex,
          (name, range, nameRange) => {
            res.push({ uri, name, range, nameRange, kind: Kind.ref });
          }
        );
      });

    return res;
  }

  scanLine(
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
    // clear regex state
    // see [[@def/ref regex]]
    pattern.lastIndex = 0;

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

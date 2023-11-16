import { fileURLToPath, pathToFileURL } from "url";
import type {
  RgJsonResultLine,
  RgJsonResultLineMatch,
  SubMatch,
} from "vscode-ripgrep-utils";
import { getBinPath, search, config } from "vscode-ripgrep-utils";
import type { ScanResult } from "./model";
import { Kind } from "../model";

/**
 * This scanner is used to fast scan folders.
 */
export class RipGrepScanner {
  bin: string;
  readonly definitionPattern: string;
  readonly referencePattern: string;
  readonly definitionRegex: RegExp;
  readonly referenceRegex: RegExp;

  constructor(
    props: Pick<RipGrepScanner, "definitionRegex" | "referenceRegex">
  ) {
    this.definitionRegex = props.definitionRegex;
    this.referenceRegex = props.referenceRegex;
    this.definitionPattern = props.definitionRegex.source;
    this.referencePattern = props.referenceRegex.source;
    this.bin = "";

    // show ripgrep command
    config.debug = true;
  }

  /**
   * @throws Error if cannot find ripgrep executable
   */
  async init(vscodeAppRoot: string) {
    const bin = await getBinPath(vscodeAppRoot);
    if (bin === undefined) throw new Error("Cannot find ripgrep executable");
    this.bin = bin;
  }

  async scanFolder(folderUri: string): Promise<ScanResult[]> {
    const folder = fileURLToPath(folderUri);

    return [
      ...this.handleSearchResult(
        await search({
          bin: this.bin,
          folder,
          regex: this.definitionPattern,
        }),
        Kind.def
      ),
      ...this.handleSearchResult(
        await search({
          bin: this.bin,
          folder,
          regex: this.referencePattern,
        }),
        Kind.ref
      ),
    ];
  }

  private handleSearchResult(
    lines: RgJsonResultLine[],
    kind: Kind
  ): ScanResult[] {
    const res = [] as ScanResult[];

    lines.forEach((line) => {
      if (line.type !== "match") return;

      // file uri
      const uri = pathToFileURL(line.data.path.text).toString();

      line.data.submatches.forEach((match) => {
        const regex =
          kind === Kind.def ? this.definitionRegex : this.referenceRegex;

        // clear regex state
        // see [[@def/ref regex]]
        regex.lastIndex = 0;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const regexMatch = regex.exec(match.match.text)!;
        res.push(this.constructResult(uri, Kind.def, line, match, regexMatch));
      });
    });

    return res;
  }

  private constructResult(
    uri: string,
    kind: Kind,
    lineMatch: RgJsonResultLineMatch,
    subMatch: SubMatch,
    regexMatch: RegExpMatchArray
  ): ScanResult {
    return {
      uri,
      kind: kind,
      name: regexMatch[1], // the first capture group
      range: {
        start: {
          line: lineMatch.data.line_number - 1,
          character: subMatch.start,
        },
        end: { line: lineMatch.data.line_number - 1, character: subMatch.end },
      },
      nameRange: {
        start: {
          line: lineMatch.data.line_number - 1,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          character: subMatch.start + regexMatch.indices![1][0],
        },
        end: {
          line: lineMatch.data.line_number - 1,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          character: subMatch.start + regexMatch.indices![1][1],
        },
      },
    };
  }
}

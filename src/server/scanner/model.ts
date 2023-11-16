import type { Range } from "vscode-languageserver/node";
import type { Kind } from "../model";

export type ScanResult = {
  uri: string;
  name: string;
  range: Range;
  nameRange: Range;
  kind: Kind;
};

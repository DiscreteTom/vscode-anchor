import { compose } from "@discretetom/r-compose";
import * as fs from "fs";

// Usage: ts-node utils/regex-gen.ts

const defaultDefinitionPattern = compose(
  ({ concat, escape, some, capture, lookahead }) =>
    concat(
      escape("[["), // open quote
      lookahead(escape("@"), { negative: true }), // prevent `[[@` which is a reference
      // wrap the content in the 1st capture group
      capture(
        // at least 1, non greedy to prevent matching the close quote
        some(/./, { greedy: false })
      ),
      escape("]]") // close quote
    ),
  "g"
);

const defaultReferencePattern = compose(
  ({ concat, escape, some, capture }) =>
    concat(
      escape("[[@"), // open quote
      // wrap the content in the 1st capture group
      capture(
        // at least 1, non greedy to prevent matching the close quote
        some(/./, { greedy: false })
      ),
      escape("]]") // close quote
    ),
  "g"
);

fs.writeFileSync(
  "src/server/regex.ts",
  [
    `// This file is generated by utils/regex-gen.ts`,
    "",
    `export const defaultDefinitionPattern = ${defaultDefinitionPattern};`,
    `export const defaultReferencePattern = ${defaultReferencePattern};`,
  ].join("\n")
);

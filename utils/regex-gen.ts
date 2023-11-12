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

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.contributes.configuration.properties[
  "codeAnchor.definitionPattern"
].default = defaultDefinitionPattern.source;
pkg.contributes.configuration.properties[
  "codeAnchor.referencePattern"
].default = defaultReferencePattern.source;

fs.writeFileSync("package.json", JSON.stringify(pkg, undefined, 2));

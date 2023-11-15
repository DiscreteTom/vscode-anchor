import { compose } from "@discretetom/r-compose";
import * as fs from "fs";

// Usage: ts-node utils/regex-gen.ts

const defaultDefinitionPattern = compose(
  ({ concat, escape, any, capture, not }) =>
    concat(
      escape("[["), // open quote
      // wrap the content in the 1st capture group
      capture(
        concat(
          not(escape("@")), // the first character cannot be @, otherwise it's a reference
          // zero or many other chars, non greedy to prevent matching the close quote
          any(/./, { greedy: false })
        )
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

const defaultCompletionPrefixPattern = compose(({ escape }) => escape("[[@"));

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.contributes.configuration.properties[
  "codeAnchor.definitionPattern"
].default = defaultDefinitionPattern.source;
pkg.contributes.configuration.properties[
  "codeAnchor.referencePattern"
].default = defaultReferencePattern.source;
pkg.contributes.configuration.properties[
  "codeAnchor.completionPrefixPattern"
].default = defaultCompletionPrefixPattern.source;

fs.writeFileSync("package.json", JSON.stringify(pkg, undefined, 2));

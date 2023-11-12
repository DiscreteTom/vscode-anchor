import type {
  SemanticTokens,
  SemanticTokensParams,
} from "vscode-languageserver/node";
import { state } from "./state";
import { Kind } from "./model";

export function semanticTokenProvider(params: SemanticTokensParams) {
  const defs = (state.uri2defs.get(params.textDocument.uri) ?? []).map((d) => ({
    ...d,
    type: Kind.def,
  }));
  const refs = (state.uri2refs.get(params.textDocument.uri) ?? []).map((d) => ({
    ...d,
    type: Kind.ref,
  }));
  if (defs.length === 0 && refs.length === 0) {
    // console.log(`no defs or refs in ${params.textDocument.uri}`);
    return { data: [] };
  }

  // sort by line and column, since we need to encode the data as delta position
  const sorted = [...defs, ...refs].sort((a, b) =>
    a.range.start.line === b.range.start.line
      ? a.range.start.character - b.range.start.character
      : a.range.start.line - b.range.start.line
  );

  // init result with unencoded data
  const result: SemanticTokens = { data: [] };
  sorted.forEach((s) => {
    result.data.push(
      s.range.start.line, // line
      s.range.start.character, // start character
      s.range.end.character - s.range.start.character, // length
      s.type === Kind.def ? 0 : 1, // token type, array index of capabilities.semanticTokens.legend.tokenTypes
      s.type === Kind.def ? 0 : 1 // token modifiers, bitmap of capabilities.semanticTokens.legend.tokenModifiers
    );
  });
  // according to the spec, the data should be encoded as the delta to the previous data
  // so we have to process it from the end
  for (let i = result.data.length - 5; i >= 5; i -= 5) {
    // delta line
    result.data[i] = result.data[i] - result.data[i - 5];
    if (result.data[i] === 0)
      // delta start character, only if the line is the same
      result.data[i + 1] = result.data[i + 1] - result.data[i - 4];
  }
  // console.log(result.data);

  return result;
}

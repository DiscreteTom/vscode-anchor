import * as fs from "fs";
import * as url from "url";

// export function fileUri2relative(uri: string) {
//   for (const folder of config.workspaceFolders) {
//     if (uri.startsWith(folder)) {
//       return uri.slice(folder.length + 1); // +1 for the slash
//     }
//   }
//   return uri;
// }

export function buildMarkupContent(content: string[][]) {
  return content.map((l) => l.join("\n")).join("\n\n---\n\n"); // separator
}

export function debounce<Params extends unknown[]>(
  delay: number,
  cb: (...args: Params) => void
) {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  return (...args: Params) => {
    clearTimeout(timeoutHandle);
    timeoutHandle = setTimeout(() => {
      cb(...args);
    }, delay);
  };
}

/**
 * Load all files from disk in parallel and call cb for each file.
 */
export async function loadAll(
  uris: string[],
  cb: (uri: string, text: string) => void
) {
  await Promise.all(
    uris.map((uri) => {
      return new Promise<void>((resolve) => {
        const filePath = url.fileURLToPath(uri);
        fs.readFile(filePath, "utf8", (err, text) => {
          if (err) {
            console.error(`Error reading file ${filePath}: ${err}`);
          } else {
            cb(uri, text);
          }
          resolve();
        });
      });
    })
  );
}

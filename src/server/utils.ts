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

export type DebouncedFunction<T extends (...args: any[]) => void> = (
  ...args: Parameters<T>
) => void;

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return function (this: any, ...args: Parameters<T>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay) as any;
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

import type { ProjectFile } from "./appModel";

const shareTokenVersion = "qv1";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type BufferShim = {
  from(data: Uint8Array | string, encoding?: string): {
    toString(encoding?: string): string;
    length: number;
    [index: number]: number;
  };
};

function bufferShim(): BufferShim | undefined {
  return (globalThis as unknown as { Buffer?: BufferShim }).Buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.slice(offset, offset + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  const buffer = bufferShim();
  if (!buffer) throw new Error("No base64 encoder is available.");
  return buffer.from(bytes).toString("base64");
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  const buffer = bufferShim();
  if (!buffer) throw new Error("No base64 decoder is available.");
  const decoded = buffer.from(value, "base64");
  return Uint8Array.from({ length: decoded.length }, (_, index) => decoded[index]);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return base64ToBytes(padded);
}

function arrayBufferFromBytes(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function gunzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot open compressed share URLs.");
  }

  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(arrayBufferFromBytes(bytes));
  await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

function assertProjectFile(value: unknown): asserts value is ProjectFile {
  if (typeof value !== "object" || value === null || (value as { kind?: unknown }).kind !== "qmk-viz-project") {
    throw new Error("Share URL does not contain a qmk-viz project.");
  }
}

export function encodeShareProjectFile(projectFile: ProjectFile): string {
  const jsonBytes = textEncoder.encode(JSON.stringify(projectFile));
  return `${shareTokenVersion}.raw.${bytesToBase64Url(jsonBytes)}`;
}

export async function decodeShareProjectFile(token: string): Promise<ProjectFile> {
  const [version, encoding, payload, ...extra] = token.split(".");
  if (version !== shareTokenVersion || !encoding || !payload || extra.length > 0) {
    throw new Error("Share URL format is not supported.");
  }

  const encodedBytes = base64UrlToBytes(payload);
  const jsonBytes = encoding === "gz"
    ? await gunzipBytes(encodedBytes)
    : encoding === "raw"
      ? encodedBytes
      : (() => { throw new Error(`Share URL encoding "${encoding}" is not supported.`); })();
  const decoded = JSON.parse(textDecoder.decode(jsonBytes)) as unknown;
  assertProjectFile(decoded);
  return decoded;
}

export function shareTokenFromHash(hash: string): string | null {
  const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const queryIndex = cleanHash.indexOf("?");
  if (queryIndex < 0) return null;
  return new URLSearchParams(cleanHash.slice(queryIndex + 1)).get("share");
}

export function hashWithoutShareToken(hash: string): string {
  const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const [path, query = ""] = cleanHash.split("?", 2);
  if (!query) return hash.startsWith("#") ? hash : `#${hash}`;

  const params = new URLSearchParams(query);
  params.delete("share");
  const nextQuery = params.toString();
  return `#${path || "/layout"}${nextQuery ? `?${nextQuery}` : ""}`;
}

export function shareUrlForToken(token: string, href = globalThis.location?.href ?? "http://localhost/#/layout"): string {
  const url = new URL(href);
  url.hash = `/layout?share=${token}`;
  return url.toString();
}

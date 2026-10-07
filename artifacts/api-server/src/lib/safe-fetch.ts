import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { AppError } from "./errors";

/**
 * Fetch a public web page on behalf of a user without letting the request
 * reach anything private (SSRF). The destination is checked at connect time
 * inside the DNS lookup, so a hostname cannot resolve to one address for the
 * check and another for the connection, and every redirect hop is re-checked.
 */

// Uncompressed. Large news and reference pages run to 1–2 MB of HTML.
const MAX_BYTES = 3_000_000;
const MAX_REDIRECTS = 3;
const DEADLINE_MS = 12_000;
const ALLOWED_TYPES = ["text/html", "application/xhtml+xml", "text/plain"];

const blocked = new net.BlockList();
for (const [prefix, bits] of [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
] as const) {
  blocked.addSubnet(prefix, bits, "ipv4");
}
for (const [prefix, bits] of [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["64:ff9b::", 96], // NAT64: can reach private IPv4
  ["2001:db8::", 32], // documentation
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
] as const) {
  blocked.addSubnet(prefix, bits, "ipv6");
}

// IPv4-mapped IPv6 (::ffff:a.b.c.d) is refused outright. It is kept out of
// `blocked` because BlockList matches IPv4 addresses against mapped subnets,
// which would block every IPv4 address.
const mapped = new net.BlockList();
mapped.addSubnet("::ffff:0:0", 96, "ipv6");

export function isPublicAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) return !mapped.check(address, "ipv6") && !blocked.check(address, "ipv6");
  return false;
}

const blockedError = () =>
  new AppError(
    400,
    "FETCH_BLOCKED",
    "That link can't be fetched. Use a public http or https article link, or paste the article text.",
  );

const fetchFailed = (cause?: unknown) =>
  new AppError(
    422,
    "FETCH_FAILED",
    "We couldn't read that page. Try pasting the article text instead.",
    { cause },
  );

export type FetchPolicy = {
  /** Test seam: lets a test serve pages from loopback. Never set in production code. */
  allowAddress?: (address: string) => boolean;
  allowAnyPort?: boolean;
};

function checkUrl(raw: string, policy: FetchPolicy): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw blockedError();
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw blockedError();
  if (url.username || url.password) throw blockedError();
  if (url.port && !policy.allowAnyPort) throw blockedError();
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const allow = policy.allowAddress ?? isPublicAddress;
  // IP literals skip DNS, so the connect-time lookup guard never sees them.
  if (net.isIP(host) && !allow(host)) throw blockedError();
  return url;
}

function guardedLookup(policy: FetchPolicy): net.LookupFunction {
  const allow = policy.allowAddress ?? isPublicAddress;
  return (hostname, options, callback) => {
    dns.lookup(hostname, { ...options, all: true }, (err, result) => {
      const cb = callback as (e: Error | null, a?: unknown, f?: number) => void;
      if (err) return cb(err);
      const addresses = result as dns.LookupAddress[];
      if (addresses.length === 0 || addresses.some((a) => !allow(a.address))) {
        return cb(blockedError());
      }
      if ((options as dns.LookupOptions).all) return cb(null, addresses);
      cb(null, addresses[0].address, addresses[0].family);
    });
  };
}

function requestOnce(
  url: URL,
  policy: FetchPolicy,
  signal: AbortSignal,
): Promise<{ redirect: string } | { body: string }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        signal,
        lookup: guardedLookup(policy),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VantageBot/1.0)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.8",
          // No compression: the byte cap then bounds memory with no decompression step.
          "Accept-Encoding": "identity",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ redirect: res.headers.location });
        }
        if (status < 200 || status >= 300) {
          res.resume();
          return reject(fetchFailed(`HTTP ${status}`));
        }
        const type = String(res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
        if (!ALLOWED_TYPES.includes(type)) {
          res.destroy();
          return reject(fetchFailed(`unsupported content type ${type}`));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            res.destroy();
            return reject(fetchFailed("response too large"));
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", (e) => reject(fetchFailed(e)));
      },
    );
    req.on("error", (e) => reject(e instanceof AppError ? e : fetchFailed(e)));
    req.end();
  });
}

/** Returns the page body as text, or throws FETCH_BLOCKED / FETCH_FAILED. */
export async function fetchPublicPage(rawUrl: string, policy: FetchPolicy = {}): Promise<string> {
  const signal = AbortSignal.timeout(DEADLINE_MS);
  let url = checkUrl(rawUrl, policy);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const result = await requestOnce(url, policy, signal);
    if ("body" in result) return result.body;
    url = checkUrl(new URL(result.redirect, url).toString(), policy);
  }
  throw fetchFailed("too many redirects");
}

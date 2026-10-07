import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fetchPublicPage, isPublicAddress } from "./safe-fetch";

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1",
    "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255",
    "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:127.0.0.1",
    "::ffff:7f00:1", "64:ff9b::a00:1", "not-an-ip", "",
  ])("blocks %s", (addr) => {
    expect(isPublicAddress(addr)).toBe(false);
  });

  it.each(["93.184.216.34", "8.8.8.8", "172.15.0.1", "172.32.0.1", "2606:4700:4700::1111"])(
    "allows %s",
    (addr) => {
      expect(isPublicAddress(addr)).toBe(true);
    },
  );
});

describe("fetchPublicPage", () => {
  let server: http.Server;
  let base: string;
  // Test seam: let this suite reach its own loopback server and nothing else.
  const policy = { allowAddress: (a: string) => a === "127.0.0.1", allowAnyPort: true };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/ok") {
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end("<p>hello</p>");
        return;
      }
      if (req.url === "/to-metadata") {
        res.statusCode = 302;
        res.setHeader("location", "http://169.254.169.254/latest/meta-data/");
        res.end();
        return;
      }
      if (req.url === "/to-ok") {
        res.statusCode = 301;
        res.setHeader("location", "/ok");
        res.end();
        return;
      }
      if (req.url === "/loop") {
        res.statusCode = 302;
        res.setHeader("location", "/loop");
        res.end();
        return;
      }
      if (req.url === "/huge") {
        res.setHeader("content-type", "text/html");
        res.end("x".repeat(3_200_000));
        return;
      }
      if (req.url === "/image") {
        res.setHeader("content-type", "image/png");
        res.end("png");
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("returns the body of an allowed page", async () => {
    await expect(fetchPublicPage(`${base}/ok`, policy)).resolves.toContain("hello");
  });

  it("follows a redirect to an allowed page", async () => {
    await expect(fetchPublicPage(`${base}/to-ok`, policy)).resolves.toContain("hello");
  });

  it("re-checks the destination on every redirect", async () => {
    await expect(fetchPublicPage(`${base}/to-metadata`, policy)).rejects.toMatchObject({
      code: "FETCH_BLOCKED",
    });
  });

  it("gives up on redirect loops", async () => {
    await expect(fetchPublicPage(`${base}/loop`, policy)).rejects.toMatchObject({ code: "FETCH_FAILED" });
  });

  it("stops reading past the size cap", async () => {
    await expect(fetchPublicPage(`${base}/huge`, policy)).rejects.toMatchObject({ code: "FETCH_FAILED" });
  });

  it("rejects non-text content", async () => {
    await expect(fetchPublicPage(`${base}/image`, policy)).rejects.toMatchObject({ code: "FETCH_FAILED" });
  });

  it("blocks loopback, odd ports and credentials under the default policy", async () => {
    for (const url of [`${base}/ok`, "http://example.org:8080/", "http://user:pw@example.org/", "ftp://example.org/"]) {
      await expect(fetchPublicPage(url)).rejects.toMatchObject({ code: "FETCH_BLOCKED" });
    }
  });

  it("blocks a hostname that resolves to a private address", async () => {
    await expect(fetchPublicPage("http://localhost/")).rejects.toMatchObject({ code: "FETCH_BLOCKED" });
  });
});

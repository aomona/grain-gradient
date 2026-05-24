import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const preferredPort = Number.parseInt(process.env.PORT ?? "4173", 10);
const root = fileURLToPath(new URL("..", import.meta.url));

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".ico", "image/x-icon"],
]);

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", ...headers });
  res.end(body);
};

const resolvePath = (requestPath) => {
  const normalized = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.{2}[/\\])+/, "");
  const resolved = path.join(root, normalized);
  return resolved.startsWith(root) ? resolved : null;
};

const createPlaygroundServer = () =>
  http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    let pathname = url.pathname;

    if (pathname === "/") {
      res.writeHead(302, { Location: "/playground/" });
      res.end();
      return;
    }

    if (pathname === "/playground") {
      res.writeHead(302, { Location: "/playground/" });
      res.end();
      return;
    }

    if (pathname === "/playground/") pathname = "/playground/index.html";

    const filePath = resolvePath(pathname);
    if (!filePath) {
      send(res, 403, "Forbidden");
      return;
    }

    try {
      const statPath = filePath.endsWith("/") ? `${filePath}index.html` : filePath;
      const fileToRead = statPath.endsWith(path.sep) ? `${statPath}index.html` : statPath;
      const data = await readFile(fileToRead);
      const ext = path.extname(fileToRead).toLowerCase();
      res.writeHead(200, {
        "Content-Type": mimeTypes.get(ext) ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    } catch {
      send(res, 404, "Not found");
    }
  });

const listen = (port, attemptsLeft = 10) => {
  const server = createPlaygroundServer();

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      console.warn(`Port ${port} is in use, trying ${port + 1}...`);
      listen(port + 1, attemptsLeft - 1);
      return;
    }

    throw error;
  });

  server.listen(port, () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    console.log(`grain-gradient playground ready at http://localhost:${actualPort}/playground/`);
  });
};

listen(Number.isFinite(preferredPort) ? preferredPort : 4173);

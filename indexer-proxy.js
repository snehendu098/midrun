const http = require("http");
const { WebSocketServer, WebSocket } = require("ws");

const TARGET_HOST = "127.0.0.1";
const TARGET_PORT = 8087;
const PROXY_PORT = 8088;

// HTTP proxy: rewrite /api/v4/ → /api/v3/
const server = http.createServer((clientReq, clientRes) => {
  const url = clientReq.url.replace("/api/v4/", "/api/v3/");
  console.log(`[proxy] HTTP ${clientReq.method} ${clientReq.url} → ${url}`);

  // Collect request body for logging
  const chunks = [];
  clientReq.on("data", (chunk) => chunks.push(chunk));
  clientReq.on("end", () => {
    const body = Buffer.concat(chunks);
    const bodyStr = body.toString().slice(0, 500);
    console.log(`[proxy] HTTP body: ${bodyStr}`);

    const proxyReq = http.request(
      {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: url,
        method: clientReq.method,
        headers: { ...clientReq.headers, host: `${TARGET_HOST}:${TARGET_PORT}` },
      },
      (proxyRes) => {
        const resChunks = [];
        proxyRes.on("data", (c) => resChunks.push(c));
        proxyRes.on("end", () => {
          const resBody = Buffer.concat(resChunks);
          console.log(`[proxy] HTTP response: ${resBody.toString().slice(0, 500)}`);
          clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
          clientRes.end(resBody);
        });
      }
    );

    proxyReq.on("error", (err) => {
      console.error("[proxy] HTTP error:", err.message);
      clientRes.writeHead(502);
      clientRes.end("Bad Gateway");
    });

    proxyReq.end(body);
  });
});

// WebSocket proxy: rewrite /api/v4/ → /api/v3/, forward subprotocols
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = (req.url || "").replace("/api/v4/", "/api/v3/");
  const target = `ws://${TARGET_HOST}:${TARGET_PORT}${url}`;
  const protocols = req.headers["sec-websocket-protocol"]
    ? req.headers["sec-websocket-protocol"].split(",").map((s) => s.trim())
    : [];

  console.log(`[proxy] WS upgrade ${req.url} → ${url} protocols=[${protocols}]`);

  const backendWs = new WebSocket(target, protocols, {
    headers: {
      origin: req.headers.origin || "",
    },
  });

  backendWs.on("open", () => {
    console.log(`[proxy] WS backend connected, protocol=${backendWs.protocol}`);
    wss.handleUpgrade(req, socket, head, (clientWs) => {
      clientWs.on("message", (msg, isBinary) => {
        console.log(`[proxy] WS client→backend: ${msg.toString().slice(0, 1500)}`);
        if (backendWs.readyState === WebSocket.OPEN) {
          backendWs.send(msg, { binary: isBinary });
        }
      });
      backendWs.on("message", (msg, isBinary) => {
        console.log(`[proxy] WS backend→client: ${msg.toString().slice(0, 1500)}`);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(msg, { binary: isBinary });
        }
      });
      clientWs.on("close", () => backendWs.close());
      backendWs.on("close", () => clientWs.close());
    });
  });

  backendWs.on("error", (err) => {
    console.error("[proxy] WS backend error:", err.message);
    socket.destroy();
  });
});

server.listen(PROXY_PORT, () => {
  console.log(
    `[indexer-proxy] listening on :${PROXY_PORT}, rewriting v4 → v3 to :${TARGET_PORT}`
  );
});

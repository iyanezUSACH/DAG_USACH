// Proxy mínimo para Claude (Node.js puro, sin npm).
// Uso:
//   CLAUDE_KEY=sk-ant-... node proxy.js
// Endpoint:
//   POST http://localhost:3001/claude

const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 3001;
const CLAUDE_KEY = process.env.CLAUDE_KEY;

if (!CLAUDE_KEY) {
  console.error("Falta CLAUDE_KEY en variables de entorno.");
  process.exit(1);
}

http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== "POST" || req.url !== "/claude") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      const upstream = https.request(
        {
          hostname: "api.anthropic.com",
          path: "/v1/messages",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": CLAUDE_KEY,
            "anthropic-version": "2023-06-01",
          },
        },
        (upstreamRes) => {
          let responseData = "";
          upstreamRes.on("data", (d) => {
            responseData += d;
          });
          upstreamRes.on("end", () => {
            res.writeHead(upstreamRes.statusCode || 500, {
              "Content-Type": "application/json",
            });
            res.end(responseData);
          });
        }
      );

      upstream.on("error", (err) => {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      });

      upstream.write(body);
      upstream.end();
    });
  })
  .listen(PORT, () => {
    console.log(`Claude proxy en http://localhost:${PORT}/claude`);
  });

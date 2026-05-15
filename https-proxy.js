const https = require("https");
const http = require("http");
const fs = require("fs");

const cert = fs.readFileSync("/root/cloud-drive/cert.pem");
const key = fs.readFileSync("/root/cloud-drive/key.pem");

https.createServer({ cert, key }, (clientReq, clientRes) => {
  const proxyOpts = {
    hostname: "127.0.0.1",
    port: 3000,
    path: clientReq.url,
    method: clientReq.method,
    headers: { ...clientReq.headers, host: "beautyfun155156.shop" },
  };
  const proxy = http.request(proxyOpts, (backendRes) => {
    clientRes.writeHead(backendRes.statusCode || 200, backendRes.headers);
    backendRes.pipe(clientRes);
  });
  proxy.on("error", () => { if (!clientRes.headersSent) { clientRes.writeHead(502); clientRes.end(); } });
  clientReq.pipe(proxy);
}).listen(443, () => console.log("ready"));

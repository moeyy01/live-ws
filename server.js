// 引入必要的模块
var WebSocket = require("ws");
var http = require("http");
var minimist = require("minimist");

// 解析命令行参数
var argv = minimist(process.argv.slice(2), {
  string: ["port"],
  default: { port: 3000 },
});

// 创建一个HTTP服务器
var server = http.createServer(function (req, res) {
  // 对根路径进行响应
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  }
});

// 在HTTP服务器上创建WebSocket服务器
var wss = new WebSocket.Server({ server });

// 关闭服务器的逻辑
var shutdown = function () {
  console.log("Received kill signal, shutting down gracefully.");

  server.close(function () {
    console.log("Closed out remaining connections.");
    process.exit();
  });

  setTimeout(function () {
    console.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit();
  }, 10 * 1000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// WebSocket服务器错误处理
wss.on("error", function (err) {
  console.log(err);
});

var hexColorRegExp = /^\d{8}$/;
var typeRegExp = /^(0|1|2)$/;
var msgMinInterval = 500;
var lastMsgTimestamps = {};

// 处理WebSocket连接
wss.on("connection", function (ws, req) {
  var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  ws.on("message", function (message) {
    var time = Date.now();
    if (
      lastMsgTimestamps[ip] &&
      time - lastMsgTimestamps[ip] < msgMinInterval
    ) {
      return;
    }
    try {
      message = JSON.parse(message);
      if (
        !hexColorRegExp.test(message.color) ||
        !typeRegExp.test(message.type) ||
        !message.text
      ) {
        return;
      }
      var msg = {
        text: message.text.substr(0, 255),
        color: message.color,
        type: message.type,
      };
    } catch (e) {
      return;
    }

    console.log(msg);
    lastMsgTimestamps[ip] = time;

    var data = JSON.stringify(msg);

    wss.clients.forEach(function (client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data, function (err) {
          if (err) {
            console.log(err);
          }
        });
      }
    });
  });
  ws.on("error", console.log);
});

// 定期清理过时的消息时间戳
setInterval(function () {
  var time = Date.now();
  Object.keys(lastMsgTimestamps).forEach(function (key) {
    if (time - lastMsgTimestamps[key] > msgMinInterval) {
      delete lastMsgTimestamps[key];
    }
  });
}, 5000);

// 让HTTP服务器监听指定的端口
server.listen(argv.port, function () {
  console.log("HTTP and WebSocket server started on port: " + argv.port);
});

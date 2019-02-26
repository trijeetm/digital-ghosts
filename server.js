// --------
// requires
// --------

// HTTP Portion
var http = require('http');
// URL module
var url = require('url');
var path = require('path');
// Using the filesystem module
var fs = require('fs');
var util = require('util');

/*
    HTTP server setup
*/

var server = http.createServer(handleRequest);
server.listen(8080);
console.log('Server started on port 8080');

function handleRequest(req, res) {
  // What did we request?
  var pathname = req.url;

  // If blank let's ask for index.html
  if (pathname == '/') {
    pathname = '/index.html';
  }

  // Ok what's our file extension
  var ext = path.extname(pathname);

  // Map extension to file type
  var typeExt = {
    '.html': 'text/html',
    '.js':   'text/javascript',
    '.css':  'text/css'
  };

  // What is it?  Default to plain text
  var contentType = typeExt[ext] || 'text/plain';

  // User file system module
  fs.readFile(__dirname + pathname,
    // Callback function for reading
    function (err, data) {
      // if there is an error
      if (err) {
        res.writeHead(500);
        return res.end('Error loading ' + pathname);
      }
      // Otherwise, send the data, the contents of the file
      res.writeHead(200,{ 'Content-Type': contentType });
      res.end(data);
    }
  );
}

/*
    SocketIO setup
    SocketIO uses the HTTP server

    Example emit:
    io.sockets.emit(label, data);
*/
var io = require('socket.io').listen(server);

/*
    Websocket setup
    Websocket server to receive data from python script
*/
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('< %s', message);
    io.sockets.emit('newPacket', message);
  });
});

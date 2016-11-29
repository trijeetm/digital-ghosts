// --------
// requires
// --------

// HTTP Portion
var http = require('http');
// URL module
var url = require('url');
var path = require('path');
// PCap module
var pcap = require('pcap'),
    tcp_tracker = new pcap.TCPTracker(),
    pcap_session = pcap.createSession('en0', '');
    // pcap_session = pcap.createSession('en0', 'tcp', undefined, false);
    // pcap_session = pcap.createSession('en0', "ip proto \\tcp");
// Using the filesystem module
var fs = require('fs');
var util = require('util');

// ------
// server
// ------

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

// WebSocket Portion
// WebSockets work with the HTTP server
var io = require('socket.io').listen(server);

// tracker emits sessions, and sessions emit data
tcp_tracker.on("session", function (session) {
  // start
  console.log("Start of TCP session between " + session.src_name + " and " + session.dst_name);
  io.sockets.emit('sessionStart', session.src_name + session.dst_name);

  // data send
  session.on("data send", function (session, data) {
    console.log(session.src_name + " -> " + session.dst_name + " data send " + session.send_bytes_payload + " + " + data.length + " bytes");
    data = {
      id: session.src_name + session.dst_name,
      size: session.send_bytes_payload + data.length
    }
    io.sockets.emit('newPacket', data);
  });

  // data recv
  // session.on("data recv", function (session, data) {
  //   console.log(session.dst_name + " -> " + session.src_name + " data recv " + session.recv_bytes_payload + " + " + data.length + " bytes");
  // });

  // end
  session.on("end", function (session) {
    console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
    io.sockets.emit('sessionEnd', session.src_name + session.dst_name);
    // console.log("Set stats for session: ", session.session_stats());
  });
});

pcap_session.on('packet', function (raw_packet) {
  var packet = pcap.decode.packet(raw_packet);
  tcp_tracker.track_packet(packet);
});
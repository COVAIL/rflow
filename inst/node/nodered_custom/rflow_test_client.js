/* Or use this example tcp client written in node.js.  (Originated with
example code from
http://www.hacksparrow.com/tcp-socket-programming-in-node-js.html.) */

var net = require('net');

var client = new net.Socket();
client.connect(1338, '127.0.0.1', function() {
	console.log('Connected');
//	client.write('Hello, server! Love, Client.');
//  client.write('{"command":"START_NODERED"}');
});

client.on('data', function(data) {
	console.log('Received: ' + data);
//	client.destroy(); // kill client after server's response
});

client.on('close', function() {
	console.log('Connection closed');
});

/*
setTimeout(function(){
  var stop = {};
  stop.command = 'STOP_RFLOW';
  client.write(JSON.stringify(stop));
}, 4000);
*/

process.stdin.on('data', function (chunk) {
  console.log(chunk);
  var sendCommand = {};
  if(chunk.indexOf('{') < 0){
    sendCommand.command = chunk.toString().trim();
  } else {
    sendCommand = JSON.parse(chunk.toString());
  }
  client.write(JSON.stringify(sendCommand));
});

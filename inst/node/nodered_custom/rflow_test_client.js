/* Or use this example tcp client written in node.js.  (Originated with
example code from
http://www.hacksparrow.com/tcp-socket-programming-in-node-js.html.) */
var fs = require('fs');
var net = require('net');

var client = new net.Socket();
client.connect(1338, '127.0.0.1', function() {
	console.log('Connected');
//	client.write('Hello, server! Love, Client.');
//  client.write('{"command":"START_NODERED"}');
});

client.on('data', function(data) {
	console.log('Received: ' + data + '\n\n');
//	client.destroy(); // kill client after server's response
});

client.on('close', function() {
	console.log('Connection closed');
});

process.stdin.on('data', function (chunk) {

  var sendCommand = {};
  if(chunk.indexOf('{') < 0){
		if(chunk.indexOf('file://') >=0){
			chunk = chunk.toString().substring(('file://').length);
			chunk = fs.readFileSync(chunk.toString().trim(), 'utf8');
			sendCommand = JSON.parse(chunk.toString());
		} else {
    	sendCommand.command = chunk.toString().trim();
		}
  } else {
    sendCommand = JSON.parse(chunk.toString());
  }
	var str = JSON.stringify(sendCommand);
	console.log("SEND LENGTH:"+str.length);
  client.write(str);
});

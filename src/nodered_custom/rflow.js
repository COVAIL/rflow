var http = require('http');
var express = require("express");
var RED = require("node-red");

var net = require('net');

var tcp_server = net.createServer(function(socket) {
  socket.write("Hello, I am the RFlow TCP Server.")
	socket.on('data', function(data){
    console.log('Received Data:' + data);
    console.log(RED);
  });
});
var comm_port = process.argv[2] || 1338;
tcp_server.listen(comm_port, '127.0.0.1');

// Create an Express app
var app = express();

// Add a simple route for static content served from 'public'
app.use("/",express.static("public"));

// Create a server
var server = http.createServer(app);

// Create the settings object - see default settings.js file for other options
var settings = {
    httpAdminRoot:"/",
    httpNodeRoot: "/api",
    userDir:"./.node-red/",
    flowFile:"./.node-red/flows_vagrant.json",
    functionGlobalContext: { }    // enables global context
};

// Initialise the runtime with a server and settings
RED.init(server,settings);

// Serve the editor UI from /red
app.use(settings.httpAdminRoot,RED.httpAdmin);

// Serve the http nodes UI from /api
app.use(settings.httpNodeRoot,RED.httpNode);

var node_port = process.argv[3] || 1337;

server.listen(node_port);

// Start the runtime
RED.start();

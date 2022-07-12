const SvData = require('./Data.js');

//Express requirements
var express = require('express');
var app = express();
var serv = require('http').Server(app);
const fs = require('fs');

//When the page is requested it sends the index.html file
app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

//Routing for files, send only what's in /client
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT);
console.log((new Date())+" Server started");

//create server class that houses room and socket data
myServer = new SvData();

function timestamp(){
  date = new Date();
  return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}

//precedes sockets code
var io = require('socket.io')(serv,{});

//all comms below
io.sockets.on('connection', function(socket){
  myServer.connectSocket(socket);
	console.log(timestamp()+" Cl("+socket.id+") connected");
  //room list is emitted here if rooms are implemented
  
	socket.on('disconnect',function (){
    myServer.disconnectSocket(socket, true);
    console.log(timestamp()+" Cl("+socket.id+") disconnected");
	});

  socket.on('enterRoom', function(data){//enterRoom exp. increases in calls, unknown why
    myServer.moveClientRoom(data);
  });

  socket.on('createRoom', function(data){
    myServer.requestRoom(data);
  });

  socket.on('leaveRoom', function(data){
    console.log(timestamp()+" Cl("+data.client+") finished a game");
    myServer.disconnectSocket(socket, false);
  });
});

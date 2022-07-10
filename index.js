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

//precedes sockets code
var io = require('socket.io')(serv,{});

//all comms below
io.sockets.on('connection', function(socket){
  myServer.connectSocket(socket);
	console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Cl("+socket.id+") connected");
  //room list is emitted here if rooms are implemented
  
	socket.on('disconnect',function (){
    myServer.disconnectSocket(socket);
    console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Cl("+socket.id+") disconnected");
	});

  socket.on('enterRoom', function(data){//enterRoom exp. increases in calls, unknown y
    //console.log("adding 1 to current"+rooms.length);
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room && data.prevRoom==="none"){//will cause glitches with multiple rooms of same name
        console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Cl("+data.client+") entered Rm("+data.room+")");
        rooms[i].players.push(data.client);
        rooms[i].current++;
        io.sockets.emit('roomEdit', {
          to:"all", 
          name:rooms[i].name, 
          current:rooms[i].current, 
          max:rooms[i].max, 
          players:rooms[i].players, 
          number:rooms[i].number,
        });
      }
    }

  });

  socket.on('createRoom', function(data){
    if(data.prevRoom==="none" && !isEmpty(data.room)){
      //create room with name data.room (or a random name if that one is unavailable)
      let roomName = generateRoomName(data.room);
      console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Cl("+data.client+") created Rm("+roomName+")");
      let createdRoom = new Room(roomName, 2);
      loadCards(createdRoom);
      createdRoom.deck=shuffle(createdRoom.deck);
      console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Cl("+data.client+") entered Rm("+roomName+")");
      //add data.client to the room
      createdRoom.players.push(data.client);
      createdRoom.current++;
      rooms.push(createdRoom);
      //update room lists
        io.sockets.emit('roomList', {
          to:"all", 
          name:createdRoom.name, 
          current:createdRoom.current, 
          max:createdRoom.max, 
          players:createdRoom.players, 
          number:createdRoom.number,
        });
        io.sockets.emit('roomReady', {
          to:data.client, 
          name:createdRoom.name, 
          current:createdRoom.current, 
          max:createdRoom.max, 
          players:createdRoom.players, 
          number:createdRoom.number,
        });
    }
  });

  function generateRoomName(rmname){
    let nameOk=true;
    if(rmname==="createRoom" || rmname==="playTutorial" || isEmpty(rmname)){
      nameOk=false;
    }else {
      for(let i=0; i<rooms.length; i++){
        if(rooms[i].name===rmname){
          nameOk=false;
          break;
        }
      }
    }
    if(nameOk===true){
      return rmname;
    }else {
      //generate name since prompt answer was not valid
      let attempt = makeid(8);
      return generateRoomName(attempt);
    }
  }

  function makeid(length) {
    let result= '';
    let characters= 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  function isEmpty(str) {
    return (!str || 0 === str.length);
  }

  socket.on('leaveRoom', function(data){
    console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Cl("+data.client+") finished a game");
    let delNum=-1;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].players.includes(data.client)){
        let leftPlayer;
        for(ii=0; ii<rooms[i].players.length; ii++){
          if(rooms[i].players[ii]===data.client){
            leftPlayer=ii;
            rooms[i].players.splice(ii, 1);
            break;
          }
        }

        rooms[i].current--;

        console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Rm("+rooms[i].name+") absolved Cl("+data.client+")");
        if(!(rooms[i].current>=1 || rooms[i].name==="Funhouse"))console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Unlisted Rm("+rooms[i].name+")");

        if(rooms[i].current>=1 || rooms[i].name==="Funhouse"){
          io.sockets.emit('roomEdit', {
            to:"all", 
            name:rooms[i].name, 
            current:rooms[i].current, 
            max:rooms[i].max, 
            players:rooms[i].players, 
            number:rooms[i].number,
            hasJaime:rooms[i].hasJaime,
          });
        }else {
          io.sockets.emit('roomUnlist', {
            to:"all", 
            name:rooms[i].name, 
            current:rooms[i].current, 
            max:rooms[i].max, 
            players:rooms[i].players, 
            number:rooms[i].number,
          });
          delNum=i;
        }
      }
    }
    if(delNum!=-1)rooms.splice(delNum, 1);
  });
});

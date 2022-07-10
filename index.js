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

//keep track of connected clients and rooms
var connected_sockets = [];
var rooms = [];

//need to add comments explaining room variables
//need to add auto-push to rooms array
class Room {
  constructor(name, max){
    this.name=name;
    this.current=0;
    this.max=max;
    this.players=[];
    this.number=rooms.length;
    this.deck=[];
    this.loadedMerch=false;
    this.lastTurnEnd=0;
  }
}
defaultRoom = new Room("Funhouse", 2);
rooms.push(defaultRoom);

//precedes sockets code
var io = require('socket.io')(serv,{});

//necessary definitions for the functions to give player data
let CARDEXT=".jpg";

let DUPENUMBER=4;//amount of duplicates per basic card in the deck
let FREDNUMBER=5;//amount of "fred merch" cards in the deck
let MAXSUIT=3;//maximum suit index
let MAXCARDS=5;//maximum number of cards in hand
let LINDATOPNUMBER=3;//top X cards of deck revealed by linda cball

class Card {
  constructor(value, suitIndex){
    this.value=value; //int describing card number (10 if fred)
    this.suitIndex=suitIndex;
    this.suit=getSuit(suitIndex); //string describing card color
    this.faceUp=false;
    this.sel=false;
    this.snapX=0;
    this.snapY=0;
  }

  display(){
    if(this.faceUp){
      image(this.cardFace, this.xPos, this.yPos);
    }else {
      image(this.cardBack, this.xPos, this.yPos);
    }
  }

  alignTo(str, i, fh){//str loc, hand index, future hand size
    let al = (fh-1)/2;//determines max offset from center
    //if 0, -al, if 1, -al+1, etc.
    this.xPos=width/2+((i-al)*width*0.05);//determines x based on leftmost point
    if(str==="hand"){
      this.yPos=handY;
    }else if(str==="ophand"){
      this.yPos=ophandY;
    }else{
      if(showErrorLogs)console.log("Error assigning card alignment location: 002a");
    }
    this.setSnaps(this.xPos, this.yPos);
    this.refresh();
  }

  setSnaps(x, y){
    this.snapX=x;
    this.snapY=y;
  }

  snap(){
    this.xPos=this.snapX;
    this.yPos=this.snapY;
    this.refresh();
  }
}

/**
 * https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
 * Renamed function from shuffleArray, added "return array;"
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 */
function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

//functions to give player data from the server below
function loadCards(room){
  //console.log("loaded cards to Rm "+room.name);
  for(let suit=1; suit<=MAXSUIT; suit++){
    for(let value=1; value<=5; value++){
      for(let i=0; i<DUPENUMBER; i++){
        room.deck.push(new Card(value, suit));
        //if(showLogs)console.log("pushed a "+getSuit(suit)+" "+value+" to the deck");
      }
    }
  }
  //console.log("loaded cards to Rm("+room.name+")");
}

function loadMerch(room){
  //console.log("loaded merch to Rm "+room.name);
  let suitCount=1;
  for(let i=0; i<FREDNUMBER; i++){
    //let cardFace = loadImage('client/data/'+getSuit(suitCount)+'fred'+CARDEXT)
    //if(showLogs)console.log("loaded cardFace (img) from client/data/"+getSuit(suitCount)+"fred"+CARDEXT);
    room.deck.push(new Card(10, suitCount));
    //if(showLogs)console.log("pushed a "+getSuit(suitCount)+" fred to the deck");
    suitCount++;
    if(suitCount>MAXSUIT)suitCount=1;
  }
}

function giveNextFaceUp(room, client){
  if(room.deck.length>0){
    let card = room.deck[0];
    room.deck.splice(0, 1);
    //console.log("gave card to Cl "+client);
    io.sockets.emit('drawnCard', {
      to:client, 
      at:room.name, 
      cardSuit:card.suitIndex,
      cardVal:card.value,
    });
  }
}

function addToParty(id, suitIndex, value, partysi, partyv, fs, pvlist, room, client){
  if(value===5){
    for(let i=1; i<=5; i++){
      room.deck.push(new Card(i, suitIndex));
    }
    room.deck=shuffle(room.deck);
  }else if(fs){
    //emit discard stuff
    for(let i=0; i<pvlist.length; i++){
      io.sockets.emit('discardAltered', {
        by:client,
        at:room.name,
        cardSuit:partysi,
        cardVal:pvlist[i],
        alterHand:false,
      });
    }
  }
  io.sockets.emit('partyAltered', {
    by:client,
    at:room.name,
    cardSuit:suitIndex,
    cardVal:value,
    partyId:id,
    funyun:fs,
  });
  //if(this.value===5)this.shuffleIn();//chimmy's effect here
}

function addToRitual(suitIndex, value, room, client){
  io.sockets.emit('ritualAltered', {
    by:client,
    at:room.name,
    cardSuit:suitIndex,
    cardVal:value,
    spliceCards:true,
  });
}

function addToDiscard(suitIndex, value, room, client, bool){
  io.sockets.emit('discardAltered', {
    by:client,
    at:room.name,
    cardSuit:suitIndex,
    cardVal:value,
    alterHand:bool,
  });
}

function addToFred(suitIndex, room, client){
  io.sockets.emit('fredAltered', {
    by:client,
    at:room.name,
    cardSuit:suitIndex,
    spliceCards:true,
  });
}

function addToAction(suitIndex, value, room, client){
  //console.log(client+" actioned a "+value);
  io.sockets.emit('actionAltered', {
    by:client, 
    at:room.name,
    cardSuit:suitIndex,
    cardVal:value,
    spliceCards:true,
  });
}

function addToHandAction(suitIndexList, valueList, suitIndex, value, room, client, bool){
  if(bool){
    io.sockets.emit('actionAltered', {
      by:client, 
      at:room.name,
      cardSuit:suitIndex,
      cardVal:value,
      spliceCards:false,
    });
  }
  io.sockets.emit('handSwap', {
    by:client,
    at:room.name,
    siList:suitIndexList,
    vList:valueList,
    initSwap:bool,
  });
}

function dumpToDiscard(suitIndexList, valueList, room, client){
  io.sockets.emit('ritualAltered', {
    by:client,
    at:room.name,
    cardSuit:suitIndexList[0],
    cardVal:0,
    spliceCards:true,
  });
  for(let i=0; i<suitIndexList.length; i++){
    io.sockets.emit('discardAltered', {
      by:client,
      at:room.name,
      cardSuit:suitIndexList[i],
      cardVal:valueList[i],
      alterHand:false,
    });
  }
}

function dumpToFred(suitIndexList, valueList, room, client){
  for(let i=0; i<room.deck.length; i++){
    if(room.deck[i].value===10 && room.deck[i].suitIndex===suitIndexList[0]){
      //console.log("someone obtained fred from ritual dump in rm "+room.name);
      io.sockets.emit('obtainFred', {
        by:client,
        at:room.name,
        cardSuit:suitIndexList[0],
        spliceCards:false,
      });
      room.deck.splice(i, 1);//should remove fred instead of thin-airing it
      break;
    }
  }
  //console.log("congrats to them!");
  io.sockets.emit('ritualAltered', {
    by:client,
    at:room.name,
    cardSuit:0,
    cardVal:0,
    spliceCards:false,
  });
  for(let i=0; i<suitIndexList.length; i++){
    io.sockets.emit('discardAltered', {
      by:client,
      at:room.name,
      cardSuit:suitIndexList[i],
      cardVal:valueList[i],
      alterHand:false,
    });
  }
}

function nextTurn(room, client){
  let srcRoom;
  for(let i=0; i<rooms.length; i++){
    if(rooms[i].name===room)srcRoom=rooms[i];
  }
  //console.log(new Date().getTime());
  srcRoom.lastTurnEnd=(new Date()).getTime();

  //console.log('detedd room '+srcRoom.name);
  let timmy;
  for(let i=0; i<srcRoom.players.length; i++){
    if(srcRoom.players[i]!==client){//works on the basis of 2-player
      timmy=srcRoom.players[i];
    }
  }
  //console.log('detedd cl '+timmy);
  io.sockets.emit('youGo', {
    to:timmy,
    at:srcRoom.name,
    time:srcRoom.lastTurnEnd,
  });
}

function getSuit(suitIndex){
  if(suitIndex===0){
    return "none";
  }else if(suitIndex===1){
    return "red";
  }else if(suitIndex===2){
    return "yellow";
  }else if(suitIndex===3){
    return "blue";
  }else {
    if(showErrorLogs)console.log("Error setting card suit string: 001a");
    return "none";
  }
}

function getSuitIndex(suit){
  if(suit==="red"){
    return 1;
  }else if(suit==="yellow"){
    return 2;
  }else if(suit==="blue"){
    return 3;
  }else if(suit==="none"){
    return 0;
  }else {
    if(showErrorLogs)console.log("Error setting card suit index: 001b");
    return "none";
  }
}

//all comms below
io.sockets.on('connection', function(socket){
  connected_sockets[connected_sockets.length] = socket;
	//^^On connection adds client to the socket list
	console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Cl("+socket.id+") connected");
  for(let i=0; i<rooms.length; i++){
    io.sockets.emit('roomList', {
      to:socket.id, 
      name:rooms[i].name, 
      current:rooms[i].current, 
      max:rooms[i].max, 
      players:rooms[i].players, 
      number:rooms[i].number,
    });
  }
  //console.log("emitted total ("+rooms.length+") rooms");
  
	socket.on('disconnect',function (){
    console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Cl("+socket.id+") disconnected");
    let delNum=(0-1);
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].players.includes(socket.id)){
        let leftPlayer;
        for(ii=0; ii<rooms[i].players.length; ii++){
          if(rooms[i].players[ii]===socket.id){
            leftPlayer=ii;
            break;
          }
        }
        delete rooms[i].players[leftPlayer];
        rooms[i].current--;
        console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Rm("+rooms[i].name+") absolved Cl("+socket.id+")");
        if(!(rooms[i].current>=1 || rooms[i].name==="Funhouse"))console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+" Unlisted Rm("+rooms[i].name+")");
        if(rooms[i].current>=1 || rooms[i].name==="Funhouse"){
          io.sockets.emit('roomEdit', {
            to:"all", 
            name:rooms[i].name, 
            current:rooms[i].current, 
            max:rooms[i].max, 
            players:rooms[i].players, 
            number:rooms[i].number,
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
    if(delNum!=(0-1))rooms.splice(delNum, 1);
		//delete connected_sockets[socket.id]; connected_sockets doesn't get deleted... umm
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

  socket.on('initFin', function(data){
    let srcRoom;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room)srcRoom=rooms[i];
    }
    if(!srcRoom.loadedMerch){
      loadMerch(srcRoom);
      srcRoom.deck=shuffle(srcRoom.deck);
    }
    console.log((new Date().getHours()+":"+new Date().getMinutes()+":"+new Date().getSeconds())+' started game at Rm('+srcRoom.name+')');

    srcRoom.lastTurnEnd=(new Date()).getTime();

    io.sockets.emit('gameStart', {
      at:srcRoom.name,
      time:srcRoom.lastTurnEnd,
    });
  });

  //game Functions
  socket.on('getCard', function(data){
    let srcRoom;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room)srcRoom=rooms[i];
    }
    //console.log('givecard');
    //console.log('client:'+data.client);
    //console.log('srcRoom:'+srcRoom.name);
    giveNextFaceUp(srcRoom, data.client);
  });

  socket.on('giveParty', function(data){
    let srcRoom;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room)srcRoom=rooms[i];
    }
    addToParty(data.id, data.cardSuit, data.cardVal, data.partySuit, data.partyVal, data.funyun, data.partyvList, srcRoom, data.client);
  });

  socket.on('giveRitual', function(data){
    let srcRoom;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room)srcRoom=rooms[i];
    }
    addToRitual(data.cardSuit, data.cardVal, srcRoom, data.client);
  });

  socket.on('giveDiscard', function(data){
    let srcRoom;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room)srcRoom=rooms[i];
    }
    addToDiscard(data.cardSuit, data.cardVal, srcRoom, data.client, true);
  });

  socket.on('giveFred', function(data){
    let srcRoom;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room)srcRoom=rooms[i];
    }
    addToFred(data.cardSuit, srcRoom, data.client);
  });

  socket.on('giveAction', function(data){
    let srcRoom;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room)srcRoom=rooms[i];
    }
    addToAction(data.cardSuit, data.cardVal, srcRoom, data.client);
  });

  socket.on('giveHandAction', function (data){
    let srcRoom;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room)srcRoom=rooms[i];
    }
    addToHandAction(data.suitIndexList, data.valueList, data.cardSuit, data.cardVal, srcRoom, data.client, data.initSwap);
  });

  socket.on('giveDump', function(data){
    let srcRoom;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room)srcRoom=rooms[i];
    }
    dumpToDiscard(data.suitIndexList, data.valueList, srcRoom, data.client);
  });

  socket.on('giveFredGet', function(data){
    let srcRoom;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room)srcRoom=rooms[i];
    }
    dumpToFred(data.suitIndexList, data.valueList, srcRoom, data.client);
  });

  socket.on('clearLindShow', function(data){
    io.sockets.emit('clearSpecIcons', {
      by:data.client, 
      at:data.room,
    });
  });

  socket.on('giveGimmeHand', function(data){
    io.sockets.emit('surrenderHand', {
      by:data.client, 
      at:data.room,
    });
  });

  socket.on('giveHandGimme', function(data){
    io.sockets.emit('heresHand', {
      by:data.client,
      at:data.room,
      siList:data.suitIndexList,
      vList:data.valueList,
    });
  });

  socket.on('giveGimmeTops', function(data){
    let srcRoom;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].name===data.room)srcRoom=rooms[i];
    }
    let suitIndexList = [];
    let valueList = [];
    for(let i=0; i<LINDATOPNUMBER; i++){
      let card=srcRoom.deck[i];
      suitIndexList.push(card.suitIndex);
      valueList.push(card.value);
    }
    io.sockets.emit('heresTops', {
      by:data.client,
      at:data.room,
      siList:suitIndexList,
      vList:valueList,
    });
  });

  socket.on('giveGimmeDiscard', function(data){
    io.sockets.emit('heresLindiscard', {
      by:data.client,
      at:data.room,
      suit:data.cardSuit,
      value:data.cardVal,
    })
  });

  socket.on('finTurn', function(data){
    nextTurn(data.room, data.client);
  });
	
});

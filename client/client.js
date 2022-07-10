//This is the p5js sketch document!
var receiving = false;
var currentRoom = "none";
var ROOMS = [];
var WIDTH = 0;
var HEIGHT = 0;
class Room {
  constructor(name, max){
    this.name=name;
    this.current=0;
    this.max=max;
    this.players=[];
  }
}
var socket = io();
//^^Connects to the server with socket.io
socket.on('roomList', refreshRooms);
function refreshRooms(data){
  if(socket.id===data.to || data.to==="all"){
    let newRoom = new Room(data.name, data.max);
    newRoom.current=data.current;
    if(newRoom.current>0)newRoom.players=data.players;
    console.log("received "+data.name+"("+data.current+"/"+data.max+")");
    ROOMS.push(newRoom);
    console.log("received rooms, now have:"+ROOMS.length);
    refreshList();
  }
}
socket.on('roomUnlist', function(data){
  if(socket.id===data.to || data.to==="all"){
    console.log("unlisted "+data.name+"("+data.current+"/"+data.max+")");

    let roomNumber = (0-1);
    for(let i=0; i<ROOMS.length; i++){
      if(ROOMS[i].name===data.name)roomNumber=i;
    }
    if(roomNumber!=(0-1))ROOMS.splice(roomNumber, 1);
    console.log("unlisted rooms, now have:"+ROOMS.length);
    refreshList();
  }
});
socket.on('roomEdit', editRooms);
function editRooms(data){
  if(socket.id===data.to || data.to==="all"){
    for(let i=0; i<ROOMS.length; i++){
      if(ROOMS[i].name===data.name){
        if(showLogs)console.log("found room, editing ("+data.name+"("+data.current+"/"+data.max+"))...");
        if(ROOMS[i].name===currentRoom){
          if(showLogs)console.log("someone joined your room!");
          for(let i=0; i<MAXCARDS; i++){
            if(deckSize>0){
              let card = new Card(0, 0, sleeveImg);
              ophand.push(card);//causes exit silly
              deckSize=deckSize-1;
            }
          }
          realignHand(ophand, "ophand");
          ROOMS[i].current=data.current;
          ROOMS[i].max=data.max;
          ROOMS[i].players=data.players;
          if(ROOMS[i].current>1){
            gameStarted=true;
          }else {
            if(gameStarted){//opponent disconnect
              //console.log("won [roomEdit]");
              win();
            }
            gameStarted=false;
          }
        }
        ROOMS[i].current=data.current;
        ROOMS[i].max=data.max;
        ROOMS[i].players=data.players;
        //number:ROOM_LIST[i].number,
      }
    }
    refreshList();
  }
}
socket.on('roomReady', function(data){
  if(data.to===socket.id){
    currentRoom=data.name;
    console.log("entered created room ("+data.name+")");
    playerId=1;
    yourTurn=true;
    gamestate="vs";
  }
});

class Obj {
  constructor(x, y, w, h){
    this.xPos=x;
    this.yPos=y;
    this.w=w;
    this.h=h;
    this.left=this.xPos-this.w/2;
    this.top=this.yPos-this.h/2;
  }

  refresh(){
    this.left=this.xPos-this.w/2;
    this.top=this.yPos-this.h/2;
  }

  mouseOver(){
    if(mouseX>this.left && mouseX<this.left+this.w && mouseY>this.top && mouseY<this.top+this.h)return true;
    return false;
  }
}

class RoomButton extends Obj{
  constructor(x, y, w, h, id, label){
    super(x, y, w, h);
    this.id=id;
    this.label=label;
  }

  click(){
    if(this.id==="createRoom"){//creates glitch with rooms named createRoom
      currentMode='untimed';
      if(showLogs)console.log("entered matchmaking...");
      let foundOpp = false;
      for(let i=0; i<ROOMS.length; i++){
        if(ROOMS[i].current===1){
          foundOpp=true;
          socket.emit('enterRoom', {
            room:ROOMS[i].name, 
            prevRoom: currentRoom,
            client:socket.id,
          });
          gamestate="vs";//waiting for player
          currentRoom=ROOMS[i].name;
        }
      }
      if(!foundOpp){
        socket.emit('createRoom', {
          room:"createRoom",
          prevRoom: currentRoom, 
          client:socket.id, 
        });
      }
    }else if(this.id==="playTutorial"){
      currentMode='tutorial';
      if(showLogs)console.log("entered tutorial");
      gamestate="vs";
      //currentRoom=
    }else {
      if(showLogs)console.log("entered ("+this.id+")");
      socket.emit('enterRoom', {
        room:this.id, 
        prevRoom: currentRoom,
        client:socket.id, 
      });
      gamestate="vs";
      currentRoom=this.id;
    }
  }
}

function refreshList(){
  roombuttons=[];
  for(let i=0; i<ROOMS.length; i++){
    roombuttons.push(new RoomButton(WIDTH/2, HEIGHT*(0.1*(i+1)), WIDTH/15, HEIGHT/18, ROOMS[i].name, ROOMS[i].name+" ("+ROOMS[i].current+"/"+ROOMS[i].max+")"));
  }
}

let mouseDown = false;
let gamestate = "rooms";
let currentMode = 'untimed';
let roombuttons = [];
let specIcons = [];
let createRoomBtn;
let setupGame = false;
let initCards = 0;
let playerId = 2;
let setupTick=1;
let tutorialUnlocked=true;
let gameStarted = false;
let yourTurn = false;
let discardTime = false;
let ritualed = false;
let discarded = false;
let nextTurnDepressed = false;
let displayChoice = false;
let dispcball = false;
let dispeye = false;
let disphand = false;
let deckSize = 999;
let tops = [];
let presentedDiscard = [];
let displayDiscard = false;
let lindHandin = false;
let yourTurnCount=0;
let middleImg;
let wonLastGame=false;
let middleClr;
let funnySpecial=false;
let historybar = [];
let hbcount;

let cballcon;
let eyecon;
let handcon;
let onecon;
let twocon;
let threecon;
let fourcon;

let imageLibrary = [];
function preload(){//load all image assets to attempt to prevent image loading problems
  //placeholderImg=loadImage('client/data/placeholder.png');
/*
  for(let i=1; i<=MAXSUIT; i++){
    for(let ii=1; ii<=6; ii++){
      if(ii===6){
        imageLibrary.push(loadImage('client/data/'+getSuit(i)+'fred'+CARDEXT));
      }else {
        imageLibrary.push(loadImage('client/data/'+getSuit(i)+ii+CARDEXT));
      }
    }
  }*/
}

function getImage(suitIndex, value){
  if(value===10)value=6;
  return imageLibrary[(((suitIndex-1)*6)+value)-1];
}

function setup(){
  var cnv = createCanvas(windowWidth, windowHeight);
  cnv.style('display', 'block');
  WIDTH=width;
  HEIGHT=height;

  textAlign(CENTER, CENTER);
  rectMode(CENTER);

  background(230);
  noStroke();

  black=color(0);
  white=color(255);

  blueClr=color(0, 0, 200);
  yellowClr=color(200, 200, 0);
  redClr=color(200, 0, 0);

  middleClr=color(90);
  playerClr=color(0, 0, 130);
  opClr=color(130, 0, 0);
  loseClr=color(200, 0, 0, 50);
  winClr=color(0, 200, 0, 50);

  if(showLogs)console.log("init");
  createRoomBtn = new RoomButton(width*0.1, height*0.1, width/15, height/18, "createRoom", "Create Room");
  playTutorialBtn = new RoomButton(width*0.9, height*0.1, width/15, height/18, "playTutorial", "Play Tutorial");
/*
  for(let i=0; i<ROOMS.length; i++){
    roombuttons.push(new RoomButton(width/2, height*(0.1*i), width/15, height/18, ROOMS[i].name, ROOMS[i].name+" ("+ROOMS[i].current+"/"+ROOMS[i].max+")"));
  }
  */
  if(showLogs)console.log("rooms:"+ROOMS+"("+ROOMS.length+")");

  if (/Mobi|Android/i.test(navigator.userAgent)) {
    // mobile!
    gamestate="mobile";
  }
}


function draw(){
  if(gamestate==="rooms"){
    background(230);
    fill(0);
    if(mouseX>(WIDTH/2 - 6*36) && mouseX<(WIDTH/2 + 6*36) && mouseY>(HEIGHT*0.8 - 6*3) && mouseY<(HEIGHT*0.8 + 6*3)){
      fill(231,84,117);
      document.getElementsByTagName("canvas")[0].style.cursor = "pointer"; 
    }else {
      document.getElementsByTagName("canvas")[0].style.cursor = "auto"; 
    }
    text("Some server logic taken from @kaldisberzins' Multiplayer Game Example. Thank you.", WIDTH/2, HEIGHT*0.8, 12*36, 12*3);
    fill(200);
    if(createRoomBtn.mouseOver())fill(150);
    rect(createRoomBtn.xPos, createRoomBtn.yPos, createRoomBtn.w, createRoomBtn.h);
    fill(0);
    text("Enter Matchmaking", createRoomBtn.xPos, createRoomBtn.yPos);
    fill(200);
    if(playTutorialBtn.mouseOver())fill(150);
    rect(playTutorialBtn.xPos, playTutorialBtn.yPos, playTutorialBtn.w, playTutorialBtn.h);
    fill(0);
    text(playTutorialBtn.label, playTutorialBtn.xPos, playTutorialBtn.yPos);
  }else if(gamestate==="vs"){
    if(!setupGame){
      if(setupTick===1){//add correct game mode script
        let head = document.getElementsByTagName('head')[0];
        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'client/mode/'+currentMode+'.js';
        head.appendChild(script);
      }else {
        if(typeof initGame === "function"){
          initGame();
          if(showLogs)console.log("initGame() finished");
          setupGame=true;
        }
        //this loading text probably doesn't work correctly
        fill(0);
        if(setupTick%3===1){
          text("Loading.", width/2, height/2);
        }else if(setupTick%3===2){
          text("Loading..", width/2, height/2);
        }else {
          text("Loading...", width/2, height/2);
        }
      }
      setupTick++;
    }else{
      displayGame();
      if(yourTurnCount>frameCount){
        fill(255);
        stroke(0);
        rect(width/2, height/2, width/4, height/4);
        fill(0);
        text('Your Turn', width/2, height/2);
      }
    }
  }else if(gamestate==="middle"){
    noStroke();
    image(middleImg, width/2, height/2);
    if(wonLastGame){
      fill(winClr);
    }else{
      fill(loseClr);
    }
    rect(width/2, height/2, width, height/5);
    fill(0);
    if(wonLastGame){
      text("You won", width/2, height/2);
    }else {
      text("You lost", width/2, height/2);
    }
  }else if(gamestate==="mobile"){
    background(230);
    fill(200, 0, 0);
    text("This game does not support mobile", width/2, height/2);
  }
}

function mousePressed(){
  if(mouseButton===LEFT){
    mouseDown=true;
    if(yourTurnCount>0)yourTurnCount=0;
    if(gamestate==="rooms"){
      for(let i=0; i<roombuttons.length; i++){
        for(let ii=0; ii<ROOMS.length; ii++){
          if(ROOMS[ii].name===roombuttons[i].id){
            if(roombuttons[i].mouseOver() && ROOMS[ii].current<ROOMS[ii].max)roombuttons[i].click();
          }
        }
        
      }
      if(createRoomBtn.mouseOver())createRoomBtn.click();
      if(playTutorialBtn.mouseOver() && tutorialUnlocked)playTutorialBtn.click();

      if(mouseX>(WIDTH/2 - 6*36) && mouseX<(WIDTH/2 + 6*36) && mouseY>(HEIGHT*0.8 - 6*3) && mouseY<(HEIGHT*0.8 + 6*3)){
        window.open("https://repl.it/@kaldisberzins");
      }

      background(230);
    }else if(gamestate==="vs"){
      for(let i=0; i<hand.length; i++){
        if(hand[i].mouseOver())hand[i].sel=true;
      }
      if(ritual.mouseOver()){
        ritual.sel=true;
      }else if(discard.mouseOver()){
        presentDiscard();
      }

      if(yourTurn && gameStarted){
        if(endBtn.mouseOver()){
          if(showLogs)console.log("ended turn");
          endBtn.click();
        }else if(displayChoice){
          for(let i=0; i<specIcons.length; i++){
            if(specIcons[i].mouseOver()){
              specIcons[i].click();
              break;
            }
          }
        }else if(lindHandin){
          for(let i=0; i<presentedDiscard.length; i++){
            let dcard=presentedDiscard[i];
            if(dcard.mouseOver()){
              //emit sock, add tohand*!
              for(let ii=0; ii<discard.cards.length; ii++){//remove card from discard
                if(discard.cards[ii].value===dcard.value && discard.cards[ii].suitIndex===dcard.suitIndex){
                  discard.cards.splice(ii, 1);
                  break;
                }
              }

              pushIn(dcard);

              giveGimmeDiscard(dcard);

              displayDiscard=false;
              lindHandin=false;
            }
          }
        }
      }
    }
  }
}

function mouseReleased(){
  if(mouseButton===LEFT){
    mouseDown=false;
    if(gamestate==="vs" && setupGame){
      let beingStupid=true;
      let specCirc=false;//so no redraw before hand swap is finished
      let needEndDraw=false;//so chimmy-6-card works
      let endParty = "middle"; //so chimmy draws before shuffle
      let endDrew=false;//so draws 1 for chimmy if not chimmy-6-card
      for(let i=0; i<hand.length; i++){
        if(hand[i].mouseOver()){
          if(leftParty.mouseOver() && leftParty.tryCard(hand[i]) && yourTurn && gameStarted){
            beingStupid=false;
            if(hand[i].value===5){
              needEndDraw=true;
              endParty="left";
            }else {
              if(hand[i].value===1 && leftParty.value!==0 && !ritualed){
                funnySpecial=true;
                ritualed=true;
              }
              giveParty("left", hand[i]);
              hand.splice(i, 1);
              dtPatch();
              realignHand(hand, "hand");
            }
          }
          if(middleParty.mouseOver() && middleParty.tryCard(hand[i]) && yourTurn && gameStarted){
            beingStupid=false;
            if(hand[i].value===5){
              needEndDraw=true;
              endParty="middle";
            }else {
              if(hand[i].value===1 && middleParty.value!==0 && !ritualed){
                funnySpecial=true;
                ritualed=true;
              }
              giveParty("middle", hand[i]);
              hand.splice(i, 1);
              dtPatch();
              realignHand(hand, "hand");
            }
          }
          if(rightParty.mouseOver() && rightParty.tryCard(hand[i]) && yourTurn && gameStarted){
            beingStupid=false;
            if(hand[i].value===5){
              needEndDraw=true;
              endParty="right";
            }else {
              if(hand[i].value===1 && rightParty.value!==0 && !ritualed){
                funnySpecial=true;
                ritualed=true;
              }
              giveParty("right", hand[i]);
              hand.splice(i, 1);
              dtPatch();
              realignHand(hand, "hand");
            }
          }
          if(ritual.mouseOver() && ritual.tryCard(hand[i]) && !ritualed && yourTurn && gameStarted){//if dragging card to ritual
            if(hand[i].value!==10){
              beingStupid=false;
              ritualed=true;
              giveRitual(hand[i]);
              hand.splice(i, 1);
              dtPatch();
              realignHand(hand, "hand");
            }else if(showHelpLogs){
              console.log("You cannot begin to fathom the devastation you would cause, ");
              console.log("were you to involve Fred's sacred merchandise with the gods");
            }
          }
          if(discard.mouseOver() && !discarded && yourTurn && gameStarted){//if dragging card to discard
            if(hand[i].value!==10){
              beingStupid=false;
              if(!discardTime || hand.length<=MAXCARDS+1){
                console.log('discarded a card');
                discarded=true;
                if(discardTime){
                  if(showLogs)console.log('auto-ended turn (normal)');
                  discardTime=false;
                  endTurn();
                  /*
                  yourTurn=false;
                  socket.emit('finTurn', {
                    room:currentRoom,
                    client:socket.id,
                  });
                  */
                }
              }
              giveDiscard(hand[i]);
              hand.splice(i, 1);
              dtPatch();
              realignHand(hand, "hand");
            }else if(showHelpLogs){
              console.log("You cannot bring yourself to discard the merchandise");
            }
          }
          if(fred.mouseOver() && !ritualed && yourTurn && gameStarted){//if dragging card to fred
            if(fred.tryCard(hand[i])){
              beingStupid=false;
              ritualed=true;
              giveFred(hand[i]);
              hand.splice(i, 1);
              dtPatch();
              realignHand(hand, "hand");
            }else if(showHelpLogs){
              console.log("This holy ground is reserved for Fred's merchandise");
            }
          }
          if(action.mouseOver() && yourTurn && gameStarted){
            if(action.tryCard(hand[i])){
              if(hand[i].value===3 && !ritualed){
                beingStupid=false;
                ritualed=true;
                specCirc=true;
                giveHandAction(hand[i]);
                hand.splice(i, 1);
                dtPatch();
              }else if(hand[i].value===2){
                beingStupid=false;
                displayChoice=true;
                giveAction(hand[i]);
                hand.splice(i, 1);
                dtPatch();
              }else if(!ritualed && hand[i].value===4){
                beingStupid=false;
                ritualed=true;
                giveAction(hand[i]);
                hand.splice(i, 1);
                dtPatch();
              }
              realignHand(hand, "hand");
            }else if(showHelpLogs){
              console.log("This merchandise is not sentient... yet.");
            }
          }
          if(beingStupid){
            hand[i].sel=false;
            hand[i].snap();
          }else if(hand.length===0 && !specCirc){//redraw on empty hand
              for(let i=0; i<MAXCARDS; i++)getNextFaceUp();
              realignHand(hand, "hand");
          }else if(hand.length===1 && !specCirc){//chimmy-6-card interaction
            if(needEndDraw){
              if(showLogs)console.log("asked for chimmy's sixer (6-card)");
              giveParty(endParty, hand[i]);
              hand.splice(i, 1);
              getNextFaceUp();
              endDrew=true;
              for(let i=0; i<MAXCARDS; i++)getNextFaceUp();
              realignHand(hand, "hand");
            }
          }
          if(needEndDraw && !endDrew){//chimmy draw non-6-card interaction
            if(showLogs)console.log("asked for chimmy's sixer (normal)");
            giveParty(endParty, hand[i]);
            hand.splice(i, 1);
            getNextFaceUp();
            realignHand(hand, "hand");
          }
        }
      }

      if(ritual.sel){//if dragging ritual to discard, dump
        if(discard.mouseOver() && !ritualed && yourTurn && gameStarted){
          ritualed=true;
          giveDump(ritual.cards);
        }else if(fred.mouseOver() && !ritualed && yourTurn && gameStarted && ritual.cards.length>=RITUALNUMBER){
          ritualed=true;
          giveFredGet(ritual.cards);
        }
        ritual.sel=false;
      }
    }
  }
}
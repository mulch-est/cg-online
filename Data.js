module.exports = class SvData {
  constructor(){
    this.rooms = [];
    this.connected_sockets = [];
  }

  //param socket contains the socket class, which is primarily used for its id member var
  connectSocket(socket){
    connected_sockets.push(socket);
  }

  //param socket contains socket class, param hard is a bool: whether to remove socket from connected_sockets
  disconnectSocket(socket, hard){
    //iterate through every player in every room to find correct socket
    let delNum = -1;
    for(let i=0; i<rooms.length; i++){
      if(rooms[i].players.includes(socket.id)){
        let leftPlayer;
        for(j=0; j<rooms[i].players.length; j++){
          if(rooms[i].players[j] === socket.id){
            leftPlayer=j;
            break;
          }
        }
        //remove socket from correct room
        rooms[i].players.splice(leftPlayer, 1);
        rooms[i].current--;
        
        if(rooms[i].current === 0){
          delNum = i;
        }
      }
    }
    //remove room from list if there are no players left
    if(delNum != -1)rooms.splice(delNum, 1);

    //remove socket from connected_sockets if hard disconnect
    if(hard){
      let delSoc = -1;
      for(let i=0; i<connected_sockets.length; i++){
        if(connected_sockets[i].id === socket.id){
          
        }
      }
      if(delSoc != -1)connected_sockets.splice(delSoc, 1);
    }
  }

  //param data contains keys sent by client
  moveClientRoom(data){
    //iterate through every room
    for(let i=0; i<rooms.length; i++){
      //will cause glitches with multiple rooms of same name
      if(rooms[i].name === data.room && data.prevRoom === "none"){
        //add client to correct room and increment current players
        rooms[i].players.push(data.client);
        rooms[i].current++;
      }
    }
  }

  //generates valid room name, param rmname should be string & desired name
  generateRoomName(rmname){
    let nameOk=true;
    if(rmname === "createRoom" || rmname === "playTutorial" || isEmpty(rmname)){
      nameOk=false;
    }else {
      for(let i=0; i<rooms.length; i++){
        if(rooms[i].name === rmname){
          nameOk=false;
          break;
        }
      }
    }
    if(nameOk){
      return rmname;
    }else {
      //generate name since prompt answer was not valid
      let attempt = makeid(8);
      return generateRoomName(attempt);
    }
  }

  //param data contains keys sent by client
  requestRoom(data){
    if(data.prevRoom==="none" && !isEmpty(data.room)){
      //create room with name data.room (or a random name if that one is unavailable)
      let roomName = generateRoomName(data.room);

      let createdRoom = new Room(roomName, 2);
      /* InitRoom()
      loadCards(createdRoom);
      createdRoom.deck=shuffle(createdRoom.deck);*/

      //add data.client to the room
      createdRoom.players.push(data.client);
      createdRoom.current++;
      createdRoom.index = rooms.length;
      rooms.push(createdRoom);
    }
  }
  
}

//creates a random string from var characters of length determined by int param length
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

class Room {
  constructor(name, max){
    this.name = name;
    this.current = 0;
    this.max = max;
    this.players = [];
    this.index = -1;
  }
}
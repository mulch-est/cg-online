module.exports = class SvData {
  constructor(){
    this.rooms = [];
    this.connected_sockets = [];
  }

  connectSocket(socket){
    connected_sockets.push(socket);
  }

  disconnectSocket(socket){
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
  }
}

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
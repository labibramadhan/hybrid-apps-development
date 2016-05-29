//import execute from 'rs-theme';

//execute();

import io from 'socket.io-client';

const socket = io.connect();

socket.on('connect', function(){
    console.log("Connected!");
});
socket.on('connect_error', function(err){
    console.log("Error on connection: " + err);
});
socket.on('event', function(data){
    console.log("Got event");
});
socket.on('disconnect', function(){
    console.log("Disconnected");
});
socket.on('LocalTodo:changed', function(){
    console.log("LocalTodo changed!");
});
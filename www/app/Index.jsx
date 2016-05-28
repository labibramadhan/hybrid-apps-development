//import execute from 'rs-theme';

//execute();

import io from 'socket.io-browserify';

const socket = io.connect('http://localhost:1234');

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
socket.emit('todos:create', {ada: true});
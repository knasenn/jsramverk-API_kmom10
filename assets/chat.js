//connection
var socket = io.connect("http://localhost:4000");
//Listen

socket.on("korv", function(data){
    console.log(data);
});

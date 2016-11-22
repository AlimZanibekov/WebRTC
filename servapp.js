var express  = require('express');
var https    = require('https');
var mongoose = require('mongoose');
var fs       = require('fs');
var app      = express();
var app2     = express();

var mongoURI = "mongodb://localhost:27017/chat";
var MongoDB = mongoose.connect(mongoURI).connection;


MongoDB.on("error", console.error.bind(console, "connection error:"));
MongoDB.once("open", function callback () {
    console.log("Connected!")
});


var UserSchema = new mongoose.Schema({
    name : String,
    pass : String,
    messages : [mongoose.Schema.Types.Mixed]
});

var User = MongoDB.model("User", UserSchema);


app.use('/', express.static(__dirname + '/app'));

https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app).listen(8001);


app2.use('/', express.static(__dirname + '/app'));
app2.listen(8000);

var app3 = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app).listen(1997);

var clients = {};
var clientsArr = [];

var io = require('socket.io').listen(app3);


io.sockets.on('connection', function (client) {
    client.on('join', function (message) {
        var ans = {
            result : {
                join : false,
                name : false
            }
        };
        var jn = false;
        if (message.name && message.pass) {
            if (!clients[message.name]) {
                jn = true;
                
                User.find({ name: message.name }, function (err, users) {
                    if (!err && users.length > 0){
                        ans.result.name = true;
                        if (users[0].pass === message.pass) {

                            clients[message.name] = {
                                socket : client,
                                call : false
                            };

                            client.s = { name : message.name};
                            ans.result.join = true;
                        }
                    }
                    client.emit('join', ans);
                });
            }
        }
        if (!jn)
            client.emit('join', ans);
	});
    
    client.on('signup', function (message) {
        var ans = {
            result : {
                join : false,
                name : false
            }
        };
        if (message.name && message.pass) {
            User.find({ name: message.name }, function (err, users) {
                if (!err && users.length == 0) {
                    ans.result.name = true;
                
                    var newUser = new User({name : message.name, pass : message.pass });
                    newUser.save(function (err, newUser) {
                        if (!err) {
                            clients[message.name] = {
                                socket : client,
                                call : false
                            };

                            client.s = { name : message.name };
                            ans.result.join = true;
                        }
                        client.emit('signup', ans);
                    });
                }
                else
                    client.emit('signup', ans);
            });
        }
        else
            client.emit('signup', ans);
	});
    
    client.on('qUpdate', function (message) {
        var arr = [];
        for (var key in clients) {
            if (key == client.s.name) continue;
            clients[key].socket.emit('qUpdate', { type: 'add', name : client.s.name });
            arr.push({
                name : key,
                call : (clients[key].call) ? true : false
            });
        }
        client.emit('qUpdate', { type: 'all', arr : arr});
        User.findOne({ name: client.s.name }, function (err, user) {
            if (!err) {
                client.emit('chat.history', { messages: user.messages});
            }else{
                console.log("err2")
            }
        });
	});
    
	client.on('qMessage', function (message) {
        var to = message.to;
        if(clients[to]) {
            if (clients[to].call == client.s.name) {
                delete message.to;
                message.from = client.s.name;
                clients[to].socket.emit('qMessage', message);
            }
        }
        else
            console.log('Error: not found "clients[' + to + ']"');
	});
    client.on('qClose', function (message) {
        var name = clients[client.s.name].call;
        if (name && clients[name]) {
            clients[name].socket.emit('qClose',{});
            clients[name].call = clients[client.s.name].call = false;
            
            for (var key in clients){
                clients[key].socket.emit('qUpdate', { type: 'uncall', one: name, two : client.s.name});
            }
        }
	});
    client.on('qCall', function (message) {
        if(clients[message.to] && !clients[message.to].call) {
            clients[message.to].call = client.s.name;
            clients[client.s.name].call = message.to;
            client.emit('qCall', { type : true, from : client.s.name});
            
            for (var key in clients)
                clients[key].socket.emit('qUpdate', { type: 'call', one: message.to, two : client.s.name});
        }
        else {
            client.emit('qCall', { type : false });
        }
	});
    
    
    client.on('chat.message', function (message) {
        var to = message.to;
        if(clients[to]) {
            message.from = client.s.name;
            message.time = new Date();
            User.findOne({ name: to }, function (err, user) {
                if (!err) {
                    user.messages.push({
                        from : message.from,
                        to   : false,
                        text : message.text,
                        time : message.time
                    });
                    user.save();
                }else{
                    console.log("err0")
                }
            });
            User.findOne({ name: message.from }, function (err, user) {
                if (!err) {
                    user.messages.push({
                        from : false,
                        to   : to,
                        text : message.text,
                        time : message.time
                    });
                    user.save();
                }else{
                    console.log("err1")
                }
            });
                      
            delete message.to;
            clients[to].socket.emit('chat.message', message);
        }
        else
            console.log('Chat error: not found "clients[' + to + ']"');
    });
    
    
    client.on('disconnect', function (message) {
        if (client.s){
            var name = clients[client.s.name].call;
            if (name && clients[name]) {
                clients[name].socket.emit('qClose',{});
                clients[name].call = false;
                for (var key in clients) {
                    clients[key].socket.emit('qUpdate', { type: 'uncall', one: name, two : client.s.name});
                }
            }
            
            for (var key in clients) {
                clients[key].socket.emit('qUpdate', { type: 'remove', name : client.s.name });
            }
            delete clients[client.s.name];
        }
	});
});
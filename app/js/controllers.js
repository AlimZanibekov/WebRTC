var qControllers = angular.module('qControllers', []);

qControllers.controller('joinCtrl', ['$scope', '$location', 'userData',
    function($scope, $location, userData) {
        $scope.up = false;
        
        socket.on('join', function (message){
            $scope.$apply(function() {
                $scope.user.disabled = false;
                if (message.result.join) {
                    $scope.up = true;
                    userData.updateName($scope.user.name);
                    setTimeout(function () {
                        $scope.$apply(function() {
                            $location.path('/main');
                        });
                    }, 500);
                } else {
                    $scope.user.error.nameErr.activity = !message.result.name;
                    $scope.user.error.passErr.activity = (!message.result.name) ? false : true;
                }
            });
        });
        
        $scope.user = {
            disabled : false,
            error : {
                nameErr : {
                    text : 'No such name', 
                    activity : false
                }, 
                connectErr : {
                    text : 'No connection to the server',
                    activity : false
                },
                emptyErr : {
                    text : 'Username can not be empty',
                    activity : false
                },
                passErr : {
                    text : 'Incorrect password',
                    activity : false
                },
                emptyPassErr : {
                    text : 'Password can not be empty',
                    activity : false
                }
            }
        };
        $scope.user.join = function () {
            if (!$scope.user.name || !$scope.user.pass) {
                $scope.user.error.emptyErr.activity = !Boolean($scope.user.name);
                $scope.user.error.emptyPassErr.activity = !Boolean($scope.user.pass);
                return;
            }
            
            $scope.user.error.connectErr.activity = !socket.connected;
            if (socket.connected) {
                $scope.user.disabled = true;
                socket.emit('join', {
                    name : $scope.user.name,
                    pass : $scope.user.pass
                });
            }
        };
    }]);
qControllers.controller('regCtrl', ['$scope', '$location', 'userData',
    function($scope, $location, userData) {
        $scope.up = false;
        
        socket.on('signup', function (message){
            $scope.$apply(function() {
                $scope.user.disabled = false;
                if (message.result.join) {
                    $scope.up = true;
                    userData.updateName($scope.user.name);
                    setTimeout(function () {
                        $scope.$apply(function() {
                            $location.path('/main');
                        });
                    }, 500);
                } else {
                    $scope.user.error.nameErr.activity = true;
                }
            });
        });
        
        $scope.user = {
            disabled : false,
            error : {
                nameErr : {
                    text : 'This name is already exist', 
                    activity : false
                }, 
                connectErr : {
                    text : 'No connection to the server',
                    activity : false
                },
                emptyErr : {
                    text : 'Username can not be empty',
                    activity : false
                },
                emptyPassErr : {
                    text : 'Password can not be empty',
                    activity : false
                }
            }
        };
        $scope.user.signup = function () {
            if (!$scope.user.name || !$scope.user.pass) {
                $scope.user.error.emptyErr.activity = !Boolean($scope.user.name);
                $scope.user.error.emptyPassErr.activity = !Boolean($scope.user.pass);
                return;
            }
            
            $scope.user.error.connectErr.activity = !socket.connected;
            if (socket.connected) {
                $scope.user.disabled = true;
                socket.emit('signup', {
                    name : $scope.user.name,
                    pass : $scope.user.pass
                });
            }
        };
    }]);


qControllers.controller('mainCtrl', ['$scope', '$location', 'userData',
    function($scope, $location, Data) {
        var peer, qStream;
        if (Data.getName() === false) {
            $location.path('/join');
            return;
        }
        $scope.modVolume = 0;
        $scope.setVolume = function () {
            videorem.volume = $scope.modVolume;
        };
        $scope.sendMessage = function (message) {
            if (!$scope.companion) {
                console.error('The source can not be found');
                return;
            }
            socket.emit('qMessage', {
                text : message,
                to : $scope.companion
            });
        };
        $scope.remoteVideo = false;
        
        $scope.muted = false;
        $scope.micSwitch = function () {
            var at = qStream.getAudioTracks()[0];
            $scope.muted = !(at.enabled = !at.enabled);
        };
        $scope.video = false;
        $scope.vidSwitch = function () {
            var vt = qStream.getVideoTracks()[0];
            $scope.video = !(vt.enabled = !vt.enabled);
        };
        
        $scope.createNewPeer = function () {
            if (peer) peer.close();
            
            peer = new PeerConnection(null);
            peer.addStream(qStream);
            peer.onicecandidate = function (event){
                if (event.candidate) {
                    $scope.sendMessage({
                        type: 'candidate',
                        label: event.candidate.sdpMLineIndex,
                        id: event.candidate.sdpMid,
                        candidate: event.candidate.candidate
                    });
                }
            };
            peer.onaddstream = function (event){
                videorem.src = URL.createObjectURL(event.stream);
                videorem.play();
                videorem.oncanplay = function () {
                    $scope.$apply(function (){
                        $scope.modVolume = videorem.volume;
                        $scope.remoteVideo = true;
                    });
                }
            };
            
        };
        
        $scope.companion = false;
        
        $scope.qClose = function () {
            setTimeout(function () {
                videorem.src = '';
            },600);
            $scope.remoteVideo = false;
            
            peer.close();
            $scope.companion = peer = false;
            $scope.createNewPeer();
        };
        
        $scope.uncall = function () {
            socket.emit('qClose', {});
            $scope.qClose();
        };
        $scope.call = function (i) {
            if ($scope.companion) return;
            
            $scope.companion = $scope.clients[i].name;
            $scope.setActive(i);
            socket.emit('qCall', { to : $scope.companion });
        };
        setTimeout(function () {
            $scope.$apply(function (){
                $scope.loaded = true;
            });
        }, 0);
        navigator.getUserMedia({
                audio: true,
                video: true
            },
            function (stream) {
                
                video.src = window.URL.createObjectURL(stream);
                video.onloadedmetadata = function(e) {
                    this.volume = 0;
                    this.play();
                };
                qStream = stream;
                $scope.createNewPeer();
            },
            function (err) {
                console.err("The following error occurred: " + err.name);
            });
        
        
        $scope.clients = [];
        socket.emit('qUpdate', {});
        socket.on('qUpdate', function (message){
            $scope.$apply(function (){
                if (message.type == 'call') {
                    for (var i = 0; i < $scope.clients.length; ++i) {
                        if (message.one == $scope.clients[i].name || message.two == $scope.clients[i].name) {
                            $scope.clients[i].call = true;
                        }
                    }
                }
                else if (message.type == 'uncall') {
                    for (var i = 0; i < $scope.clients.length; ++i) {
                        if (message.one == $scope.clients[i].name || message.two == $scope.clients[i].name) {
                            $scope.clients[i].call = false;
                        }
                    }
                }
                else if (message.type == 'remove') {
                    if ($scope.active == message.name) 
                        $scope.active = '';
                    for (var i = 0; i < $scope.clients.length; ++i) {
                        if (message.name == $scope.clients[i].name) {
                            //delete $scope.chat[$scope.clients[i].name];
                            
                            if ($scope.clients.length > 1 && i != $scope.clients.length - 1) {
                                $scope.clients[i] = $scope.clients.pop();
                            }
                            else {
                                $scope.clients.pop();
                            }
                            break;
                        }
                    }
                }
                else if (message.type == 'all') {
                    $scope.clients = message.arr;
                    for (var i = 0; i < $scope.clients.length; ++i) {
                        $scope.clients[i].active = false;
                        $scope.clients[i].num = 0;
                        $scope.clients[i].online = true;
                        if (!$scope.chat[$scope.clients[i].name])
                            $scope.chat[$scope.clients[i].name] = [];
                    }
                }
                else if (message.type == 'add') {
                    $scope.clients.push({
                        name : message.name,
                        call : false,
                        active : false, 
                        num : 0,
                        online : true
                    });
                    if (!$scope.chat[message.name])
                        $scope.chat[message.name] = [];
                }
            });
        });
        
        socket.on('qCall', function (message){
            if (message.type) {
                for (var i = 0; i < $scope.clients.length; ++i)
                    if (message.from == $scope.clients[i].name){
                        $scope.setActive(i);
                        break;
                    }
                
                peer.createOffer(
                    function (description){
                        peer.setLocalDescription(description);
                        $scope.sendMessage(description);
                    }, 
                    function(error) { 
                        console.error(error);
                    },
                    {
                        'mandatory': { 
                            'OfferToReceiveAudio': true, 
                            'OfferToReceiveVideo': true 
                        }
                    }
                );
            }
            else
                $scope.companion = false;
        });
        
        socket.on('qClose', function (message){
            $scope.qClose();
        });
        
        socket.on('qMessage', function (message){
            if (message.text.type === 'offer') {
                $scope.companion = message.from;
                
                
                peer.setRemoteDescription(new SessionDescription(message.text));
                peer.createAnswer(
                    function (description){
                        peer.setLocalDescription(description);
                        socket.emit('qMessage', {
                            text : description, 
                            to : $scope.companion
                        });
                    },
                    function(error) { 
                        console.error(error);
                    },
                    {
                        'mandatory': { 
                            'OfferToReceiveAudio': true, 
                            'OfferToReceiveVideo': true 
                        }
                    }
                );
            } 
            else if (message.text.type === 'answer') {
                peer.setRemoteDescription(new SessionDescription(message.text));
            }
            else if (message.text.type === 'candidate') {
                var candidate = new IceCandidate({
                        sdpMLineIndex: message.text.label, 
                        candidate: message.text.candidate
                    });
                
                peer.addIceCandidate(candidate);
            }
        });
        
        
        $scope.chat = {
            error : {
                activeErr : {
                    text : 'Not selected recipient',
                    activity : false
                },
                emptyErr : {
                    text : 'Empty message cannot send',
                    activity : false
                }
            }
        };
        $scope.chat.message = '';
        $scope.active = '';
        $scope.chat.isError = false;
        
        $scope.chat.send = function () {
            if (!this.message) {
                this.error.emptyErr.activity = true;
                return;
            }
            if (!$scope.active) {
                this.error.activeErr.activity = true;
                return;
            }
            socket.emit('chat.message', {
                text : this.message,
                to : $scope.active
            });
            $scope.chat[$scope.active].push({
                text : this.message,
                time : new Date(), 
                my   : true
            });
            
            this.message = '';
        }
        
        socket.on('chat.message', function(message) {
            $scope.$apply(function(){
                if ($scope.chat[message.from]) {
                    $scope.chat[message.from].push({
                        text : message.text,
                        time : message.time, 
                        my   : false
                    });
                    
                    for (var i = 0; i < $scope.clients.length; ++i)
                        if (message.from == $scope.clients[i].name) {
                            if (message.from != $scope.active)
                                $scope.clients[i].num++;
                            break;
                        }
                }
                else {
                    console.error('Message.from is not definded: '+message.from);
                }
                
            });
        });
        socket.on('chat.history', function(message) {
            $scope.$apply(function(){
                var mess = message.messages;
                for (var i = 0; i < mess.length; ++i) {
                    if (!mess[i].from) {
                        if (!$scope.chat[mess[i].to])
                            $scope.chat[mess[i].to] = [];
                        
                        $scope.chat[mess[i].to].push({
                            text : mess[i].text,
                            time : mess[i].time,
                            my   : true
                        });
                    }
                    else if (!mess[i].to) {
                        if (!$scope.chat[mess[i].from])
                            $scope.chat[mess[i].from] = [];
                        $scope.chat[mess[i].from].push({
                            text : mess[i].text,
                            time : mess[i].time, 
                            my   : false
                        });
                    }
                }
                console.dir($scope.chat)
            });
        });
        
        
        $scope.setActive = function (k) {
            for (var i = 0; i < $scope.clients.length; ++i) 
                $scope.clients[i].active = false;
            $scope.clients[k].active = true;
            $scope.clients[k].num = 0;
            $scope.active = $scope.clients[k].name;
            $scope.chat.error.activeErr.activity = false;
        }
        
        
        messageTextarea.onkeypress = function (event) {
            if(event.keyCode == 13 && !event.shiftKey) {
                this.parentNode.children[1].click();
                return false;
            }
        }
    }]);
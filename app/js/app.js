'use strict';
var socket = io.connect('https://'+window.location.hostname+':1997');
var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;


/* App Module */

var qChat = angular.module('qChat', [
    'ngRoute',
    'qControllers',
    'qServices'
]);

qChat.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
            when('/main', {
                templateUrl: '/parts/main.html',
                controller: 'mainCtrl'
            }).
            when('/join', {
                templateUrl: '/parts/join.html',
                controller: 'joinCtrl'
            }).
            when('/signup', {
                templateUrl: '/parts/signup.html',
                controller: 'regCtrl'
            }).
            otherwise({
                redirectTo: '/join'
            });
    }]);

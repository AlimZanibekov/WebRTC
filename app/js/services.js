'use strict';

var qServices = angular.module('qServices', []);

qServices.factory('userData', function(){
    var name = false;
    return {
        updateName: function(newValue) {
            name = newValue;
        },
        getName: function() {
            return name;
        }
    };
});


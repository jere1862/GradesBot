window.onload = function(e) {
    /*FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    });*/   

    FB.login(function(response){
        console.log(response);
    }, {scope: 'email, pages_messaging_subscriptions'});
}

function statusChangeCallback(test) {
}

const onSubscribe = function() {
}

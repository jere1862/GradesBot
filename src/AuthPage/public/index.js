window.onload = function(e) {
    FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    });
}

function statusChangeCallback(test) {
    console.log(test);
}

const onSubscribe = function() {
}

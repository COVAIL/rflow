Asynchronous Twitter client API for node.js
===========================================

[twitter-ng](http://github.com/Isolus/twitter-ng) is an improved version of AvianFlu's [ntwitter](http://github.com/AvianFlu/ntwitter) which is based on jdub's [node-twitter](http://github.com/jdub/node-twitter), which in turn was inspired by, and uses some code from, technoweenie's [twitter-node](http://github.com/technoweenie/twitter-node).


## Installation

You can install twitter-ng and its dependencies with npm: `npm install twitter-ng`.


### Setup API 

The keys listed below can be obtained from [dev.twitter.com](http://dev.twitter.com) after [setting up a new App](https://dev.twitter.com/apps/new).

``` javascript
var twitter = require('twitter-ng');

var twit = new twitter({
  consumer_key: 'Twitter',
  consumer_secret: 'API',
  access_token_key: 'keys',
  access_token_secret: 'go here'
});
```


### Obtaining Access Token

This example assumes that you use [express](http://expressjs.com/).

``` javascript
app.get('/twitter_signin', restrict, function(req, res, next) {
  var twit = new twitter({
    consumer_key: 'KEY',
    consumer_secret: 'SECRET',
    oauth_callback: 'https://example.org/twitter_callback'
  });
  twit.login()(req, res, next);

});
app.get('/twitter_callback', restrict, function(req, res){
  var twit = new twitter({
    consumer_key: 'KEY',
    consumer_secret: 'SECRET',
  });
  twit.callback()(req, res, function() {
    console.log("Access Token: " + req.session.oauth_access_token);
    console.log("Access Token Secret: " + req.session.oauth_access_token_secret);
  });
});
```

### REST API 

Interaction with other parts of Twitter is accomplished through their RESTful API.
The best documentation for this exists at [dev.twitter.com](http://dev.twitter.com).  Convenience methods exist
for many of the available methods, but some may be more up-to-date than others.
If your Twitter interaction is very important, double-check the parameters in the code with 
Twitter's current documentation.

Note that all functions may be chained:

``` javascript
twit
  .verifyCredentials(function (err, data) {
    console.log(data);
  })
  .updateStatus('Test tweet from twitter-ng/' + twitter.VERSION,
    function (err, data) {
      console.log(data);
    }
  );
```

### Streaming API 

The stream() callback receives a Stream-like EventEmitter.

Here is an example of how to call the `statuses/sample` method:

``` javascript
twit.stream('statuses/sample', function(stream) {
  stream.on('data', function (data) {
    console.log(data);
  });
});
```
        
Here is an example of how to call the 'statuses/filter' method with a bounding box over San Fransisco and New York City ( see streaming api for more details on [locations](https://dev.twitter.com/docs/streaming-api/methods#locations) ):

``` javascript
twit.stream('statuses/filter', {'locations':'-122.75,36.8,-121.75,37.8,-74,40,-73,41'}, function(stream) {
  stream.on('data', function (data) {
    console.log(data);
  });
});
```

twitter-ng also supports user and site streams:

``` javascript
twit.stream('user', {track:'nodejs'}, function(stream) {
  stream.on('data', function (data) {
    console.log(data);
  });
  stream.on('end', function (response) {
    // Handle a disconnection
  });
  stream.on('destroy', function (response) {
    // Handle a 'silent' disconnection from Twitter, no end/error event fired
  });
  // Disconnect stream after five seconds
  setTimeout(stream.destroy, 5000);
});
```

## Contributors

[Lots of people contribute to this project. You should too!](https://github.com/Isolus/twitter-ng/contributors)

## TODO

- Complete the convenience functions, preferably generated
- Support [recommended reconnection behaviour](https://dev.twitter.com/docs/streaming-apis/connecting#Best_practices) for the streaming APIs
- Better support for rate limiting.


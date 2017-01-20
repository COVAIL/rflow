var VERSION = '0.6.2',
  http = require('http'),
  querystring = require('querystring'),
  oauth = require('oauth'),
  streamparser = require('./parser'),
  util = require('util'),
  utils = require('./utils'),
  keys = require('./keys');

function Twitter(options) {
  if (!(this instanceof Twitter)) return new Twitter(options);

  var defaults = {
    consumer_key: null,
    consumer_secret: null,
    access_token_key: null,
    access_token_secret: null,
    oauth_callback: null,

    headers: {
      'Accept': '*/*',
      'Connection': 'close',
      'User-Agent': 'twitter-ng/' + VERSION
    }
  };

  this.options = utils.merge(defaults, options, keys.urls);

  this.oauth = new oauth.OAuth(
    this.options.request_token_url,
    this.options.access_token_url,
    this.options.consumer_key,
    this.options.consumer_secret,
    '1.0', 
    this.options.oauth_callback, 
    'HMAC-SHA1', null,
    this.options.headers
  );
}
Twitter.VERSION = VERSION;
module.exports = Twitter;

/*
 * Helper Functions
 */
Twitter.prototype.get = function(url, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }

  if ( typeof callback !== 'function' ) {
    throw new Error('FAIL: INVALID CALLBACK.');
    return this;
  }

  if (url.charAt(0) == '/')
    url = this.options.rest_base + url;

  this.oauth.get(url + '?' + querystring.stringify(params),
    this.options.access_token_key,
    this.options.access_token_secret,
  function(error, data, response) {
    if ( error && error.statusCode ) {
      var err = new Error('HTTP Error '
        + error.statusCode + ': '
        + http.STATUS_CODES[error.statusCode]);
      err.statusCode = error.statusCode;
      err.data = error.data;
      callback(err);
    } 
    else if (error) {
      callback(error);
    }
    else {
      try {
        var json = JSON.parse(data);
      } 
      catch(err) {
        return callback(err);
      }
      callback(null, json);
    }
  });
  return this;
}
Twitter.prototype.post = function(url, content, content_type, callback) {
  if (typeof content === 'function') {
    callback = content;
    content = null;
    content_type = null;
  } else if (typeof content_type === 'function') {
    callback = content_type;
    content_type = null;
  }

  if ( typeof callback !== 'function' ) {
    throw new Error('FAIL: INVALID CALLBACK.');
    return this;
  }

  if (url.charAt(0) == '/')
    url = this.options.rest_base + url;

  // Workaround: oauth + booleans == broken signatures
  if (content && typeof content === 'object') {
    Object.keys(content).forEach(function(e) {
			if ( typeof content[e] === 'boolean' )
				content[e] = content[e].toString();
		});
  }
  
  this.oauth.post(url,
    this.options.access_token_key,
    this.options.access_token_secret,
    content, content_type,
    function(error, data, response) {
      if ( error && error.statusCode ) {
        var err = new Error('HTTP Error '
          + error.statusCode + ': '
          + http.STATUS_CODES[error.statusCode]
          + ', API message: ' + error.data);
        err.data = error.data;
        err.statusCode = error.statusCode;
        callback(err);
      } 
      else if (error) {
        callback(error);
      }
      else {
        try {
          var json = JSON.parse(data);
        } 
        catch(err) {
          return callback(err);
        }
        callback(null, json);
      }
    }
  );
  return this;
}
Twitter.prototype._getUsingCursor = function(url, params, callback) {
  var self = this,
    params = params || {},
    key = params.key || null,
    result = [];

  // if we don't have a key to fetch, we're screwed
  if (!key) {
    return callback(new Error('FAIL: Results key must be provided to _getUsingCursor().'));
  }
  delete params.key;

  // kick off the first request, using cursor -1
  params = utils.merge(params, {cursor:-1});
  this.get(url, params, fetch);

  function fetch(err, data) {
    if (err) {
      return callback(err);
    }

    // FIXME: what if data[key] is not a list?
    if (data[key]) result = result.concat(data[key]);

    if (data.next_cursor_str === '0') {
      callback(null, result);
    } else {
      params.cursor = data.next_cursor_str;
      self.get(url, params, fetch);
    }
  }

  return this;
}
Twitter.prototype.login = function(oauth_callback) {
  var self = this;

  return function handle(req, res, next) {
    self.oauth.getOAuthRequestToken(
      function(error, oauth_token, oauth_token_secret, results) {
        if ( error ) {
          console.log('error');
          console.log(error);
          // FIXME: do something more intelligent
          return next(500);
        } 
        else if (!(results && results.oauth_callback_confirmed == 'true')) {
          console.log('callback not confirmed');
          return next(500);
        }
        else {
          req.session.oauth_token = oauth_token;
          req.session.oauth_token_secret = oauth_token_secret;
          res.redirect(self.options.authorize_url + '?' + querystring.stringify({oauth_token: oauth_token}));
        }
      }
    );
  };
}
Twitter.prototype.callback = function() {
  var self = this;
  
  return function handle(req, res, next) {
    self.oauth.getOAuthAccessToken(
    req.session.oauth_token,
    req.session.oauth_token_secret,
    req.param('oauth_verifier'),
    function(error, oauth_access_token, oauth_access_token_secret, results) {
      if ( error ) {
        console.log('error');
        console.log(error);
        // FIXME: do something more intelligent
        return next(500);
      }
      else {
        req.session.oauth_access_token = oauth_access_token;
        req.session.oauth_access_token_secret = oauth_access_token_secret;
        next();
      }
    });
  };
}

/*
 * API Functions
 */

// Timelines
Twitter.prototype.getMentions = function(params, callback) {
  var url = '/statuses/mentions_timeline.json';
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.getUserTimeline = function(params, callback) {
  var url = '/statuses/user_timeline.json';
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.getHomeTimeline = function(params, callback) {
  var url = '/statuses/home_timeline.json';
  this.get(url, params, callback);
  return this;
}

// Tweets
Twitter.prototype.getRetweets = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }
  var url = '/statuses/retweets/' + escape(id) + '.json';
  this.get(url, params, callback); 
  return this;
}
Twitter.prototype.showStatus = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }
  var url = '/statuses/show/' + escape(id) + '.json';
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.getStatus
  = Twitter.prototype.showStatus;
Twitter.prototype.destroyStatus = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }
  var url = '/statuses/destroy/' + escape(id) + '.json';
  this.post(url, params, null, callback);
  return this;
}
Twitter.prototype.deleteStatus
  = Twitter.prototype.destroyStatus;
Twitter.prototype.updateStatus = function(text, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }
  var url = '/statuses/update.json';
  var defaults = {
    status: text,
    include_entities: 1
  };
  params = utils.merge(defaults, params);
  this.post(url, params, null, callback);
  return this;
}
Twitter.prototype.retweetStatus = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }
  var url = '/statuses/retweet/' + escape(id) + '.json';
  this.post(url, params, null, callback);
  return this;
}
/* TODO: Implement updateStatusWithMedia
Twitter.prototype.updateStatusWithMedia = function(text, media, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }
  var url = '/statuses/update_with_media.json';
  var defaults = {
    status: text,
    include_entities: 1
  };
  params = utils.merge(defaults, params);
  this.post(url, params, null, callback);
  return this;
}
*/
Twitter.prototype.getEmbed = function(params, callback) {
  var url = '/statuses/retweets/' + escape(id);
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.getRetweeterIds = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }
  var defaults = {key: 'ids'};
  params = utils.merge(defaults, params);
  var url = '/statuses/retweeters/ids.json';
  this._getUsingCursor(url, params, null, callback);
  return this;
}

// Search
Twitter.prototype.search = function(q, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }
  if ( typeof callback !== 'function' ) {
    throw new Error('FAIL: INVALID CALLBACK.');
    return this;
  }
  var url = '/search/tweets.json';
  params = utils.merge(params, {q:q});
  this.get(url, params, callback);
  return this;
}

// Streaming
// TODO: Implement getFilteredStatuses
// TODO: Implement getStatusesSample
// TODO: Implement getFirehose
Twitter.prototype.stream = function(method, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }

  // Iterate on params properties, if any property is an array, convert it to comma-delimited string
  if (params) {
    Object.keys(params).forEach(function(item) {
      if (util.isArray(params[item])) {
        params[item] = params[item].join(',');
      }
    });
  }

  var stream_base = this.options.stream_base,
      self = this;

  // Stream type customisations
  if (method === 'user') {
    stream_base = this.options.user_stream_base;
  } 
  else if (method === 'site') {
    stream_base = this.options.site_stream_base;
  } 


  var url = stream_base + '/' + escape(method) + '.json';

  var request = this.oauth.post(
    url,
    this.options.access_token_key,
    this.options.access_token_secret,
    params, null
  );

  var stream = new streamparser();

  stream.destroySilent = function() {
    stream.clearHeartbeat();
    if ( typeof request.abort === 'function' )
      request.abort(); // node v0.4.0
    else
      request.socket.destroy();
  };
  stream.destroy = function() {
    // FIXME: should we emit end/close on explicit destroy?
    stream.destroySilent();

    // emit the 'destroy' event
    stream.emit('destroy','socket has been destroyed');
  };

  
  stream.on('_data', processTweet);

  function processTweet(tweet) {
    if (tweet['limit']) {
      stream.emit('limit', tweet['limit']);
    }
    else if (tweet['delete']) {
      stream.emit('delete', tweet['delete']);
    }
    else if (tweet['scrub_geo']) {
      stream.emit('scrub_geo', tweet['scrub_geo']);
    }
    else {
      stream.emit('data', tweet);
    }
  }

  request.on('response', function(response) {

    // Any response code greater then 200 from steam API is an error
    if(response.statusCode > 200) {
      stream.destroySilent();
      stream.emit('error', 'http', response.statusCode );
    }
    else
    {
      // FIXME: Somehow provide chunks of the response when the stream is connected
      // Pass HTTP response data to the parser, which raises events on the stream
      response.on('data', function(chunk) {
        stream.receive(chunk);
      });
      response.on('error', function(error) {
        stream.emit('error', error);
      });
      response.on('end', function() {
        stream.emit('end', response);
      });
      
      /* 
       * This is a net.Socket event.
       * When twitter closes the connectionm no 'end/error' event is fired.
       * In this way we can able to catch this event and force to destroy the 
       * socket. So, 'stream' object will fire the 'destroy' event as we can see above.
       */
      response.on('close', function() {
        stream.destroy();
      });
    }
  });
  request.on('error', function(error) {
    stream.emit('error', error);
  });
  request.end();

  if ( typeof callback === 'function' ) callback(stream);
  return this;
}

// Direct Messages
Twitter.prototype.getDirectMessages = function(params, callback) {
  var url = '/direct_messages.json';
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.getDirectMessagesSent = function(params, callback) {
  var url = '/direct_messages/sent.json';
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.getSentDirectMessages
  = Twitter.prototype.getDirectMessagesSent;
Twitter.prototype.getDirectMessageById = function(id, callback) {
  var url = '/direct_messages/show.json';
  this.get(url, {id: id}, callback);
  return this;
}
Twitter.prototype.destroyDirectMessage = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }
  params = utils.merge(params, {id: id});
  var url = '/direct_messages/destroy.json';
  this.post(url, params, callback);
  return this;
}
Twitter.prototype.deleteDirectMessage
  = Twitter.prototype.destroyDirectMessage;
Twitter.prototype.newDirectMessage = function(id, text, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }
  var defaults = {
    text: text,
    include_entities: 1
  };
  if (typeof id === 'string') {
    defaults.screen_name = id;
  }
  else {
    defaults.user_id = id;
  }
  params = utils.merge(defaults, params);
  var url = '/direct_messages/new.json';
  this.post(url, params, null, callback);
  return this;
}
Twitter.prototype.sendDirectMessage
  = Twitter.prototype.newDirectMessage;

// Friends & Followers
Twitter.prototype.getNoRetweets = function(params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }

  var url = '/friendships/no_retweets/ids.json';
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.getFriendsIds = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }

  if (typeof id === 'string') {
    params.screen_name = id;
  }
  else if (typeof id === 'number') {
    params.user_id = id;
  }
  params = utils.merge(params, { key: 'ids' });

  var url = '/friends/ids.json';
  this._getUsingCursor(url, params, callback);
  return this;
}
Twitter.prototype.getFollowersIds = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }

  if (typeof id === 'string') {
    params.screen_name = id;
  }
  else if (typeof id === 'number') {
    params.user_id = id;
  }
  params = utils.merge(params, { key: 'ids' });

  var url = '/followers/ids.json';
  this._getUsingCursor(url, params, callback);
  return this;
}
Twitter.prototype.lookupFriendship = function(id, callback) {
  var url = '/friendships/lookup.json',
    params = {}, ids = [], names = [];
  
  if (typeof id === 'string') {
    id = id.replace(/^\s+|\s+$/g, '');
    id = id.split(',');
  }
  
  id = [].concat(id);
  
  id.forEach(function(item) {
    if (parseInt(item, 10)) {
      ids.push(item);
    } else {
      names.push(item);
    }
  });
  
  params.user_id = ids.toString();
  params.screen_name = names.toString();
  
  this.get(url, params, callback);
  return this;
};
Twitter.prototype.incomingFriendship = function(params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }
  params = utils.merge({key: 'ids'}, params);

  var url = '/friendships/incoming.json';
  this._getUsingCursor(url, params, callback);
  return this;
}
Twitter.prototype.incomingFriendships
  = Twitter.prototype.incomingFriendship;
Twitter.prototype.outgoingFriendship = function(params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }
  params = utils.merge({key: 'ids'}, params);

  var url = '/friendships/outgoing.json';
  this._getUsingCursor(url, params, callback);
  return this;
}
Twitter.prototype.outgoingFriendships
  = Twitter.prototype.outgoingFriendship;
Twitter.prototype.createFriendship = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }

  var defaults = {
    include_entities: 1
  };
  if (typeof id === 'string') {
    defaults.screen_name = id;
  }
  else {
    defaults.user_id = id;
  }
  params = utils.merge(defaults, params);

  var url = '/friendships/create.json';
  this.post(url, params, null, callback);
  return this;
}

Twitter.prototype.destroyFriendship = function(id, callback) {
  if (typeof id === 'function') {
    callback = id;
    id = null;
  }

  var params = {
    include_entities: 1
  };
  if (typeof id === 'string') {
    params.screen_name = id;
  }
  else {
    params.user_id = id;
  }

  var url = '/friendships/destroy.json';
  this.post(url, params, null, callback);
  return this;
}
Twitter.prototype.deleteFriendship
  = Twitter.prototype.destroyFriendship;
Twitter.prototype.updateFriendship = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }

  if (typeof id === 'string') {
    params.screen_name = id;
  }
  else if (typeof id === 'number') {
    params.user_id = id;
  }

  var url = '/friendships/update.json';
  this.post(url, params, null, callback);
  return this;
}
Twitter.prototype.showFriendship = function(source, target, callback) {
  var params = {};

  if (typeof source === 'string') {
    params.source_screen_name = source;
  }
  else {
    params.source_id = source;
  }

  if (typeof target === 'string') {
    params.target_screen_name = target;
  }
  else {
    params.target_id = target;
  }

  var url = '/friendships/show.json';
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.getFriends = function(id, callback) {
  if (typeof id === 'function') {
    callback = id;
    id = null;
  }

  var params = { key: 'users' };
  if (typeof id === 'string') {
    params.screen_name = id;
  }
  else if (typeof id === 'number') {
    params.user_id = id;
  }

  var url = '/friends/list.json';
  this._getUsingCursor(url, params, callback);

  return this;
}
Twitter.prototype.getFollowers = function(id, callback) {
  if (typeof id === 'function') {
    callback = id;
    id = null;
  }

  var params = { key: 'users' };
  if (typeof id === 'string') {
    params.screen_name = id;
  }
  else if (typeof id === 'number') {
    params.user_id = id;
  }

  var url = '/followers/list.json';
  this._getUsingCursor(url, params, callback);

  return this;
}

// Users
Twitter.prototype.settings = function(callback) {
  var url = '/account/settings.json';
  this.get(url, null, callback);
  return this;
}
Twitter.prototype.verifyCredentials = function(params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }

  var url = '/account/verify_credentials.json';
  this.get(url, params, callback);
  return this;
}

Twitter.prototype.updateProfile = function(params, callback) {
  // params: name, url, location, description
  var defaults = {
    include_entities: 1
  };
  params = utils.merge(defaults, params);

  var url = '/account/update_profile.json';
  this.post(url, params, null, callback);
  return this;
}
// TODO: Fix updateProfileImg
/*Twitter.prototype.updateProfileImg = function (params, callback) {
  // params: name, url, location, description
  var defaults = {
    include_entities: 1
  };
  params = utils.merge(defaults, params);

  var url = '/account/update_profile_image.json';
  this.post(url, params, null, callback);
  return this;
  
}*/

Twitter.prototype.createBlock = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }

  if (typeof id === 'string') {
    params.screen_name = id;
  }
  else {
    params.user_id = id;
  }

  var url = '/blocks/create.json';
  this.post(url, params, null, callback);
  return this;
}
Twitter.prototype.blockUser
  = Twitter.prototype.createBlock;

Twitter.prototype.destroyBlock = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }

  if (typeof id === 'string') {
    params.screen_name = id;
  }
  else {
    params.user_id = id;
  }

  var url = '/blocks/destroy.json';
  this.post(url, params, null, callback);
  return this;
}
Twitter.prototype.unblockUser
  = Twitter.prototype.destroyBlock;
Twitter.prototype.lookupUser = function(id, params, callback) {
  var ids = [], names = [];
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }

  if(typeof id === 'string') {
    id = id.replace(/^\s+|\s+$/g, '');
    id = id.split(',');
  }

  // Wrap any stand-alone item in an array.
  id = [].concat(id);

  // Add numbers as userIds, strings as usernames.
  id.forEach(function(item) {
    if (+item) {
      ids.push(item);
    }
    else {
      names.push(item);
    }
  });

  params.user_id = ids.toString();
  params.screen_name = names.toString();

  var url = '/users/lookup.json';
  this.get(url, params, callback);
  return this;
};
Twitter.prototype.lookupUsers
  = Twitter.prototype.lookupUser;
Twitter.prototype.searchUser = function(q, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }
  params = utils.merge(params, {q:q});
  
  var url = '/users/search.json';
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.searchUsers
  = Twitter.prototype.searchUser;

// Suggested Users

// Favorites
Twitter.prototype.getFavorites = function(params, callback) {
  var url = '/favorites/list.json';
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.createFavorite = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }
  params = utils.merge(params, {id: id});
  var url = '/favorites/create.json';
  this.post(url, params, null, callback);
  return this;
}
Twitter.prototype.destroyFavorite = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }
  params = utils.merge(params, {id: id});
  var url = '/favorites/destroy.json';
  this.post(url, params, null, callback);
  return this;
}
Twitter.prototype.deleteFavorite
  = Twitter.prototype.destroyFavorite;

// Lists
Twitter.prototype.getLists = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }

  if (typeof id === 'string') {
    params.screen_name = id;
  }
  else {
    params.user_id = id;
  }
  params = utils.merge(defaults, params);

  var url = '/lists/list.json';
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.getListMemberships = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }

  var defaults = {key: 'lists'};
  if (typeof id === 'string') {
    defaults.screen_name = id;
  }
  else {
    defaults.user_id = id;
  }
  params = utils.merge(defaults, params);

  var url = '/lists/memberships.json';
  this._getUsingCursor(url, params, callback);
  return this;
}
Twitter.prototype.getListSubscriptions = function(id, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }

  var defaults = {key: 'lists'};
  if (typeof id === 'string') {
    defaults.screen_name = id;
  }
  else {
    defaults.user_id = id;
  }
  params = utils.merge(defaults, params);

  var url = '/lists/subscriptions.json';
  this._getUsingCursor(url, params, callback);
  return this;
}

// Saved Searches 
Twitter.prototype.savedSearches = function(callback) {
  var url = '/saved_searches/list.json';
  this.get(url, null, callback);
  return this;
}
Twitter.prototype.showSavedSearch = function(id, callback) {
  var url = '/saved_searches/' + escape(id) + '.json';
  this.get(url, null, callback);
  return this;
}
Twitter.prototype.createSavedSearch = function(query, callback) {
  var url = '/saved_searches/create.json';
  this.post(url, {query: query}, null, callback);
  return this;
}
Twitter.prototype.newSavedSearch =
  Twitter.prototype.createSavedSearch;
Twitter.prototype.destroySavedSearch = function(id, callback) {
  var url = '/saved_searches/destroy/' + escape(id) + '.json';
  this.post(url, null, null, callback);
  return this;
}
Twitter.prototype.deleteSavedSearch =
  Twitter.prototype.destroySavedSearch;

// Places & Geo
Twitter.prototype.geoGetPlace = function(place_id, callback) {
  var url = '/geo/id/' + escape(place_id) + '.json';
  this.get(url, callback);
  return this;
}
Twitter.prototype.geoReverseGeocode = function(lat, lng, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }
  else if (typeof params !== 'object') {
    params = {};
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return callback(new Error('FAIL: You must specify latitude and longitude as numbers.'));
  }

  var url = '/geo/reverse_geocode.json';
  params.lat = lat;
  params.long = lng;

  this.get(url, params, callback);
  return this;
}
Twitter.prototype.geoSearch = function(params, callback) {
  var url = '/geo/search.json';
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.geoSimilarPlaces = function(lat, lng, name, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }
  else if (typeof params !== 'object') {
    params = {};
  }
  if (typeof lat !== 'number' || typeof lng !== 'number' || !name) {
    return callback(new Error('FAIL: You must specify latitude, longitude (as numbers) and name.'));
  }
  var url = '/geo/similar_places.json';
  params.lat = lat;
  params.long = lng;
  params.name = name;
  this.get(url, params, callback);
  return this;
}

// Trends 
Twitter.prototype.getTrends = function(callback) {
  this.getTrendsWithId('1', null, callback);
  return this;
}
Twitter.prototype.getCurrentTrends = function(params, callback) {
  this.getTrendsWithId('1', params, callback);
  return this;
}
Twitter.prototype.getTrendsWithId = function(woeid, params, callback) {
  if (!woeid) {
    woeid = '1';
  }
  var url = '/trends/place.json';
  if (typeof params == 'function') {
    callback = params;
    params = {};
    params.id = woeid;
  }
  this.get(url, params, callback);
  return this;
}
Twitter.prototype.getAvailableTrends = function(callback) {
  var url = '/trends/available.json';
  this.get(url, null, callback);
  return this;
}
Twitter.prototype.getClosestTrends = function(params, callback) {
  var url = '/trends/closest.json';
  this.get(url, params, callback);
  return this;
}

// Spam Reporting
Twitter.prototype.reportSpam = function(id, callback) {
  var url = '/users/report_spam.json';
  var params = {};
  if (typeof id === 'string') {
    params.screen_name = id;
  }
  else {
    params.user_id = id;
  }
  this.post(url, params, null, callback);
  return this;
}

// Help
Twitter.prototype.getConfiguration = function(callback) {
  var url = '/help/configuration.json';
  this.get(url, null, callback);
  return this;
}
Twitter.prototype.getLanguages = function(callback) {
  var url = '/help/languages.json';
  this.get(url, null, callback);
  return this;
}
Twitter.prototype.getPrivacyPolicy = function(callback) {
  var url = '/help/privacy.json';
  this.get(url, null, callback);
  return this;
}
Twitter.prototype.getTOS = function(callback) {
  var url = '/help/tos.json';
  this.get(url, null, callback);
  return this;
}
Twitter.prototype.rateLimitStatus = function(params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }
  var url = '/application/rate_limit_status.json';
  this.get(url, params, callback);
  return this;
}

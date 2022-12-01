const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  //access parsed cookies on the request
  // req.cookies = cookiesObj;
  var parsedCookies = req.cookies;
  // console.log('parsedCookies ',parsedCookies);
  //look up user data related to that session
  if(Object.keys(parsedCookies).length === 0) {
    models.Sessions.create()
    .then(result => {
      return models.Sessions.get({id : result.insertId})
    })
    .then(result => {
      req.session = {hash: result.hash}
      res.cookie('shortlyid', result.hash);
      next();
    })
    .catch(error => {
      console.log(error);
    })
  } else { // if an incoming request has a cookie, verify that the cookie is valid (that is a session stored in the db)
    // console.log('parsedCookies', parsedCookies)
    var session;
    models.Sessions.get({hash: parsedCookies.shortlyid})
    .then(result => {

      session = result;
      console.log('session get result',result);
      // console.log('session userId',result.userId);
      if(result.userId) {
        return models.Users.get({id: result.userId});
      } else {
        req.session = {'hash': parsedCookies.shortlyid};
        next();
      }
    })
    .then(result => {
      var username;
      var userId = '';
      if(!result) {
        username = null;
      } else {
        username = Object.values(JSON.parse(JSON.stringify(result)))[1];
        userId = Object.values(JSON.parse(JSON.stringify(result)))[0];
      }
      req.session = {'hash': parsedCookies.shortlyid, 'user': {'username': username}, 'userId': userId}
      next();
    })
    .catch(error => {
      console.log(error);
    })
  }
  //assigns an object to to a session property on the request that contains relevant user info
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/


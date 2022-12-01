const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  //access parsed cookies on the request
  // req.cookies = cookiesObj;
  var parsedCookies = req.cookies;
  console.log('parsedCookies ',parsedCookies);
  //look up user data related to that session
  if(Object.keys(parsedCookies).length === 0) {
    models.Sessions.create()
    .then(result => {
      return models.Sessions.get({id : result.insertId})
    })
    .then(result => {
      res.cookie('sessionHash', result.hash);
      next();
    });
  } else { // if an incoming request has a cookie, verify that the cookie is valid (that is a session stored in the db)
    return models.Sessions.get({hash: parsedCookies})
  }
  //assigns an object to to a session property on the request that contains relevant user info
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/


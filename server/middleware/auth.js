const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  //access parsed cookies on the request
  var parsedCookies = req.cookies;
  // verify that the cookie is valid (that is a session stored in the db)
  models.Sessions.get({hash: parsedCookies.shortlyid})
  .then(result => {
    if (result) {
      // if the cookie is valid, get the associated user info
      models.Users.get({id: result.userId})
      .then(result => {
        if(result) {
          var username = Object.values(JSON.parse(JSON.stringify(result)))[1];
          var userId = Object.values(JSON.parse(JSON.stringify(result)))[0];
          req.session = {'hash': parsedCookies.shortlyid, 'user': {'username': username}, 'userId': userId}
          next();
        } else {
          req.session = {'hash': parsedCookies.shortlyid, 'user': {'username': ''}, 'userId': ''};
          next();
        }
      })
    } else {
      // if the cookie is not valid, generate a new hash and session object
      // get the user info for the new login
      models.Sessions.create()
      .then(result => {
        return models.Sessions.get({id : result.insertId})
      })
      .then(result => {
        req.session = {hash: result.hash, 'user': {'username': req.body.username}}
        res.cookie('shortlyid', result.hash);
        next();
      })
      .catch(error => {
        console.log(error);
      })
    }})
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/
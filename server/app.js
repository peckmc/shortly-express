const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const Auth = require('./middleware/auth');
const CookieParser = require('./middleware/cookieParser');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(CookieParser);
app.use(Auth.createSession);


app.get('/login',
  (req, res) => {
    res.render('login');
  }
);


app.get('/',
(req, res) => {
  if (models.Sessions.isLoggedIn(req.session)) {
    res.render('index');
  } else {
    return models.Sessions.delete({hash:req.session.hash})
    .then(ok => {
      res.redirect('/login');
    })
    .catch( err => {
      console.log('create link failed');
    });
}});

app.get('/create',
(req, res) => {
  if (models.Sessions.isLoggedIn(req.session)) {
    res.render('index');
  } else {
    return models.Sessions.delete({hash:req.session.hash})
    .then(ok => {
      res.redirect('/login');
    })
    .catch( err => {
      console.log('create link failed');
    });
  }
});

app.get('/links',
(req, res, next) => {
   if (models.Sessions.isLoggedIn(req.session)) {
      models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
   } else {
      return models.Sessions.delete({hash:req.session.hash})
      .then(ok => {
        res.redirect('/login');
      })
      .catch( err => {
        console.log('create link failed');
      });
   }
});

app.post('/links',
(req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.post('/login',
(req, res, next) => {


    models.Users.get({username: req.body.username})
      .then(user => {
        if (!user) {
          res.redirect('/login');
        } else {
          var hashedpw = user.password;
          var salt = user.salt;
          var bool = models.Users.compare(req.body.password, hashedpw, salt);
          if (bool) {

            var hash = req.session.hash;
            models.Sessions.update({hash: req.session.hash}, {userId: user.id})
              .then(ok => {
                console.log('Login successful');
                res.redirect('/');
              });
          } else {
            res.redirect('/login');
          }
        }
      })
      .catch( err => {
        console.log('Error');
      });
  // redirect to the home page
});

app.post('/signup',
(req, res, next) => {

  models.Users.get({username: req.body.username})
    .then(user => {
      if (user) {
        res.redirect('/signup');
      } else {
        return models.Users.create(req.body)
          .then( user => {
            var id = user.insertId;
            var hash = req.session.hash;
            models.Sessions.update({hash: hash}, {userId: id})
              .then(ok => {
                res.redirect('/');
              });
          })
          .catch( err => {
            console.log('Signup failed');
          });
      }
    });
});

app.get('/logout',
(req, res, next) => {
  return models.Sessions.delete({hash:req.session.hash})
  .then(ok => {
    res.clearCookie('shortlyId');
    res.redirect('/');
  })
  .catch( err => {
    console.log('log out failed');
  });

});


/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

/************************************************************/
// write you logout here
/************************************************************/


module.exports = app;
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
// app.use('some path', verifySession)


app.get('/',
(req, res) => {
  res.render('index');
});

app.get('/create',
(req, res) => {
  res.render('index');
});

app.get('/links',
(req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
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
  // Check the database for the username
  models.Users.get({username: req.body.username})
  .then(result => {
    // authenticate the password
    return models.Users.compare(req.body.password, result.password, result.salt)
  })
  .then(result => {
    if(result !== true) {
      res.redirect('/login');
    } else {
      models.Sessions.update({hash: req.session.hash}, {userId: result.id})
      .then(ok => {
        console.log('Login successful');
        res.redirect('/');
      });
    }
  })
  .then(result => {
    res.status(200).redirect('/');
  })
  .catch(error => {
    res.redirect('/login');
  })
  // redirect to the home page
});

app.post('/signup',
(req, res, next) => {
  // call User.create with the username and password
  // redirect to signup if the user already exists
  models.Users.get({username: req.body.username})
  .then(userSigned => {
    if (userSigned) {
      console.log('user has signed')
      res.status(500).redirect('/signup');
    } else {
      models.Users.create(req.body)
      .then(userCreated => {

        models.Sessions.update({hash: req.session.hash}, {userId: userCreated.id})
      .then(ok => {
        console.log('Signed successful');
        res.status(200).redirect('/');
      });
      })
      .error(error => {
        console.log('Signed fail');
        res.status(500).redirect('/signup');
      });

    }
  }

  )

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

module.exports = app;
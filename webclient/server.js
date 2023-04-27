const fs = require('fs');
const url = require('url');
const path = require('path');
const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');
require('dotenv').config();

const port = 6969;

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const WEBCLIENT_URL = process.env.WEBCLIENT_URL;
const GITHUB_CALLBACK_URL = WEBCLIENT_URL + ':' + port + '/auth/github/callback';

// Set up passport with GitHub strategy
passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: GITHUB_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
));

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((obj, cb) => {
  cb(null, obj);
});

const app = express();

app.use(session({
  secret: 'some_random_secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());


// GitHub OAuth routes
app.get('/auth/github', passport.authenticate('github'));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to the main page.
    res.redirect('/');
  }
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/github');
}


// Serve static files from the webclient folder
app.get('/', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/courses.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'courses.html'));
});

app.get('/courses.js', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'courses.js'));
});

app.get('/prompts.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'prompts.html'));
});

app.get('/prompts.js', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'prompts.js'));
});

app.get('/config.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'config.html'));
});

app.get('/config.js', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'config.js'));
});


app.get('/courses.json', ensureAuthenticated, (req, res) => {
  const coursesPath = path.join(__dirname, '..', 'courses.json');
  res.sendFile(coursesPath);
});

app.post('/save-courses', (req, res) => {
  const coursesPath = path.join(__dirname, '..', 'courses.json');
  const newCoursesData = req.body;

  fs.writeFile(coursesPath, JSON.stringify(newCoursesData, null, 2), (err) => {
    if (err) {
      res.status(500).send('Error writing to file');
      console.error('Error writing to file:', err);
    } else {
      res.status(200).send('File updated successfully');
    }
  });
});

app.get('/private', ensureAuthenticated, (req, res) => {
  res.send('This is a private page. You have been authenticated!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
});

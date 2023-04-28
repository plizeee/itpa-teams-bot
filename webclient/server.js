const fs = require('fs');
const url = require('url');
const path = require('path');
const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');
require('dotenv').config();

//gets the ips of the server
const os = require('os');
const networkInterfaces = os.networkInterfaces();

//get local ip address
const LOCAL_IP_ADDRESS = networkInterfaces['wlan0'].find(details => details.family === 'IPv4').address;
console.log(LOCAL_IP_ADDRESS);

const port = 6969;

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const WEBCLIENT_URL = process.env.WEBCLIENT_URL;
const GITHUB_CALLBACK_URL = WEBCLIENT_URL + ':' + port + '/auth/github/callback';

// Allowed GitHub users
const allowedUsers = process.env.AUTHORIZED_USERS.split(',');

// Set up passport with GitHub strategy
function createGitHubStrategy(clientIP) {

  return new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: GITHUB_CALLBACK_URL
  }, function (accessToken, refreshToken, profile, cb) {
    if (allowedUsers.includes(profile.username) || allowedUsers.includes(profile.id)) {
      return cb(null, profile);
    } else {
      return cb(new Error('Unauthorized user'));
    }
  });
}

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
app.get('/auth/github', (req, res, next) => {
  passport.use(createGitHubStrategy(req.socket.remoteAddress));

  passport.authenticate('github')(req, res, next);
});

app.get('/auth/github/callback', (req, res, next) => {
  passport.authenticate('github', (err, user, info) => {
    if (err) {
      console.error('Error:', err);
      return res.redirect('/unauthorized');
    }
    if (!user) {
      return res.redirect('/unauthorized');
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error('Error:', err);
        return res.redirect('/unauthorized');
      }
      return res.redirect('/');
    });
  })(req, res, next);
});


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    // User is authenticated, so we continue
    return next();
  }
  res.redirect('/auth/github');
}

function allowLocal(req, res, next) {
  const URL_ADDRESS = req.headers.host + req.url;
  if (URL_ADDRESS.includes(LOCAL_IP_ADDRESS) || URL_ADDRESS.includes('localhost')) {
    console.log('local');
    // Allow local requests without authentication
    return next();
  }
  
  console.log(req.socket.remoteAddress);
  console.log(URL_ADDRESS);
  ensureAuthenticated(req, res, next);
}

// Serve static files from the webclient folder
app.get('/', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/courses.html', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'courses.html'));
});

app.get('/courses.js', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'courses.js'));
});

app.get('/prompts.html', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'prompts.html'));
});

app.get('/prompts.js', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'prompts.js'));
});

app.get('/config.html', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'config.html'));
});

app.get('/config.js', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'config.js'));
});

app.get('/courses.json', allowLocal, (req, res) => {
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

app.get('/private', allowLocal, (req, res) => {
  res.send('This is a private page. You have been authenticated!');
});

app.get('/unauthorized', (req, res) => {
  res.sendFile(path.join(__dirname, 'unauthorized.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
});

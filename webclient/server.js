const fs = require('fs');
const https = require('https');
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

const SharedFunctions = require(path.join(__dirname, '../bot', 'util.js'));
const GPTFunctions = require(path.join(__dirname, '../bot', 'functions.js'));
console.log(networkInterfaces);

//get local ip address
const LOCAL_IP_ADDRESSES = getLocalIPs();

function getLocalIPs() { 
  let localIPs = [];
  for(let key in networkInterfaces) {
    if(networkInterfaces.hasOwnProperty(key)) {
      let details = networkInterfaces[key];
      for(let i=0; i<details.length; i++) {
        if(details[i].family === 'IPv4' && !details[i].internal) {
          localIPs.push(details[i].address);
        }
      }
    }
  }
  return localIPs;
}

console.log('local addresses:' + LOCAL_IP_ADDRESSES);

const port = 3001;

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const WEBCLIENT_URL = process.env.WEBCLIENT_URL;
// const GITHUB_CALLBACK_URL = WEBCLIENT_URL + ':' + port + 'admin/auth/github/callback';
const GITHUB_CALLBACK_URL = WEBCLIENT_URL + '/admin/auth/github/callback';


// Allowed GitHub users
console.log(process.env.AUTHORIZED_USERS);
const allowedUsers = process.env.AUTHORIZED_USERS.split(',');

// Set up passport with GitHub strategy
function createGitHubStrategy(clientIP) {

  return new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: GITHUB_CALLBACK_URL
  }, function (accessToken, refreshToken, profile, cb) {
    if (allowedUsers.includes(profile.username) || allowedUsers.includes(profile.id)) {
      console.log('Authorized user:', profile.username, 'from IP:', clientIP);
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

app.get("/functions-grouped", (req,res)=>{
  let data = {results:GPTFunctions.GroupedFunctionNames(req.query.q)};
  console.log(req.query);
  console.log(data.results);
  res.send(JSON.stringify(data));
})
// app.get("/functions-selected", (req,res)=>{
//   let data = {results:GPTFunctions.GroupedFunctionNames(req.query.q)};
//   console.log(req.query);
//   console.log(data.results);
//   res.send(JSON.stringify(data));
// })

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
      // return res.redirect('/');
      return res.redirect('/admin');
    });
  })(req, res, next);
});


// function ensureAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) {
//     console.log('User is authenticated');
//     return next();
//   }
//   console.log('User not authenticated, redirecting to /auth/github');
//   res.redirect('/auth/github');
// }

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    console.log('User is authenticated');
    return next();
  }
  console.log('User not authenticated, redirecting to /admin/auth/github');
  res.redirect(`${WEBCLIENT_URL}/admin/auth/github`); // Use absolute URL
}


function allowLocal(req, res, next) {
  const URL_ADDRESS = req.headers.host + req.url;

  // Check if the request is coming from a local IP address
  const urlIncludesLocalIP = LOCAL_IP_ADDRESSES.some(ip => URL_ADDRESS.includes(ip));
  if (urlIncludesLocalIP || URL_ADDRESS.includes('localhost')) {
    console.log('Local connection. No authentication required.');
    // Allow local requests without authentication
    return next();
  }
  
  console.log(req.socket.remoteAddress);
  console.log(URL_ADDRESS);
  ensureAuthenticated(req, res, next);
}

// Serve static files from the webclient folder

// app.get
app.get('/', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/instances.js', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'instances.js'));
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

app.get('/profiles.json', allowLocal, (req, res) => {
  const profilesPath = path.join(__dirname, '../bot', 'profiles.json');
  res.sendFile(profilesPath);
});

app.get('/courses.json', allowLocal, (req, res) => {
  const coursesPath = path.join(__dirname, '../bot', 'courses.json');
  res.sendFile(coursesPath);
});

app.get('/promptCommands.json', allowLocal, (req, res) => {
  const promptPath = path.join(__dirname, '../bot', 'promptCommands.json');
  res.sendFile(promptPath);
});

app.get('/config.json', allowLocal, (req, res) => {
  const configPath = path.join(__dirname, '../bot', 'config.json');
  res.sendFile(configPath);
});

app.get('/instanceData.json', allowLocal, (req, res) => {
  const instanceDataPath = path.join(__dirname, '../bot', 'instanceData.json');

  fs.readFile(instanceDataPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading file');
      console.error(err);
      return;
    }

    let instanceData;
    try {
      instanceData = JSON.parse(data);
      if (!instanceData || !instanceData.instances || !Array.isArray(instanceData.instances)) {
        console.error('Invalid data format');
        throw new Error('Invalid data format');
      }
    } catch (parseError) {
      res.status(500).send('Error parsing file');
      console.error(parseError);
      return;
    }

    // Ensure all promises are resolved before filtering
    const processStatusPromises = instanceData.instances.map(instance => SharedFunctions.getProcessStatus(instance.pid));

    Promise.all(processStatusPromises).then((statusResults) => {
      const filteredInstanceData = {
        instances: instanceData.instances.filter((instance, index) => statusResults[index])
      };
      console.log(filteredInstanceData);

      fs.writeFile(instanceDataPath, JSON.stringify(filteredInstanceData, null, '\t'), writeError => {
        if (writeError) {
          res.status(500).send('Error writing to file');
          console.error(writeError);
          return;
        }
        console.log('Instance data file updated');
        
        res.sendFile(instanceDataPath);
      });
    });
  });
});


app.get('/private', allowLocal, (req, res) => {
  res.send('This is a private page. You have been authenticated!');
});

app.get('/unauthorized', (req, res) => {
  res.sendFile(path.join(__dirname, 'unauthorized.html'));
});

// get css files
app.get('/styles.css', allowLocal, (req, res) => {
  res.sendFile(path.join(__dirname, 'styles.css'));
});

// app.post
app.post('/save-courses', (req, res) => {
  const coursesPath = path.join(__dirname, '../bot', 'courses.json');
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

app.post('/save-prompts', (req, res) => {
  const promptPath = path.join(__dirname, '../bot', 'promptCommands.json');
  const newPromptData = req.body;

  fs.writeFile(promptPath, JSON.stringify(newPromptData, null, 2), (err) => {
    if (err) {
      res.status(500).send('Error writing to file');
      console.error('Error writing to file:', err);
    } else {
      res.status(200).send('File updated successfully');
    }
  });
});

app.post('/save-config', (req, res) => {
  const configPath = path.join(__dirname, '../bot', 'config.json');
  const newConfigData = req.body;

  fs.writeFile(configPath, JSON.stringify(newConfigData, null, 2), (err) => {
    if (err) {
      res.status(500).send('Error writing to file');
      console.error('Error writing to file:', err);
    } else {
      res.status(200).send('File updated successfully');
    }
  });
});

app.delete('/kill-instance', (req, res) => {
  const instance_id = req.body.instance_id;
  const pid = req.body.pid;

  //for security, we should only accept killing instances that exist in the instanceData.json file
  if(!SharedFunctions.isProcessStored(pid)){
    res.status(500).send("Process isn't stored in instanceData.json. Killing process failed.");
    return;
  }

  console.log('Killing instance:', instance_id, pid);
  SharedFunctions.handleExit(instance_id);
  res.status(200).send('Instance killed successfully');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
});
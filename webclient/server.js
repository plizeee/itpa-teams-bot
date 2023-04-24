const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');
const port = 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);

  if (req.method === 'PUT' && parsedUrl.pathname === '../courses.json') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      fs.writeFile(path.join(__dirname, '..', 'courses.json'), body, (err) => {
        if (err) {
          console.error(err);
          res.writeHead(500);
          res.end('Error saving data');
        } else {
          res.writeHead(200);
          res.end('Data saved successfully');
        }
      });
    });
  } else {
    let filePath;
    // if (parsedUrl.pathname === '/') {
    //   filePath = path.join('.', 'index.html');
    // } else {
    //   filePath = path.join(__dirname, parsedUrl.pathname);
    // }

    if (parsedUrl.pathname === '/') {
      filePath = path.join('.', 'index.html');
    } else if (parsedUrl.pathname === '/courses.json') {
      filePath = path.join(__dirname, '..', 'courses.json');
    } else {
      filePath = path.join(__dirname, parsedUrl.pathname);
    }

    if (req.method === 'POST' && parsedUrl.pathname === '/save-courses') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        const formattedData = JSON.stringify(JSON.parse(body), null, "\t");
        fs.writeFile(path.join(__dirname, '..', 'courses.json'), formattedData, 'utf8', (err) => {
          if (err) {
            console.log('Error writing to file:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Data saved successfully');
          }
        });
      });
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200);
        res.end(data);
      }
    });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
});

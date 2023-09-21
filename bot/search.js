const puppeteer = require('puppeteer');
const read = require('node-readability');

//TODO figure out whehter node-readability is necessary
//or if it's possible to get the same quality of results with just puppeteer


//Get the first page of google search results for a query
//returns an array of objects with title and url
//TODO add description (possibly from meta tag)
async function getSearchResults(query) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://www.google.com/search?q=' + query);

  const links = await page.evaluate(() => {
    const results = [];
    for (const block of document.querySelectorAll('div.g')) {
      const titleElement = block.querySelector('h3');
      const urlElement = block.querySelector('a');
      if (titleElement && urlElement) {
        results.push({
          title: titleElement.innerText,
          url: urlElement.href
        });
      }
    }

    return results;
  });

  // for debugging, print getWebpageContents for the first result
  // const content = await getWebpageContents(links[0].url);
  // console.log(content);

  await browser.close();
  return links;
}

//Old implementation of getWebpageContents
//This used puppeteer to get the contents of a webpage,
//but it didn't filter out the ads and other junk
// async function getWebpageContents(url) {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();
//   await page.goto(url);

//   const content = await page.evaluate(() => {
//     let data = {};
//     data.title = document.querySelector('title') ? document.querySelector('title').innerText : 'No Title';
//     data.headings = [...document.querySelectorAll('h1, h2, h3')].map(el => el.innerText);
//     data.paragraphs = [...document.querySelectorAll('p')].map(el => el.innerText);

//     return data;
//   });

//   await browser.close();
//   return content;
// }

//Get the contents of a webpage from a url
//we get the html, then make it readable, then extract the title and content
async function getWebpageContentsFromUrl(url) {
  console.log("Getting webpage contents from url...")
  let html = await getHtmlFromUrl(url);
  let content = await getReadableContentFromHtml(html);
  
  console.log("Webpage contents: ", content);
  return content;
}

//make html readable
//this can't be used with urls that have robots.txt
//so we use puppeteer to get the html instead
async function getReadableContentFromHtml(html) {
  console.log("Extracting readable content from html...")
  return new Promise((resolve, reject) => {
    read(html, (err, article, meta) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          title: article.title,
          content: article.content
        });
      }
    });
  });
}

//get html from url
//this gets the raw html from a webpage, but it's not very readable
//so we use puppeteer to get the html instead and feed it to node-readability
async function getHtmlFromUrl(url) {
  console.log("Getting html from url...")
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const html = await page.evaluate(() => document.body.innerHTML);
  await browser.close();
  return html;
}

// Usage:
// getWebpageContents('https://www.example.com').then(console.log).catch(console.error);

// Usage:
// getSearchResults('where am i').then(console.log).catch(console.error);

module.exports = {
  getSearchResults,
  getWebpageContentsFromUrl
};
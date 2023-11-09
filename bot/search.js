//if you're having trouble with puppeteer, try this solution:
//https://pptr.dev/guides/configuration#configuration-files

//TODO figure out whehter node-readability is necessary
//or if it's possible to get the same quality of results with just puppeteer

const puppeteer = require('puppeteer');
const read = require('node-readability');
const fs = require('fs'); //needed to read/write json files

//read config.json
const config = JSON.parse(fs.readFileSync('./bot/config.json'));

//default to undefined if chromiumPath doesn't exist in config.json
const chromiumPath = config.chromiumPath || undefined;

//Get the first page of google search results for a query
//returns an array of objects with title and url
//TODO add description (possibly from meta tag)
async function getSearchResults(query) {
  console.log("Getting search results for query...")
  // const browser = await puppeteer.launch();
  try {
    const browser = await launchPuppeteer();
    console.log("puppeteer launched");
    const page = await browser.newPage();
    console.log("new page created");
    await page.goto('https://www.google.com/search?q=' + query);
    console.log("page loaded");

    console.log("Getting links from search results...")
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

      console.log("Search results: ", results);
      return results;
    });

    // for debugging, print getWebpageContents for the first result
    // const content = await getWebpageContents(links[0].url);
    // console.log(content);

    await browser.close();
    return links;
  } catch (error) {
    console.error("Puppeteer Error:", error);
  }
}

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
  try {
    const browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.goto(url);
    const html = await page.evaluate(() => document.body.innerHTML);
    await browser.close();
    return html;
  } catch (error) {
    console.error("Puppeteer Error:", error);
  }
}

//NOTE: puppeteer only works on certain versions of chromium, which is not bundled properly on the raspberry pi
//this function exists because puppeteer's default chromium path doesn't work on linux (should work on mac and windows)
//so we can specify a chromium path in config.json
async function launchPuppeteer() {
  if(chromiumPath) { //if chromiumPath is defined in config.json
    return await puppeteer.launch({
      executablePath: chromiumPath,
      headless: true
    });
  }
  else { //if chromiumPath is not defined in config.json
    return await puppeteer.launch();
  }
}

module.exports = {
  getSearchResults,
  getWebpageContentsFromUrl
};
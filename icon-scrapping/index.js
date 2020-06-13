const Scraper = require('images-scraper');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const google = new Scraper({
  puppeteer: {
    headless: false,
  }
});

const fileName = path.resolve(__dirname, 'google_duo.json');

async function scrapeUrls () {
  const results = await google.scrape('google duo icon', 20);
  fs.writeFile(fileName, JSON.stringify(results, null, 4), () => null);
}

// scrapeUrls();

async function download (url, path) {
  const writer = fs.createWriteStream(path);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

const downloadImage = async () => {
  const file = fs.readFileSync(fileName);
  const list = JSON.parse(file);
  let count = 0;

  for (let i=0; i < list.length; i++) {
    const { url } = list[i];
    const imageExt = path.basename(url).split('.')[1];
    const imageName = `${new Date().getTime()}.${imageExt}`;
    const imagePath = path.resolve(__dirname, 'video_camera', imageName);

    if (['jpg', 'png'].includes(imageExt)) {
      try {
        await download(url, imagePath);
        console.log('downloaded image #: ' + (++count), url);
      } catch (e) {
        console.error('could\'nt download image ', url);
      }
    }
  }
};

downloadImage();

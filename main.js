const MangadexDownloader = require('../mangadex/mangadex');

const mangadexDownloader = new MangadexDownloader(32775, {
  dir: "E:\\Mango\\Scanlated\\Fechippuru ~Our Innocent Love~",
  firstChapter: 40,
  group: 8802
});

mangadexDownloader.download();
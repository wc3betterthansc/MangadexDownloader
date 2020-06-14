const
    CronJob = require("cron").CronJob,
    path = require("path"),
    MangadexDownloader = require("./mangadex-downloader").VerboseMangadexDownloader,
    RSS = require("./rss"),
    {MangaList} = require("./manga");

require("dotenv").config();

const mangaList = new MangaList();
const allManga = mangaList.loadAllManga();

async function getNewChapters() {
    const newChapters = {};

    for(const manga of allManga.values()) {
        const rss = new RSS({
            id: manga.id,
            name: manga.name,
            lastChapter: manga.lastChapter
        });
        const chaps = await rss.getNewChapters();
        newChapters[manga.id] = chaps;
    }
    return newChapters;
}

async function updateMangaList(newChapters) {
    for(const manga of allManga.values()) {
        const chapters = newChapters[manga.id];
        if(chapters.length !== 0)
            manga.lastChapter = Math.max(...chapters);
    }
    mangaList.saveAllManga();
}

async function synchronize(dir=process.env.MANGA_DIR) {
    const newChapters = await getNewChapters();

    for(const manga of allManga.values()) {
        if(newChapters[manga.id].length === 0) continue;

        const 
            firstChapter = Math.min(...newChapters[manga.id]),
            lastChapter = Math.max(...newChapters[manga.id]),
            mangaDownloader = new MangadexDownloader(manga.id,{
                dir: path.join(dir,manga.name),
                firstChapter,
                lastChapter,
                lang: manga.lang
            });
        await mangaDownloader.download();
    }
    updateMangaList(newChapters);
}

function synchronizeMessage() {
    console.log(`Finished synchronization at: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
}

/**
 * 
 * @param {string} time 
 */
function schedule(time) {
    const job = new CronJob(time,async()=>{
        await synchronize();
        synchronizeMessage();
    },null,true)
    .start();
}

module.exports = schedule;


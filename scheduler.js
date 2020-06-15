const
    CronJob = require("cron").CronJob,
    path = require("path"),
    MangadexDownloader = require("./mangadex-downloader").VerboseMangadexDownloader,
    RSS = require("./rss"),
    {MangaList} = require("./manga");

require("dotenv").config();

class Scheduler {
    /**
     * 
     * @param {string} time 
     */
    constructor(time) {
        this.time = time;
        this._mangaList = new MangaList();
    }
    
    /**
     * @param {string} t
     */
    set time(t) {
        this._time = t;
    }
    
    async _updateMangaList(newChapters) {
        for(const manga of this._allManga.values()) {
            const chapters = newChapters[manga.id];
            if(chapters.length !== 0)
                manga.lastChapter = Math.max(...chapters);
        }
        this._mangaList.saveAllManga();
    }

    async _getNewChapters() {
        const newChapters = {};
    
        for(const manga of this._allManga.values()) {
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

    _synchronizeMessage() {
        console.log(`Finished synchronization at: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
    }
    
    async _synchronize(dir=process.env.MANGA_DIR) {
        this._allManga = this._mangaList.loadAllManga();
        const newChapters = await this._getNewChapters();

        for(const manga of this._allManga.values()) {
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
        this._updateMangaList(newChapters);
    }

    start() {
        const job = new CronJob(this._time,async()=>{
            await this._synchronize();
            this._synchronizeMessage();
        },null,true)
        .start();
    }
}

module.exports = Scheduler;


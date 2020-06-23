const manga = require("./manga");

const
    CronJob = require("cron").CronJob,
    path = require("path"),
    mangadexDownloader = require("./mangadex-downloader"),
    rss = require("./rss"),
    {MangaList} = require("./manga");

require("dotenv").config();

class Scheduler {

    static downloaderClass = {
        true: mangadexDownloader.VerboseMangadexDownloader,
        false: mangadexDownloader.MangadexDownloader
    }

    static rssClass = {
        true: rss.VerboseRSS,
        false: rss.RSS
    }

    constructor({time,downloaderVerbose=false,rssVerbose=false}={}) {
        this.time = time;
        this._MangadexDownloader = Scheduler.downloaderClass[downloaderVerbose];
        this._RSS = Scheduler.rssClass[rssVerbose];
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
        const rssList = [];
        const newChaptersDict = {};
    
        for(const manga of this._allManga.values()) {
            const rss = new this._RSS(manga);
            rssList.push(rss);
        }

        const newChaptersPromises = rssList.map(rss => rss.getNewChapters());
        const newChaptersArr = await Promise.all(newChaptersPromises);
        newChaptersArr.forEach((chaps,i) => {
            const id = rssList[i].id;
            const manga = this._allManga.get(id);
            newChaptersDict[manga.id] = chaps;
        });
        
        return newChaptersDict;
    }

    _synchronizeMessage() {
        const date = new Date();
        console.log(`Finished synchronization at: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    }
    
    async _synchronize(dir=process.env.MANGA_DIR) {
        this._allManga = this._mangaList.loadAllManga();
        const newChapters = await this._getNewChapters();

        for(const manga of this._allManga.values()) {
            if(newChapters[manga.id].length === 0) continue;
    
            const 
                firstChapter = Math.min(...newChapters[manga.id]),
                lastChapter = Math.max(...newChapters[manga.id]),
                mangaDownloader = new this._MangadexDownloader(manga.id,{
                    dir: path.join(dir,manga.name),
                    firstChapter,
                    lastChapter,
                    lang: manga.lang,
                    noNumberAllowed: false
                });
            await mangaDownloader.download();
        }
        this._updateMangaList(newChapters);
    }

    async start(startImmediately=false) {
        const synchronize = async ()=>{
            await this._synchronize();
            this._synchronizeMessage();
        }

        if(startImmediately) await synchronize();
        
        const job = new CronJob(this._time,async()=>await synchronize(),null,true)
            .start();

    }
}

module.exports = Scheduler;


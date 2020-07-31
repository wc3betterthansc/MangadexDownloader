const
    CronJob = require("cron").CronJob,
    path = require("path"),
    {MangadexDownloader,VerboseMangadexDownloader} = require("./mangadex-downloader"),
    {RSS,VerboseRSS} = require("./rss"),
    {MangaList} = require("./manga");

require("dotenv").config();

const 
    DEFAULT_TIME = "0 */2 * * *";

const
    downloaderClass = {
        true: VerboseMangadexDownloader,
        false: MangadexDownloader
    },
    rssClass = {
        true: VerboseRSS,
        false: RSS
    };

/**
 * 
 * @param {boolean} isVerbose
 * @return {typeof MangadexDownloader}
 */
function getMangadexDownloaderClass(isVerbose) {
    return downloaderClass[isVerbose];
}

/**
 *
 * @param {boolean} isVerbose 
 * @return {typeof RSS}
 */
function getRSS(isVerbose) {
    return rssClass[isVerbose];
}

class Scheduler {
    /**
     * @typedef SchedulerParamsType
     * @property {string} [time]
     * @property {boolean} [downloaderVerbose]
     * @property {boolean} [rssVerbose]
     *
     * @param {SchedulerParamsType} [param] 
     */
    constructor({time=DEFAULT_TIME,downloaderVerbose=false,rssVerbose=false}={}) {
        this.time = time;
        this._MangadexDownloader = getMangadexDownloaderClass(downloaderVerbose);
        this._RSS = getRSS(rssVerbose);
        this._mangaList = new MangaList();
    }
    
    /**
     * @param {string} t
     */
    set time(t) {
        this._time = t;
    }

    async _updateMangaList(lastChapters) {

        for(const manga of this._allManga.values()) {
            const lastChapter = lastChapters[manga.id];
            if(lastChapter) manga.lastChapter = lastChapter;
        }
        this._mangaList.saveAllManga();
    }
    
    /**
     * return type
     * {
     *    [number]: [] 
     * }
     */
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
        const lastChapters = {};

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

            lastChapters[manga.id] = mangaDownloader.lastDownloadedChapter;
        }
        this._updateMangaList(lastChapters);
    }

    async start(startImmediately=false) {
        const synchronize = async ()=>{
            await this._synchronize();
            this._synchronizeMessage();
        }

        if(startImmediately) await synchronize();
        
        // @ts-ignore
        const job = new CronJob(this._time,async()=>await synchronize(),null,true)
            .start();

    }
}

module.exports = Scheduler;
const
    CronJob = require("cron").CronJob,
    path = require("path"),
    { MangadexDownloader, VerboseMangadexDownloader } = require("./mangadex-downloader"),
    { RSS, VerboseRSS } = require("./rss"),
    { MangaList } = require("./manga");


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
     * @property {boolean} [prependSeriesName]
     *
     * @param {SchedulerParamsType} [param] 
     */
    constructor({ time = DEFAULT_TIME, downloaderVerbose = false, rssVerbose = false, prependSeriesName = false } = {}) {
        this.time = time;
        this._MangadexDownloader = getMangadexDownloaderClass(downloaderVerbose);
        this._RSS = getRSS(rssVerbose);
        this._mangaList = new MangaList();
        this._prependSeriesName = prependSeriesName;
    }

    /**
     * @param {string} t
     */
    set time(t) {
        this._time = t;
    }

    async _updateMangaList(lastChapters) {

        for (const manga of this._allManga.values()) {
            const lastChapter = lastChapters[manga.id];
            if (lastChapter) manga.lastChapter = lastChapter;
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
        const newChapters = {};

        for (const manga of this._allManga.values()) {
            const rss = new this._RSS(manga);
            const newChaps = await rss.getNewChapters();
            newChapters[manga.id] = newChaps;
        }
        return newChapters;
    }

    _synchronizeMessage() {
        const date = new Date();
        console.log(`Finished synchronization at: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    }

    async _synchronize() {
        this._allManga = this._mangaList.loadAllManga();
        const newChapters = await this._getNewChapters();
        const lastChapters = {};

        for (const manga of this._allManga.values()) {
            if (newChapters[manga.id].length === 0) continue;

            const
                firstChapter = Math.min(...newChapters[manga.id]),
                lastChapter = Math.max(...newChapters[manga.id]),
                params = {
                    dir: manga.dir,
                    name: manga.name,
                    firstChapter,
                    lastChapter,
                    lang: manga.lang,
                    noNumberAllowed: false,
                    prependSeriesName: this._prependSeriesName
                };

            const mangaDownloader = new this._MangadexDownloader(manga.id, params);
            await mangaDownloader.download();

            lastChapters[manga.id] = mangaDownloader.lastDownloadedChapter;
        }
        this._updateMangaList(lastChapters);
    }

    async start(startImmediately = false) {
        const synchronize = async() => {
            await this._synchronize();
            this._synchronizeMessage();
        }

        if (startImmediately) await synchronize();

        // @ts-ignore
        const job = new CronJob(this._time, async() => await synchronize(), null, true)
            .start();

    }
}

module.exports = Scheduler;
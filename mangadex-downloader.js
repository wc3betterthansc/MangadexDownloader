const Mangadex = require("mangadex-api").default,
    Manga = require("./manga").Manga,
    ZipLocal = require("zip-local"),
    fs = require("fs"),
    path = require("path"),
    util = require("./util");
require("dotenv").config();

const
    DEFAULT_NONAME_CHAPTER = "noname",
    MAX_DOWNLOAD_TRIES = 5,
    DEFAULT_FIRST_CHAPTER = 0,
    DEFAULT_LAST_CHAPTER = Infinity,
    DEFAULT_LANG = "gb",
    DEFAULT_GROUP = 0,
    DEFAULT_NO_NUMBER_ALLOWED = true;

class MangadexDownloader {
    /**
     * @typedef RangeType
     * @property {number|string} firstChapter 
     * @property {number|string} lastChapter
     * 
     * @typedef ConstructorParamsType
     * @property {string} [dir]
     * @property {string} [name]
     * @property {number|string} [firstChapter]
     * @property {number|string} [lastChapter]
     * @property {RangeType[]} [range]
     * @property {string} [lang]
     * @property {number|string} [group]
     * @property {boolean} [noNumberAllowed]
     * 
     * @typedef DownloadParamsType
     * @property {string} imgUrl 
     * @property {string} imgName 
     * @property {string} chapDir
     * @property {string} chapter
     */

    /** 
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    constructor(mangaId, { dir, name, firstChapter = DEFAULT_FIRST_CHAPTER, lastChapter = DEFAULT_LAST_CHAPTER, range = [], lang = DEFAULT_LANG, group = DEFAULT_GROUP, noNumberAllowed = DEFAULT_NO_NUMBER_ALLOWED } = {}) {
        // @ts-ignore
        this.mangaId = mangaId;
        this.dir = dir;
        this.name = name;
        this.lang = lang;
        // @ts-ignore
        this.group = group;
        this.noNumberAllowed = noNumberAllowed;

        /* firstChapter and lastChapter are ignored if range has been set */
        if (range.length === 0) {
            // @ts-ignore
            firstChapter = parseFloat(firstChapter);
            // @ts-ignore
            lastChapter = parseFloat(lastChapter);
            this.range = [{ firstChapter, lastChapter }];
        } else this.range = range;
    }

    /** @param {number} id */
    // @ts-ignore
    set mangaId(id) { this._mangaId = parseInt(id); }

    /** @param {string} d */
    set dir(d) {
        if (d)
            this._dir = util.getValidFilepath(path.resolve(d));
        else
            this._dir = process.env.MANGA_DIR;
    }

    /** @param {string} n */
    set name(n) {
        if (n)
            this._name = util.getValidFilepath(n);
        else throw NoNameError;
    }

    /** @param {string} l */
    set lang(l) { this._lang = l; }

    /** @param {number} g */
    // @ts-ignore
    set group(g) { this._group = parseInt(g); }

    /** @param {boolean} bool */
    set noNumberAllowed(bool) { this._noNumberAllowed = bool; }

    /** @param {number} chap */
    set lastDownloadedChapter(chap) { this._lastDownloadedChapter = chap; }

    /** @param {RangeType[]} r */
    set range(r) {
        if (!Array.isArray(r))
            throw RangeError;
        this._range = r;
    }

    get mangaId() { return this._mangaId; }
    get dir() { return this._dir; }
    get name() { return this._name; }
    get lang() { return this._lang; }
    get group() { return this._group; }
    get noNumberAllowed() { return this._noNumberAllowed; }
    get range() { return this._range; }
    get lastDownloadedChapter() { return this._lastDownloadedChapter; }

    async download() {
        /* if acquiring the chapters id is not possible then something is wrong with the mangadex servers */
        try {
            var chapId = await this._getChapId();
        } catch (err) {
            console.error(err.message);
            return;
        }

        const mangaDir = path.join(this._dir, this._name);
        util.mkdir(mangaDir);

        chaptersLoop: for (const id of chapId) {
            const { chapter, urls } = await this._getChapUrls(id);
            const chapName = util.getValidFilepath(chapter.padStart(3, "0"));
            const chapDir = path.join(mangaDir, chapName);

            if (urls.length > 0) {
                util.mkdir(chapDir);
                for (const [i, imgUrl] of urls.entries()) {
                    const imgName = getImgFilename(i);

                    /* if the script was unable to retrieve a single chapter, the entire chapter download is scrapped. Add an error entry for this chapter. */
                    try {
                        await this._download({ imgUrl, imgName, chapDir, chapter });
                    } catch (err) {
                        util.rmdir(chapDir);
                        this._addErr(err, chapter);
                        continue chaptersLoop;
                    }
                }

                /* chapter has been fully downloaded. add it to the log entry then zip the entire folder. */
                this._addLog(chapter);
                this._zipChapter(chapDir, chapName);
            }
        }
    }

    /**
     * 
     * @param {DownloadParamsType} params
     */
    async _download({ imgUrl, imgName, chapDir, chapter }) {
        /**
         * @param {number} tryNumber
         */
        const helper = async tryNumber => {
            try {
                await util.download({ url: imgUrl, filename: imgName, dir: chapDir });
                const lastChap = parseFloat(chapter);

                /* it is possible to receive empty files. This is fixed by reacquiring chapter urls and redownloading. Do not redownload no-number chapters. */
                const imgSize = fs.statSync(path.join(chapDir, imgName)).size;
                const chapIsNumber = !isNaN(lastChap);
                if (imgSize === 0) {
                    if (chapIsNumber)
                        return this._redownload(lastChap, chapDir, imgUrl);
                    else throw NoNumberError;
                }

            } catch (err) {
                if (err === NoNumberError) throw NoNumberError;

                else {
                    console.error(retryMessage(imgUrl, tryNumber));
                    if (tryNumber < MAX_DOWNLOAD_TRIES)
                        await helper(++tryNumber);
                    else
                        throw FailedDownloadError(imgUrl);
                }
            }
        }
        await helper(1);
    }

    async _getManga() {
        try {
            const manga = await Mangadex.getManga(this._mangaId);
            return manga;
        } catch (err) {
            throw MangaRetrievingError;
        }
    }

    /**
     * 
     * @param {number} id 
     */
    async _getChap(id) {
        try {
            return await Mangadex.getChapter(id);
        } catch (err) {
            throw ChapterRetrievingError;
        }
    }

    /**
     * @return {Promise<Array<number>>}
     */
    async _getChapId() {
        const manga = await this._getManga();
        /**
         * @type {Array<import("mangadex-api/typings/mangadex").MangaChapter>}
         */
        let chaps = manga.chapter;

        //filter by group
        if (this._group)
            chaps = chaps.filter(chap =>
                chap.group_id === this._group ||
                chap.group_id_2 === this._group ||
                chap.group_id_3 === this._group);

        //filter by chapter range
        chaps = chaps.filter(chap => this._isInRange(chap.chapter))

        //filter by language
        .filter(chap => chap.lang_code === this._lang);

        //remove duplicates
        chaps = chaps.filter((chapter, index) => chaps.findIndex(c => chapter.chapter === c.chapter) === index);

        return chaps.map(chap => chap.id);
    }

    /**
     * 
     * @param {number} id 
     */
    async _getChapUrls(id) {
        const chap = await this._getChap(id);
        let chapter, urls;
        let chapNumber = parseFloat(chap.chapter);

        switch (chap.status.toUpperCase()) {
            case "OK":
                urls = chap.page_array;
                break;
            case "DELAYED":
                urls = [];
                break;
            default:
                urls = [];
        }

        if (isNaN(chapNumber)) chapter = chap.title || DEFAULT_NONAME_CHAPTER;
        else chapter = chap.chapter
        return { chapter, urls }
    }

    /**
     * @param {string} chapDir
     * @param {number|string} chapNum 
     */
    _zipChapter(chapDir, chapNum) {
        const mangaDir = path.join(this._dir, this._name);
        const zipName = util.getUniqueFilename({ filename: chapNum + ".zip", dir: mangaDir });
        const zipPath = path.join(mangaDir, zipName);

        return util.zip({ filePath: chapDir, zipPath, deleteFile: true });
    }

    /**
     * 
     * @param {number|string} chap 
     */
    _isInRange(chap) {
        if (this._noNumberAllowed && chap == "")
            return true;
        // @ts-ignore
        chap = parseFloat(chap);
        for (const r of this._range)
            if (r.firstChapter <= chap && r.lastChapter >= chap)
                return true;
        return false;
    }

    /**
     * 
     * @param {number} lastChapter
     * @param {string} chapDir
     * @param {string} imgUrl
     */
    async _redownload(lastChapter, chapDir, imgUrl) {
        console.error(noImageErrorMsg(imgUrl));
        util.rmdir(chapDir);

        this._range = this._range
            .map((r, i) => {
                if (r.firstChapter < lastChapter && r.lastChapter < lastChapter)
                    return;
                else if (r.firstChapter <= lastChapter && r.lastChapter >= lastChapter)
                    return {...r, firstChapter: lastChapter }
                else return r;
            })
            .filter(Boolean);

        await this.download();
    }

    /**
     * 
     * @param {string} chapter 
     */
    _addLog(chapter) {
        const currentChapNumber = parseInt(chapter);
        const chapIsNumber = !isNaN(currentChapNumber);

        if (chapIsNumber) this.lastDownloadedChapter = currentChapNumber;
        const lastChapter = currentChapNumber;

        // @ts-ignore
        Manga.addLog({ name: this.name, id: this.mangaId, lastChapter });
    }

    /**
     * 
     * @param {string} chapter
     * @param {Error} err
     */
    _addErr(err, chapter) {
        const currentChapNumber = parseInt(chapter);
        const chapIsNumber = !isNaN(currentChapNumber);

        if (chapIsNumber) this.lastDownloadedChapter = currentChapNumber;
        const lastChapter = currentChapNumber;

        // @ts-ignore
        Manga.addErr({ name: this.name, id: this.mangaId, lastChapter }, err);
    }

    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    static download(mangaId, { dir, name, firstChapter = DEFAULT_FIRST_CHAPTER, lastChapter = DEFAULT_LAST_CHAPTER, range = [], lang = DEFAULT_LANG, group = DEFAULT_GROUP, noNumberAllowed = DEFAULT_NO_NUMBER_ALLOWED } = {}) {
        return new MangadexDownloader(mangaId, { dir, name, firstChapter, lastChapter, range, lang, group, noNumberAllowed }).download();
    }
}

class VerboseMangadexDownloader extends MangadexDownloader {
    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    constructor(mangaId, { dir, name, firstChapter = DEFAULT_FIRST_CHAPTER, lastChapter = DEFAULT_LAST_CHAPTER, range = [], lang = DEFAULT_LANG, group = DEFAULT_GROUP, noNumberAllowed = DEFAULT_NO_NUMBER_ALLOWED } = {}) {
        super(mangaId, { dir, name, firstChapter, lastChapter, range, lang, group, noNumberAllowed });
    }

    async download() {
        await super.download();
        console.log("Download finished.");
    }

    /**
     * 
     * @param {number} id
     */
    async _getChap(id) {
        const chap = await super._getChap(id);
        console.log(`Chapter ${chap.chapter} data acquired.`);
        return chap;
    }

    async _getChapId() {
        const chapIds = await super._getChapId();
        console.log("Acquiring chapters data...");
        return chapIds;
    }

    async _getManga() {
        console.log("Acquiring manga data...");
        const manga = await super._getManga();
        console.log("Manga data acquired.");
        console.log(`Manga name: ${manga.manga.title}.`);
        return manga;
    }

    /**
     * 
     * @param {DownloadParamsType} params
     */
    async _download({ imgUrl, imgName, chapDir, chapter }) {
        const downloadLocation = path.join(chapDir, imgName);
        console.log("Downloading: " + imgUrl)
        await super._download({ imgUrl, imgName, chapDir, chapter });
        console.log("Done. Download location: " + downloadLocation);
    }

    /**
     * @param {string} chapDir
     * @param {number|string} chapNum 
     */
    async _zipChapter(chapDir, chapNum) {
        const zipParams = await super._zipChapter(chapDir, chapNum);
        console.log(`Zipping: ${chapDir} as ${zipParams.zipPath}`);
        return zipParams;
    }

    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    static download(mangaId, { dir, name, firstChapter = DEFAULT_FIRST_CHAPTER, lastChapter = DEFAULT_LAST_CHAPTER, range = [], lang = DEFAULT_LANG, group = DEFAULT_GROUP, noNumberAllowed = DEFAULT_NO_NUMBER_ALLOWED } = {}) {
        return new VerboseMangadexDownloader(mangaId, { dir, name, firstChapter, lastChapter, range, lang, group, noNumberAllowed }).download();
    }
}

class ManualMangadexDownloader {
    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    constructor(mangaId, { dir, name, firstChapter = DEFAULT_FIRST_CHAPTER, lastChapter = DEFAULT_LAST_CHAPTER, range = [], lang = DEFAULT_LANG, group = DEFAULT_GROUP, noNumberAllowed = DEFAULT_NO_NUMBER_ALLOWED } = {}) {
        this._mangadexDownloader = this._getMangadexDownloader(mangaId, { dir, name, firstChapter, lastChapter, range, lang, group, noNumberAllowed });
    }

    async download() {
        await this._mangadexDownloader.download();
        this._updateManga();
    }

    _updateManga() {
        let manga = Manga.loadManga(this._mangadexDownloader.mangaId);

        if (!manga) {
            manga = new Manga({
                name: this._mangadexDownloader.name,
                id: this._mangadexDownloader.mangaId,
                dir: this._mangadexDownloader.dir
            });
        }
        manga.lastChapter = this._mangadexDownloader.lastDownloadedChapter;
        manga.saveManga();
        return manga;
    }

    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params] 
     */
    _getMangadexDownloader(mangaId, { dir, name, firstChapter = DEFAULT_FIRST_CHAPTER, lastChapter = DEFAULT_LAST_CHAPTER, range = [], lang = DEFAULT_LANG, group = DEFAULT_GROUP, noNumberAllowed = DEFAULT_NO_NUMBER_ALLOWED } = {}) {
        return new MangadexDownloader(mangaId, { dir, name, firstChapter, lastChapter, range, lang, group, noNumberAllowed });
    }

    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} params
     */
    static download(mangaId, { dir, name, firstChapter = DEFAULT_FIRST_CHAPTER, lastChapter = DEFAULT_LAST_CHAPTER, range = [], lang = DEFAULT_LANG, group = DEFAULT_GROUP, noNumberAllowed = DEFAULT_NO_NUMBER_ALLOWED } = {}) {
        return new ManualMangadexDownloader(mangaId, { dir, name, firstChapter, lastChapter, range, lang, group, noNumberAllowed }).download();
    }
}

class VerboseManualMangadexDownloader extends ManualMangadexDownloader {
    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    constructor(mangaId, { dir, name, firstChapter = DEFAULT_FIRST_CHAPTER, lastChapter = DEFAULT_LAST_CHAPTER, range = [], lang = DEFAULT_LANG, group = DEFAULT_GROUP, noNumberAllowed = DEFAULT_NO_NUMBER_ALLOWED } = {}) {
        super(mangaId, { dir, name, firstChapter, lastChapter, range, lang, group, noNumberAllowed });
    }

    _updateManga() {
        const manga = super._updateManga();
        console.log(`Manga ${manga.name} has been updated in the manga list.`);
        return manga;
    }

    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    _getMangadexDownloader(mangaId, { dir, name, firstChapter = DEFAULT_FIRST_CHAPTER, lastChapter = DEFAULT_LAST_CHAPTER, range = [], lang = DEFAULT_LANG, group = DEFAULT_GROUP, noNumberAllowed = DEFAULT_NO_NUMBER_ALLOWED } = {}) {
        return new VerboseMangadexDownloader(mangaId, { dir, name, firstChapter, lastChapter, range, lang, group, noNumberAllowed });
    }

    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} params
     */
    static download(mangaId, { dir, name, firstChapter = DEFAULT_FIRST_CHAPTER, lastChapter = DEFAULT_LAST_CHAPTER, range = [], lang = DEFAULT_LANG, group = DEFAULT_GROUP, noNumberAllowed = DEFAULT_NO_NUMBER_ALLOWED } = {}) {
        return new VerboseManualMangadexDownloader(mangaId, { dir, name, firstChapter, lastChapter, range, lang, group, noNumberAllowed }).download();
    }
}

/**
 * @param {string} imgUrl
 */
function noImageErrorMsg(imgUrl) {
    return `No image was downloaded. URL ${imgUrl} does not work anymore. Reacquiring chapters data.`;
}

/**
 * 
 * @param {number} i 
 */
function getImgFilename(i) {
    return (i + 1).toString().padStart(2, "0") + ".png";
}

/**
 * 
 * @param {string} imgUrl 
 * @param {number} tryNumber 
 */
function retryMessage(imgUrl, tryNumber) {
    return `Download of ${imgUrl} has failed, retrying again. Remaining tries = ${MAX_DOWNLOAD_TRIES - tryNumber}`
}

// /**
//  * 
//  * @param {string} dir 
//  */
// function getMangaName(dir) {
//     let unixPath = path.normalize(dir).replace(/\\/g, "/");
//     if (unixPath.charAt(unixPath.length - 1) === '/')
//         unixPath = unixPath.substring(0, unixPath.length - 1);

//     const pathArr = unixPath.split("/");
//     return pathArr[pathArr.length - 1];
// }

// **** ERRORS *****

const
    NoNameError = { name: "NoNameError", message: "No name for the manga series was passed." },
    RangeError = { name: "RangeError", message: "The range parameter must be an Array." },
    NoNumberError = { name: "NoNumberError", message: "Skipping the download of current no-number chapter after failing download." },
    MangaRetrievingError = { name: "MangaRetrievingError", message: "Trouble getting mangadex manga information. Try again later." },
    ChapterRetrievingError = { name: "ChapterRetrievingError", message: "Trouble getting mangadex chapter information. Try again later." },
    FailedDownloadError = (imgUrl) => ({ name: "FailedDownloadError", message: `Failed downloading ${imgUrl} after ${MAX_DOWNLOAD_TRIES} tries.` });

// *****************

module.exports = {
    MangadexDownloader,
    VerboseMangadexDownloader,
    ManualMangadexDownloader,
    VerboseManualMangadexDownloader
}
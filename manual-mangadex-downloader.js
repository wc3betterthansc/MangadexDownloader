/**
 * this is for autocomplete in VSCode
 * @type {Mangadex.Mangadex}
 */
const 
    Mangadex = require("mangadex-api"),
    path = require("path"),
    {MangadexDownloader,VerboseMangadexDownloader} = require("./mangadex-downloader"),
    {Manga} = require("./manga");

/**
 * @this {ManualMangadexDownloader | VerboseManualMangadexDownloader} A manual mangadex downloader object
 * 
 * @return {Manga}
 * 
 * This function will update the currently downloaded manga list after finishing downloading the current manga. This
 * function is shared by both ManualMangadexDownloader and VerboseManualMangadexDownloader.
 */
function updateManga() {
    let manga = Manga.loadManga(this._mangaId);

    if(!manga) {
        let unixPath = path.normalize(this._dir).replace(/\\/g,"/");

        if(unixPath.charAt(unixPath.length-1) === '/')
            unixPath = unixPath.substring(0,unixPath.length-1);

        const pathArr = unixPath.split("/");
        const name = pathArr[pathArr.length-1];
            manga = new Manga({
                name,
                id: this._mangaId,
            });
    }
    manga.lastChapter = this._lastChapter;
    manga.saveManga();
    return manga;
}

/**
 * Use this class to manually download manga. It will automatically update the list of manga.
 */
class ManualMangadexDownloader extends MangadexDownloader {
    /**
     * @typedef RangeType
     * @property {number} firstChapter 
     * @property {number} lastChapter
     * 
     * @typedef ParamsType
     * @property {string} dir
     * @property {number} firstChapter
     * @property {number} lastChapter
     * @property {RangeType[]} range
     * @property {string} lang
     * @property {number} group
     * @property {boolean} noNumberAllowed
     * 
     * @param {number} mangaId 
     * @param {ParamsType} params
     */
    constructor(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        super(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }

    async download() {
        await super.download();
        this._updateManga();
    }

    /**
     * @typedef RangeType
     * @property {number} firstChapter 
     * @property {number} lastChapter
     * 
     * @typedef ParamsType
     * @property {string} dir
     * @property {number} firstChapter
     * @property {number} lastChapter
     * @property {RangeType[]} range
     * @property {string} lang
     * @property {number} group
     * @property {boolean} noNumberAllowed
     * 
     * @param {number} mangaId 
     * @param {ParamsType} params
     */
    static download(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return super.download(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }
}

class VerboseManualMangadexDownloader extends VerboseMangadexDownloader {
    /**
     * @typedef RangeType
     * @property {number} firstChapter 
     * @property {number} lastChapter
     * 
     * @typedef ParamsType
     * @property {string} dir
     * @property {number} firstChapter
     * @property {number} lastChapter
     * @property {RangeType[]} range
     * @property {string} lang
     * @property {number} group
     * @property {boolean} noNumberAllowed
     * 
     * @param {number} mangaId 
     * @param {ParamsType} params
     */
    constructor(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        super(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }

    async download() {
        await super.download();
        this._updateManga();
    }

    /**
     * @typedef RangeType
     * @property {number} firstChapter 
     * @property {number} lastChapter
     * 
     * @typedef ParamsType
     * @property {string} dir
     * @property {number} firstChapter
     * @property {number} lastChapter
     * @property {RangeType[]} range
     * @property {string} lang
     * @property {number} group
     * @property {boolean} noNumberAllowed
     * 
     * @param {number} mangaId 
     * @param {ParamsType} params
     */
    static download(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return super.download(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }
}

ManualMangadexDownloader.prototype._updateManga = updateManga;
VerboseManualMangadexDownloader.prototype._updateManga = function() {
    const manga = updateManga.apply(this);
    console.log(`Manga ${manga.name} has been updated in the manga list.`);
}

module.exports = {
    ManualMangadexDownloader,
    VerboseManualMangadexDownloader,
}
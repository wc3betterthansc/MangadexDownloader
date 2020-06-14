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
 * @this {ManualMangadexDownloader | VerboseManualMangadexDownloader}
 * 
 * This function will update the currently downloaded manga list after finishing downloading the current manga. This
 * function is shared by both MangadexDownloader and VerboseMangadexDownloader.
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
     * 
     * @param {number} mangaId 
     * @param {ParamsType} params
     */
    constructor(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0}={}) {
        super(mangaId,{dir,firstChapter,lastChapter,range,lang,group});
    }

    async download() {
        await super.download();
        this._updateManga();
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
     * 
     * @param {number} mangaId 
     * @param {ParamsType} params
     */
    constructor(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0}={}) {
        super(mangaId,{dir,firstChapter,lastChapter,range,lang,group});
    }

    async download() {
        await super.download();
        this._updateManga();
    }
}

ManualMangadexDownloader.prototype._updateManga =
VerboseManualMangadexDownloader.prototype._updateManga =
updateManga;

module.exports = {
    ManualMangadexDownloader,
    VerboseManualMangadexDownloader,
}
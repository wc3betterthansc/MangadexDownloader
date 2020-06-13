/**
 * this is for autocomplete in VSCode
 * @type {Mangadex.Mangadex}
 */
const 
    Mangadex = require("mangadex-api"),
    path = require("path"),
    MangadexDownloader = require("./mangadex-downloader"),
    {Manga} = require("./manga");

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

    /**
     * Call this function after download has been fully executed because it depends on the execution of the overriden method _getChapdId
     * to get the real last chapter value.
     */
    _updateManga() {
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
     * lastChapter is not necessarily the last chapter but rather a limit (by default Infinity), in order to get the real
     * last chapter we must intercept the id of the chapter then use it to get the list of all chapters, the last
     * chapter is the last one in the array of chapters.
     */
    async _getChapId() {
        let chapIds = await super._getChapId();
        const chap = await Mangadex.getChapter(chapIds[chapIds.length-1]);
        this._lastChapter = parseFloat(chap.chapter);
        return chapIds;
    }
}

module.exports = ManualMangadexDownloader;
/**
 * this is for autocomplete in VSCode
 * @type {Mangadex.Mangadex}
 */
const 
    Mangadex = require("mangadex-api"),
    ZipLocal = require("zip-local"),
    fs = require("fs"),
    path = require("path"),
    { download, mkdir } = require("./util");
const manga = require("./manga");
const { Manga } = require("./manga");

const MAX_DOWNLOAD_TRIES = 5;

class MangadexDownloader {

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
        this.mangaId = mangaId;
        this.dir = dir;
        this.lang = lang;
        this.group = group;

        /* firstChapter and lastChapter are ignored if range has been set */
        if(range.length === 0) {
            firstChapter = parseFloat(firstChapter);
            lastChapter = parseFloat(lastChapter);
            this.range = [{firstChapter,lastChapter}];
        }

        else
            this.range = range;
    }

    /**
     * @param {number | string} id
     */
    set mangaId(id) {
        this._mangaId = parseInt(id);
    }

    /**
     * @param {string} d
     */
    set dir(d) {
        this._dir = d;
    }

    /**
     * @param {string} l
     */
    set lang(l) {
        this._lang = l;
    }

    /**
     * @param {number | string} g
     */
    set group(g) {
        this._group = parseInt(g);
    }

    /**
     * @typedef RangeType
     * @property {number} firstChapter 
     * @property {number} lastChapter
     * 
     * @param {RangeType[]} r
     */
    set range(r) {
        if(!Array.isArray(r))
            throw new Error("the range parameter must be an Array");
        this._range = r;
    }

    async download() {
        const imgUrls = await this._getUrls();
        mkdir(this._dir);

        for(const chapNum of Object.keys(imgUrls)) {
            const chapName = chapNum.padStart(3,"0");
            const chapDir = path.join(this._dir,chapName);
            mkdir(chapDir);

            for(const [i,imgUrl] of imgUrls[chapNum].entries()) {
                const imgName = (i+1).toString().padStart(2,"0") + ".png";

                //if the download fails, delete the temporary folder storing the images then continue to the next chapter
                try {
                    await this.constructor._download(imgUrl, imgName, chapDir);
                }
                catch(err) {
                    fs.rmdirSync(chapDir,{recursive:true});
                    break;
                }
            }
            this._zipChapter(chapName);
        }
    }

    /**
     * 
     * @param {string} imgUrl 
     * @param {string} imgName 
     * @param {string} chapDir 
     */
    static async _download(imgUrl, imgName, chapDir) {
        await helper(1);
        async function helper(tryNumber) {
            try {
                await download(imgUrl, imgName, chapDir);
            }
            catch(err) {
                if(tryNumber <= MAX_DOWNLOAD_TRIES) 
                    await helper(++tryNumber);
                else 
                    throw new Error(`Failed downloading ${imgUrl} after ${MAX_DOWNLOAD_TRIES} tries.`);
            }
        }
    }

    _getManga() {
        return Mangadex.getManga(this._mangaId);
    }

    /**
     * 
     * @param {number} id 
     */
    _getChap(id) {
        return Mangadex.getChapter(id);
    }

    async _getChapId() {
        const manga = await this._getManga();
        let chaps = manga.chapter;

        //filter by group
        if(this._group) 
            chaps = chaps.filter(chap => 
                chap.group_id === this._group || 
                chap.group_id_2 === this._group || 
                chap.group_id_3 === this._group);

        //filter by chapter range
        chaps = chaps.filter(chap => this._isInRange(parseFloat(chap.chapter)));

        //filter by language
        chaps = chaps.filter(chap => chap.lang_code === this._lang)
        
        //store the real first chapter and last chapter
        this._firstChapter = parseFloat(chaps[0].chapter);
        this._lastChapter = parseFloat(chaps[chaps.length-1].chapter);
                
        return chaps.map(chap => chap.id);
    }

    async _getUrls() {
        const chapIds = await this._getChapId();
        const chapUrls = {}

        for(let id of chapIds) {
            const chap = await this._getChap(id);
            const urls = chap.page_array;
            chapUrls[parseFloat(chap.chapter)] = urls;
        }
        return chapUrls;
    }

    /**
     * 
     * @param {number} chapNum 
     */
    _zipChapter(chapNum) {
        const chapDir = path.join(this._dir,chapNum);
        const chapZip = chapDir + ".zip";
        ZipLocal.zip(chapDir, (err,zipped)=> {
            if(!err) {
                zipped.compress();
                zipped.save(chapZip,err=> {
                    if(!err)  {
                        console.log("Zipping: "+chapDir);
                        fs.rmdirSync(chapDir,{recursive:true});
                    }
                })
            }
        });
    }

    /**
     * 
     * @param {number} chap 
     */
    _isInRange(chap) {
        for(const r of this._range) 
            if(r.firstChapter <= chap && r.lastChapter >= chap)
                return true;
        return false;
    }
}

class VerboseMangadexDownloader extends MangadexDownloader {
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
     * @param {string} imgUrl 
     * @param {string} imgName 
     * @param {string} chapDir 
     */
    static async _download(imgUrl, imgName, chapDir) {
        await helper(1);
        async function helper(tryNumber) {
            try {
                await download(imgUrl, imgName, chapDir);
                console.log(`Downloaded: ${imgUrl} as ${path.join(chapDir,imgName)}`);
            }
            catch(err) {
                console.error(`Download of ${imgUrl} has failed, retrying again. Remaining tries = ${MAX_DOWNLOAD_TRIES - tryNumber}`);
                if(tryNumber < MAX_DOWNLOAD_TRIES) 
                    await helper(++tryNumber);
                else 
                    throw new Error(`Failed downloading ${imgUrl} after ${MAX_DOWNLOAD_TRIES} tries.`);
            }
        }
    }
}

module.exports = {
    MangadexDownloader,
    VerboseMangadexDownloader
}
/**
 * @type {Mangadex.Mangadex}
 */
// @ts-ignore
const Mangadex = require("mangadex-api"),
    Manga = require("./manga").Manga,
    ZipLocal = require("zip-local"),
    fs = require("fs"),
    path = require("path"),
    { download, mkdir, getUniqueFilename, getValidFileName } = require("./util");

const MAX_DOWNLOAD_TRIES = 5;

class MangadexDownloader {
    /**
     * @typedef RangeType
     * @property {number} firstChapter 
     * @property {number} lastChapter
     * 
     * @typedef ConstructorParamsType
     * @property {string} [dir]
     * @property {number} [firstChapter]
     * @property {number} [lastChapter]
     * @property {RangeType[]} [range]
     * @property {string} [lang]
     * @property {number} [group]
     * @property {boolean} [noNumberAllowed]
     * 
     * @typedef DownloadParamsType
     * @property {string} imgUrl 
     * @property {string} imgName 
     * @property {string} chapDir
     */
    
    /** 
     * 
     * @param {number} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    constructor(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0, noNumberAllowed = true}={}) {
        this.mangaId = mangaId;
        this.dir = dir;
        this.lang = lang;
        this.group = group;
        this.noNumberAllowed = noNumberAllowed;

        /* firstChapter and lastChapter are ignored if range has been set */
        if(range.length === 0) {
            // @ts-ignore
            firstChapter = parseFloat(firstChapter);
            // @ts-ignore
            lastChapter = parseFloat(lastChapter);
            this.range = [{firstChapter,lastChapter}];
        }
        else this.range = range;
    }

    /** @param {number} id */
    // @ts-ignore
    set mangaId(id) {this._mangaId = parseInt(id);}

    /** @param {string} d */
    set dir(d) {this._dir = d;}

    /** @param {string} l */
    set lang(l) {this._lang = l;}

    /** @param {number | string} g */
    // @ts-ignore
    set group(g) {this._group = parseInt(g);}

    /** @param {boolean} bool */
    set noNumberAllowed(bool) {this._noNumberAllowed = bool;}

    /** @param {number} chap */
    set firstChapter(chap) {this._firstChapter = chap;}

    /** @param {number} chap */
    set lastChapter(chap) {this._lastChapter = chap;}

    /** @param {RangeType[]} r */
    set range(r) {
        if(!Array.isArray(r))
            throw new Error("the range parameter must be an Array");
        this._range = r;
    }

    get mangaId() {return this._mangaId;}
    get dir() {return this._dir;}
    get lang() {return this._lang;}
    get group() {return this._group;}
    get noNumberAllowed() {return this._noNumberAllowed;}
    get range() {return this._range;}
    get firstChapter() {return this._firstChapter;}
    get lastChapter() {return this._lastChapter;}

    async download() {
        const imgUrls = await this._getUrls();
        mkdir(this._dir);

        for(const chapNum of Object.keys(imgUrls)) {
            const chapName = getValidFileName(chapNum.padStart(3,"0"));
            const chapDir = path.join(this._dir,chapName);
            mkdir(chapDir);

            for(const [i,imgUrl] of imgUrls[chapNum].entries()) {
                const imgName = (i+1).toString().padStart(2,"0") + ".png";

                //if the download fails, delete the temporary folder storing the images then continue to the next chapter
                try {
                    // @ts-ignore
                    await this.constructor._download({imgUrl, imgName, chapDir});
                }
                catch(err) {
                    fs.rmdirSync(chapDir,{recursive:true});
                    console.error(err);
                    break;
                }
            }
            this._zipChapter(chapDir,chapName);
        }
    }

    /**
     * 
     * @param {DownloadParamsType} params
     */
    static async _download({imgUrl, imgName, chapDir}) {
        await helper(1);
        async function helper(tryNumber) {
            try {
                await download({url: imgUrl, filename: imgName, dir: chapDir});
            }
            catch(err) {
                if(tryNumber <= MAX_DOWNLOAD_TRIES) 
                    await helper(++tryNumber);
                else 
                    throw new Error(`Failed downloading ${imgUrl} after ${MAX_DOWNLOAD_TRIES} tries.`);
            }
        }
    }

    async _getManga() {
        try {
            const manga = await Mangadex.getManga(this._mangaId);
            return manga;
        }
        catch(err) {
            console.error("Trouble getting mangadex manga information. Try again later.");
        }

    }

    /**
     * 
     * @param {number} id 
     */
    async _getChap(id) {
        try {
            const chap = await Mangadex.getChapter(id);
            return chap;
        }
        catch(err) {
            console.error("Trouble getting mangadex chapter information. Try again later.");
        }
    }

    async _getChapId() {
        const manga = await this._getManga();
        /**
         * @type {Array}
         */
        let chaps = manga.chapter;

        //filter by group
        if(this._group) 
            chaps = chaps.filter(chap => 
                chap.group_id === this._group || 
                chap.group_id_2 === this._group || 
                chap.group_id_3 === this._group);

        //filter by chapter range
        chaps = chaps.filter(chap => this._isInRange(chap.chapter));

        //filter by language
        chaps = chaps.filter(chap => chap.lang_code === this._lang)
        
        //store the real first chapter and last chapter
        this.firstChapter = parseFloat(chaps[0].chapter);
        this.lastChapter = parseFloat(chaps[chaps.length-1].chapter);
                
        return chaps.map(chap => chap.id);
    }

    async _getUrls() {
        const chapIds = await this._getChapId();
        const chapUrls = {}

        for(let id of chapIds) {
            const chap = await this._getChap(id);
            const urls = chap.page_array;
            let chapNumber = parseFloat(chap.chapter);

            if(isNaN(chapNumber)) {
                if(chapIds.length === 1) chapNumber = 1;
                // @ts-ignore
                else chapNumber = chap.title;
            }
            chapUrls[chapNumber] = urls;
        }
        return chapUrls;
    }

    /**
     * @param {string} chapDir
     * @param {number|string} chapNum 
     */
    _zipChapter(chapDir,chapNum) {
        let chapZip = path.join(this._dir,getUniqueFilename({filename: chapNum+".zip", dir:this._dir}));
        
        ZipLocal.zip(chapDir, (err,zipped)=> {
            if(!err) {
                zipped.compress();
                zipped.save(chapZip,err=> {
                    if(!err)  {
                        console.log(`Zipping: ${chapDir} as ${chapZip}`);
                        fs.rmdirSync(chapDir,{recursive:true});
                    }
                })
            }
        });
    }

    /**
     * 
     * @param {number|string} chap 
     */
    _isInRange(chap) {
        if(this._noNumberAllowed && chap == "")
            return true;
        // @ts-ignore
        chap = parseFloat(chap);
        for(const r of this._range) 
            if(r.firstChapter <= chap && r.lastChapter >= chap)
                return true; 
        return false;
    }

    /**
     * 
     * @param {number} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    static download(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        const mangadexDownloader = new this(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
        return mangadexDownloader.download();
    }
}

class VerboseMangadexDownloader extends MangadexDownloader {
    /**
     * 
     * @param {number} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    constructor(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        super(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
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
    static async _download({imgUrl, imgName, chapDir}) {
        await helper(1);
        async function helper(tryNumber) {
            try {
                await download({url: imgUrl, filename: imgName, dir: chapDir});
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

    /**
     * 
     * @param {number} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    static download(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return super.download(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }
}

class ManualMangadexDownloader {
    /**
     * 
     * @param {number} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    constructor(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        this._mangadexDownloader = this._getMangadexDownloader(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }

    async download() {
        await this._mangadexDownloader.download();
        this._updateManga();
    }

    _updateManga() {
        let manga = Manga.loadManga(this._mangadexDownloader.mangaId);
    
        if(!manga) {
            let unixPath = path.normalize(this._mangadexDownloader.dir).replace(/\\/g,"/");
    
            if(unixPath.charAt(unixPath.length-1) === '/')
                unixPath = unixPath.substring(0,unixPath.length-1);
    
            const pathArr = unixPath.split("/");
            const name = pathArr[pathArr.length-1];
                manga = new Manga({
                    name,
                    id: this._mangadexDownloader.mangaId,
                });
        }
        manga.lastChapter = this._mangadexDownloader.lastChapter;
        manga.saveManga();
        return manga;
    }

    /**
     * 
     * @param {number} mangaId 
     * @param {ConstructorParamsType} [params] 
     */
    _getMangadexDownloader(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return new MangadexDownloader(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }
    
    /**
     * 
     * @param {number} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    static download(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return MangadexDownloader.download(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }

}

class VerboseManualMangadexDownloader extends ManualMangadexDownloader {
    /**
     * 
     * @param {number} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    constructor(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        super(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }

    _updateManga() {
        const manga = super._updateManga();
        console.log(`Manga ${manga.name} has been updated in the manga list.`);
        return manga;
    }

    /**
     * 
     * @param {number} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    _getMangadexDownloader(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return new VerboseMangadexDownloader(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }

    /**
     * 
     * @param {number} mangaId 
     * @param {ConstructorParamsType} params
     */
    static download(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return VerboseMangadexDownloader.download(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }

}

module.exports = {
    MangadexDownloader,
    VerboseMangadexDownloader,
    ManualMangadexDownloader,
    VerboseManualMangadexDownloader
}
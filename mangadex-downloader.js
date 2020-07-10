/**
 * @type {Mangadex.Mangadex}
 */
// @ts-ignore
const Mangadex = require("mangadex-api"),
    Manga = require("./manga").Manga,
    ZipLocal = require("zip-local"),
    fs = require("fs"),
    path = require("path"),
    util = require("./util");

const MAX_DOWNLOAD_TRIES = 5;

class MangadexDownloader {
    /**
     * @typedef RangeType
     * @property {number|string} firstChapter 
     * @property {number|string} lastChapter
     * 
     * @typedef ConstructorParamsType
     * @property {string} [dir]
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
     */
    
    /** 
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    constructor(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0, noNumberAllowed = true}={}) {
        // @ts-ignore
        this.mangaId = mangaId;
        this.dir = dir;
        this.lang = lang;
        // @ts-ignore
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

    /** @param {number} g */
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
        let chapId;
        try{
            chapId = await this._getChapId();
        }
        catch(err) {
            console.error(err);
            return;
        }

        util.mkdir(this._dir);

        chaptersLoop: for(const id of chapId) {
            const {chap,urls} = await this._getUrl(id,chapId.length);
            const chapName = util.getValidFileName(chap.padStart(3,"0"));
            const chapDir = path.join(this._dir,chapName);
            util.mkdir(chapDir);

            for(const [i,imgUrl] of urls.entries()) {
                const imgName = this._getImgFilename(i);

                //if the download fails, delete the temporary folder storing the images then continue to the next chapter
                try {
                    // @ts-ignore
                    await this.constructor._download({imgUrl, imgName, chapDir});
                    const imgSize = fs.statSync(path.join(chapDir,imgName)).size;
                    if(imgSize === 0) {
                        const num = parseInt(chap);
                        
                        //chapNum could be the title of the chapter if the chapter does not have a specific number. Continue to the next chapter.
                        if(isNaN(num))
                            throw new Error(MangadexDownloader._noImageErrorMsg(imgUrl));
                        
                        //otherwise redownload everything from the current chapter number.
                        return this._redownload(num,chapDir,imgUrl);
                    }
                }
                catch(err) {
                    fs.rmdirSync(chapDir,{recursive:true});
                    console.error(err);
                    continue chaptersLoop;
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
                await util.download({url: imgUrl, filename: imgName, dir: chapDir});
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
            throw new Error("Trouble getting mangadex manga information. Try again later.");
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
            throw new Error("Trouble getting mangadex chapter information. Try again later.");
        }
    }

    /**
     * @return {Promise<Array<number>>}
     */
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
        if(chaps.length > 0) {
            this.firstChapter = parseFloat(chaps[0].chapter);
            this.lastChapter = parseFloat(chaps[chaps.length-1].chapter);
        }
                
        return chaps.map(chap => chap.id);
    }

    /**
     * 
     * @param {number} id 
     * @param {number} nbOfChapters
     */
    async _getUrl(id,nbOfChapters) {
        const chap = await this._getChap(id);
        const urls = chap.page_array;
        let chapNumber = parseFloat(chap.chapter);

        if(isNaN(chapNumber)) {
            if(nbOfChapters === 1) chapNumber = 1;
            // @ts-ignore
            else chapNumber = chap.title;
        }
        
        return {
            chap: chapNumber.toString(),
            urls
        }
    }

    /**
     * @param {string} chapDir
     * @param {number|string} chapNum 
     */
    _zipChapter(chapDir,chapNum) {
        const zipName = util.getUniqueFilename({filename: chapNum+".zip", dir:this._dir});
        const zipPath = path.join(this._dir,zipName);
        
        ZipLocal.zip(chapDir, (err,zipped)=> {
            if(!err) {
                zipped.compress();
                zipped.save(zipPath,err=> {
                    if(!err)  {
                        console.log(`Zipping: ${chapDir} as ${zipPath}`);
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
     * @param {number} i 
     */
    _getImgFilename(i) {
        return (i+1).toString().padStart(2,"0") + ".png";
    }

    /**
     * 
     * @param {number} lastChapter
     * @param {string} chapDir
     * @param {string} imgUrl
     */
    async _redownload(lastChapter,chapDir,imgUrl) {
        console.error(MangadexDownloader._noImageErrorMsg(imgUrl));
        fs.rmdirSync(chapDir,{recursive:true});

        this._range = this._range
            .map((r,i)=> {
                if(r.firstChapter < lastChapter && r.lastChapter < lastChapter)
                    return;
                else if(r.firstChapter <= lastChapter && r.lastChapter >= lastChapter)
                    return {...r,firstChapter: lastChapter}
                else return r;
            })
            .filter(Boolean);

        await this.download();
    }    

    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    static download(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return new MangadexDownloader(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed}).download();
    }

    static _noImageErrorMsg(imgUrl) {
        return `No image was downloaded. URL ${imgUrl} does not work anymore. Reacquiring chapters data.`;
    }
}

class VerboseMangadexDownloader extends MangadexDownloader {
    /**
     * 
     * @param {number|string} mangaId 
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
                await util.download({url: imgUrl, filename: imgName, dir: chapDir});
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
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    static download(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return new VerboseMangadexDownloader(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed}).download();
    }
}

class ManualMangadexDownloader {
    /**
     * 
     * @param {number|string} mangaId 
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
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params] 
     */
    _getMangadexDownloader(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return new MangadexDownloader(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }
    
    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} params
     */
    static download(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return new ManualMangadexDownloader(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed}).download();
    }

}

class VerboseManualMangadexDownloader extends ManualMangadexDownloader {
    /**
     * 
     * @param {number|string} mangaId 
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
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} [params]
     */
    _getMangadexDownloader(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return new VerboseMangadexDownloader(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed});
    }

    /**
     * 
     * @param {number|string} mangaId 
     * @param {ConstructorParamsType} params
     */
    static download(mangaId,{dir="./", firstChapter = 0, lastChapter = Infinity, range = [], lang = "gb", group = 0,noNumberAllowed = true}={}) {
        return new VerboseManualMangadexDownloader(mangaId,{dir,firstChapter,lastChapter,range,lang,group,noNumberAllowed}).download();
    }
    
}

module.exports = {
    MangadexDownloader,
    VerboseMangadexDownloader,
    ManualMangadexDownloader,
    VerboseManualMangadexDownloader
}
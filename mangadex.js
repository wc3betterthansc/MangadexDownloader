/**
 * this is for autocomplete in VSCode
 * @type {Mangadex.Mangadex}
 */
const 
    Mangadex = require("mangadex-api"),
    ZipLocal = require("zip-local"),
    fs = require("fs"),
    path = require("path"),
    { download, listDir } = require("./util/util");

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
        if(range.length === 0)
            this.range = [{firstChapter,lastChapter}];
        else
            this.range = range;
    }

    set mangaId(id) {
        this._mangaId = parseInt(id);
    }

    set dir(d) {
        this._dir = d;
    }

    set lang(l) {
        this._lang = l;
    }

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

        if(!fs.existsSync(this._dir)) fs.mkdirSync(this._dir,{recursive: true});

        for(const chapNum of Object.keys(imgUrls)) {
            const chapName = chapNum.padStart(3,"0");
            const chapDir = path.join(this._dir,chapName);

            fs.mkdirSync(chapDir);
            for(const [i,imgUrl] of imgUrls[chapNum].entries()) {
                const imgName = (i+1).toString().padStart(2,"0") + ".png";
                try {
                    await download(imgUrl,imgName,chapDir);
                    const imgPath = path.join(chapDir,imgName);
                    console.log(`Downloaded: ${imgUrl} as ${imgPath}`);
                }
                catch(err) {
                    console.log(err);
                }
            }
            this._zipChapter(chapName);
        }
        console.log("Download finished.");
    }

    async _getUrls() {
        const chapIds = await this._getChapId();
        const chapUrls = {}
        console.log("Acquiring chapters data...");

        for(let id of chapIds) {
            const chap = await Mangadex.getChapter(id);
            console.log(`Chapter ${chap.chapter} data acquired.`);
            const urls = chap.page_array;
            chapUrls[parseFloat(chap.chapter)] = urls;
        }
        return chapUrls;
    }

    async _getChapId() {
        console.log("Acquiring manga data...");
        let manga = await Mangadex.getManga(this._mangaId);
        console.log("Manga data acquired.");
        console.log(`Manga name: ${manga.manga.title}.`);
    
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
        return chaps.filter(chap => chap.lang_code === this._lang)
                    .map(chap => chap.id);
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

    _zipChapters() {
        const chaps = listDir(this._dir);
    
        chaps.forEach(chap => {
            const chapDir = path.join(this._dir,chap);
            const chapZip = chapDir + ".zip";
            console.log("Zipping: "+chapDir);
            ZipLocal.sync.zip(chapDir).compress().save(chapZip);
            fs.rmdirSync(chapDir,{recursive:true});
        });
    
        console.log("Zipping complete.");
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

module.exports = MangadexDownloader;
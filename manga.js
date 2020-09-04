const { mkdir } = require("./util"),
    fs = require("fs"),
    path = require("path");

const
    MANGA_LIST_JSON = "MangaList.json",
    LOG = "log.txt",
    ERR = "error.txt",
    DEFAULT_DIR = "./manga";

class Manga {
    /**
     * @typedef MangaParamType 
     * 
     * @property {string} [name]
     * @property {number} [id]
     * @property {number} [lastChapter]
     * @property {string} [lang]
     * @property {string} [dir]
     */

    /**
     * 
     * @param {MangaParamType} [params]
     */
    constructor({ name, id, lastChapter = -1, lang = "gb", dir } = {}) {
        this.name = name;
        this.id = id;
        this.lastChapter = lastChapter;
        this.lang = lang;
        this.dir = dir;
    }

    /** @param {string} n*/
    set name(n) { this._name = n; }

    /** @param {number} i*/
    // @ts-ignore
    set id(i) { this._id = parseInt(i); }

    /** @param {number} chap*/
    // @ts-ignore
    set lastChapter(chap) { this._lastChapter = parseFloat(chap); }

    /** @param {string} l*/
    set lang(l) { this._lang = l; }

    /** @param {string} d*/
    set dir(d) { this._dir = d; }

    get name() { return this._name; }
    get id() { return this._id; }
    get lastChapter() { return this._lastChapter; }
    get lang() { return this._lang; }
    get dir() { return this._dir; }

    /**
     * 
     * @param {string} dir -Save location 
     */
    saveManga(dir = DEFAULT_DIR) {
        mkdir(dir);
        const mangaListJson = path.join(dir, MANGA_LIST_JSON);
        let mangaList = {};

        if (fs.existsSync(mangaListJson))
            mangaList = JSON.parse(fs.readFileSync(mangaListJson, "utf-8"));

        mangaList[this._id] = {
            name: this._name,
            lastChapter: this._lastChapter,
            lang: this._lang,
            dir: this._dir
        }

        fs.writeFileSync(mangaListJson, JSON.stringify(mangaList), { encoding: "utf-8" });
    }

    /**
     * 
     * @param {string} dir -Manga location
     * 
     * Deletes the manga from the manga list. This method does not delete the manga files.
     */
    deleteManga(dir = DEFAULT_DIR) {
        const mangaListJson = path.join(dir, MANGA_LIST_JSON);
        let mangaList = {};

        if (fs.existsSync(mangaListJson))
            mangaList = JSON.parse(fs.readFileSync(mangaListJson, "utf-8"));

        delete mangaList[this._id];
        fs.writeFileSync(mangaListJson, JSON.stringify(mangaList), { encoding: "utf-8" });
    }

    /**
     * 
     * @param {string} dir 
     */
    addLog(dir = DEFAULT_DIR) {
        const logFile = path.join(dir, LOG);
        mkdir(dir);

        const chapMsg = !isNaN(this.lastChapter) ? `chapter ${this.lastChapter}` : this.lastChapter;
        const today = new Date();
        const timeStamp = today.toLocaleDateString() + " " + today.toLocaleTimeString();
        const msg = `${this.id}: ${this.name} ${chapMsg} (${timeStamp})\n`;

        fs.appendFile(logFile, msg, err => {
            if (err) throw err;
            console.log(msg);
        });
    }

    /**
     * 
     * @param {Error} err 
     * @param {string} dir 
     */
    addErr(err, dir = DEFAULT_DIR) {
        const errFile = path.join(dir, ERR);
        mkdir(dir);

        const chapMsg = !isNaN(this.lastChapter) ? `chapter ${this.lastChapter}` : this.lastChapter;
        const today = new Date();
        const timeStamp = today.toLocaleDateString() + " " + today.toLocaleTimeString();
        const msg = `${this.id}: ${this.name} ${chapMsg} (${timeStamp}) ERR:${err.message}\n`;

        fs.appendFile(errFile, msg, err => {
            if (err) throw err;
            console.error(msg);
        });
    }

    /**
     * @param {number} id -Manga id
     * @param {string} dir -Manga location
     * @returns {Manga} 
     */
    static loadManga(id, dir = DEFAULT_DIR) {
        const mangaListJson = path.join(dir, MANGA_LIST_JSON);

        if (!fs.existsSync(mangaListJson))
            throw new Error(`Cannot load manga, ${MANGA_LIST_JSON} is missing.`);

        const mangaList = JSON.parse(fs.readFileSync(mangaListJson, "utf-8"));

        if (!mangaList[id]) return null;

        const manga = {
            id,
            name: mangaList[id].name,
            lastChapter: mangaList[id].lastChapter,
            lang: mangaList[id].lang,
            dir: mangaList[id].dir
        }

        return new Manga(manga);
    }

    /**
     * 
     * @param {Manga | MangaParamType} manga
     */
    static addLog(manga, dir = DEFAULT_DIR) {
        let mangaObject;
        if (!(manga instanceof Manga))
            mangaObject = new Manga(manga);
        else
            mangaObject = manga;

        mangaObject.addLog(dir);
    }

    /**
     * 
     * @param {Manga | MangaParamType} manga 
     * @param {Error} err 
     * @param {string} dir 
     */
    static addErr(manga, err, dir = DEFAULT_DIR) {
        let mangaObject;
        if (!(manga instanceof Manga))
            mangaObject = new Manga(manga);
        else
            mangaObject = manga;

        mangaObject.addErr(err, dir);
    }
}

class MangaList {
    constructor(dir = DEFAULT_DIR) {
        this.dir = dir;

        /**
         * @type {Map<number,Manga>}
         */
        const map = new Map();
        this.allManga = map;
    }

    /**
     * @param {string} d
     */
    set dir(d) {
        this._dir = d;
    }

    /**
     * @param {Map<number,Manga>} am
     */
    set allManga(am) {
        this._allManga = am;
    }

    /**
     * @return {Map<number,Manga>}
     */
    get allManga() {
        return this._allManga;
    }

    saveAllManga() {
        mkdir(this._dir);
        const mangaListJson = path.join(this._dir, MANGA_LIST_JSON);
        const mangaList = {};

        for (const manga of this._allManga.values()) {
            const mangaListJson = path.join(this._dir, MANGA_LIST_JSON);
            mangaList[manga._id] = {
                name: manga._name,
                lastChapter: manga._lastChapter,
                lang: manga._lang,
                dir: manga._dir
            }
        }
        fs.writeFileSync(mangaListJson, JSON.stringify(mangaList), { encoding: "utf-8" });
    }

    loadAllManga() {
        const mangaListJson = path.join(this._dir, MANGA_LIST_JSON);

        if (!fs.existsSync(mangaListJson))
            throw new Error(`Cannot load all manga, ${MANGA_LIST_JSON} is missing.`);

        const mangaList = JSON.parse(fs.readFileSync(mangaListJson, "utf-8"));

        for (const id of Object.keys(mangaList)) {
            const manga = {
                id: parseInt(id),
                name: mangaList[id].name,
                lastChapter: mangaList[id].lastChapter,
                lang: mangaList[id].lang,
                dir: mangaList[id].dir
            }
            this._allManga.set(parseInt(id), new Manga(manga));
        }

        return this._allManga;
    }

    /**
     * 
     * @param {MangaParamType | Manga} manga
     */
    addManga(manga) {
        let mangaObject;
        if (!(manga instanceof Manga))
            mangaObject = new Manga(manga);
        else
            mangaObject = manga;

        this._allManga.set(mangaObject._id, mangaObject);
    }

    /**
     * @typedef ParamType 
     * 
     * @property {string} name
     * @property {number} id
     * @property {number} lastChapter
     * 
     * @param {Array<ParamType | Manga>} mangaArr 
     */
    addMangaList(mangaArr) {
        if (!Array.isArray(mangaArr)) throw new Error("The manga list must be an array.");

        mangaArr.forEach(manga => this.addManga(manga));
    }

    /**
     * Delete the manga from the MangaList model. This method does not update the manga list on the drive. 
     * Use saveAllManga to write the modifications on the drive. 
     * 
     * @param {number} id -manga id
     * 
     */
    deleteManga(id) {
        this._allManga.delete(id);
    }
}

module.exports = {
    Manga,
    MangaList
}
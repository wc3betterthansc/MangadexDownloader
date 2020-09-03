const { mkdir } = require("./util"),
    fs = require("fs"),
    path = require("path");

const MANGA_LIST_JSON = "MangaList.json";
const LOG = "log.txt";
const DEFAULT_DIR = "./manga";

class Manga {

    /**
     * @typedef MangaParamType 
     * 
     * @property {string} [name]
     * @property {number} [id]
     * @property {number} [lastChapter]
     * @property {string} [lang]
     */

    /**
     * 
     * @param {MangaParamType} [params]
     */
    constructor({ name, id, lastChapter = -1, lang = "gb" } = {}) {
        this.name = name;
        this.id = id;
        this.lastChapter = lastChapter;
        this.lang = lang;
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

    get name() { return this._name; }
    get id() { return this._id; }
    get lastChapter() { return this._lastChapter; }
    get lang() { return this._lang; }

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
            lang: this._lang
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

    addLog(dir = DEFAULT_DIR) {
        const logFile = path.join(dir, LOG);
        mkdir(dir);

        const chapMsg = !isNaN(this.lastChapter) ? `chapter ${this.lastChapter}` : this.lastChapter;
        const msg = `${this.name} (${this.id}): ${chapMsg}\n`;
        fs.appendFile(logFile, msg, err => {
            if (err) throw err;
            console.log("log file updated.");
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

        return new Manga({
            id,
            name: mangaList[id].name,
            lastChapter: mangaList[id].lastChapter,
            lang: mangaList[id].lang
        });
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
                lang: manga._lang
            }
        }
        fs.writeFileSync(mangaListJson, JSON.stringify(mangaList), { encoding: "utf-8" });
    }

    loadAllManga() {
        const mangaListJson = path.join(this._dir, MANGA_LIST_JSON);

        if (!fs.existsSync(mangaListJson))
            throw new Error(`Cannot load all manga, ${MANGA_LIST_JSON} is missing.`);

        const mangaList = JSON.parse(fs.readFileSync(mangaListJson, "utf-8"));

        for (const id of Object.keys(mangaList))
            this._allManga.set(parseInt(id), new Manga({
                id: parseInt(id),
                name: mangaList[id].name,
                lastChapter: mangaList[id].lastChapter,
                lang: mangaList[id].lang
            }));
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
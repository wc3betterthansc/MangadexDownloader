const 
    {mkdir} = require("./util"),
    fs = require("fs"),
    path = require("path");

const MANGA_LIST_JSON = "MangaList.json";
const DEFAULT_DIR = "./manga";

class Manga {

    /**
     * @typedef ParamType 
     * 
     * @property {string} name
     * @property {number} id
     * @property {number} lastChapter
     * @property {string} lang
     * 
     * @param {ParamType} params
     */
    constructor({name,id,lastChapter=-1,lang="gb"}={}) {
        this.name = name;
        this.id = id;
        this.lastChapter = lastChapter;
        this.lang = lang;
    }

    set name(n) {
        this._name = n;
    }

    set id(i) {
        this._id = parseInt(i);
    }

    set lastChapter(chap) {
        this._lastChapter = parseFloat(chap);
    }

    set lang(l) {
        this._lang = l;
    }

    /**
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * @return {number}
     */
    get id() {
        return this._id;
    }

    /**
     * @return {number}
     */
    get lastChapter() {
        return this._lastChapter;
    }

    get lang() {
        return this._lang;
    }

    /**
     * 
     * @param {string} dir -Save location 
     */
    saveManga(dir=DEFAULT_DIR) {
        mkdir(dir);
        const mangaListJson = path.join(dir,MANGA_LIST_JSON);
        let mangaList = {};

        if(fs.existsSync(mangaListJson))
            mangaList = JSON.parse(fs.readFileSync(mangaListJson, "utf-8"));

        mangaList[this._id] = {
            name: this._name,
            lastChapter: this._lastChapter,
            lang: this._lang
        }
        fs.writeFileSync(mangaListJson, JSON.stringify(mangaList), {encoding: "utf-8"});        
    }

    /**
     * 
     * @param {string} dir -Manga location
     * 
     * Deletes the manga from the manga list. This method does not delete the manga files.
     */
    deleteManga(dir=DEFAULT_DIR) {
        const mangaListJson = path.join(dir,MANGA_LIST_JSON);
        let mangaList = {};

        if(fs.existsSync(mangaListJson))
            mangaList = JSON.parse(fs.readFileSync(mangaListJson, "utf-8"));

        delete mangaList[this._id];
        fs.writeFileSync(mangaListJson, JSON.stringify(mangaList), {encoding: "utf-8"});   
    }

    /**
     * @param {number} id -Manga id
     * @param {string} dir -Manga location
     * @returns {Manga} 
     */
    static loadManga(id,dir=DEFAULT_DIR) {
        const mangaListJson = path.join(dir,MANGA_LIST_JSON);

        if(!fs.existsSync(mangaListJson))
            throw new Error(`Cannot load manga, ${MANGA_LIST_JSON} is missing.`);

        const mangaList = JSON.parse(fs.readFileSync(mangaListJson, "utf-8"));

        if(!mangaList[id]) return null;

        return new Manga({
            id,
            name: mangaList[id].name,
            lastChapter: mangaList[id].lastChapter,
            lang: mangaList[id].lang
        });
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
        const mangaListJson = path.join(this._dir,MANGA_LIST_JSON);
        const mangaList = {};

        for(const manga of this._allManga.values()) {
            const mangaListJson = path.join(this._dir,MANGA_LIST_JSON);
            mangaList[manga._id] = {
                name: manga._name,
                lastChapter: manga._lastChapter,
                lang: manga._lang
            }
        }
        fs.writeFileSync(mangaListJson,JSON.stringify(mangaList),{encoding: "utf-8"});
    }

    loadAllManga() {
        const mangaListJson = path.join(this._dir,MANGA_LIST_JSON);

        if(!fs.existsSync(mangaListJson))
            throw new Error(`Cannot load all manga, ${MANGA_LIST_JSON} is missing.`);

        const mangaList = JSON.parse(fs.readFileSync(mangaListJson, "utf-8"));

        for(const id of Object.keys(mangaList))
            this._allManga.set(parseInt(id), new Manga({
                id,
                name: mangaList[id].name,
                lastChapter: mangaList[id].lastChapter,
                lang: mangaList[id].lang
            }));
        return this._allManga;
    }

    /**
     * @typedef ParamType 
     * 
     * @property {string} name
     * @property {number} id
     * @property {number} lastChapter
     * 
     * @param {ParamType | Manga} manga
     */
    addManga(manga) {
        if(!(manga instanceof Manga)) {
            manga = new Manga(manga);
        }
        this._allManga.set(manga._id,manga);
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
        if(!Array.isArray(mangaArr)) throw new Error("The manga list must be an array.");

        mangaArr.forEach(manga => this.addManga(manga));
    }

    /**
     * 
     * @param {number} id -manga id
     * 
     * Delete the manga from the MangaList model. This method does not update the manga list on the drive. 
     * Use saveAllManga to write the modifications on the drive. 
     */
    deleteManga(id) {
        delete this._allManga.delete(id);
    }
}

module.exports = {
    Manga,
    MangaList
}
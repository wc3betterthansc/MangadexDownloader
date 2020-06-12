const 
    {mkdir} = require("./util/util"),
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
     * 
     * @param {ParamType} params
     */
    constructor({name,id,lastChapter=-1}={}) {
        this.name = name;
        this.id = id;
        this.lastChapter = lastChapter;
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

    saveManga(dir=DEFAULT_DIR) {
        mkdir(dir);
        const mangaListJson = path.join(dir,MANGA_LIST_JSON);
        let mangaList = {};

        if(fs.existsSync(mangaListJson))
            mangaList = JSON.parse(fs.readFileSync(mangaListJson, "utf-8"));

        mangaList[this._id] = {
            name: this._name,
            lastChapter: this._lastChapter,
        }
        fs.writeFileSync(mangaListJson, JSON.stringify(mangaList), {encoding: "utf-8"});        
    }

    addChapter(chapter) {
        this._chapters.push(chapter);
    }

    /**
     * @param {number} id
     * @param {string} dir
     * @returns {Manga} 
     */
    static loadManga(id,dir=DEFAULT_DIR) {
        const mangaListJson = path.join(dir,MANGA_LIST_JSON);

        if(!fs.existsSync(mangaListJson))
            throw new Error(`Cannot load manga, ${MANGA_LIST_JSON} is missing.`);

        const mangaList = JSON.parse(fs.readFileSync(mangaListJson, "utf-8"));

        return new Manga({
            name: mangaList[id].name,
            lastChapter: mangaList[id].lastChapter,
            id
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
            this._allManga.set(id, new Manga({
                id,
                name: mangaList[id].name,
                lastChapter: mangaList[id].lastChapter,
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

    deleteManga(id) {
        delete this._allManga.delete(id);
    }
}

module.exports = {
    Manga,
    MangaList
}
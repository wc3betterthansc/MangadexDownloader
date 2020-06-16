const 
    {get} = require("./util"),
    xmlParser = require("xml2js").Parser,
    fs = require("fs"),
    path = require("path"),
    _ = require("lodash");

require("dotenv").config();

class RSS {
    /**
     * @typedef ParamsType
     * @property {string} name
     * @property {number} id
     * @property {string} dir
     * @property {number} lastChapter
     * 
     * @param {ParamsType} param 
     */
    constructor({name,id,lastChapter=-1}={}) {
        this.name = name;
        this.id = id;
        this.lastChapter = lastChapter;
    }

    /**
     * @param {string} n
     */
    set name(n) {
        this._name = n;
    }

    /**
     * @param {string | number} i
     */
    set id(i) {
        this._id = parseInt(i);
    }

    set lastChapter(chap) {
        this._lastChapter = parseFloat(chap);
    }

    get name() {
        return this._name;
    }

    get id() {
        return this._id;
    }

    get lastChapter() {
        return this._lastChapter;
    }

    async getNewChapters() {
        const chapters = await this._getChapters();
        return chapters.filter(chap => chap > this._lastChapter);
    }

    async _getParsedRSS() {
        const parser = new xmlParser();
        const xml = await get(this._url);
        const parsedXML = await parser.parseStringPromise(xml);
        return parsedXML.rss;
    }

    async _getChapters() {
        const parsedRSS = await this._getParsedRSS();
        const regex = /Chapter ([\d\.]+)$/;
        const titles = parsedRSS.channel[0].item.map(entry => entry.title[0]);
        return titles
            .map(title => {
                const match = title.match(regex);
                if(match) return parseFloat(match[1]);
            })
            .filter(chap => chap != undefined);
    }

    get _url() {
        if(!this._id)  throw new Error("Cannot get RSS without specifying the id of the content.");
        const rssKey = process.env.RSS_KEY;
        return `https://mangadex.org/rss/${rssKey}/manga_id/${this._id}`;
    }

}

module.exports = RSS;
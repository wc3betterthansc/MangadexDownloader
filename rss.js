const 
    {get} = require("./util"),
    XMLParser = require("xml2js").Parser,
    fs = require("fs"),
    path = require("path");

require("dotenv").config();

class RSS {
    /**
     * @typedef RSSParamsType
     * @property {string} [name]
     * @property {number} [id]
     * @property {number} [lastChapter]
     * 
     */

    /**
     * @param {RSSParamsType} [param]
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
        // @ts-ignore
        this._id = parseInt(i);
    }

    /**
     * @param {string | number} chap
     */
    set lastChapter(chap) {
        // @ts-ignore
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
        try {
            const chapters = await this._getChapters();
            return chapters.filter(chap => chap > this._lastChapter);
        }
        catch(err) {
            console.error(err);
            return [];
        }
    }

    async _getParsedRSS() {
        const parser = new XMLParser({explicitArray: false});
        const xml = await get(this._url);
        const parsedXML = await parser.parseStringPromise(xml);
        return parsedXML.rss;
    }

    /**
     * @return {Promise<number[]>}
     */
    async _getChapters() {
        const parsedRSS = await this._getParsedRSS();
        const regex = /Chapter ([\d\.]+)$/;
        const titles = parsedRSS.channel.item.map(entry => entry.title);
        return titles
            .map(title => {
                const match = title.match(regex);
                if(match) return parseFloat(match[1]);
            })
            .filter(chap => chap != undefined);
    }

    get _url() {
        if(!this._id) throw new Error("Cannot get RSS without specifying the id of the content.");
        const rssKey = process.env.RSS_KEY;
        return `https://mangadex.org/rss/${rssKey}/manga_id/${this._id}`;
    }
}

class VerboseRSS extends RSS {
    /**
     * @param {RSSParamsType} param 
     */
    constructor({name,id,lastChapter=-1}={}) {
        super({name,id,lastChapter});
    }

    async getNewChapters() {
        const chapters = await super.getNewChapters();
        let message;
        switch(chapters.length) {
            case 0:  message = `No new chapters for manga ${this._name} have been found.`;break;
            case 1:  message = `1 new chapter for manga ${this._name} has been found.`;break;
            default: message = `${chapters.length} new chapters for manga ${this._name} have been found.`;
        }
        console.log(message);
        return chapters;
    }

    async _getParsedRSS() {
        const parsedRSS = await super._getParsedRSS();
        console.log(`${this._name}'s RSS feed has been parsed.`);
        return parsedRSS;
    }

    async _getChapters() {
        const chapters = await super._getChapters();
        console.log(`${this._name}'s chapter numbers have been extracted from the RSS feed.`);
        return chapters;
    }

    get _url() {
        const url = super._url;
        console.log(`${this._name}'s RSS feed url is: ${url}`);
        return url;
    }
}

module.exports = {
    RSS,
    VerboseRSS
};
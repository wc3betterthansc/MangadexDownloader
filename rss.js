const 
    {get, mkdir} = require("./util"),
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
     * @property {number} lastChapter -This value is used if no previous RSS file exists on the drive, this will set a starting point to look up for new chapters.
     * 
     * @param {ParamsType} param 
     */
    constructor({name,id,dir="./rss",lastChapter=-1}={}) {
        this.name = name;
        this.id = id;
        this.dir = dir;
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

    /**
     * @param {string} d
     */
    set dir(d) {
        this._dir = d;
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

    get dir() {
        return this._dir;
    }

    /**
     * Get the latest RSS from the URL and store it temporarily in the memory. Store and return the parsed version.
     */
    async getLatestRss() {
        const parser = new xmlParser();
        const rssFile = await get(this._url);
        const parsedRss = await parser.parseStringPromise(rssFile);
        this._latestParsedRss = parsedRss.rss;
        this._latestRssFile = rssFile;
        return this._latestParsedRss;
    }

    /**
     * Get the previous RSS stored in "{dir}/{name}", returns false if there was no previous rss file or temporarily store in the memory. Store and return the parsed version of the previous RSS.
     */
    async getPreviousRss() {
        const rssPath = path.join(this._dir,this._name+".xml");

        if(!fs.existsSync(rssPath)) return false;

        const parser = new xmlParser();
        this._previousRssFile = fs.readFileSync(rssPath, "utf-8");
        const parsedRss = await parser.parseStringPromise(this._previousRssFile);
        this._previousParsedRss = parsedRss.rss;
        return this._previousParsedRss;
    }

    /**
     * @return {Promise<number[]>}
     */
    async getLatestChapters() {
        let parsedRss;

        if(!this._latestParsedRss) 
            parsedRss = await this.getLatestRss();
        else
            parsedRss = this._latestParsedRss;

        return RSS._getChapters(parsedRss);
    }

    /**
     * @return {Promise<number[]> | Promise<false>}
     */
    async getPreviousChapters() {
        let parsedRss;

        if(this._previousParsedRss === undefined)
            parsedRss = await this.getPreviousRss();
        else
            parsedRss = this._previousParsedRss;
        if(!parsedRss) return false;

        return RSS._getChapters(parsedRss);
    }

    async getNewChapters() {
        let previousChaptersPromise = this.getPreviousChapters();
        let latestChaptersPromise = this.getLatestChapters();
        
        let [previousChapters, latestChapters] = await Promise.all([previousChaptersPromise,latestChaptersPromise]);
        this._saveRSSFile();

        if(!previousChapters) {
            if(this._lastChapter === -1 ) return latestChapters;
            return latestChapters.filter(chap => chap > this._lastChapter);
        }
        return _
            .difference(latestChapters,previousChapters)
            .filter(chap => chap > this._lastChapter);
    }

    /**
     * Save the latest RSS File into the specified "{directory}/{name}" path.
     */
    async _saveRSSFile() {
        if(!this._name) throw new Error("Cannot save RSS without a name.");
        if(!this._dir) throw new Error("Cannot save RSS without a directory path.");
        if(!this._latestRssFile) await this.getLatestRss();

        const rssPath = path.join(this._dir,this._name+".xml");
        mkdir(this._dir);

        fs.writeFileSync(rssPath,this._latestRssFile,{
            encoding: "utf-8",
        });
    }

    get _url() {
        if(!this._id)  throw new Error("Cannot get RSS without specifying the id of the content.");
        const rssKey = process.env.RSS_KEY;
        return `https://mangadex.org/rss/${rssKey}/manga_id/${this._id}`;
    }

    static _getChapters(parsedRss) {
        const regex = /Chapter ([\d\.]+)$/;
        const titles = parsedRss.channel[0].item.map(entry => entry.title[0]);
        return titles
            .map(title => {
                const match = title.match(regex);
                if(match) return parseFloat(match[1]);
            })
            .filter(chap => chap != undefined);
    }
}

module.exports = RSS;
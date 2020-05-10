const 
    fetch = require("node-fetch"),
    JSDOM = require("jsdom").JSDOM,
    fs = require("fs"),
    path = require("path");

/* This function returns a DOM Object of a web page inside a promise */
async function getHTML(url) {
    const res = await fetch(url);
    const html = await res.text();
    return new JSDOM(html).window.document;
}

/* block the code for a certain duration */
async function wait(dur) {
    return new Promise(res=> {
        setTimeout(res,dur);
    });
}

/* download a file from "url" into "dir" and name it "filename" */
async function download(url, filename, dir) {
    const imgRes = await fetch(url);
    return new Promise((res,rej)=>{
        const file = fs.createWriteStream(path.join(dir,filename));
        file.on("finish",()=>{
            file.close();
            res();
        });
        file.on("error",()=>{
            file.close();
            rej();
        });
        imgRes.body.on("error",()=>{
            file.close();
            rej();
        });
        imgRes.body.pipe(file);
    });
}

/* returns a list of directories inside "dir" */
function listDir(dir) {
    return fs.readdirSync(dir).filter(file => fs.statSync(path.join(dir,file)).isDirectory());
}

module.exports = {
    getHTML,
    wait,
    download,
    listDir
}

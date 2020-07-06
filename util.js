const 
    fetch = require("node-fetch").default,
    JSDOM = require("jsdom").JSDOM,
    fs = require("fs"),
    path = require("path");

console.log();
/**
 * @typedef DownloadParamsType
 * @property {string} url 
 * @property {string} filename 
 * @property {string} dir
 * @property {boolean} [override]
 * 
 */

/* This function returns a DOM Object of a web page inside a promise */
/**
 * 
 * @param {string} url 
 */
async function getHTML(url) {
    const res = await fetch(url,undefined);
    const html = await res.text();
    return new JSDOM(html).window.document;
}

/**
 * 
 * @param {string} url 
 */
async function get(url) {
    const res = await fetch(url,undefined);
    return res.text();
}

/* block the code for a certain duration */
/**
 * 
 * @param {number} dur 
 */
async function wait(dur) {
    return new Promise(res=> {
        setTimeout(res,dur);
    });
}

/**
 * download a file from "url" into "dir" and name it "filename". the override option will replace existing files, otherwise it will add the file * next to the previous ones with an incremented value between parentheses.
 * 
 * @param {DownloadParamsType} param
 * 
 */
async function download({url, filename, dir, override=false}) {
    if(!override) filename = getUniqueFilename({filename, dir});

    const imgRes = await fetch(url, undefined);
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

/**
 * return a unique name for a file in order to prevent file overriding. Example: if "filename.zip" exists then this function
 * will return "filename(1).zip".
 * 
 * @typedef ParamType
 * @property {string} filename
 * @property {string} dir
 * 
 * @param {ParamType} param 
 */
function getUniqueFilename({filename,dir}) {
    const extensionIndex = filename.indexOf(".");
    let fileNameNoExt = filename;
    let ext;

    //-1 : no extension
    // 0 : file starts with 0, not an extension (.gitignore, .env, etc)
    // length-1 : file ends with a ".", not an extension (filename.)
    if(extensionIndex > 0 && extensionIndex !== filename.length-1 ) {
        fileNameNoExt = filename.substring(0,extensionIndex);
        ext = filename.substring(extensionIndex+1);
    }

    let alreadyExists,newFileNameNoExt,newFileName;
    let counter = 0;

    do {
        newFileNameNoExt = counter ? `${fileNameNoExt}(${counter})` : fileNameNoExt;
        newFileName = ext ? newFileNameNoExt+"."+ext : newFileNameNoExt;
        alreadyExists = fs.existsSync(path.join(dir,newFileName));
        counter++;
    }while(alreadyExists);

    return newFileName
}

/* returns a list of directories inside "dir". */
/**
 * 
 * @param {string} dir 
 */
function listDir(dir) {
    return fs.readdirSync(dir).filter(file => fs.statSync(path.join(dir,file)).isDirectory());
}


/**
 * create directory if it doesn't exist.
 * 
 * @param {string} dir 
 * 
 */
function mkdir(dir) {
    dir = getValidFileName(dir);

    if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive: true});
    return dir;
}

/**
 * return a valid file name to a file or directory path by removing illegal characters from the one passed to the function.
 * 
 * @param {string} dir 
 */
function getValidFileName(dir) {
    switch(process.platform) {
        case "win32": {
            let drive = "";
            if(dir.charAt(1) === ":" && dir.charAt(2) === "\\") {
                drive = dir.charAt(0)+":\\"
                dir = dir.substring(3);
            }
            dir = drive + dir.replace(/[\>\<\:\*\"\/\|\?\*]/g,"");
            break;
        }
    }
    return dir;
}

module.exports = {
    getHTML,
    get,
    wait,
    download,
    getUniqueFilename,
    getValidFileName,
    mkdir,
    listDir
}

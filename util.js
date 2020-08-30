const { time } = require("console");

const
    fetch = require("node-fetch").default,
    fetchResponse = require("node-fetch").Response,
    AbortController = require("abort-controller").AbortController,
    JSDOM = require("jsdom").JSDOM,
    puppeteer = require("puppeteer"),
    fs = require("fs"),
    ZipLocal = require("zip-local"),
    ZipExport = require("zip-local/libs/ZipExport"),
    path = require("path");

/**
 * @typedef DownloadParamsType
 * @property {string} url 
 * @property {string} filename 
 * @property {string} dir
 * @property {boolean} [override]
 * @property {number} [timeout]
 * 
 */

/* This function returns a DOM Object of a web page inside a promise */
/**
 * 
 * @param {string} url 
 */
async function getHTML(url) {
    const res = await fetch(url);
    if (!res.ok) throw StatusCodeError(res.status);
    const html = await res.text();
    return new JSDOM(html).window.document;
}

/* This function returns a DOM Object of a web page that is served dynamically with javascript inside a promise */
/**
 * 
 * @param {string} url
 */
async function getDynamicHTML(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const html = await page.content();
    browser.close();
    return new JSDOM(html).window.document;
}

/**
 * 
 * @param {string} url 
 */
async function get(url, timeout = 0) {
    let res;
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeout);

    try {
        if (timeout)
            res = await fetch(url, { signal: controller.signal });
        else res = await fetch(url);

    } catch (err) {
        if (err.name === "AbortError")
            throw TimeoutError;
        else throw err;
    } finally {
        clearTimeout(to);
    }

    if (!res.ok) throw StatusCodeError(res.status);
    return res.text();
}

/* block the code for a certain duration */
/**
 * 
 * @param {number} dur 
 */
async function wait(dur) {
    return new Promise(res => {
        setTimeout(res, dur);
    });
}

/**
 * download a file from "url" into "dir" and name it "filename". the override option will replace existing files, otherwise it will add the file * next to the previous ones with an incremented value between parentheses.
 * 
 * @param {DownloadParamsType} param
 * 
 */
async function download({ url, filename, dir, override = false, timeout = 5000 }) {
    if (!override) filename = getUniqueFilename({ filename, dir });

    let response;
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeout);

    try {
        if (timeout)
            response = await fetch(url, { signal: controller.signal });
        else response = await fetch(url);
    } catch (err) {
        if (err.name === "AbortError")
            throw TimeoutError;
        else throw err;
    } finally {
        clearTimeout(to);
    }

    if (response.ok) {
        return new Promise((res, rej) => {
            const file = fs.createWriteStream(path.join(dir, filename));
            file.on("finish", () => {
                file.close();
                res();
            });
            file.on("error", () => {
                file.close();
                console.error(WritingError.message);
                rej(WritingError);
            });
            response.body.on("error", () => {
                file.close();
                console.error(RemoteError.message);
                rej(RemoteError);
            });
            response.body.pipe(file);
        });
    } else throw StatusCodeError(response.status);
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
function getUniqueFilename({ filename, dir }) {
    const
        rmExtension = removeExtension(filename),
        filenameNoExt = rmExtension.filename,
        extension = rmExtension.extension;

    let alreadyExists, newFilenameNoExt, newFilename;
    let counter = 0;

    do {
        newFilenameNoExt = counter ? `${filenameNoExt}(${counter})` : filenameNoExt;
        newFilename = extension ? newFilenameNoExt + "." + extension : newFilenameNoExt;
        alreadyExists = fs.existsSync(path.join(dir, newFilename));
        counter++;
    } while (alreadyExists);

    return newFilename
}

/* returns a list of directories inside "dir". */
/**
 * 
 * @param {string} dir 
 */
function listDir(dir) {
    return fs
        .readdirSync(dir)
        .filter(file => fs.statSync(path.join(dir, file)).isDirectory());
}


/**
 * create the directory "dir" if it doesn't exist.
 * 
 * @param {string} dir 
 * 
 */
function mkdir(dir) {
    const validDirPath = getValidFilepath(path.resolve(dir));

    if (!fs.existsSync(validDirPath)) fs.mkdirSync(validDirPath, { recursive: true });
    return validDirPath;
}

/**
 * remove the directory "dir" if it exists.
 * 
 * @param {string} dir 
 */
function rmdir(dir) {
    const validDirPath = getValidFilepath(path.resolve(dir));

    if (fs.existsSync(validDirPath)) fs.rmdirSync(validDirPath, { recursive: true });
    return validDirPath;
}

/**
 * return a valid file or directory path by removing illegal characters from the one passed to the function.
 * 
 * @param {string} filepath 
 */
function getValidFilepath(filepath) {
    switch (process.platform) {
        case "win32":
            {
                let drive = "";
                if (filepath.charAt(1) === ":" && filepath.charAt(2) === "\\") {
                    drive = filepath.charAt(0) + ":\\"
                    filepath = filepath.substring(3);
                }
                filepath = drive + filepath.replace(/[\>\<\:\*\"\/\|\?\*]/g, "");
                break;
            }
    }
    return filepath;
}

/**
 * get the filename and extension separately.
 * 
 * @typedef RemoveExtensionType
 * @property {string} filename
 * @property {string} extension
 * 
 * @param {string} filename
 * @return {RemoveExtensionType}
 */
function removeExtension(filename) {
    let extension = "";
    let filenameNoExt = filename;
    const extensionIndex = filename.indexOf(".");

    //-1 : no extension
    // 0 : file starts with ".", not an extension (.gitignore, .env, etc)
    // length-1 : file ends with a ".", not an extension (filename.)
    if (extensionIndex > 0 && extensionIndex !== filename.length - 1) {
        filenameNoExt = filename.substring(0, extensionIndex);
        extension = filename.substring(extensionIndex + 1);
    }

    return { filename: filenameNoExt, extension }
}

/**
 * Zip the file "filePath" as "zipPath". If the zipping was a success, if "deleteFile" is true "filePath" will be deleted. 
 * 
 * @typedef ZipParamsType
 * @property {string} filePath
 * @property {string} zipPath
 * @property {boolean} [deleteFile]
 * 
 * @param {ZipParamsType} param
 * @return {Promise<ZipParamsType>}
 */
async function zip({ filePath, zipPath, deleteFile = false }) {
    /**
     * @type {ZipExport}
     */
    const zippedFile = await new Promise((res, rej) => {
        ZipLocal.zip(filePath, (err, zipped) => {
            if (!err) {
                zipped.compress();
                res(zipped);
            } else rej(err);
        });
    });

    return new Promise((res, rej) => {
        zippedFile.save(zipPath, err => {
            if (!err) {
                if (deleteFile) rmdir(filePath);
                res({ filePath, zipPath, deleteFile });
            } else rej(err);
        });
    });

}

/**
 * Unzip the file "zipPath" as "filePath". If the unzipping was a success, if deleteZip is true "zipPath" will be deleted. 
 * 
 * @typedef UnzipParamsType
 * @property {string} zipPath
 * @property {string} [unzipPath]
 * @property {boolean} [deleteZip]
 * 
 * @param {UnzipParamsType} param
 * @return {Promise<UnzipParamsType>}
 */
async function unzip({ zipPath, unzipPath, deleteZip = false }) {
    const unzipped = await _unzip(zipPath);

    if (!unzipPath) {
        zipPath = path.resolve(zipPath);
        const zipNameNoExt = removeExtension(path.basename(zipPath)).filename;
        const zipParentDir = path.dirname(zipPath);
        unzipPath = path.join(zipParentDir, zipNameNoExt);
    }
    mkdir(unzipPath);

    return new Promise((res, rej) => {
        unzipped.save(unzipPath, err => {
            if (!err) {
                if (deleteZip) rmdir(zipPath);
                res({ zipPath, unzipPath, deleteZip });
            } else rej(err);
        });
    });
}

/**
 * Unzip the file "ZipPath" in memory. If the unzipping was a success, if deleteZip is true "zipPath" will be deleted. 
 *  
 * @typedef UnzipMemoryParamsType
 * @property {string} zipPath
 * @property {boolean} [deleteZip]
 * 
 * @param {UnzipMemoryParamsType} param
 * 
 */
async function unzipMemory({ zipPath, deleteZip = false }) {
    const unzipped = await _unzip(zipPath);
    if (deleteZip) rmdir(zipPath);
    return unzipped.memory();
}

/**
 * @param {string} zipPath
 * 
 * @return {Promise<ZipExport>}
 */
function _unzip(zipPath) {
    return new Promise((res, rej) => {
        ZipLocal.unzip(zipPath, (err, unzip) => {
            if (!err) res(unzip);
            else rej(err);
        });
    });
}

// ************ ERRORS *********** 

const
    TimeoutError = { name: "TimeoutError", message: "Connection to the server timed out while requesting file." },
    WritingError = { name: "WritingError", message: "Writing on disk error has occurred while downloading." },
    RemoteError = { name: "RemoteError", message: "Error while accessing file remotely for download." },
    StatusCodeError = (statusCode) => ({ name: "StatusCodeError", message: "Failed to establish connection to the server: Code " + statusCode });

// *******************************
module.exports = {
    getHTML,
    getDynamicHTML,
    get,
    wait,
    download,
    removeExtension,
    getUniqueFilename,
    getValidFilepath,
    mkdir,
    rmdir,
    zip,
    unzip,
    unzipMemory,
    listDir
}
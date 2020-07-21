const ArgumentParser = require("argparse").ArgumentParser;
const downloaders = require("./mangadex-downloader");

const parser = new ArgumentParser({
    version: "1.0.0",
    addHelp: true,
    description: "Download manga from mangadex."
});

parser.addArgument(
    ["-i","--id"],
    {
        help: "The id of the manga",
        type: "int",
        required: true,
    }
);

parser.addArgument(
    ["-d","--dir"],
    {
        help: "The directory where the manga chapters will be downloaded.",
        type: "string",
        required: false,
        defaultValue: undefined
    }
);

parser.addArgument(
    ["-vb","--verbose"],
    {
        help: "Feedback from the downloader.",
        type: Boolean,
        action: "storeTrue",
        defaultValue: undefined
    }
);

parser.addArgument(
    ["-a","--autoUpdate"],
    {
        help: "If this option is selected the manga list will be automatically updated.",
        type: Boolean,
        action: "storeTrue"
    }
);

parser.addArgument(
    ["-f","--firstChapter"],
    {
        help: "The first chapter to download.",
        type: "int",
        required: false,
        defaultValue: undefined
    }
);

parser.addArgument(
    ["-l","--lastChapter"],
    {
        help: "The last chapter to download.",
        type: "int",
        required: false,
        defaultValue: undefined
    }
);

parser.addArgument(
    ["-lg","--lang"],
    {
        help: "The language desired for the manga.",
        type: "string",
        required: false,
        defaultValue: undefined
    }
);

parser.addArgument(
    ["-g","--group"],
    {
        help: "The id of the scanlation group desired for the manga chapters.",
        type: "int",
        required: false,
        defaultValue: undefined
    }
)

const args = parser.parseArgs();
const {id,dir,verbose,autoUpdate,firstChapter,lastChapter,lang,group} = args;
let downloaderClass;

/* select the right Downloader class based off verbosity and autoUpdate parameters */
if(verbose) {
    if(autoUpdate) downloaderClass = downloaders.VerboseManualMangadexDownloader;
    else downloaderClass = downloaders.VerboseMangadexDownloader;
}
else {
    if(autoUpdate) downloaderClass = downloaders.ManualMangadexDownloader;
    else downloaderClass = downloaders.MangadexDownloader;
}

const {download} = downloaderClass;
const params = {dir,firstChapter,lastChapter,lang,group};

/* replace null with undefined, default parameters only work with undefined. */
for(let [key,val] of Object.entries(params))
    if(val === null) params[key] = undefined;

download(id,params);
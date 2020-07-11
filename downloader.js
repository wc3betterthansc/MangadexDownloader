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
        required: false
    }
);

parser.addArgument(
    ["-vb","--verbose"],
    {
        help: "Feedback from the downloader.",
        type: Boolean,
        action: "storeTrue"
    }
);

parser.addArgument(
    ["-a","--autoUpdate"],
    {
        help: "If this option is selected the manga will be automatically updated.",
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
    }
);

parser.addArgument(
    ["-l","--lastChapter"],
    {
        help: "The last chapter to download.",
        type: "int",
        required: false,
    }
);

parser.addArgument(
    ["-lg","--lang"],
    {
        help: "The language desired for the manga.",
        type: "string",
        required: false,
    }
);

const args = parser.parseArgs();
const {id,dir,verbose,autoUpdate,firstChapter,lastChapter,lang} = args;
let downloaderClass;

if(verbose) {
    if(autoUpdate) downloaderClass = downloaders.VerboseManualMangadexDownloader;
    else downloaderClass = downloaders.VerboseMangadexDownloader;
}
else {
    if(autoUpdate) downloaderClass = downloaders.ManualMangadexDownloader;
    else downloaderClass = downloaders.MangadexDownloader;
}

const {download} = downloaderClass;
download(id,{dir,firstChapter,lastChapter,lang});
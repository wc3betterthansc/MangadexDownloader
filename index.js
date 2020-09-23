const ArgumentParser = require("argparse").ArgumentParser;
const downloaders = require("./mangadex-downloader");

const parser = new ArgumentParser({
    version: "1.0.0",
    addHelp: true,
    description: "Download manga from mangadex."
});

parser.addArgument(
    ["-i", "--id"], {
        help: "The id of the manga",
        type: "int",
        required: true,
    }
);

parser.addArgument(
    ["-d", "--dir"], {
        help: "The directory where the manga directory will be located.",
        type: "string",
        required: false,
    }
);

parser.addArgument(
    ["-n", "--name"], {
        help: "The name of the directory where the manga chapters will be downloaded.",
        type: "string",
        required: true,
    }
)

parser.addArgument(
    ["-vb", "--verbose"], {
        help: "Feedback from the downloader.",
        type: Boolean,
        action: "storeTrue",
        required: false
    }
);

parser.addArgument(
    ["-a", "--autoUpdate"], {
        help: "If this option is selected the manga list will be automatically updated.",
        type: Boolean,
        action: "storeTrue",
        required: false
    }
);

parser.addArgument(
    ["-f", "--firstChapter"], {
        help: "The first chapter to download.",
        type: "int",
        required: false,
    }
);

parser.addArgument(
    ["-l", "--lastChapter"], {
        help: "The last chapter to download.",
        type: "int",
        required: false,
    }
);

parser.addArgument(
    ["-lg", "--lang"], {
        help: "The language desired for the manga.",
        type: "string",
        required: false,
    }
);

parser.addArgument(
    ["-g", "--groups"], {
        help: "The id of the scanlation groups desired for the manga chapters. Multiple ids must be separated by a comma",
        type: "string",
        required: false,
    }
)

parser.addArgument(
    ["-p", "--prepend"], {
        help: "Prepend the series name to the chapter filename.",
        type: Boolean,
        action: "storeTrue",
        required: false
    }
)

const args = parser.parseArgs();
const { id, dir, name, verbose, autoUpdate, firstChapter, lastChapter, lang, prepend } = args;
let { groups } = args;
let downloaderClass;

/* select the right Downloader class based off verbosity and autoUpdate parameters */
if (verbose) {
    if (autoUpdate) downloaderClass = downloaders.VerboseManualMangadexDownloader;
    else downloaderClass = downloaders.VerboseMangadexDownloader;
} else {
    if (autoUpdate) downloaderClass = downloaders.ManualMangadexDownloader;
    else downloaderClass = downloaders.MangadexDownloader;
}

/* convert the groups string to array */
if (groups) groups = groups.replace(/ /g, '').split(",");

const { download } = downloaderClass;
const params = { dir, name, firstChapter, lastChapter, lang, groups, prependSeriesName: prepend };

/* replace null with undefined, default parameters only work with undefined. */
for (let [key, val] of Object.entries(params))
    if (val === null) params[key] = undefined;

download(id, params);
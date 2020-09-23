# index.js (CLI downloader)
**usage:**

**Set a default manga directory:**
1) rename .env.usage to .env
2) replace {DEFAULT MANGA DIRECTORY HERE} with the directory of all your manga
3) save

```bash
#list of commands.
node index.js -h
```
```bash
#example: 

#(--id 5 -f 50 -l 200) download chapters 50 to 200 of the manga with the id "5" (Naruto) 
#(-d "./manga" -n "Naruto") in the ./manga/Naruto directory
#(-vb) verbose output.
node index.js --id 5 -d "./manga" -n "Naruto" -f 50 -l 200 -vb
```
```bash
#(-i 5 --name "Naruto") download all chapters of Naruto in the default manga directory 
#(-p) prepend the name of the series to the chapters filename (Naruto - 001.zip for chapter 1)
#(-vb) verbose output.
node index.js -i 5 --name "Naruto" -vb -p
```
```bash
#(--id 5 -n "Naruto") download all chapters of Naruto in the default manga directory 
#(-a) automatically update the mangalist after you download, 
#this is useful if you plan to use the Scheduler to automatically download chapters whenever newer ones are available.
node index.js --id 5 -a -n "Naruto"
```
```bash
#(--id 5 -n "Naruto") download all chapters of Naruto in the default manga directory
#(-g "1,2,3") only accept chapters from the scanlation groups with the id 1 or 2 or 3
node index.js --id 5 -n "Naruto" -g "1,2,3"
```


# mangadex-downloader.js (JavaScript classes downloader)
**usage:**
```javascript
//Download all available chapters of the manga with the id "5" (Naruto) in the directory "C:\Manga\Naruto".
//with console feedback.
const Downloader = require("./mangadex-downloader").VerboseMangadexDownloader;
const downloader = new Downloader(5,{
    dir: "C:\\Manga",
    name: "Naruto"
});
downloader.download();
```

**If you don't care about feedback from the program, you can use MangadexDownloader instead of VerboseMangadexDownloader:**

```javascript
//Download all available chapters of the manga with the id "5" (Naruto) in the directory "C:\Manga\Naruto". 
//No console feedback.
const Downloader = require("./mangadex-downloader").MangadexDownloader;
const downloader = new Downloader(5,{
    dir: "C:\\Manga",
    name: "Naruto"
});
downloader.download();
```

**The parameters accepted by the second argument of the MangadexDownloader constructor and all of its subclasses:**

```javascript
{ 
  //the manga download location.
  dir: "C:\\Manga\\",
  //the name of the manga directory.
  name: "Naruto",
  //the only accepted scanlation group. undefined or [] means no restriction of groups. 
  //This accepts a number, a numerical string, or array of numbers or numerical strings. Default = [].
  groups: [1,"2",3],
  //The lower limit for downloading available chapters. Default = 0.
  firstChapter: 10,
  //The higher limit for downloading available chapters. Default = Infinity.
  lastChapter: 55,
  //A list of {firstChapter,lastChapter} objects. it overrides "firstChapter" and "lastChapter". 
  //Useful to add gaps in the range.
  range: [ {firstChapter: 0, lastChapter: 25}, {firstChapter: 50, lastChapter: 100} ],
  //Select the language of the chapters. Default = "gb" (english).
  lang: "gb",
  //Allow the download of chapters that don't have a specific number. Default = true.
  noNumberAllowed: true,
  //Prepend the series name to the chapters filename. Default = false.
  prependSeriesName: true,
}
```

**You can use the static version of the download method:**

```javascript
const Downloader = require("./mangadex-downloader").VerboseMangadexDownloader;
Downloader.download(5,{
    dir: "C:\\Manga",
    name: "Naruto"
});
```

**If you want to use a Scheduler to automatically download newly available chapters:**
1) rename .env.usage to .env
2) login to your mangadex account, go to any manga then find the RSS icon (usually on the top right). 
Copy the link, it should look like this: https://mangadex.org/rss/{RSS_KEY}/manga_id/5. 
Inside .env replace {INSERT KEY HERE} with the RSS_KEY (don't use curly braces)
4) save

**How to start the scheduler:**

```javascript
const Scheduler = require("./scheduler");

// the time uses a cron time syntaxe, 
// in this example it will check for new chapter every 2 hours at 0 minute. (00:00, 02:00, 04:00, 06:00,etc)
//more info: https://en.wikipedia.org/wiki/Cron
const time = "0 */2 * * *";
new Scheduler({time}).start();
```

**The parameters accepted by the first argument of Scheduler constructor:**

```javascript
{ 
  //The time used by the scheduler to check for new chapters. Uses the cron time syntaxe. Default = "0 */2 * * *".
  time: "0 */2 * * *",
  //If you want feedback from the downloader. Default = false.
  downloaderVerbose: true,
  //If you want feedback from the rss parser. Default = false.
  rssVerbose: true
}
```

**Use the Manual downloader classes if you want to update the JSON manga list that is used by the Scheduler. 
Just like the stand-alone version of the downloaders classes, the manual downloaders
come with a verbose and non-verbose class:**

```javascript
//Download all available chapters of the manga with the id "5" (Naruto) in the directory "C:\Manga\Naruto".
//with console feedback. Update the anime list after finishing the download.
const VerboseDownloader = require("./mangadex-downloader").VerboseManualMangadexDownloader;
const downloader = new VerboseDownloader(5,{
    dir: "C:\\Manga",
    name: "Naruto"
});
downloader.download();

//Download all available chapters of the manga with the id "5" (Naruto) in the directory "C:\Manga\Naruto".
//no console feedback. Update the anime list after finishing the download.
const SilentDownloader = require("./mangadex-downloader").ManualMangadexDownloader;
const downloader = new SilentDownloader(5,{
    dir: "C:\\Manga",
    name: "Naruto"
});
downloader.download();
```

**The manual downloader classes also have a static version of the download method:**
```javascript

//Download all available chapters of the manga with the id "5" (Naruto) in the directory "C:\Manga\Naruto".
//with console feedback. Update the anime list after finishing the download.
const VerboseDownloader = require("./mangadex-downloader").VerboseManualMangadexDownloader;
VerboseDownloader.download(5,{
    dir: "C:\\Manga",
    name: "Naruto"
});

//Download all available chapters of the manga with the id "5" (Naruto) in the directory "C:\Manga\Naruto".
//no console feedback. Update the anime list after finishing the download.
const SilentDownloader = require("./mangadex-downloader").ManualMangadexDownloader;
SilentDownloader.download(5,{
    dir: "C:\\Manga",
    name: "Naruto"
});
```

**The Format of the JSON file used by the Scheduler and the manual downloader classes. 
The key is the id of the manga.
The value is an object containing the name of the manga, the directory where the manga is located, the last chapter downloaded and the language.:**
```json
{
  "5":{
    "name":"Naruto",
    "lastChapter":519,
    "lang":"gb",
    "dir":"C:\\Manga",
  },
  "39":{
    "name":"One Piece",
    "lastChapter":983,
    "lang":"gb",
    "dir":"C:\\Manga",
  }
}
```


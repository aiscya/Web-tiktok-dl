const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

let downloads = [];
let downloadCount = 0;

if (fs.existsSync("database.json")) {
  const data = JSON.parse(fs.readFileSync("database.json"));
  downloads = data.downloads || [];
  downloadCount = data.downloadCount || 0;
}

const getTimeElapsed = (timestamp) => {
  const elapsed = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day(s) ago`;
  if (hours > 0) return `${hours} hour(s) ago`;
  if (minutes > 0) return `${minutes} minute(s) ago`;
  return `${seconds} second(s) ago`;
};

app.get("/", (req, res) => {
  res.render("index", {
    downloads: downloads,
    downloadCount: downloadCount,
    result: null,
    getTimeElapsed: getTimeElapsed,
  });
});

app.post("/process", async (req, res) => {
  const url = req.body.url;
  try {
    const response = await axios.get(
      `https://api.alyachan.dev/api/tiktok?url=${url}&apikey=cyaishy`
    );
    console.log("API response:", response.data);
    const data = response.data;

    if (data && data.data) {
      const nowatermarkItem = data.data.find(
        (item) => item.type === "nowatermark"
      );
      const nowatermarkUrl = nowatermarkItem ? nowatermarkItem.url : null;
      const audio =
        data.music_info && data.music_info.url ? data.music_info.url : null;

      const newDownload = {
        url: url,
        title: data.title,
        size: data.size_nowm,
        duration: data.duration,
        video: nowatermarkUrl,
        audio: audio,
        timestamp: new Date(),
        downloads: 1,
      };

      const existingDownload = downloads.find((d) => d.url === url);
      if (existingDownload) {
        existingDownload.downloads++;
        existingDownload.timestamp = new Date();
      } else {
        downloads.push(newDownload);
      }

      downloadCount++;

      fs.writeFileSync(
        "database.json",
        JSON.stringify(
          { downloads: downloads, downloadCount: downloadCount },
          null,
          2
        )
      );

      res.render("index", {
        downloads: downloads,
        downloadCount: downloadCount,
        result: newDownload,
        getTimeElapsed: getTimeElapsed,
      });
    } else {
      console.error("Unexpected API response format:", data);
      res.send("Failed to process the video. Invalid API response format.");
    }
  } catch (error) {
    console.error("Error processing video:", error);
    res.send("Failed to process the video.");
  }
});

app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});

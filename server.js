const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Tạo thư mục temp nếu chưa tồn tại
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Route cho trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post("/download", (req, res) => {
    const { url, format } = req.body;
    if (!url) {
        return res.status(400).json({ error: "Video URL required" });
    }

    const ytDlpPath = path.join(__dirname, "yt-dlp.exe");
    let args;
    
    if (format === 'mp3') {
        args = [
            '-x',
            '--audio-format', 'mp3',
            '-o', `${tempDir}/%(title)s.%(ext)s`,
            url
        ];
    } else {
        args = [
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '-o', `${tempDir}/%(title)s.%(ext)s`,
            url
        ];
    }

    const ytDlp = spawn(ytDlpPath, args);
    let fileName = '';

    ytDlp.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);

        // Tìm tên file từ output
        const fileMatch = output.match(/Destination: (.+)/);
        if (fileMatch) {
            fileName = fileMatch[1];
        }
    });

    ytDlp.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: "Download failed" });
        }

        if (fileName) {
            const filePath = path.join(tempDir, path.basename(fileName));
            if (fs.existsSync(filePath)) {
                res.download(filePath, (err) => {
                    if (err) {
                        console.error("Error sending file:", err);
                    }
                    // Xóa file sau khi gửi xong
                    fs.unlink(filePath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error("Error deleting file:", unlinkErr);
                        }
                    });
                });
            } else {
                res.status(500).json({ error: "File not found after download" });
            }
        } else {
            res.status(500).json({ error: "Could not determine downloaded file name" });
        }
    });
});

app.listen(3000, () => {
    console.log("🚀 Server running at http://localhost:3000");
});

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

// Hàm xóa file cũ trong thư mục temp
function clearTempDirectory() {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
    }
}

// Hàm kiểm tra URL YouTube hợp lệ
function isValidYoutubeUrl(url) {
    try {
        const urlObj = new URL(url);
        // Kiểm tra domain
        if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
            return false;
        }
        // Kiểm tra định dạng URL YouTube
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        return youtubeRegex.test(url);
    } catch (error) {
        return false;
    }
}

// Route cho trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post("/download", (req, res) => {
    const { url, format } = req.body;

    // Kiểm tra URL có được cung cấp không
    if (!url) {
        return res.status(400).json({ 
            error: "Vui lòng nhập URL video YouTube",
            code: "MISSING_URL"
        });
    }

    // Kiểm tra URL có hợp lệ không
    if (!isValidYoutubeUrl(url)) {
        return res.status(400).json({ 
            error: "URL không hợp lệ. Vui lòng nhập URL YouTube hợp lệ",
            code: "INVALID_URL"
        });
    }

    // Xóa các file cũ trong thư mục temp
    clearTempDirectory();

    const ytDlpPath = path.join(__dirname, "yt-dlp.exe");
    let args;
    
    if (format === 'mp3') {
        args = [
            '-x',
            '--audio-format', 'mp3',
            '--restrict-filenames',
            '--no-warnings',
            '--force-overwrites',
            '-o', `${tempDir}/%(title)s.%(ext)s`,
            url
        ];
    } else {
        args = [
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--restrict-filenames',
            '--no-warnings',
            '--force-overwrites',
            '-o', `${tempDir}/%(title)s.%(ext)s`,
            url
        ];
    }

    const ytDlp = spawn(ytDlpPath, args);
    let fileName = '';
    let errorOutput = '';
    let mergedFileName = '';
    let isPrivateVideo = false;
    let isAgeRestricted = false;

    ytDlp.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);

        // Kiểm tra các trường hợp lỗi phổ biến
        if (output.includes('Private video')) {
            isPrivateVideo = true;
        }
        if (output.includes('Sign in to confirm your age')) {
            isAgeRestricted = true;
        }

        // Tìm tên file từ output
        const fileMatch = output.match(/Destination: (.+)/);
        if (fileMatch) {
            fileName = fileMatch[1];
        }

        // Tìm tên file đã merge
        const mergeMatch = output.match(/Merging formats into "(.+)"/);
        if (mergeMatch) {
            mergedFileName = mergeMatch[1];
        }

        // Kiểm tra nếu file đã tồn tại
        const existingMatch = output.match(/has already been downloaded/);
        if (existingMatch && fileName) {
            mergedFileName = fileName;
        }
    });

    ytDlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`stderr: ${data}`);
    });

    ytDlp.on('close', (code) => {
        // Xử lý các trường hợp lỗi đặc biệt
        if (isPrivateVideo) {
            return res.status(400).json({ 
                error: "Video này là video riêng tư. Không thể tải xuống.",
                code: "PRIVATE_VIDEO"
            });
        }

        if (isAgeRestricted) {
            return res.status(400).json({ 
                error: "Video này có giới hạn độ tuổi. Không thể tải xuống.",
                code: "AGE_RESTRICTED"
            });
        }

        if (code !== 0) {
            console.error('Download failed with error:', errorOutput);
            
            // Xử lý các lỗi phổ biến
            if (errorOutput.includes('Video unavailable')) {
                return res.status(400).json({ 
                    error: "Video không khả dụng hoặc đã bị xóa",
                    code: "VIDEO_UNAVAILABLE"
                });
            }
            
            if (errorOutput.includes('This video is unavailable')) {
                return res.status(400).json({ 
                    error: "Video không khả dụng trong khu vực của bạn",
                    code: "REGION_RESTRICTED"
                });
            }

            return res.status(500).json({ 
                error: "Lỗi khi tải video: " + errorOutput,
                code: "DOWNLOAD_ERROR"
            });
        }

        // Ưu tiên sử dụng tên file đã merge
        const finalFileName = mergedFileName || fileName;
        
        if (finalFileName) {
            const filePath = path.join(tempDir, path.basename(finalFileName));
            console.log('Looking for file at:', filePath);
            
            if (fs.existsSync(filePath)) {
                res.download(filePath, (err) => {
                    if (err) {
                        console.error("Error sending file:", err);
                        res.status(500).json({ 
                            error: "Lỗi khi gửi file: " + err.message,
                            code: "SEND_ERROR"
                        });
                    }
                    // Xóa file sau khi gửi xong
                    fs.unlink(filePath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error("Error deleting file:", unlinkErr);
                        }
                    });
                });
            } else {
                console.error('File not found at path:', filePath);
                // Liệt kê các file trong thư mục temp để debug
                const files = fs.readdirSync(tempDir);
                console.log('Files in temp directory:', files);
                res.status(500).json({ 
                    error: "Không tìm thấy file sau khi tải. Vui lòng thử lại.",
                    code: "FILE_NOT_FOUND"
                });
            }
        } else {
            console.error('Could not determine downloaded file name');
            res.status(500).json({ 
                error: "Không thể xác định tên file đã tải",
                code: "UNKNOWN_FILENAME"
            });
        }
    });
});

app.listen(3000, () => {
    console.log("🚀 Server running at http://localhost:3000");
});

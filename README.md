# YouTube Downloader

Ứng dụng web đơn giản cho phép tải video YouTube ở định dạng MP4 hoặc trích xuất âm thanh ở định dạng MP3.

## Tính năng

- Tải video YouTube ở định dạng MP4
- Trích xuất âm thanh từ video YouTube ở định dạng MP3
- Giao diện web đơn giản và trực quan

## Yêu cầu hệ thống

- Node.js (phiên bản 14 trở lên)
- File thực thi yt-dlp (đã được bao gồm trong dự án)

## Cài đặt

1. Sao chép repository:
```bash
git clone <đường-dẫn-repository>
cd youtube-downloader
```

2. Cài đặt các gói phụ thuộc:
```bash
npm install
```

## Cách sử dụng

1. Khởi động server:
```bash
node server.js
```

2. Mở trình duyệt web và truy cập:
```
http://localhost:3000
```

3. Nhập URL video YouTube và chọn định dạng mong muốn (MP4 hoặc MP3)
4. Nhấn tải xuống và đợi file được xử lý

## Cấu trúc dự án

```
youtube-downloader/
├── public/          # Thư mục chứa file tĩnh và giao diện người dùng
├── temp/           # Thư mục lưu trữ tạm thời cho các file tải xuống
├── server.js       # File server chính
├── yt-dlp.exe      # File thực thi tải video YouTube
└── package.json    # File quản lý các gói phụ thuộc
```

## Các gói phụ thuộc

- express: Framework web server
- cors: Middleware cho phép chia sẻ tài nguyên giữa các nguồn khác nhau
- yt-dlp: Công cụ tải video YouTube

## Giấy phép

ISC

## Lưu ý

Dự án này sử dụng yt-dlp để tải video YouTube. Hãy đảm bảo tuân thủ điều khoản dịch vụ của YouTube khi sử dụng ứng dụng này. 
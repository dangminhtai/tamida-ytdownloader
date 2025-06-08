document.addEventListener('DOMContentLoaded', () => {
    const videoUrlInput = document.getElementById('videoUrl');
    const downloadBtn = document.getElementById('downloadBtn');
    const formatSelect = document.getElementById('format');
    const statusDiv = document.getElementById('status');
    const progressContainer = document.getElementById('progress');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');

    downloadBtn.addEventListener('click', async () => {
        const videoUrl = videoUrlInput.value.trim();
        const format = formatSelect.value;

        if (!videoUrl) {
            statusDiv.textContent = 'Vui lòng nhập URL video';
            statusDiv.style.color = 'red';
            return;
        }

        try {
            downloadBtn.disabled = true;
            statusDiv.textContent = 'Đang tải xuống...';
            statusDiv.style.color = '#667eea';
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
            progressText.textContent = '0%';

            const response = await fetch('/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: videoUrl, format }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Lỗi khi tải video');
            }

            // Tải xuống file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Hiển thị thành công
            progressBar.style.width = '100%';
            progressText.textContent = '100%';
            statusDiv.textContent = 'Tải xuống thành công!';
            statusDiv.style.color = 'green';
        } catch (error) {
            statusDiv.textContent = error.message;
            statusDiv.style.color = 'red';
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
        } finally {
            downloadBtn.disabled = false;
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressBar.style.width = '0%';
                progressText.textContent = '0%';
            }, 2000);
        }
    });
}); 
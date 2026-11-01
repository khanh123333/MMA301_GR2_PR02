export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.name === 'MulterError') {
    const error = err.code === 'LIMIT_FILE_SIZE' ? 'File vượt quá dung lượng cho phép' : 'File tải lên không hợp lệ';
    return res.status(400).json({ error });
  }
  if (err.code === 11000) return res.status(409).json({ error: 'Dữ liệu đã tồn tại' });
  // Client errors raised by Express itself: malformed JSON, missing file in sendFile
  if (err.status === 404) return res.status(404).json({ error: 'Không tìm thấy' });
  if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: 'Yêu cầu không hợp lệ' });

  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
}

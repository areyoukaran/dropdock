const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 15_000;

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function handleResponse(res) {
  if (!res.ok) {
    let detail = "Something went wrong";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // no json body
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch {
    throw new ApiError('The server returned an invalid response.', res.status);
  }
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return await handleResponse(res);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', 408);
    }
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function createTextDrop({ textContent, textLanguage, expiryMode, timeExpiry, maxDownloads, password }) {
  return request(`${API_BASE}/api/drops/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text_content: textContent,
      text_language: textLanguage || null,
      expiry_mode: expiryMode,
      time_expiry: timeExpiry || null,
      max_downloads: maxDownloads || null,
      password: password || null,
    }),
  });
}

export async function createFileDrop({ files, expiryMode, timeExpiry, maxDownloads, password }, onProgress) {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  formData.append("expiry_mode", expiryMode);
  if (timeExpiry) formData.append("time_expiry", timeExpiry);
  if (maxDownloads) formData.append("max_downloads", maxDownloads);
  if (password) formData.append("password", password);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/drops/files`);
    xhr.timeout = REQUEST_TIMEOUT_MS;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let body;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (xhr.responseText && Object.keys(body).length === 0) {
          reject(new ApiError('The server returned an invalid response.', xhr.status));
        } else {
          resolve(body);
        }
      } else {
        reject(new ApiError(body.detail || "Upload failed", xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Network error during upload", 0));
    xhr.onabort = () => reject(new ApiError('Upload was cancelled.', 0));
    xhr.ontimeout = () => reject(new ApiError('The upload timed out. Please try again.', 408));
    xhr.send(formData);
  });
}

export async function getDropMeta(slug) {
  return request(`${API_BASE}/api/drops/${encodeURIComponent(slug)}/meta`);
}

export async function unlockTextDrop(slug, password) {
  return request(`${API_BASE}/api/drops/${encodeURIComponent(slug)}/unlock/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(password ? { password } : {}),
  });
}

export async function getDownloadUrl(slug, fileId, password) {
  return request(`${API_BASE}/api/drops/${encodeURIComponent(slug)}/download/${encodeURIComponent(fileId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(password ? { password } : {}),
  });
}

export async function getHealth() {
  return request(`${API_BASE}/health`);
}

export { ApiError };

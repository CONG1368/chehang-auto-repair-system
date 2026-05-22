import request from './request';

export function uploadBatch(files: File[], module: string) {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  return request.post('/upload/batch', formData, {
    params: { module },
  });
}

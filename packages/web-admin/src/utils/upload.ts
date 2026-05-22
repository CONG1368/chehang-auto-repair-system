import request from '@/api/request'

/**
 * 批量上传文件到指定模块
 * @param files 要上传的文件数组
 * @param module 模块名，决定存储子目录
 * @returns 上传后的 URL 数组
 */
export async function uploadFiles(files: File[], module: string = 'common'): Promise<string[]> {
  if (!files || files.length === 0) return []

  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  const res = await request.post('/upload/batch', formData, {
    params: { module },
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return (res as any).urls ?? []
}

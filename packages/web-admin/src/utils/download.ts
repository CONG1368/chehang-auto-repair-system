import { useAuthStore } from '@/stores/auth'

export async function downloadFile(url: string, filename?: string) {
  const authStore = useAuthStore()
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${authStore.token}` },
  })
  if (!res.ok) throw new Error('下载失败')
  const blob = await res.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  if (filename) link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const fieldLabels = {
  chapters: 'chương',
  title: 'tiêu đề',
  contentText: 'nội dung',
  pageStart: 'trang bắt đầu',
  pageEnd: 'trang kết thúc',
  fileName: 'tên file',
  fileContentBase64: 'nội dung file',
  topicId: 'chủ đề',
  topicName: 'chủ đề mới',
  name: 'tên',
}

function formatErrorLocation(loc) {
  if (!Array.isArray(loc) || !loc.length) return ''

  const parts = []

  loc.forEach((part, index) => {
    if (part === 'body' || part === 'query' || part === 'path') return
    if (part === 'chapters' && typeof loc[index + 1] === 'number') return

    if (typeof part === 'number') {
      if (loc[index - 1] === 'chapters') {
        parts.push(`chương ${part + 1}`)
        return
      }
      parts.push(`mục ${part + 1}`)
      return
    }

    parts.push(fieldLabels[part] || String(part))
  })

  return parts.join(' · ')
}

function flattenErrorDetail(detail) {
  if (detail == null || detail === '') return []
  if (typeof detail === 'string') return [detail]

  if (Array.isArray(detail)) {
    return detail.flatMap((item) => {
      if (typeof item === 'string') return [item]
      if (item && typeof item === 'object') {
        const message = typeof item.msg === 'string' ? item.msg : ''
        const location = formatErrorLocation(item.loc)

        if (message) {
          return [location ? `${location}: ${message}` : message]
        }

        return flattenErrorDetail(item.detail ?? item.message ?? item.error)
      }

      return []
    })
  }

  if (typeof detail === 'object') {
    const nested = flattenErrorDetail(detail.detail ?? detail.message ?? detail.error)
    if (nested.length) return nested

    try {
      return [JSON.stringify(detail)]
    } catch {
      return ['Đã xảy ra lỗi không xác định.']
    }
  }

  return [String(detail)]
}

export function getErrorMessage(error, fallback = 'Đã xảy ra lỗi.') {
  const messages = flattenErrorDetail(
    error?.response?.data?.detail ?? error?.response?.data ?? error?.message
  ).filter(Boolean)

  return messages.length ? messages.join('\n') : fallback
}

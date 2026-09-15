// 消息的已读状态 —— 手机版「消息」页的未读红点与标签栏角标（2026-09-15）。
//
// 公告没有 Id，用「时间 + 标题」当键；存在 WebView 的 localStorage 里，只留最近 300 条。
// 存不下（隐私模式、存储被清）只是下次又显示成未读，不影响别的，所以读写都吞掉异常。

import { ref } from 'vue'
import type { NoticeInfo } from '../api'

const KEY = 'wpc.readNotices'

function load(): Set<string> {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]')
    return new Set(Array.isArray(arr) ? arr.map(String) : [])
  } catch {
    return new Set()
  }
}

export const readKeys = ref<Set<string>>(load())

export function noticeKey(n: NoticeInfo): string {
  return `${n.noticeTime}|${n.noticeTitle}`
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...readKeys.value].slice(-300)))
  } catch {
    /* 存不下只是下次又显示未读 */
  }
}

export function isRead(n: NoticeInfo): boolean {
  return readKeys.value.has(noticeKey(n))
}

export function markRead(n: NoticeInfo): void {
  if (isRead(n)) return
  const next = new Set(readKeys.value)
  next.add(noticeKey(n))
  readKeys.value = next
  save()
}

export function markAllRead(list: NoticeInfo[]): void {
  const next = new Set(readKeys.value)
  list.forEach((n) => next.add(noticeKey(n)))
  readKeys.value = next
  save()
}

export function unreadCount(list: NoticeInfo[]): number {
  return list.filter((n) => !isRead(n)).length
}

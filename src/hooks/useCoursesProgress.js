import { useEffect, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import api from '../api/axios'
import { getCompletedIdsSet, flattenSubjectContents } from '../utils/progress'

/**
 * Computes progress for one or more courses entirely on the client:
 *   - subject structure (which contents exist) is fetched once per subject
 *     and cached by React Query (and persisted to localStorage across
 *     reloads — see main.jsx), so repeat visits are instant.
 *   - which of those contents are "done" comes from local completion
 *     state (utils/progress.js), never from a backend progress endpoint.
 *
 * This also fixes the old sequential `for (const purchase of purchases) await ...`
 * loop (MyCourses / Progress pages), which fetched one course at a time —
 * useQueries below fires all requests in parallel.
 *
 * @param {string[]|string} courseIds
 * @returns {{
 *   subjectProgress: Record<string, {completed:number,total:number,name:string,courseId:string}>,
 *   courseProgress: Record<string, {completed:number,total:number}>,
 *   overall: {completed:number,total:number},
 *   isLoading: boolean
 * }}
 */
export function useCoursesProgress(courseIds) {
  const ids = (Array.isArray(courseIds) ? courseIds : [courseIds]).filter(Boolean)

  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const onChange = () => forceUpdate((n) => n + 1)
    window.addEventListener('ar-completion-changed', onChange)
    return () => window.removeEventListener('ar-completion-changed', onChange)
  }, [])

  const subjectListQueries = useQueries({
    queries: ids.map((courseId) => ({
      queryKey: ['course-subjects', courseId],
      queryFn: () => api.get(`/courses/${courseId}/subjects`).then((r) => r.data),
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
    })),
  })

  const subjectRefs = []
  ids.forEach((courseId, i) => {
    const subjects = subjectListQueries[i]?.data?.subjects || []
    subjects.forEach((s) => subjectRefs.push({ subjectId: s.id, courseId, name: s.name }))
  })

  const detailQueries = useQueries({
    queries: subjectRefs.map((ref) => ({
      queryKey: ['subject-detail', ref.subjectId],
      queryFn: () => api.get(`/subjects/${ref.subjectId}`).then((r) => r.data),
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
    })),
  })

  const completedIds = getCompletedIdsSet()

  const subjectProgress = {}
  const courseProgress = {}
  let overallCompleted = 0
  let overallTotal = 0

  subjectRefs.forEach((ref, i) => {
    const subjectDetail = detailQueries[i]?.data?.subject
    const contents = flattenSubjectContents(subjectDetail)
    const total = contents.length
    const completed = contents.filter((c) => completedIds.has(c.id)).length

    subjectProgress[ref.subjectId] = { completed, total, name: ref.name, courseId: ref.courseId }

    if (!courseProgress[ref.courseId]) courseProgress[ref.courseId] = { completed: 0, total: 0 }
    courseProgress[ref.courseId].completed += completed
    courseProgress[ref.courseId].total += total

    overallCompleted += completed
    overallTotal += total
  })

  const listsLoading = subjectListQueries.some((q) => q.isLoading)
  const detailsLoading = subjectRefs.length > 0 && detailQueries.some((q) => q.isLoading)

  return {
    subjectProgress,
    courseProgress,
    overall: { completed: overallCompleted, total: overallTotal },
    isLoading: listsLoading || detailsLoading,
  }
}

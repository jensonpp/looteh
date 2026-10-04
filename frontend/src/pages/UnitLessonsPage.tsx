import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type LessonSummary } from '../api/client'

const STALE_DAYS = 7

function isStale(lesson: LessonSummary): boolean {
  if (lesson.status !== 'completed' || !lesson.lastCompletedAt) return false
  const completed = new Date(lesson.lastCompletedAt).getTime()
  return Date.now() - completed > STALE_DAYS * 24 * 60 * 60 * 1000
}

export default function UnitLessonsPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null)

  useEffect(() => {
    if (!unitId) return
    api.unitLessons(unitId).then(({ lessons }) => setLessons(lessons))
  }, [unitId])

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col px-6 py-12 text-left">
      <Link to="/" className="text-sm text-slate-500 hover:underline">
        ← Back to units
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Lessons</h1>
      <ul className="mt-6 flex flex-col gap-3">
        {lessons?.map((lesson) => (
          <li key={lesson.id}>
            <Link
              to={`/lessons/${lesson.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-300 px-4 py-3 hover:border-slate-900"
            >
              <span>{lesson.status === 'completed' ? '✅' : '📝'} {lesson.title}</span>
              <span className="flex items-center gap-2">
                {isStale(lesson) && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    🎯 Practice
                  </span>
                )}
                {lesson.status === 'completed' && (
                  <span className="text-xs text-slate-500">Best: {lesson.bestScore}%</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

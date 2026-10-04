import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type LessonSummary } from '../api/client'

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
              {lesson.status === 'completed' && (
                <span className="text-xs text-slate-500">Best: {lesson.bestScore}%</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

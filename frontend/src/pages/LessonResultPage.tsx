import { Link, useLocation, useParams } from 'react-router-dom'

type ResultState = { score: number; bonusXpAwarded: number; streakCount: number }

export default function LessonResultPage() {
  const location = useLocation()
  const { lessonId } = useParams<{ lessonId: string }>()
  const result = location.state as ResultState | null

  if (!result) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-slate-500">No result data — did you land here directly?</p>
        <Link to="/" className="mt-4 underline">
          Back to units
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">Lesson complete! 🎉</h1>
      <p className="mt-4 text-lg text-slate-700">Score: {result.score}%</p>
      <p className="mt-1 text-slate-500">
        +{result.bonusXpAwarded} bonus XP &nbsp;·&nbsp; 🔥 Streak: {result.streakCount}
      </p>
      <div className="mt-8 flex gap-3">
        <Link to="/" className="rounded-md bg-slate-900 px-4 py-2 text-white">
          Back to units
        </Link>
        {lessonId && (
          <Link to={`/lessons/${lessonId}`} className="rounded-md border border-slate-300 px-4 py-2">
            Retry lesson
          </Link>
        )}
      </div>
    </div>
  )
}

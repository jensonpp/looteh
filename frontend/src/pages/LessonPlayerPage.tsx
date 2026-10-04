import { useEffect, useReducer, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type LessonDetail } from '../api/client'
import { track } from '../lib/analytics'
import ConceptCard from '../components/ConceptCard'

type PlayerState = {
  phase: 'concept' | 'quiz'
  questionIndex: number
  selectedOptionId: string | null
  feedback: 'correct' | 'incorrect' | null
  correctCount: number
}

type Action =
  | { type: 'advance_to_quiz' }
  | { type: 'select_option'; optionId: string }
  | { type: 'answer_result'; correct: boolean }
  | { type: 'next_question' }

function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case 'advance_to_quiz':
      return { ...state, phase: 'quiz' }
    case 'select_option':
      return { ...state, selectedOptionId: action.optionId }
    case 'answer_result':
      return {
        ...state,
        feedback: action.correct ? 'correct' : 'incorrect',
        correctCount: state.correctCount + (action.correct ? 1 : 0),
      }
    case 'next_question':
      return { ...state, questionIndex: state.questionIndex + 1, selectedOptionId: null, feedback: null }
    default:
      return state
  }
}

const initialState: PlayerState = {
  phase: 'concept',
  questionIndex: 0,
  selectedOptionId: null,
  feedback: null,
  correctCount: 0,
}

export default function LessonPlayerPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [state, dispatch] = useReducer(reducer, initialState)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!lessonId) return
    api.lesson(lessonId).then(({ lesson }) => setLesson(lesson))
    api.startLesson(lessonId).catch(() => {})
    track('lesson_started', { lessonId })
  }, [lessonId])

  if (!lesson) {
    return <div className="mx-auto flex max-w-2xl flex-1 items-center justify-center px-6">Loading…</div>
  }

  if (state.phase === 'concept') {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-6 py-12">
        <ConceptCard markdown={lesson.conceptMarkdown} />
        <button
          onClick={() => dispatch({ type: 'advance_to_quiz' })}
          className="mt-8 self-start rounded-md bg-slate-900 px-4 py-2 text-white"
        >
          Start quiz
        </button>
      </div>
    )
  }

  const question = lesson.questions[state.questionIndex]
  const isLastQuestion = state.questionIndex === lesson.questions.length - 1

  async function handleSubmit() {
    if (!state.selectedOptionId || !question) return
    setSubmitting(true)
    try {
      const { correct } = await api.answerQuestion(question.id, state.selectedOptionId)
      dispatch({ type: 'answer_result', correct })
      track('question_answered', { questionId: question.id, correct })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleNext() {
    if (isLastQuestion && lessonId && lesson) {
      const totalQuestions = lesson.questions.length
      const result = await api.completeLesson(lessonId, state.correctCount, totalQuestions)
      track('lesson_completed', { lessonId, score: result.score })
      navigate(`/lessons/${lessonId}/result`, { state: result })
    } else {
      dispatch({ type: 'next_question' })
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-6 py-12 text-left">
      <p className="text-sm text-slate-500">
        Question {state.questionIndex + 1} of {lesson.questions.length}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">{question.prompt}</h2>

      <div className="mt-6 flex flex-col gap-3">
        {question.options.map((option) => {
          const selected = state.selectedOptionId === option.id
          return (
            <button
              key={option.id}
              disabled={state.feedback !== null}
              onClick={() => dispatch({ type: 'select_option', optionId: option.id })}
              className={`rounded-md border px-4 py-3 text-left ${
                selected ? 'border-slate-900 bg-slate-50' : 'border-slate-300'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {state.feedback && (
        <p className={`mt-4 font-medium ${state.feedback === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
          {state.feedback === 'correct' ? '✅ Correct! +10 XP' : '❌ Not quite.'}
        </p>
      )}

      <div className="mt-8">
        {state.feedback === null ? (
          <button
            onClick={handleSubmit}
            disabled={!state.selectedOptionId || submitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            Submit
          </button>
        ) : (
          <button onClick={handleNext} className="rounded-md bg-slate-900 px-4 py-2 text-white">
            {isLastQuestion ? 'Finish lesson' : 'Next question'}
          </button>
        )}
      </div>
    </div>
  )
}

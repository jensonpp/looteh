import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400">
      <p>
        Educational content only — not financial advice. See{' '}
        <Link to="/legal" className="underline hover:text-slate-600">
          Legal & Disclaimer
        </Link>
        .
      </p>
    </footer>
  )
}

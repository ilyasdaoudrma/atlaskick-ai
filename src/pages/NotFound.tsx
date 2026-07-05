import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="relative min-h-[100svh] overflow-hidden px-5 pt-36 pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(242,182,60,0.16),transparent_34%),radial-gradient(circle_at_78%_20%,rgba(226,75,88,0.15),transparent_34%)]" />
      <div className="absolute inset-x-0 top-0 h-px grad-line" />
      <div className="relative mx-auto max-w-5xl">
        <motion.p
          className="kicker"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Lost ball / 404
        </motion.p>
        <motion.h1
          className="display mt-5 max-w-3xl"
          style={{ fontSize: 'var(--text-hero)' }}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          This route is out of play.
        </motion.h1>
        <motion.p
          className="mt-5 max-w-xl text-[0.98rem]"
          style={{ color: 'var(--muted)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.25 }}
        >
          The match board, predictions, Morocco journey, simulator and analyst are still live from the main dashboard.
        </motion.p>
        <Link
          to="/"
          className="display grad-bg mt-9 inline-flex min-h-11 items-center rounded-xl px-7 py-3 text-lg tracking-wide no-underline"
        >
          Return to dashboard
        </Link>
      </div>
    </div>
  )
}

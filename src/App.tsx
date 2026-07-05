import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { LiveDataProvider } from './services/LiveDataContext'
import Assistant from './pages/Assistant'
import Home from './pages/Home'
import MatchCentre from './pages/MatchCentre'
import Morocco from './pages/Morocco'
import NotFound from './pages/NotFound'
import Predict from './pages/Predict'
import Accuracy from './pages/Accuracy'
import Simulator from './pages/Simulator'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function RouteWipes({ pathname }: { pathname: string }) {
  const wipe = ['inset(0 100% 0 0)', 'inset(0 0% 0 0)', 'inset(0 0% 0 100%)']

  return (
    <>
      <motion.div
        key={`${pathname}-wipe-back`}
        className="route-wipe route-wipe--back"
        initial={{ clipPath: wipe[0] }}
        animate={{ clipPath: wipe }}
        transition={{ duration: 0.42, times: [0, 0.46, 1], ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        key={`${pathname}-wipe-front`}
        className="route-wipe route-wipe--front"
        initial={{ clipPath: wipe[0] }}
        animate={{ clipPath: wipe }}
        transition={{ duration: 0.39, delay: 0.04, times: [0, 0.44, 1], ease: [0.16, 1, 0.3, 1] }}
      />
    </>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <LiveDataProvider>
      <div className="grain">
        <ScrollToTop />
        <Nav />
        <RouteWipes pathname={location.pathname} />
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/predict" element={<Predict />} />
              <Route path="/morocco" element={<Morocco />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/accuracy" element={<Accuracy />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/match/:espnId" element={<MatchCentre />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.main>
        </AnimatePresence>
        <Footer />
      </div>
    </LiveDataProvider>
  )
}

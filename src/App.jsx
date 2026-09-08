import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from "./components/Layout"
import PrivateRoute from "./components/PrivateRoute"

// Eager: needed on first paint for the most common entry (login)
import Login from "./pages/Auth/Login"

// Lazy: everything else loads on demand, per-route
const About = lazy(() => import("./pages/About/About"))
const Contact = lazy(() => import("./pages/Contact/Contact"))
const SyncLogin = lazy(() => import("./pages/Auth/SyncLogin"))
const Register = lazy(() => import("./pages/Auth/Signup"))
const SignupDebug = lazy(() => import("./pages/Auth/SignupDebug"))
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword"))
const VerifyOTP = lazy(() => import("./pages/Auth/VerifyOTP"))
const MyCourses = lazy(() => import("./pages/MyCourses/MyCourses"))
const Subjects = lazy(() => import("./pages/Subjects/Subjects"))
const SubjectDetail = lazy(() => import("./pages/Subjects/SubjectDetail"))
const MediaContent = lazy(() => import("./pages/Media/MediaContent"))
const BookReader = lazy(() => import("./pages/Books/BookReader"))
const Profile = lazy(() => import("./pages/Profile/Profile"))
const Store = lazy(() => import("./pages/Store/Store"))
const Notifications = lazy(() => import("./pages/Notifications/Notifications"))
const Quiz = lazy(() => import("./pages/Quiz/QuizList"))
const QuizPlay = lazy(() => import("./pages/Quiz/QuizPlay"))
const QuizResult = lazy(() => import("./pages/Quiz/QuizResult"))
const QuizAnalysis = lazy(() => import("./pages/Quiz/QuizAnalysis"))
const QuizPractice = lazy(() => import("./pages/Quiz/QuizPractice"))
const Progress = lazy(() => import("./pages/Progress/Progress"))
const DoubtChat = lazy(() => import("./pages/DoubtChat/DoubtChat"))
const FreeCourses = lazy(() => import("./pages/FreeCourses/FreeCourses"))
const Books = lazy(() => import("./pages/Books/Books"))
const WatchHistory = lazy(() => import("./pages/WatchHistory/WatchHistory"))
const Maintenance = lazy(() => import("./pages/Maintenance/Maintenance"))
const Home = lazy(() => import("./pages/Home/Home"))

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ fontSize: 14, opacity: 0.6 }}>Loading…</div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public Routes - Only Login/Signup */}
          <Route path="/login" element={<Login />} />
          <Route path="/sync-login" element={<SyncLogin />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/signup-debug" element={<SignupDebug />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/maintenance" element={<Maintenance />} />

          {/* ── PUBLIC quiz-play flow (shared links) — no login required ── */}
          <Route path="/play/:subject/:name" element={<QuizPlay />} />
          <Route path="/play/result/:attemptId" element={<QuizResult />} />
          <Route path="/play/analysis/:attemptId" element={<QuizAnalysis />} />
          <Route path="/play/practice" element={<QuizPractice />} />

          {/* All Student Routes - Protected */}
          <Route element={<PrivateRoute role="student" />}>
            <Route path="/courses/:courseId/subjects/:subjectId/content/:contentId" element={<MediaContent />} />
            <Route path="/quiz/analysis/:attemptId" element={<QuizAnalysis />} />
            <Route path="/quiz/practice" element={<QuizPractice />} />
            <Route path="/quiz/:subject/:name/play" element={<QuizPlay />} />
            <Route path="/books/:bookId" element={<BookReader />} />
            <Route path="/doubt-chat" element={<DoubtChat />} />

            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/store" element={<Store />} />
              <Route path="/free-courses" element={<FreeCourses />} />
              <Route path="/books" element={<Books />} />
              <Route path="/watch-history" element={<WatchHistory />} />
              <Route path="/my-courses" element={<MyCourses />} />
              <Route path="/courses/:courseId/subjects" element={<Subjects />} />
              <Route path="/courses/:courseId/subjects/:subjectId" element={<SubjectDetail />} />
              <Route path="/courses/:courseId/subjects/:subjectId/chapters/:chapterId" element={<SubjectDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/quiz/:subject" element={<Quiz />} />
              <Route path="/quiz/result/:attemptId" element={<QuizResult />} />
              <Route path="/progress" element={<Progress />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App

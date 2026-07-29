import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from "./components/Layout"
import Home from "./pages/Home/Home"
import About from "./pages/About/About"
import Contact from "./pages/Contact/Contact"
import Login from "./pages/Auth/Login"
import SyncLogin from "./pages/Auth/SyncLogin"
import Register from "./pages/Auth/Signup"
import SignupDebug from "./pages/Auth/SignupDebug"
import ForgotPassword from "./pages/Auth/ForgotPassword"
import VerifyOTP from "./pages/Auth/VerifyOTP"
import MyCourses from "./pages/MyCourses/MyCourses"
import Subjects from "./pages/Subjects/Subjects"
import SubjectDetail from "./pages/Subjects/SubjectDetail"
import MediaContent from "./pages/Media/MediaContent"
import BookReader from "./pages/Books/BookReader"
import Profile from "./pages/Profile/Profile"
import Store from "./pages/Store/Store"
import Notifications from "./pages/Notifications/Notifications"
import Quiz from "./pages/Quiz/QuizList"
import QuizPlay from "./pages/Quiz/QuizPlay"
import QuizResult from "./pages/Quiz/QuizResult"
import QuizAnalysis from "./pages/Quiz/QuizAnalysis"
import Leaderboard from "./pages/Quiz/Leaderboard"
import Progress from "./pages/Progress/Progress"
import DoubtChat from "./pages/DoubtChat/DoubtChat"
import FreeCourses from "./pages/FreeCourses/FreeCourses"
import Books from "./pages/Books/Books"
import WatchHistory from "./pages/WatchHistory/WatchHistory"
import PrivateRoute from "./components/PrivateRoute"
import Maintenance from "./pages/Maintenance/Maintenance"

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public Routes - Only Login/Signup */}
        <Route path="/login" element={<Login />} />
        <Route path="/sync-login" element={<SyncLogin />} />
        <Route path="/signup" element={<Register />} />
        <Route path="/signup-debug" element={<SignupDebug />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/maintenance" element={<Maintenance />} />

        {/* ── PUBLIC quiz-play flow (shared links) — no login required ──
            A guest can open a shared quiz, play it, and see the result +
            per-quiz leaderboard without an account. */}
        <Route path="/play/:subject/:name" element={<QuizPlay />} />
        <Route path="/play/result/:attemptId" element={<QuizResult />} />
        <Route path="/play/analysis/:attemptId" element={<QuizAnalysis />} />

        {/* All Student Routes - Protected */}
        <Route element={<PrivateRoute role="student" />}>
          {/* Media (video/pdf) routes render OUTSIDE Layout — no navbar/header ever shows */}
          <Route path="/courses/:courseId/subjects/:subjectId/content/:contentId" element={<MediaContent />} />
          <Route path="/courses/:courseId/subjects/:subjectId/chapters/:chapterId/content/:contentId" element={<MediaContent />} />
          <Route path="/quiz/analysis/:attemptId" element={<QuizAnalysis />} />
          <Route path="/quiz/:subject/:name/play" element={<QuizPlay />} />
          {/* Book Reader renders OUTSIDE Layout — full screen experience */}
          <Route path="/books/:bookId" element={<BookReader />} />
          {/* Doubt Chat renders OUTSIDE Layout — full screen experience */}
          <Route path="/doubt-chat" element={<DoubtChat />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/store" element={<Store />} />
            <Route path="/free-courses" element={<FreeCourses />} />
            <Route path="/books" element={<Books />} />
            <Route path="/watch-history" element={<WatchHistory />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
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
    </BrowserRouter>
  )
}

export default App

import { useEffect } from 'react';
import { useStore } from './store/useStore';
import Navbar from './components/layout/Navbar';
import HeroSection from './components/layout/HeroSection';
import UploadArea from './components/upload/UploadArea';
import SubjectGrid from './components/subjects/SubjectGrid';
import Workspace from './components/workspace/Workspace';
import Dashboard from './components/dashboard/Dashboard';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Profile from './components/auth/Profile';

function App() {
  const { getSelectedSubject, hydrateStore, initializeAuth, activeView } = useStore();
  const selectedSubject = getSelectedSubject();

  useEffect(() => {
    hydrateStore();
    initializeAuth();
  }, [hydrateStore, initializeAuth]);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-purple-500/30 selection:text-white">
      {/* Ambient Glow Backgrounds */}
      <div className="fixed top-[-150px] left-[-150px] w-[500px] h-[500px] bg-purple-600/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-150px] right-[-150px] w-[500px] h-[500px] bg-blue-600/20 blur-[130px] rounded-full pointer-events-none" />

      {/* Global Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="relative z-10 px-4 sm:px-8 py-8 max-w-7xl mx-auto">
        {activeView === 'login' ? (
          <Login />
        ) : activeView === 'signup' ? (
          <Signup />
        ) : activeView === 'profile' ? (
          <Profile />
        ) : activeView === 'dashboard' ? (
          <Dashboard />
        ) : selectedSubject ? (
          <Workspace />
        ) : (
          <div className="space-y-12">
            <HeroSection />
            <UploadArea />
            <SubjectGrid />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
import { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import BookingsScreen from './screens/BookingsScreen';
import ProfileScreen from './screens/ProfileScreen';
import BookRideScreen from './screens/BookRideScreen';
import TripTrackScreen from './screens/TripTrackScreen';
import ChatScreen from './screens/ChatScreen';
import { Home, Calendar, User, MessageCircle } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState('Home');
  const [tab, setTab] = useState('Home');
  const [screenParams, setScreenParams] = useState({});

  const navigate = (name, params) => {
    setScreen(name);
    if (params) setScreenParams(params);
    if (['Home', 'Bookings', 'Chat', 'Profile'].includes(name)) setTab(name);
  };

  const goBack = () => {
    setScreen(tab);
    setScreenParams({});
  };

  const navigation = { navigate, goBack };
  const route = { params: screenParams };

  if (loading) return (
    <div className="mobile-frame flex items-center justify-center h-screen bg-bg">
      <div className="w-8 h-8 border-2 border-gold rounded-full border-t-transparent animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="mobile-frame">
      <LoginScreen />
    </div>
  );

  // Overlay screens (full-screen, still centered)
  if (screen === 'BookRide') return (
    <div className="mobile-frame">
      <BookRideScreen navigation={navigation} route={route} />
    </div>
  );
  if (screen === 'TripTrack') return (
    <div className="mobile-frame">
      <TripTrackScreen navigation={navigation} route={route} />
    </div>
  );
  if (screen === 'Chat') return (
    <div className="mobile-frame">
      <ChatScreen navigation={navigation} route={route} />
    </div>
  );

  const tabs = [
    { name: 'Home', Icon: Home },
    { name: 'Bookings', Icon: Calendar },
    { name: 'Chat', Icon: MessageCircle },
    { name: 'Profile', Icon: User },
  ];

  const tabScreens = { Home: HomeScreen, Bookings: BookingsScreen, Chat: ChatScreen, Profile: ProfileScreen };
  const ActiveScreen = tabScreens[tab] || HomeScreen;

  return (
    <div className="mobile-frame flex flex-col bg-bg" style={{ minHeight: '100vh' }}>
      <div className="flex-1 overflow-y-auto pb-20">
        <ActiveScreen navigation={navigation} route={route} />
      </div>
      {/* Tab Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-card-border flex" style={{ height: 64 }}>
        {tabs.map(({ name, Icon }) => (
          <button
            key={name}
            onClick={() => { setTab(name); setScreen(name); setScreenParams({}); }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${tab === name ? 'text-gold' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-semibold">{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

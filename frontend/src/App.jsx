import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context';

// Import basic components
import { Welcome, SignIn, SignUp, Splash } from './screens/auth.jsx';
import { ParentDashboard, ChoresList, ChoreDetail, CreateChore, ChildrenView, RulesScreen, AnalyticsScreen, SettingsScreen } from './screens/parent.jsx';
import { ChildDashboard, AvailableChores, SubmitChore, MyChores, BalanceScreen, GoalsScreen, ProfileScreen } from './screens/child.jsx';

function AppRoutes() {
  const context = useApp();
  
  // Safely get values from context with defaults
  const user = context?.user || null;
  const loading = context?.loading || false;

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2eee1', color: '#6e4600', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #6e4600', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 20px' }}></div>
          <p>Chargement de PocketMoney...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/login" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      
      {/* Parent */}
      <Route path="/parent" element={<ParentDashboard />} />
      <Route path="/parent/chores" element={<ChoresList />} />
      <Route path="/parent/chores/:choreId" element={<ChoreDetail />} />
      <Route path="/parent/chores/new" element={<CreateChore />} />
      <Route path="/parent/children" element={<ChildrenView />} />
      <Route path="/parent/rules" element={<RulesScreen />} />
      <Route path="/parent/analytics" element={<AnalyticsScreen />} />
      <Route path="/parent/settings" element={<SettingsScreen />} />

      {/* Child */}
      <Route path="/child" element={<ChildDashboard />} />
      <Route path="/child/available-chores" element={<AvailableChores />} />
      <Route path="/child/submit-chore/:choreId" element={<SubmitChore />} />
      <Route path="/child/my-chores" element={<MyChores />} />
      <Route path="/child/balance" element={<BalanceScreen />} />
      <Route path="/child/goals" element={<GoalsScreen />} />
      <Route path="/child/profile" element={<ProfileScreen />} />

      <Route path="/" element={<Navigate to={user ? (user.role === 'PARENT' ? '/parent' : '/child') : '/welcome'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}

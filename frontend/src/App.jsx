import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider, useApp } from './context';

// Import basic components
import { Welcome, SignIn, SignUp, ForgotPassword, ResetPassword } from './screens/auth.jsx';
import { PrivacyPolicy, TermsOfUse } from './screens/legal.jsx';
import { ParentDashboard, InboxScreen, ChoresList, ChoreDetail, CreateChore, ChildrenView, RulesScreen, PenaltyHistoryScreen, AnalyticsScreen, SettingsScreen, ExpensesReview, ChildSettingsScreen } from './screens/parent.jsx';
import { ChildDashboard, AvailableChores, SubmitChore, MyChores, BalanceScreen, GoalsScreen, ProfileScreen, ExpensesScreen } from './screens/child.jsx';

const homePath = (user) => (user.role === 'PARENT' ? '/parent' : '/child');

// AppRoutes n'affiche les routes qu'une fois la session chargée : `user` est fiable ici.
function ProtectedRoute({ role }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/welcome" replace />;
  if (user.role !== role) return <Navigate to={homePath(user)} replace />;
  return <Outlet />;
}

function AppRoutes() {
  const context = useApp();
  
  // Safely get values from context with defaults
  const user = context?.user || null;
  const loading = context?.loading || false;

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3FE', color: '#3A28D9', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #3A28D9', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 20px' }}></div>
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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfUse />} />
      
      {/* Parent */}
      <Route element={<ProtectedRoute role="PARENT" />}>
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/parent/inbox" element={<InboxScreen />} />
        <Route path="/parent/chores" element={<ChoresList />} />
        <Route path="/parent/chores/:choreId" element={<ChoreDetail />} />
        <Route path="/parent/chores/new" element={<CreateChore />} />
        <Route path="/parent/chores/:choreId/edit" element={<CreateChore />} />
        <Route path="/parent/children" element={<ChildrenView />} />
        <Route path="/parent/children/:childId/settings" element={<ChildSettingsScreen />} />
        <Route path="/parent/rules" element={<RulesScreen />} />
        <Route path="/parent/rules/history" element={<PenaltyHistoryScreen />} />
        <Route path="/parent/analytics" element={<AnalyticsScreen />} />
        <Route path="/parent/settings" element={<SettingsScreen />} />
        <Route path="/parent/expenses" element={<ExpensesReview />} />
      </Route>

      {/* Child */}
      <Route element={<ProtectedRoute role="CHILD" />}>
        <Route path="/child" element={<ChildDashboard />} />
        <Route path="/child/available-chores" element={<AvailableChores />} />
        <Route path="/child/submit-chore/:choreId" element={<SubmitChore />} />
        <Route path="/child/my-chores" element={<MyChores />} />
        <Route path="/child/balance" element={<BalanceScreen />} />
        <Route path="/child/goals" element={<GoalsScreen />} />
        <Route path="/child/profile" element={<ProfileScreen />} />
        <Route path="/child/expenses" element={<ExpensesScreen />} />
      </Route>

      <Route path="/" element={<Navigate to={user ? homePath(user) : '/welcome'} replace />} />
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

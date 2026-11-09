import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { LandingPage } from './pages/LandingPage.js';
import { FeaturesPage } from './pages/FeaturesPage.js';
import { HowItWorksPage } from './pages/HowItWorksPage.js';
import { ClientDashboard } from './components/ClientDashboard.js';
import { FreelancerDashboard } from './components/FreelancerDashboard.js';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage.js';
import { CreateProjectWizard } from './components/CreateProjectWizard.js';
import { ProfileModal } from './components/ProfileModal.js';
import { ConnectWalletModal } from './components/ConnectWalletModal.js';
import { api, storage, Project, Profile, AppNotification, TransactionRecord } from './lib/api.js';
import { fetchTestnetBalance } from './lib/stellar.js';

export function App() {
  const [currentTab, setCurrentTab] = useState<'landing' | 'features' | 'how-it-works' | 'dashboard' | 'project-details'>('landing');
  const [userRole, setUserRole] = useState<'client' | 'freelancer'>('client');
  const [walletAddress, setWalletAddress] = useState<string | null>(storage.getWallet());
  const [balanceXlm, setBalanceXlm] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectData, setSelectedProjectData] = useState<any>(null);

  // Modals
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Initial load & profile check
  useEffect(() => {
    const savedWallet = storage.getWallet();
    const token = storage.getToken();

    if (savedWallet && token) {
      setWalletAddress(savedWallet);
      api.getMe()
        .then((res) => {
          if (res.profile) setProfile(res.profile);
        })
        .catch(() => {
          // Token expired or invalid
        });
    }
  }, []);

  // Fetch balance and data when wallet is connected
  const refreshData = async () => {
    if (!walletAddress) return;

    try {
      const balance = await fetchTestnetBalance(walletAddress);
      setBalanceXlm(balance);

      const [pRes, tRes, nRes] = await Promise.all([
        api.getProjects(),
        api.getTransactions(),
        api.getNotifications(),
      ]);

      setProjects(pRes.projects);
      setTransactions(tRes.transactions);
      setNotifications(nRes.notifications);
      setUnreadCount(nRes.unreadCount);

      if (selectedProjectId) {
        const pdRes = await api.getProject(selectedProjectId);
        setSelectedProjectData(pdRes);
      }
    } catch (err) {
      console.error('Data refresh error:', err);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      refreshData();
      const interval = setInterval(refreshData, 5000);
      return () => clearInterval(interval);
    }
  }, [walletAddress, selectedProjectId]);

  const handleSelectProject = async (projectId: string) => {
    setSelectedProjectId(projectId);
    try {
      const res = await api.getProject(projectId);
      setSelectedProjectData(res);
      setCurrentTab('project-details');
    } catch (err) {
      console.error('Failed to load project details:', err);
    }
  };

  const handleDisconnectWallet = () => {
    storage.clearToken();
    setWalletAddress(null);
    setProfile(null);
    setBalanceXlm(null);
    setProjects([]);
    setTransactions([]);
    setCurrentTab('landing');
  };

  const handleWalletSuccess = (address: string, userProfile: Profile | null) => {
    setWalletAddress(address);
    if (userProfile) setProfile(userProfile);
    setCurrentTab('dashboard');
    refreshData();
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects([newProject, ...projects]);
    handleSelectProject(newProject.id);
  };

  const handleMarkNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar
        walletAddress={walletAddress}
        balanceXlm={balanceXlm}
        profile={profile}
        role={userRole}
        onToggleRole={setUserRole}
        onConnectWallet={() => setShowConnectModal(true)}
        onDisconnectWallet={handleDisconnectWallet}
        onOpenCreateProject={() => setShowCreateProject(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        currentTab={currentTab}
        onNavigate={(tab: any) => {
          if (tab === 'dashboard' && !walletAddress) {
            setShowConnectModal(true);
            return;
          }
          setCurrentTab(tab);
        }}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkNotificationRead={handleMarkNotificationRead}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'landing' && (
          <LandingPage
            onConnectWallet={() => setShowConnectModal(true)}
            onExploreFeatures={() => setCurrentTab('how-it-works')}
            walletConnected={!!walletAddress}
            onGoToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'features' && <FeaturesPage />}

        {currentTab === 'how-it-works' && <HowItWorksPage />}

        {currentTab === 'dashboard' && (
          userRole === 'client' ? (
            <ClientDashboard
              projects={projects}
              transactions={transactions}
              onOpenCreateProject={() => setShowCreateProject(true)}
              onSelectProject={handleSelectProject}
            />
          ) : (
            <FreelancerDashboard
              projects={projects}
              transactions={transactions}
              onSelectProject={handleSelectProject}
            />
          )
        )}

        {currentTab === 'project-details' && selectedProjectData && (
          <ProjectDetailsPage
            project={selectedProjectData.project}
            agreement={selectedProjectData.agreement}
            milestones={selectedProjectData.milestones}
            disputes={selectedProjectData.disputes}
            userWallet={walletAddress}
            userRole={userRole}
            onBack={() => setCurrentTab('dashboard')}
            onRefresh={refreshData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-8 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            PactPay © 2026. Decentralized Freelance Escrow Protocol.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Stellar Testnet</span>
            <span>•</span>
            <span>Soroban Smart Contracts</span>
            <span>•</span>
            <a
              href="https://github.com/stellar"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 transition-colors"
            >
              Stellar Docs
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ConnectWalletModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onSuccess={handleWalletSuccess}
      />

      <CreateProjectWizard
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onProjectCreated={handleProjectCreated}
      />

      {walletAddress && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profile={profile}
          walletAddress={walletAddress}
          onProfileUpdated={(updated) => setProfile(updated)}
        />
      )}
    </div>
  );
}
export default App;


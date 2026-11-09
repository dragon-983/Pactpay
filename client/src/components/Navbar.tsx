import React, { useState } from 'react';
import {
  Shield,
  Wallet,
  Bell,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  User,
  Plus,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { shortAddress, getAccountExplorerUrl, formatXlm } from '../lib/stellar.js';
import { Profile, AppNotification } from '../lib/api.js';

interface NavbarProps {
  walletAddress: string | null;
  balanceXlm: string | null;
  profile: Profile | null;
  role: 'client' | 'freelancer';
  onToggleRole: (role: 'client' | 'freelancer') => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onOpenCreateProject: () => void;
  onOpenProfile: () => void;
  currentTab: string;
  onNavigate: (tab: string) => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkNotificationRead: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  walletAddress,
  balanceXlm,
  profile,
  role,
  onToggleRole,
  onConnectWallet,
  onDisconnectWallet,
  onOpenCreateProject,
  onOpenProfile,
  currentTab,
  onNavigate,
  notifications,
  unreadCount,
  onMarkNotificationRead,
}) => {
  const [copied, setCopied] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
                <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  Pact<span className="text-emerald-400">Pay</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-400/90 tracking-wider uppercase block -mt-1">
                  Stellar Escrow
                </span>
              </div>
            </button>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-1 text-sm font-medium">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  currentTab === 'dashboard'
                    ? 'text-white bg-slate-800/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigate('features')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  currentTab === 'features'
                    ? 'text-white bg-slate-800/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Features
              </button>
              <button
                onClick={() => onNavigate('how-it-works')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  currentTab === 'how-it-works'
                    ? 'text-white bg-slate-800/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                How It Works
              </button>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Testnet Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Stellar Testnet
            </div>

            {walletAddress ? (
              <>
                {/* Role Switcher Pill */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
                  <button
                    onClick={() => onToggleRole('client')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      role === 'client'
                        ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Client
                  </button>
                  <button
                    onClick={() => onToggleRole('freelancer')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      role === 'freelancer'
                        ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Freelancer
                  </button>
                </div>

                {/* Create Project Button (Clients) */}
                {role === 'client' && (
                  <button
                    onClick={onOpenCreateProject}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition-colors shadow-sm shadow-emerald-500/20"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    New Project
                  </button>
                )}

                {/* Notifications Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifMenu(!showNotifMenu);
                      setShowWalletMenu(false);
                    }}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors relative"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifMenu && (
                    <div className="absolute right-0 mt-2 w-80 glass-panel rounded-xl shadow-2xl border border-slate-800 py-2 z-50 text-xs">
                      <div className="px-3 py-2 border-b border-slate-800/80 font-semibold text-slate-300 flex items-center justify-between">
                        <span>Notifications</span>
                        <span className="text-[10px] text-emerald-400">{unreadCount} unread</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/50">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-slate-500">No notifications</div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => onMarkNotificationRead(n.id)}
                              className={`p-3 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                                !n.read ? 'bg-emerald-500/5' : ''
                              }`}
                            >
                              <div className="font-medium text-slate-200">{n.title}</div>
                              <div className="text-slate-400 mt-0.5 line-clamp-2">{n.message}</div>
                              <div className="text-[10px] text-slate-500 mt-1">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Connected Wallet Pill */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowWalletMenu(!showWalletMenu);
                      setShowNotifMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="font-mono font-medium text-slate-200">{shortAddress(walletAddress)}</span>
                    <span className="hidden md:inline text-slate-400 font-mono">({formatXlm(balanceXlm)})</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Wallet Menu Dropdown */}
                  {showWalletMenu && (
                    <div className="absolute right-0 mt-2 w-72 glass-panel rounded-xl shadow-2xl border border-slate-800 p-3 z-50 text-xs">
                      <div className="pb-3 border-b border-slate-800">
                        <div className="text-slate-400">Connected Wallet (Freighter)</div>
                        <div className="font-mono font-semibold text-slate-200 mt-0.5 break-all">
                          {walletAddress}
                        </div>
                        <div className="mt-2 text-emerald-400 font-semibold font-mono">
                          Balance: {formatXlm(balanceXlm)}
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        <button
                          onClick={copyAddress}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 text-slate-300 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            Copy Public Key
                          </span>
                          {copied && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                        <a
                          href={getAccountExplorerUrl(walletAddress)}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 text-slate-300 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            View on Stellar Expert
                          </span>
                        </a>
                        <button
                          onClick={() => {
                            onOpenProfile();
                            setShowWalletMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 text-slate-300 transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Profile Settings
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-800">
                        <button
                          onClick={() => {
                            onDisconnectWallet();
                            setShowWalletMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Disconnect Wallet
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={onConnectWallet}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 glow-emerald"
              >
                <Wallet className="w-4 h-4 stroke-[2.5]" />
                Connect Freighter
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};


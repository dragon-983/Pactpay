import React from 'react';
import {
  Wallet,
  Clock,
  CheckCircle2,
  Send,
  ArrowUpRight,
  Shield,
  Layers,
  Coins,
} from 'lucide-react';
import { Project, TransactionRecord } from '../lib/api.js';
import { formatXlm, shortAddress } from '../lib/stellar.js';

interface FreelancerDashboardProps {
  projects: Project[];
  transactions: TransactionRecord[];
  onSelectProject: (id: string) => void;
}

export const FreelancerDashboard: React.FC<FreelancerDashboardProps> = ({
  projects,
  transactions,
  onSelectProject,
}) => {
  // Aggregate earnings & active contracts
  const totalEarnedXlm = transactions
    .filter((t) => t.tx_type === 'approve_release' && t.status === 'confirmed')
    .reduce((acc, t) => acc + Number(t.amount_xlm || 0), 0);

  const activeProjects = projects.filter((p) => p.status === 'funded' || p.status === 'in_progress');
  const lockedEscrowXlm = activeProjects.reduce((acc, p) => acc + Number(p.total_budget), 0);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Freelancer Earnings & Escrow Dashboard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Track guaranteed on-chain escrow deposits, submit milestone deliverables, and receive instant payouts.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Earnings</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white font-mono">
            {totalEarnedXlm.toLocaleString()} <span className="text-xs font-normal text-slate-400">XLM</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">Released to wallet</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Guaranteed in Escrow</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-emerald-400 font-mono">
            {lockedEscrowXlm.toLocaleString()} <span className="text-xs font-normal text-slate-400">XLM</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Locked in active contracts</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Contracts</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white font-mono">{activeProjects.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Funded & ongoing</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white font-mono">
            {projects.filter((p) => p.status === 'completed').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Successfully settled</div>
        </div>
      </div>

      {/* Freelancer Projects */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          Your Contracts
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {projects.length}
          </span>
        </h2>

        {projects.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No active client contracts</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Share your Stellar public key with clients so they can initialize guaranteed milestone escrow agreements with you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className="glass-card p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all hover:bg-slate-800/40 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400">Client: </span>
                      <span className="font-mono text-slate-300">
                        {p.client_name || shortAddress(p.client_address)}
                      </span>
                    </div>
                    <div className="font-bold text-white font-mono">{formatXlm(p.total_budget)}</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-400">
                  <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    View Milestones <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


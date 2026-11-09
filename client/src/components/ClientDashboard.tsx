import React from 'react';
import {
  Coins,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowUpRight,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import { Project, TransactionRecord } from '../lib/api.js';
import { formatXlm, shortAddress, getExplorerUrl } from '../lib/stellar.js';

interface ClientDashboardProps {
  projects: Project[];
  transactions: TransactionRecord[];
  onOpenCreateProject: () => void;
  onSelectProject: (id: string) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  projects,
  transactions,
  onOpenCreateProject,
  onSelectProject,
}) => {
  // Aggregate stats
  const totalFundedXlm = projects.reduce((acc, p) => acc + (p.status !== 'cancelled' ? Number(p.total_budget) : 0), 0);
  const activeCount = projects.filter((p) => p.status === 'funded' || p.status === 'in_progress').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;
  const pendingFundingCount = projects.filter((p) => p.status === 'pending_funding').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'funded':
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Escrow Active
          </span>
        );
      case 'pending_funding':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Needs Funding
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Completed
          </span>
        );
      case 'disputed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Disputed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Client Escrow Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your funded milestones, inspect freelancer submissions, and release payments.
          </p>
        </div>

        <button
          onClick={onOpenCreateProject}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Create Escrow Project
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Escrow Value</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white font-mono">
            {totalFundedXlm.toLocaleString()} <span className="text-xs font-normal text-slate-400">XLM</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">Across all agreements</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Contracts</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white font-mono">{activeCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Currently in progress</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pending Funding</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-amber-300 font-mono">{pendingFundingCount}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">Awaiting contract deposit</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white font-mono">{completedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Successfully settled</div>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          Your Escrow Projects
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {projects.length}
          </span>
        </h2>

        {projects.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No active escrow agreements yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Create a project to define milestones and protect your funds in an autonomous Stellar smart contract.
              </p>
            </div>
            <button
              onClick={onOpenCreateProject}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => {
              const completedCount = Number(p.completed_milestone_count || 0);
              const totalCount = Number(p.milestone_count || 1);
              const percent = Math.round((completedCount / totalCount) * 100);

              return (
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
                      {getStatusBadge(p.status)}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400">Freelancer: </span>
                        <span className="font-mono text-slate-300">
                          {p.freelancer_name || shortAddress(p.freelancer_address)}
                        </span>
                      </div>
                      <div className="font-bold text-white font-mono">{formatXlm(p.total_budget)}</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Milestone Progress</span>
                        <span>
                          {completedCount} of {totalCount} completed ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-400">
                    <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Manage Escrow <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent On-Chain Transactions */}
      {transactions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h2 className="text-lg font-bold text-white">Recent Stellar Transactions</h2>
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/60">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono">
                    TX
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 capitalize">
                      {tx.tx_type.replace('_', ' ')}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {shortAddress(tx.tx_hash)}
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-4">
                  {tx.amount_xlm && (
                    <div className="font-mono font-bold text-emerald-400">
                      {formatXlm(tx.amount_xlm)}
                    </div>
                  )}
                  <a
                    href={getExplorerUrl(tx.tx_hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


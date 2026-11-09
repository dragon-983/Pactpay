import React from 'react';
import {
  ShieldCheck,
  Cpu,
  Lock,
  Layers,
  FileCode2,
  RefreshCw,
  Scale,
  Zap,
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4">
          Engineered for Security
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Soroban-Powered Escrow Architecture
        </h1>
        <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
          PactPay eliminates counterparty risk by enforcing financial terms through autonomous Rust smart contracts on Stellar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Native Soroban Contracts</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Written in zero-overhead Rust, running natively on Stellar's WebAssembly execution environment. Every state change is authenticated and immutable.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Granular Milestones</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Break projects into distinct deliverable milestones. Funds release incrementally upon client verification, ensuring freelancers are paid for completed work.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Zero Custody & Middlemen</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            PactPay backend servers never touch private keys or hold user funds. Assets reside exclusively in the contract balance until milestone conditions trigger release.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Multi-Sig Dispute Arbitration</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Disputed funds are instantly frozen on-chain. An agreed platform arbiter evaluates deliverables and executes a mathematically verified split.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <RefreshCw className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Structured Revisions</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Clients can request specific modifications with actionable notes before signing off. Work submissions are immutably versioned with GitHub commit hashes.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Integer Stroop Accounting</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            All monetary figures are stored as 64-bit and 128-bit integers (1 XLM = 10,000,000 stroops). Zero floating-point rounding errors across the stack.
          </p>
        </div>
      </div>
    </div>
  );
};


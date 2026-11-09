import React from 'react';
import {
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Coins,
  Scale,
  Users,
  ChevronRight,
} from 'lucide-react';

interface LandingPageProps {
  onConnectWallet: () => void;
  onExploreFeatures: () => void;
  walletConnected: boolean;
  onGoToDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onConnectWallet,
  onExploreFeatures,
  walletConnected,
  onGoToDashboard,
}) => {
  return (
    <div className="relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-96 right-0 w-[500px] h-[400px] bg-blue-500/5 blur-[160px] pointer-events-none rounded-full" />

      {/* Hero Section */}
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Powered by Soroban Smart Contracts on Stellar Testnet
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Trustless Freelance Escrow for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Decentralized Web</span>.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Clients fund locked escrow contracts. Freelancers submit verified milestones. Payments release automatically upon approval with sub-second Stellar finality.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {walletConnected ? (
            <button
              onClick={onGoToDashboard}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 group"
            >
              Enter Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button
              onClick={onConnectWallet}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 group"
            >
              Connect Freighter Wallet
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          <button
            onClick={onExploreFeatures}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-sm transition-colors"
          >
            How It Works
          </button>
        </div>

        {/* Live Metrics Grid */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto text-left">
          <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">100%</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Smart Contract Escrow</div>
            <div className="text-[11px] text-emerald-400/80 mt-2">Zero custodial middlemen</div>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">5.0 sec</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Settlement Finality</div>
            <div className="text-[11px] text-emerald-400/80 mt-2">Stellar consensus protocol</div>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">&lt; $0.001</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Transaction Fees</div>
            <div className="text-[11px] text-emerald-400/80 mt-2">Negligible network costs</div>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">7 Decimals</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Stroop Precision</div>
            <div className="text-[11px] text-emerald-400/80 mt-2">Integer math, zero float loss</div>
          </div>
        </div>
      </section>

      {/* Interactive Escrow Workflow Flowchart */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
            How PactPay Guarantees Fair Collaboration
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Both parties are protected at every stage of the engagement through automated Soroban smart contract logic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Step 1 */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 relative group glass-card-hover">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 mb-4 font-mono font-bold text-sm">
              01
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              Define & Fund
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Client specifies milestone deliverables, timelines, and budget. Client funds the escrow contract with native XLM via Freighter.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-emerald-400">
              contract.fund_agreement()
            </div>
          </div>

          {/* Step 2 */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 relative group glass-card-hover">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 mb-4 font-mono font-bold text-sm">
              02
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              Work & Submit
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Freelancer works with confidence knowing 100% of the funds are locked on-chain. Deliverables and git commits are submitted.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-emerald-400">
              contract.submit_milestone()
            </div>
          </div>

          {/* Step 3 */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 relative group glass-card-hover">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 mb-4 font-mono font-bold text-sm">
              03
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Review & Release
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Client inspects work and either requests revisions or approves. Upon approval, contract transfers funds directly to freelancer.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-emerald-400">
              contract.approve_and_release()
            </div>
          </div>

          {/* Step 4 */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 relative group glass-card-hover">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 mb-4 font-mono font-bold text-sm">
              04
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              Dispute Guard
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              If a deadlock occurs, funds remain frozen on-chain. An arbiter evaluates evidence and authorizes an exact settlement split.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-emerald-400">
              contract.resolve_dispute()
            </div>
          </div>
        </div>
      </section>

      {/* Comparison: Traditional Freelance vs PactPay */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8">
            Why Forward-Thinking Teams Choose PactPay
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Traditional */}
            <div className="space-y-4 pt-4 md:pt-0">
              <div className="text-red-400 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                Traditional Platforms (Upwork, Fiverr)
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  10% to 20% platform cut on every milestone payment
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  5 to 14 days payout waiting periods and withdrawal holds
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  Risk of arbitrary account bans and frozen bank balances
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  Opaque dispute arbitration favoring high-volume clients
                </li>
              </ul>
            </div>

            {/* PactPay */}
            <div className="space-y-4 pt-4 md:pt-0 md:pl-8">
              <div className="text-emerald-400 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                PactPay on Stellar Soroban
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  0% platform commission on milestone escrow contracts
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  Instant non-custodial payouts directly into your Stellar wallet
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  No accounts, passwords, or KYC middleman custody
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  Deterministic smart contract state & auditable on-chain proof
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 text-center relative z-10 px-4">
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Ready to Escrow Your Next Project?
        </h2>
        <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
          Connect your Freighter wallet, define milestones, and initiate your first contract on Stellar Testnet in under 2 minutes.
        </p>
        <div className="mt-8">
          <button
            onClick={walletConnected ? onGoToDashboard : onConnectWallet}
            className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-emerald-500/25 inline-flex items-center gap-2"
          >
            {walletConnected ? 'Open Dashboard' : 'Connect Freighter & Start'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};


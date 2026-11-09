import React from 'react';
import {
  FileText,
  KeyRound,
  CheckCircle,
  Coins,
  Send,
  Shield,
  Code2,
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          How PactPay Works Under the Hood
        </h1>
        <p className="mt-4 text-slate-400 text-sm sm:text-base">
          A step-by-step breakdown of cryptographic escrow execution on the Stellar network.
        </p>
      </div>

      <div className="space-y-12">
        {/* Step 1 */}
        <div className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono shrink-0 text-lg">
            1
          </div>
          <div className="space-y-3 flex-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-400" />
              Wallet Authentication
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              No passwords or usernames. Users authenticate by signing an ephemeral cryptographic nonce challenge via Freighter wallet. The backend verifies the Ed25519 signature against the public key and generates a Row Level Security session context.
            </p>
            <div className="glass-card p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-400">
              <code>PactPay-Auth:&lt;PUBLIC_KEY&gt;:&lt;TIMESTAMP&gt;:&lt;NONCE&gt;</code>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono shrink-0 text-lg">
            2
          </div>
          <div className="space-y-3 flex-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              Agreement Creation & Escrow Deposit
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              The client initializes the project with milestone definitions and executes <code className="text-emerald-400">fund_agreement()</code>. The Soroban smart contract transfers the total agreed XLM balance from the client to the contract's secure storage account.
            </p>
            <div className="glass-card p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300">
              <span className="text-slate-500">// Rust Soroban Invocation</span><br />
              token_client.transfer(&client, &contract_address, &total_stroops);
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono shrink-0 text-lg">
            3
          </div>
          <div className="space-y-3 flex-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              Milestone Deliverable Submission
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              When work is completed, the freelancer submits the deliverable link, GitHub pull request, and summary notes. The smart contract records the submission hash, transitioning the milestone to <code className="text-emerald-400">Submitted</code>.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-6 items-start">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono shrink-0 text-lg">
            4
          </div>
          <div className="space-y-3 flex-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Approval & Automatic Payment Release
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              The client reviews the deliverable. Upon approval, the smart contract's <code className="text-emerald-400">approve_and_release()</code> method verifies client authentication and automatically transfers the milestone amount directly to the freelancer's wallet address.
            </p>
            <div className="glass-card p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300">
              <span className="text-slate-500">// On-Chain Release</span><br />
              token_client.transfer(&contract_address, &freelancer_address, &milestone_amount);
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


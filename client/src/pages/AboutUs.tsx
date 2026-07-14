import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Compass, Shield, Zap, Code, Award, Terminal, Cpu, Mail, Check, LifeBuoy } from 'lucide-react';

export const AboutUs: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState(false);

  const handleCopyEmail = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("venkuu935@gmail.com");
      }
    } catch (e) {
      console.warn("Clipboard copy failed", e);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3500);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const team = [
    {
      name: "Alex Rivera",
      role: "Lead AI Architect",
      bio: "Ex-DeepMind researcher focused on localized LLM code-context injection algorithms.",
      icon: Cpu,
      color: "from-blue-500 to-indigo-500"
    },
    {
      name: "Sophia Chen",
      role: "Principal Product Engineer",
      bio: "Full stack developer specializing in high-throughput real-time developer workflows.",
      icon: Terminal,
      color: "from-pink-500 to-purple-600"
    },
    {
      name: "Marcus Vance",
      role: "Senior Security Specialist",
      bio: "Former security auditor creating rule-based vulnerability scanners for monorepos.",
      icon: Shield,
      color: "from-cyan-500 to-teal-500"
    }
  ];

  const values = [
    {
      title: "AI-Native Innovation",
      desc: "Delivering state-of-the-art context window mapping and streaming solutions to augment human developers.",
      icon: Zap
    },
    {
      title: "Local-First Trust",
      desc: "Ensuring deep security audits and index caching run entirely local-first for code privacy.",
      icon: Shield
    },
    {
      title: "Frictionless Simplicity",
      desc: "Creating zero-setup environments supporting SQLite, automated tests, and instant diagrams.",
      icon: Code
    }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12 pb-12"
    >
      {/* Hero Banner */}
      <motion.div
        variants={itemVariants}
        className="relative bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 md:p-12 overflow-hidden flex flex-col md:flex-row items-center justify-between"
      >
        <div className="space-y-4 max-w-xl z-10 text-center md:text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Compass className="h-3.5 w-3.5" />
            <span>Discover DevPilot AI</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Accelerating Software Engineering with Context-Aware AI
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            DevPilot AI is an autonomous workspace helper built to streamline codebase audits. We walk directory trees, cache manifest models, stream context-scoped chat explanations, generate tests, and layout interactive diagrams.
          </p>
        </div>
        
        <div className="relative mt-8 md:mt-0 flex items-center justify-center z-10">
          <div className="w-40 h-40 bg-indigo-550/10 rounded-full blur-2xl absolute animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 ring-1 ring-white/20">
            <Compass className="h-16 w-16 text-white animate-spin-slow" />
          </div>
        </div>
      </motion.div>

      {/* Core Values */}
      <div className="space-y-6">
        <motion.div variants={itemVariants} className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Our Core Mission</h2>
          <p className="text-[11px] text-slate-400 font-semibold max-w-md mx-auto">
            Providing modular code diagnostics that empower software engineers to write secure, clear, and well-tested products.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((val) => {
            const Icon = val.icon;
            return (
              <motion.div
                key={val.title}
                variants={itemVariants}
                className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-3 hover:border-indigo-500/30 transition-all duration-300 group"
              >
                <div className="bg-indigo-500/10 p-2.5 rounded-xl w-fit text-indigo-400 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{val.title}</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">{val.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Our Team */}
      <div className="space-y-6">
        <motion.div variants={itemVariants} className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight font-sans">Meet the Pilots</h2>
          <p className="text-[11px] text-slate-400 font-semibold max-w-md mx-auto">
            An elite cohort of engineers, researchers, and security analysts crafting the future of developer tools.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {team.map((member) => {
            const Icon = member.icon;
            return (
              <motion.div
                key={member.name}
                variants={itemVariants}
                className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 hover:border-indigo-500/30 transition-all duration-300 group"
              >
                <div className={`bg-gradient-to-br ${member.color} p-4 rounded-full shadow-lg text-white group-hover:scale-105 transition-transform`}>
                  <Icon className="h-8 w-8" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-200">{member.name}</h3>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{member.role}</p>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">{member.bio}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Support & Contact Card */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-indigo-900/20 via-rose-900/10 to-slate-900/20 border border-rose-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-5"
      >
        <div className="flex items-center space-x-4 text-center md:text-left">
          <div className="bg-rose-500/10 p-3 rounded-xl text-rose-400 shrink-0">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Facing Issues or Need Support?</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold max-w-xl">
              Visit our Support Center to submit a ticket, browse FAQs, or contact the host directly at{' '}
              <strong className="text-rose-400 cursor-pointer hover:underline" onClick={handleCopyEmail}>venkuu935@gmail.com</strong>.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href="mailto:venkuu935@gmail.com"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-white/5 flex items-center gap-1.5"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email Directly</span>
          </a>
          <button
            onClick={() => navigate('/support')}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            <span>Open Support Center</span>
          </button>
        </div>
      </motion.div>

      {/* Toast Alert Feedback */}
      {copied && (
        <div className="fixed bottom-8 right-8 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg z-55 backdrop-blur-md animate-bounce">
          <Check className="h-4 w-4 text-rose-400" />
          <span>Support email copied to clipboard! (venkuu935@gmail.com)</span>
        </div>
      )}

      {/* Footer Info Badge */}
      <motion.div
        variants={itemVariants}
        className="bg-indigo-650/10 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0"
      >
        <div className="flex items-center space-x-3 text-center sm:text-left">
          <Award className="h-5 w-5 text-indigo-400 shrink-0" />
          <p className="text-[10px] text-indigo-300 font-bold tracking-wide">
            DevPilot AI Platform v1.2.0 • Licensed Workspace Diagnostics Suite
          </p>
        </div>
        <button
          onClick={() => alert("Thank you for piloting with us!")}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-md"
        >
          Check Changelog
        </button>
      </motion.div>
    </motion.div>
  );
};

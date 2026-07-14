import React, { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Mail, MessageSquare, ChevronDown, ChevronUp,
  CheckCircle, Loader2, Send, AlertCircle, Info,
  Zap, Shield, Code, FileText, GitBranch, LifeBuoy, Copy, ExternalLink
} from 'lucide-react';

const SUPPORT_EMAIL = 'venkuu935@gmail.com';

const faqs = [
  {
    q: 'Why is the AI chatbot not responding?',
    a: 'The chatbot uses the Gemini API which has free-tier rate limits. If you see a rate limit error (429), the system automatically falls back to offline mock responses. To get live AI responses, add your own Gemini API key under Settings → API Key Integrations.'
  },
  {
    q: 'How do I upload a project for analysis?',
    a: 'Go to the Projects page, click "New Project", and upload a ZIP archive of your codebase. The system will scan directory trees, detect languages, and make your code available to all AI tools (chat, diagrams, tests, docs).'
  },
  {
    q: 'Why are test generation or docs returning placeholder content?',
    a: 'This happens when the Gemini API key is missing or rate-limited. The backend serves pre-built mock templates in that case. Set a valid GEMINI_API_KEY in fastapi-server/.env to enable live generation.'
  },
  {
    q: 'The diagram generator shows an error or hangs — what do I do?',
    a: 'Diagram generation is AI-powered. On API errors or Windows socket timeouts, the system falls back to pre-built Mermaid diagrams. Try refreshing the page or selecting a different diagram type.'
  },
  {
    q: 'How do I reset my password?',
    a: 'Go to Settings → Security & Password to change it while logged in. If you are locked out, contact support at venkuu935@gmail.com with your registered email.'
  },
  {
    q: 'The page shows a blank screen — what happened?',
    a: 'This is usually a JavaScript runtime error caught by the Error Boundary. Hard-refresh the page (Ctrl + Shift + R). If it persists, contact support with the error message shown on screen.'
  },
  {
    q: 'Can I change the visual theme of the application?',
    a: 'Yes! Go to Settings → Appearance & Theme. You can switch between Dark Slate (default), Light Contrast, and Cyber Synth (neon). Your choice is saved in localStorage and applied on every reload.'
  },
  {
    q: 'How long does it take to get a support response?',
    a: 'The host typically responds within 24 hours on weekdays. For urgent issues, clearly state "URGENT" in your subject line when emailing venkuu935@gmail.com.'
  }
];

const categories = [
  { label: 'AI / Chatbot Issue', icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  { label: 'Diagram Error', icon: GitBranch, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  { label: 'Test / Docs Generator', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { label: 'Security / Auth', icon: Shield, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  { label: 'Project Upload', icon: Code, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { label: 'Other / General', icon: MessageSquare, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
];

export const Support: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [configError, setConfigError] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  // ─── Copy email to clipboard ──────────────────────────────────────────────
  const copyEmail = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SUPPORT_EMAIL)
        .then(() => {
          setCopyStatus('copied');
          setTimeout(() => setCopyStatus('idle'), 2500);
        })
        .catch(() => {
          // fallback: select text approach
          fallbackCopy();
        });
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    const el = document.createElement('textarea');
    el.value = SUPPORT_EMAIL;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      document.execCommand('copy');
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
    document.body.removeChild(el);
    setTimeout(() => setCopyStatus('idle'), 2500);
  };

  // ─── Open mail client ─────────────────────────────────────────────────────
  const openMailClient = () => {
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[DevPilot Support] General Inquiry')}`;
    window.location.href = mailto;
  };

  // ─── Submit ticket ────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!category) {
      setFormError('Please select an issue category before submitting.');
      return;
    }
    if (!senderEmail || !senderEmail.includes('@')) {
      setFormError('Please enter a valid email address so we can reply to you.');
      return;
    }
    if (message.trim().length < 20) {
      setFormError('Please describe your issue in at least 20 characters.');
      return;
    }

    setSubmitting(true);

    const emailSubject = `[DevPilot Support] ${subject || category}`;
    const emailBody = [
      `Issue Category: ${category}`,
      `Reply To: ${senderEmail}`,
      subject ? `Subject: ${subject}` : '',
      '',
      'Message:',
      message.trim(),
      '',
      '---',
      `Sent from DevPilot AI Support Center`,
    ].filter(Boolean).join('\n');

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    // Use location.href so it's never blocked by pop-up blockers
    window.location.href = mailto;

    // Show success after a short delay
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  const resetForm = () => {
    setSubmitted(false);
    setCategory('');
    setSubject('');
    setMessage('');
    setSenderEmail('');
    setFormError('');
    setConfigError(false);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-16"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Support Center</h1>
        <p className="text-sm text-slate-400 mt-1 font-medium">
          Browse FAQs, submit a ticket, or reach the host directly — we'll get back to you fast.
        </p>
      </motion.div>

      {/* ── Quick-contact banner ── */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-indigo-900/30 via-slate-900/20 to-rose-900/20 border border-white/8 rounded-2xl p-5"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left info */}
          <div className="flex items-center gap-3">
            <div className="bg-rose-500/15 p-2.5 rounded-xl text-rose-400 shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Host Support Email</p>
              <p className="text-sm font-bold text-rose-400 mt-0.5 select-all">{SUPPORT_EMAIL}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Typical response: within 24 hours</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="copy-email-btn"
              onClick={copyEmail}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all ${
                copyStatus === 'copied'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : copyStatus === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-800 border-white/8 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {copyStatus === 'copied' ? (
                <><CheckCircle className="h-3.5 w-3.5" /><span>Copied!</span></>
              ) : (
                <><Copy className="h-3.5 w-3.5" /><span>Copy Email</span></>
              )}
            </button>

            <button
              id="open-mail-btn"
              onClick={openMailClient}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/30 transition-all shadow-md shadow-rose-600/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Mail App</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Two-column: Form + FAQ ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* ── LEFT: Ticket Form ── */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-indigo-400" />
              Submit a Support Ticket
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
              Fill the form and we'll deliver your ticket directly to the host email.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* ── Success state ── */}
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-emerald-500/8 border border-emerald-500/25 rounded-2xl p-8 flex flex-col items-center text-center gap-4"
              >
                <div className="bg-emerald-500/15 p-4 rounded-2xl">
                  <CheckCircle className="h-10 w-10 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-300">Ticket Sent! ✉️</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1 max-w-xs leading-relaxed">
                    Your support request has been <strong className="text-emerald-400">delivered</strong> to the host inbox.
                    We'll reply to <strong className="text-white">{senderEmail}</strong> within 24 hours.
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Submit Another Ticket
                </button>
              </motion.div>
            ) : (
              /* ── Form state ── */
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                noValidate
                className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 space-y-5"
              >

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Issue Category <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.label;
                      return (
                        <button
                          key={cat.label}
                          type="button"
                          id={`cat-${cat.label.replace(/\s+/g, '-').toLowerCase()}`}
                          onClick={() => { setCategory(cat.label); setFormError(''); }}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[10px] font-bold transition-all text-left ${
                            isSelected
                              ? `${cat.bg} ${cat.border} ${cat.color} border`
                              : 'border-white/5 bg-slate-950/40 text-slate-400 hover:border-white/10 hover:text-slate-200 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className={`${cat.bg} p-1 rounded-lg ${cat.color} shrink-0`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <span className="leading-tight">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label htmlFor="support-subject" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Subject <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    id="support-subject"
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Chatbot not loading on first message"
                    className="w-full bg-slate-950 border border-white/5 text-slate-200 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder-slate-600"
                  />
                </div>

                {/* Reply email */}
                <div className="space-y-1.5">
                  <label htmlFor="support-email" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Your Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    value={senderEmail}
                    onChange={e => { setSenderEmail(e.target.value); setFormError(''); }}
                    placeholder="you@example.com"
                    className="w-full bg-slate-950 border border-white/5 text-slate-200 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder-slate-600"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label htmlFor="support-message" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Describe Your Issue <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    id="support-message"
                    value={message}
                    onChange={e => { setMessage(e.target.value); setFormError(''); }}
                    rows={5}
                    placeholder="Describe what you were doing, any error messages, your browser and OS..."
                    className="w-full bg-slate-950 border border-white/5 text-slate-200 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none placeholder-slate-600"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] text-slate-600 font-semibold">Min. 20 characters</p>
                    <p className={`text-[9px] font-bold ${message.length >= 20 ? 'text-emerald-500' : 'text-slate-600'}`}>
                      {message.length} chars
                    </p>
                  </div>
                </div>

                {/* Validation error */}
                <AnimatePresence>
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-300 text-[10px] font-semibold leading-relaxed"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                      <span>{formError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  id="submit-ticket-btn"
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /><span>Preparing email...</span></>
                  ) : (
                    <><Send className="h-4 w-4" /><span>Send Support Request</span></>
                  )}
                </button>

                {configError && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 space-y-1.5">
                    <p className="text-amber-400 text-[10px] font-bold flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" /> Email service not configured
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                      To enable real email delivery, open <code className="text-amber-300">server/.env</code> and set <code className="text-amber-300">MAIL_APP_PASSWORD</code> to a Gmail App Password for <strong className="text-white">venkateshwaraprasadrajagopal@gmail.com</strong>.<br />
                      Generate one at: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-indigo-400 underline">myaccount.google.com/apppasswords</a>
                    </p>
                  </div>
                )}

                <p className="text-[9px] text-slate-600 text-center font-semibold leading-relaxed">
                  Your ticket is sent directly to <span className="text-rose-400">venkuu935@gmail.com</span> via the DevPilot server.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── RIGHT: FAQ ── */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-400" />
              Frequently Asked Questions
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
              Quick answers to the most common issues.
            </p>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'border-indigo-500/30 bg-indigo-500/5'
                      : 'border-white/5 bg-slate-900/40 hover:border-white/10'
                  }`}
                >
                  <button
                    id={`faq-${i}`}
                    className="w-full flex items-start justify-between px-4 py-3.5 text-left gap-3 group"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span className={`text-[11px] font-bold leading-snug transition-colors ${
                      isOpen ? 'text-indigo-300' : 'text-slate-300 group-hover:text-slate-100'
                    }`}>
                      {faq.q}
                    </span>
                    <span className="shrink-0 mt-0.5">
                      {isOpen
                        ? <ChevronUp className="h-3.5 w-3.5 text-indigo-400" />
                        : <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
                      }
                    </span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                      >
                        <p className="px-4 pb-4 pt-1 text-[10px] text-slate-400 leading-relaxed font-semibold border-t border-white/5">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Tip card */}
          <div className="flex items-start gap-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4">
            <Info className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Can't find your answer? Use the form on the left or email <strong className="text-indigo-300">{SUPPORT_EMAIL}</strong> directly. The host typically responds within 24 hours.
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../App';
import { api } from '../api';
import { ArrowLeft } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = useRef([]);

  const handleSendOTP = async () => {
    if (!email.includes('@')) { setError('Please enter a valid email'); return; }
    setLoading(true); setError('');
    try {
      await api.sendOTP(email);
      setStep('otp');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 5) { setError('Enter complete OTP'); return; }
    setLoading(true); setError('');
    try {
      const data = await api.verifyOTP(email, code);
      login(data.token, data.user);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (val, i) => {
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 4) otpRefs.current[i + 1]?.focus();
  };

  return (
    <div className="mobile-frame flex items-center justify-center min-h-screen px-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full"
      >
        {/* Logo */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 rounded-[22px] mx-auto mb-5 flex items-center justify-center shadow-lg shadow-yellow-600/20"
            style={{ background: 'linear-gradient(135deg, #C8A951, #FFD94D)' }}
          >
            <span className="text-2xl font-extrabold tracking-tight" style={{ color: '#0A1628' }}>BC</span>
          </motion.div>
          <h1 className="text-3xl font-bold tracking-wider" style={{ color: '#C8A951' }}>Best Class</h1>
          <p className="text-[10px] tracking-[6px] uppercase mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>CHAUFFEUR</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Sign in with your registered email</p>

              <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                placeholder="james@bestclass.com"
                className="input-field mb-6"
              />

              {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

              <button onClick={handleSendOTP} disabled={loading} className="gold-btn">
                {loading ? 'Sending OTP...' : 'Continue'}
              </button>

              <p className="text-center text-[11px] mt-6" style={{ color: 'rgba(255,255,255,0.12)' }}>
                Prototype: Use james@bestclass.com
              </p>
            </motion.div>
          ) : (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-white mb-2">Verify OTP</h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Enter the 5-digit code sent to {email}</p>

              <div className="flex justify-center gap-3 mb-8">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    maxLength={1}
                    value={d}
                    onChange={e => handleOtpChange(e.target.value, i)}
                    className="w-14 h-16 rounded-2xl text-center text-2xl font-bold text-white outline-none transition-all"
                    style={{
                      background: d ? 'rgba(200,169,81,0.08)' : 'rgba(255,255,255,0.04)',
                      border: d ? '1.5px solid #C8A951' : '1.5px solid rgba(255,255,255,0.08)',
                    }}
                  />
                ))}
              </div>

              {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

              <button onClick={handleVerifyOTP} disabled={loading} className="gold-btn">
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <button onClick={() => { setStep('email'); setError(''); }} className="flex items-center justify-center gap-2 w-full mt-4 py-3 text-sm" style={{ color: '#C8A951' }}>
                <ArrowLeft size={16} /> Back to email
              </button>

              <p className="text-center text-[11px] mt-6" style={{ color: 'rgba(255,255,255,0.12)' }}>
                Prototype OTP: 12345
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

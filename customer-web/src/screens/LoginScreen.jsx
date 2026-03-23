import { useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';

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
    if (code.length !== 5) { setError('Please enter the complete OTP'); return; }
    setLoading(true); setError('');
    try {
      const data = await api.verifyOTP(email, code);
      login(data.token, data.user);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (val, idx) => {
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 4) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-8">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-14">
          <div className="w-20 h-20 rounded-3xl bg-gold flex items-center justify-center mx-auto mb-5" style={{ boxShadow: '0 8px 32px rgba(200,169,81,0.3)' }}>
            <span className="text-2xl font-extrabold text-bg tracking-tight">BC</span>
          </div>
          <h1 className="text-4xl font-bold text-gold tracking-widest">Best Class</h1>
          <p className="text-[11px] text-text-muted tracking-[3px] uppercase mt-2">Premium Chauffeur Services</p>
        </div>

        {step === 'email' ? (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome</h2>
            <p className="text-sm text-text-secondary mb-8">Book your premium chauffeur experience</p>

            <label className="block text-xs text-text-secondary mb-2 font-medium">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
              placeholder="your@email.com"
              className="input-dark mb-6"
            />

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button onClick={handleSendOTP} disabled={loading} className="btn-gold">
              {loading ? 'Sending...' : 'Continue'}
            </button>

            <p className="text-center text-[11px] text-white/10 mt-5">Prototype: richard@bestclass.com or any email</p>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Verification</h2>
            <p className="text-sm text-text-secondary mb-8">Enter the 5-digit code sent to {email}</p>

            <div className="flex justify-center gap-3 mb-8">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(e.target.value.replace(/\D/g, ''), i)}
                  onKeyDown={e => handleOtpKeyDown(e, i)}
                  className={`w-14 h-16 rounded-2xl text-center text-2xl font-bold text-white outline-none transition-all
                    ${digit ? 'bg-[rgba(200,169,81,0.06)] border-2 border-gold' : 'bg-white/[0.04] border-2 border-white/[0.08]'}`}
                />
              ))}
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button onClick={handleVerifyOTP} disabled={loading} className="btn-gold">
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <button onClick={() => { setStep('email'); setOtp(['','','','','']); setError(''); }} className="block mx-auto mt-4 text-gold text-sm">
              ← Change email
            </button>

            <p className="text-center text-[11px] text-white/10 mt-5">Prototype OTP: 12345</p>
          </div>
        )}
      </div>
    </div>
  );
}

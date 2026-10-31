import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css';

const svgProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const MailIcon = () => (
  <svg className="field__icon" viewBox="0 0 24 24" {...svgProps}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3.5 7l8.5 6 8.5-6" />
  </svg>
);

const LockIcon = () => (
  <svg className="field__icon" viewBox="0 0 24 24" {...svgProps}>
    <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 018 0v2.5" />
  </svg>
);

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...svgProps}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...svgProps} strokeWidth={2}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log({ email, remember });
    navigate('/');
  };

  return (
    <main className="login">
      <div className="login__card">
        <section className="login__hero" aria-hidden="true">
        </section>

        <section className="login__panel">
          <form className="login__form-wrap" onSubmit={handleSubmit}>
            <div className="login__logo">LQ</div>
            <h1 className="login__title">LEGACY IQ</h1>
            <p className="login__subtitle">Autonomous Legacy Modernization Agent – Sign in to access workspace.</p>

            <div className="field">
              <label className="field__label" htmlFor="email">
                Email
              </label>
              <div className="field__control">
                <MailIcon />
                <input
                  id="email"
                  className="field__input"
                  type="email"
                  placeholder="architect@tcs.modernize.ai"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="password">
                Password
              </label>
              <div className="field__control">
                <LockIcon />
                <input
                  id="password"
                  className="field__input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="field__toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </div>

            <div className="login__row">
              <label className="check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <a className="login__forgot" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                Enter as Guest
              </a>
            </div>

            <button type="submit" className="btn btn--primary">
              Access Modernization Workspace <ArrowIcon />
            </button>

            <div className="divider">OR</div>

            <button type="button" className="btn btn--outline" onClick={() => navigate('/')}>
              <GoogleIcon /> Sign in with Enterprise SSO
            </button>

            <p className="login__signup">
              TCS AI Engineering Hackathon 2026 Edition
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Disc3, Eye, EyeOff, LoaderCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register'
  const { isAuthenticated, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'listener' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isRegister) await register(form)
      else await login({ email: form.email, password: form.password })
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not complete that request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <Link to="/" className="auth-back"><ArrowLeft size={17} /> Back to home</Link>
      <div className="auth-visual"><div className="auth-orb" /><Disc3 size={210} strokeWidth={.45} /><p className="eyebrow"><Sparkles size={14} /> A home for independent sound</p><h1>Find your<br /><em>next favorite.</em></h1><p>Discover the artists shaping the future of music.</p></div>
      <div className="auth-card">
        <div className="auth-logo"><span><Disc3 size={19} /></span> Indie<span>Hub</span></div>
        <p className="eyebrow">{isRegister ? 'Start listening' : 'Welcome back'}</p>
        <h2>{isRegister ? 'Create your account' : 'Sign in to IndieHub'}</h2>
        <p className="auth-subtitle">{isRegister ? 'Join a community built around new music.' : 'Your next great discovery is waiting.'}</p>
        <form onSubmit={submit}>
          {isRegister && <label>Name<input name="name" value={form.name} onChange={update} placeholder="Your name" required /></label>}
          <label>Email<input type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com" required /></label>
          <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={update} placeholder="At least 8 characters" minLength="8" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          {isRegister && <label>I'm joining as<select name="role" value={form.role} onChange={update}><option value="listener">Listener</option><option value="artist">Artist</option></select></label>}
          {error && <div className="form-error">{error}</div>}
          <button className="button-primary auth-submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" size={17} /> : null}{isRegister ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to IndieHub?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
      </div>
    </div>
  )
}

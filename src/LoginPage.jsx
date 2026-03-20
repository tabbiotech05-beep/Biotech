import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Login failed');

            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('allowedDashboards', JSON.stringify(data.allowedDashboards));
            localStorage.setItem('role', data.role);

            if (data.role === 'pharmacienne') {
                const targetDash = data.allowedDashboards[0] || 'dashboard1';
                navigate(`/dashboard/${targetDash}`);
            } else if (data.allowedDashboards.length > 1) {
                navigate('/dashboard-selection');
            } else {
                navigate(`/dashboard/${data.allowedDashboards[0]}`);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen iso-grid-bg flex items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative floating orbs */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10 animate-spin-slow"
                style={{ background: 'radial-gradient(circle, #6366f1, transparent)', filter: 'blur(60px)' }} />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-10 animate-spin-slow"
                style={{ background: 'radial-gradient(circle, #06b6d4, transparent)', filter: 'blur(50px)', animationDirection: 'reverse' }} />

            {/* Isometric decorative shapes */}
            <div className="absolute top-10 right-10 opacity-20 animate-float" style={{ animationDelay: '0.5s' }}>
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <rect x="10" y="10" width="60" height="60" rx="8" stroke="#6366f1" strokeWidth="1.5" fill="none" />
                    <rect x="20" y="20" width="40" height="40" rx="4" stroke="#06b6d4" strokeWidth="1" fill="none" />
                </svg>
            </div>
            <div className="absolute bottom-10 left-10 opacity-20 animate-float" style={{ animationDelay: '1s' }}>
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                    <polygon points="30,5 55,50 5,50" stroke="#6366f1" strokeWidth="1.5" fill="none" />
                </svg>
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md animate-fade-up">
                <div className="iso-card p-8" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)' }}>
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse-glow shadow-lg"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #0ea5e9)' }}>
                                    <img src="/images/logo.jpg" alt="Logo" className="h-12 w-12 object-contain rounded-xl" />
                                </div>
                            </div>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-1">BIOTECH TENSHI</h1>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Système de Gestion Pharmaceutique</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-5 p-3 rounded-lg flex items-center gap-2 text-sm"
                            style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#b91c1c' }}>
                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                                style={{ color: 'var(--text-secondary)' }}>
                                Nom d'utilisateur
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="iso-input pl-10"
                                    placeholder="Entrez votre identifiant"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                                style={{ color: 'var(--text-secondary)' }}>
                                Mot de Passe
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="iso-input pl-10"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="iso-btn iso-btn-primary w-full py-3 text-base mt-2 disabled:opacity-60"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Connexion...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    Se connecter
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            © 2026 BIOTECH TENSHI · Système de Gestion
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

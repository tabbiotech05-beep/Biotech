import React, { useState, useEffect } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getMondayOfWeek(dateStr) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function getCurrentMonday() {
    const monday = getMondayOfWeek(new Date().toISOString().slice(0, 10));
    return new Date(monday).toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SectorisationDelegueView() {
    const token = localStorage.getItem('token');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMySectorisation = async () => {
            setLoading(true);
            try {
                const monday = getCurrentMonday();
                const res = await fetch(`/api/sectorisation/me?weekStart=${monday}`, {
                    headers: { 'x-auth-token': token }
                });
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error("Erreur chargement sectorisation:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMySectorisation();
    }, [token]);

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', animation: 'fadeUp 0.5s ease' }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #312e81, #4338ca)',
                borderRadius: '24px', padding: '2.5rem',
                border: '1px solid #4f46e5', marginBottom: '2rem',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(49,46,129,0.3)'
            }}>
                {/* Decorative background shapes */}
                <div style={{
                    position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)',
                    borderRadius: '50%', pointerEvents: 'none'
                }} />
                
                <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ background: 'white', padding: '0.5rem', borderRadius: '16px', display: 'flex', color: '#4338ca' }}>📍</span>
                    Ma Sectorisation
                </h1>
                <p style={{ color: '#c7d2fe', fontSize: '1.1rem', fontWeight: 500, maxWidth: '80%' }}>
                    Consultez votre zone d'affectation et les consignes pour la semaine en cours.
                </p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                    <div style={{
                        width: '50px', height: '50px', border: '5px solid #e2e8f0',
                        borderTopColor: '#6366f1', borderRadius: '50%',
                        animation: 'rotation 1s linear infinite', margin: '0 auto 1.5rem'
                    }} />
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#475569' }}>Chargement des données...</p>
                </div>
            ) : (
                <div style={{
                    background: 'white', borderRadius: '24px',
                    border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                    padding: '2.5rem', position: 'relative'
                }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: '#f1f5f9', color: '#475569',
                        padding: '0.5rem 1rem', borderRadius: '12px',
                        fontWeight: 700, fontSize: '0.9rem', marginBottom: '2rem'
                    }}>
                        <span>🗓️</span>
                        Semaine du {formatDate(data?.weekStart)} au {formatDate(data?.weekEnd)}
                    </div>

                    {!data?.defined ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.5 }}>🗺️</div>
                            <h3 style={{ fontSize: '1.5rem', color: '#1e293b', fontWeight: 800, marginBottom: '0.75rem' }}>
                                Aucune sectorisation définie
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '400px', margin: '0 auto' }}>
                                L'administrateur n'a pas encore assigné de secteur pour vous cette semaine.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {/* Secteur Card */}
                            <div style={{
                                background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                                border: '1px solid #e2e8f0', borderLeft: '6px solid #6366f1',
                                borderRadius: '16px', padding: '1.5rem'
                            }}>
                                <p style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                                    Secteur Affecté
                                </p>
                                <p style={{ color: '#0f172a', fontSize: '1.5rem', fontWeight: 800 }}>
                                    {data.secteur || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Non spécifié</span>}
                                </p>
                            </div>

                            {/* Remarque Card */}
                            <div style={{
                                background: '#fffbeb',
                                border: '1px solid #fde68a', borderLeft: '6px solid #f59e0b',
                                borderRadius: '16px', padding: '1.5rem'
                            }}>
                                <p style={{ color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                                    Remarques / Consignes
                                </p>
                                <p style={{ color: '#92400e', fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.6 }}>
                                    {data.remarque || <span style={{ opacity: 0.6, fontStyle: 'italic' }}>Aucune remarque particulière</span>}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

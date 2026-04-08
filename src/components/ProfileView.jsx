import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ProfileView() {
    const [profile, setProfile] = useState({
        username: '',
        email: '',
        carLicensePlate: '',
        carModel: '',
        profileImage: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/auth/me', {
                headers: { 'x-auth-token': token }
            });
            setProfile(res.data);
            if (res.data.profileImage) {
                setPreviewUrl(`/${res.data.profileImage}`);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching profile:', err);
            setMessage({ text: 'Erreur lors du chargement du profil', type: 'error' });
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('carLicensePlate', profile.carLicensePlate);
            formData.append('carModel', profile.carModel);
            if (selectedFile) {
                formData.append('image', selectedFile);
            }

            const res = await axios.put('/api/auth/profile', formData, {
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setProfile(res.data);
            if (res.data.profileImage) {
                setPreviewUrl(`/${res.data.profileImage}`);
            }
            setMessage({ text: 'Profil mis à jour avec succès', type: 'success' });
        } catch (err) {
            console.error('Error updating profile:', err);
            setMessage({ text: 'Erreur lors de la mise à jour du profil', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Mon Profil</h2>

            {message.text && (
                <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                    <span className="text-lg">
                        {message.type === 'success' ? '✅' : '⚠️'}
                    </span>
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Profile Image Section */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 shadow-md bg-slate-100 flex items-center justify-center">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-black text-slate-400">
                                    {profile.username ? profile.username[0].toUpperCase() : '?'}
                                </span>
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full cursor-pointer shadow-lg hover:bg-indigo-700 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 italic">Format supporté: JPG, PNG, WEBP (Max 2Mo)</p>
                </div>

                {/* Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Utilisateur</label>
                        <input
                            type="text"
                            value={profile.username}
                            disabled
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Solde Congés</label>
                        <div className="w-full px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                            <span className="text-sm font-bold text-emerald-700">Jours restants</span>
                            <span className="text-xl font-black text-emerald-800">{profile.totalLeaveDays ?? 25}</span>
                        </div>
                    </div>
                </div>

                {/* Car Section */}
                <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </div>
                    <div className="flex-1 space-y-3">
                        <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Véhicule</h3>
                        <p className="text-xs text-indigo-700/70 leading-relaxed font-medium">
                            Enregistrez votre véhicule et son matricule pour qu'ils soient automatiquement inclus dans vos notes de frais.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider ml-1">Modèle (Ex: SKODA)</label>
                                <input
                                    type="text"
                                    placeholder="Modèle voiture"
                                    value={profile.carModel}
                                    onChange={(e) => setProfile({ ...profile, carModel: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider ml-1">Matricule</label>
                                <input
                                    type="text"
                                    placeholder="123 TUN 4567"
                                    value={profile.carLicensePlate}
                                    onChange={(e) => setProfile({ ...profile, carLicensePlate: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-200"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className={`px-8 py-3 rounded-xl text-white font-black shadow-lg shadow-indigo-200 transition-all ${
                            saving ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                        }`}
                    >
                        {saving ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Enregistrement...</span>
                            </div>
                        ) : (
                            'Enregistrer les modifications'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

import React, { useEffect, useState } from 'react';

export default function PharmacienneView() {
    const [users, setUsers] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedStock, setSelectedStock] = useState(null); // Full stock object
    const [sampleCount, setSampleCount] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeAssignmentTab, setActiveAssignmentTab] = useState('sample'); // 'sample' or 'material'

    useEffect(() => {
        fetchDelegues();
        fetchStock();
    }, []);

    const fetchDelegues = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/users', {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const fetchStock = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/stock', {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setStocks(data);
            }
        } catch (err) {
            console.error("Failed to fetch stock", err);
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        if (!selectedUser || !selectedStock || !sampleCount) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/auth/users/${selectedUser._id}/samples`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    name: selectedStock.name,
                    stockId: selectedStock._id,
                    count: parseInt(sampleCount)
                })
            });

            if (res.ok) {
                setMessage('Assignation réussie !');
                setSelectedStock(null);
                setSampleCount('');
                fetchDelegues();
                fetchStock();
            } else {
                const errorData = await res.json();
                setMessage(errorData.message || 'Erreur lors de l\'assignation.');
            }
        } catch (err) {
            console.error(err);
            setMessage('Erreur serveur.');
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleResetSamples = async () => {
        if (!window.confirm("⚠️ ATTENTION : Êtes-vous sûr de vouloir réinitialiser les inventaires de TOUS les délégués ?")) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/reset-samples', {
                method: 'POST',
                headers: { 'x-auth-token': token }
            });

            if (res.ok) {
                setMessage('✅ Inventaires réinitialisés.');
                fetchDelegues();
            } else {
                setMessage('❌ Erreur lors de la réinitialisation.');
            }
        } catch (err) {
            console.error(err);
            setMessage('Erreur serveur.');
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Tableau de Bord Pharmacienne</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Assignment Form */}
                <div className="lg:col-span-1 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-semibold text-lg mb-4 text-gray-700">Assigner du Stock</h3>

                    {/* Form Tabs */}
                    <div className="flex border-b mb-4">
                        <button
                            onClick={() => { setActiveAssignmentTab('sample'); setSelectedStock(null); }}
                            className={`flex-1 py-2 text-xs font-bold uppercase transition-all ${activeAssignmentTab === 'sample' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Médicaments
                        </button>
                        <button
                            onClick={() => { setActiveAssignmentTab('material'); setSelectedStock(null); }}
                            className={`flex-1 py-2 text-xs font-bold uppercase transition-all ${activeAssignmentTab === 'material' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Matériel Promo
                        </button>
                    </div>

                    {message && (
                        <div className={`p-3 mb-4 rounded-md text-sm border ${message.includes('réussie') || message.includes('✅') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleAssign} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Délégué</label>
                            <select
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                                value={selectedUser ? selectedUser._id : ''}
                                onChange={(e) => setSelectedUser(users.find(u => u._id === e.target.value))}
                                required
                            >
                                <option value="">Choisir un délégué...</option>
                                {users.map(user => (
                                    <option key={user._id} value={user._id}>{user.username} ({user.email})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {activeAssignmentTab === 'sample' ? 'Produit et N° de Lot' : 'Article Promotionnel'}
                            </label>
                            <select
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                                value={selectedStock ? selectedStock._id : ''}
                                onChange={(e) => setSelectedStock(stocks.find(s => s._id === e.target.value))}
                                required
                            >
                                <option value="">Choisir un article...</option>
                                {stocks
                                    .filter(s => (s.type || 'sample') === activeAssignmentTab && s.quantity > 0)
                                    .map((stock) => (
                                        <option key={stock._id} value={stock._id}>
                                            {stock.name} {activeAssignmentTab === 'sample' && `- Lot: ${stock.batchNumber}`} (Dispo: {stock.quantity})
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité à donner</label>
                            <input
                                type="number"
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                                placeholder={`ex: max ${selectedStock ? selectedStock.quantity : 10}`}
                                value={sampleCount}
                                onChange={(e) => setSampleCount(e.target.value)}
                                required
                                min="1"
                                max={selectedStock ? selectedStock.quantity : undefined}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !selectedUser || !selectedStock}
                            className={`w-full py-3 px-4 rounded-md text-white font-bold transition-all shadow-md active:scale-95 ${loading || !selectedUser || !selectedStock ? 'bg-gray-400 cursor-not-allowed' : (activeAssignmentTab === 'sample' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700')}`}
                        >
                            {loading ? 'Traitement...' : 'Confirmer l\'Assignation'}
                        </button>
                    </form>
                </div>

                {/* Right: List of Delegates */}
                <div className="lg:col-span-2">
                    <h3 className="font-semibold text-lg mb-4 text-gray-700">Inventaire des Délégués</h3>
                    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Délégué</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médicaments</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matériel Promo</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">Aucun délégué trouvé.</td>
                                    </tr>
                                ) : (
                                    users.map(user => {
                                        const samples = user.samples.filter(s => (s.itemType || 'sample') === 'sample');
                                        const materials = user.samples.filter(s => s.itemType === 'material');

                                        return (
                                            <tr key={user._id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedUser?._id === user._id ? 'bg-blue-50/50' : ''}`} onClick={() => setSelectedUser(user)}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-gray-900">{user.username}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs">
                                                    {samples.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {samples.map((s, idx) => (
                                                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                                                                    {s.name}: {s.count}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : <span className="text-gray-300 italic">Aucun</span>}
                                                </td>
                                                <td className="px-6 py-4 text-xs">
                                                    {materials.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {materials.map((s, idx) => (
                                                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                                    {s.name}: {s.count}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : <span className="text-gray-300 italic">Aucun</span>}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Reset Button (Bottom) */}
            <div className="lg:col-span-3 mt-4 flex justify-end">
                <button
                    onClick={handleResetSamples}
                    disabled={loading}
                    className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Réinitialiser tous les inventaires
                </button>
            </div>
        </div>
    );
}

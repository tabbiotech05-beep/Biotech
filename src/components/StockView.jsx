import React, { useEffect, useState } from 'react';

export default function StockView() {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('sample'); // 'sample' or 'material'
    const [newItem, setNewItem] = useState({
        name: '',
        quantity: '',
        expiryDate: '',
        batchNumber: '',
        type: 'sample',
        creationDate: new Date().toISOString().split('T')[0]
    });
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchStock();
    }, []);

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
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    ...newItem,
                    quantity: parseInt(newItem.quantity),
                    type: newItem.type
                })
            });

            if (res.ok) {
                setMessage('Article ajouté !');
                setNewItem({
                    name: '',
                    quantity: '',
                    expiryDate: '',
                    batchNumber: '',
                    type: newItem.type, // Keep the same type for convenience
                    creationDate: new Date().toISOString().split('T')[0]
                });
                fetchStock();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Erreur lors de l\'ajout');
            }
        } catch (err) {
            console.error(err);
            setMessage('Erreur serveur');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cet article ?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/stock/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });

            if (res.ok) {
                setMessage('Article supprimé.');
                fetchStock();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const isExpiringSoon = (expiryDate) => {
        if (!expiryDate) return false;
        const today = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(today.getMonth() + 6);
        return new Date(expiryDate) <= sixMonthsFromNow;
    };

    const filteredStocks = stocks.filter(s => (s.type || 'sample') === activeTab);

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Gestion du Stock
            </h2>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b">
                <button
                    onClick={() => setActiveTab('sample')}
                    className={`pb-2 px-4 font-bold transition-all ${activeTab === 'sample' ? 'border-b-4 border-green-600 text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Médicaments (Échantillons)
                </button>
                <button
                    onClick={() => setActiveTab('material')}
                    className={`pb-2 px-4 font-bold transition-all ${activeTab === 'material' ? 'border-b-4 border-blue-600 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Matériel Promotionnel
                </button>
            </div>

            {/* Add New Item Form */}
            <div className={`mb-8 p-6 rounded-lg border shadow-sm ${activeTab === 'sample' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">
                    Ajouter {activeTab === 'sample' ? 'un médicament' : 'un article promotionnel'}
                </h3>
                {message && (
                    <div className={`mb-4 p-3 rounded-md text-sm ${message.includes('Erreur') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleAdd} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du Produit</label>
                            <input
                                type="text"
                                required
                                placeholder={activeTab === 'sample' ? "ex: Doliprane" : "ex: Stylo, Fiche Pozo"}
                                className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 shadow-sm"
                                value={newItem.name}
                                onChange={e => setNewItem({ ...newItem, name: e.target.value, type: activeTab })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {activeTab === 'sample' ? 'N° de Lot' : 'Référence (Optionnel)'}
                            </label>
                            <input
                                type="text"
                                required={activeTab === 'sample'}
                                placeholder="ex: LOT-2023-A"
                                className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 shadow-sm"
                                value={newItem.batchNumber}
                                onChange={e => setNewItem({ ...newItem, batchNumber: e.target.value, type: activeTab })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                            <input
                                type="number"
                                required
                                min="1"
                                placeholder="ex: 100"
                                className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 shadow-sm"
                                value={newItem.quantity}
                                onChange={e => setNewItem({ ...newItem, quantity: e.target.value, type: activeTab })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Création</label>
                            <input
                                type="date"
                                required
                                className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 shadow-sm"
                                value={newItem.creationDate}
                                onChange={e => setNewItem({ ...newItem, creationDate: e.target.value, type: activeTab })}
                            />
                        </div>
                        {activeTab === 'sample' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'Expiration</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-green-500 shadow-sm"
                                    value={newItem.expiryDate}
                                    onChange={e => setNewItem({ ...newItem, expiryDate: e.target.value, type: activeTab })}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className={`${activeTab === 'sample' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 px-8 rounded-md font-bold shadow-md transition-all active:scale-95`}>
                            Ajouter au Stock
                        </button>
                    </div>
                </form>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500 italic">Chargement du stock...</div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Produit</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {activeTab === 'sample' ? 'N° Lot' : 'Référence'}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantité</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Création</th>
                                {activeTab === 'sample' && <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiration</th>}
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStocks.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === 'sample' ? "6" : "5"} className="px-6 py-10 text-center text-sm text-gray-400 italic">
                                        Aucun article touvé dans cette catégorie.
                                    </td>
                                </tr>
                            ) : (
                                filteredStocks.map(item => {
                                    const expiringSoon = isExpiringSoon(item.expiryDate);
                                    return (
                                        <tr key={item._id} className={`${expiringSoon ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'} transition-colors`}>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${expiringSoon ? 'text-red-900' : (activeTab === 'sample' ? 'text-indigo-900' : 'text-blue-900')}`}>{item.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`${expiringSoon ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200'} px-2 py-1 rounded border font-mono text-xs`}>
                                                    {item.batchNumber || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-3 py-1 rounded-full font-bold text-sm ${item.quantity < 10 ? 'bg-red-100 text-red-700' : (expiringSoon ? 'bg-red-200 text-red-800' : (activeTab === 'sample' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'))}`}>
                                                    {item.quantity}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${expiringSoon ? 'text-red-600' : 'text-gray-500'}`}>
                                                {new Date(item.creationDate).toLocaleDateString('fr-FR')}
                                            </td>
                                            {activeTab === 'sample' && (
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${expiringSoon ? 'text-red-700' : 'text-gray-500 font-medium'}`}>
                                                    {new Date(item.expiryDate).toLocaleDateString('fr-FR')}
                                                    {expiringSoon && <span className="ml-2 text-[10px] uppercase font-bold text-red-600 bg-red-100 px-1 rounded">Exp proche</span>}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <button
                                                    onClick={() => handleDelete(item._id)}
                                                    className={`${expiringSoon ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-500 hover:text-white hover:bg-red-500'} px-3 py-1 rounded-md transition-all font-medium border border-red-200`}
                                                >
                                                    Supprimer
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

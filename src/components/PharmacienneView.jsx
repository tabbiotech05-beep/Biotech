import React, { useEffect, useState } from 'react';

export default function PharmacienneView() {
    const [users, setUsers] = useState([]);
    const [stocks, setStocks] = useState([]);
    
    // Batch Assignment State
    const [selectedUsers, setSelectedUsers] = useState([]); // array of user IDs
    const [quantities, setQuantities] = useState({}); // { stockId: count }

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeAssignmentTab, setActiveAssignmentTab] = useState('sample'); // 'sample' or 'material'

    // Return Modal State
    const [returnModal, setReturnModal] = useState({
        isOpen: false,
        delegateId: null,
        delegateName: '',
        sampleName: '',
        batchNumber: '',
        itemType: 'sample',
        maxCount: 0,
        returnCount: ''
    });

    const [expiryEditModal, setExpiryEditModal] = useState({
        isOpen: false,
        stockId: null,
        stockName: '',
        currentExpiry: ''
    });

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

    const toggleUser = (id) => {
        if (selectedUsers.includes(id)) {
            setSelectedUsers(selectedUsers.filter(uid => uid !== id));
        } else {
            setSelectedUsers([...selectedUsers, id]);
        }
    };

    const selectAllUsers = () => {
        setSelectedUsers(users.map(u => u._id));
    };

    const clearUserSelection = () => {
        setSelectedUsers([]);
    };

    const handleQuantityChange = (stockId, value) => {
        setQuantities({
            ...quantities,
            [stockId]: value
        });
    };

    const handleBatchAssign = async () => {
        if (selectedUsers.length === 0) {
            setMessage('Sélectionnez au moins un délégué');
            return;
        }

        const assignments = [];
        for (const [stockId, countStr] of Object.entries(quantities)) {
            const count = parseInt(countStr);
            if (count && count > 0) {
                const s = stocks.find(st => st._id === stockId);
                if (s) {
                    assignments.push({
                        stockId: s._id,
                        name: s.name,
                        count: count
                    });
                }
            }
        }

        if (assignments.length === 0) {
            setMessage('Veuillez spécifier au moins une quantité valide > 0');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/auth/batch-assign-samples`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    userIds: selectedUsers,
                    assignments
                })
            });

            if (res.ok) {
                setMessage('✅ Assignation en masse réussie !');
                setQuantities({});
                setSelectedUsers([]);
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
            setTimeout(() => setMessage(''), 5000);
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

    const handleOpenReturnModal = (delegate, sample) => {
        setReturnModal({
            isOpen: true,
            delegateId: delegate._id,
            delegateName: delegate.username,
            sampleName: sample.name,
            batchNumber: sample.batchNumber,
            itemType: sample.itemType || 'sample',
            maxCount: sample.count,
            returnCount: sample.count // Default to returning all
        });
    };

    const handleCloseReturnModal = () => {
        setReturnModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleReturnSubmit = async (e) => {
        e.preventDefault();
        const count = parseInt(returnModal.returnCount, 10);
        if (isNaN(count) || count <= 0 || count > returnModal.maxCount) {
            alert('Veuillez entrer une quantité valide.');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/auth/return-samples`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    delegateId: returnModal.delegateId,
                    sampleName: returnModal.sampleName,
                    batchNumber: returnModal.batchNumber,
                    itemType: returnModal.itemType,
                    returnCount: count
                })
            });

            if (res.ok) {
                setMessage('✅ Restitution effectuée avec succès !');
                handleCloseReturnModal();
                fetchDelegues();
                fetchStock();
            } else {
                const errorData = await res.json();
                alert(errorData.message || 'Erreur lors de la restitution.');
            }
        } catch (err) {
            console.error(err);
            alert('Erreur serveur.');
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleOpenExpiryEdit = (stock) => {
        setExpiryEditModal({
            isOpen: true,
            stockId: stock._id,
            stockName: stock.name,
            currentExpiry: stock.expiryDate ? new Date(stock.expiryDate).toISOString().split('T')[0] : ''
        });
    };

    const handleCloseExpiryEdit = () => {
        setExpiryEditModal({ ...expiryEditModal, isOpen: false });
    };

    const handleExpirySubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/stock/${expiryEditModal.stockId}/expiry`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    expiryDate: expiryEditModal.currentExpiry
                })
            });

            if (res.ok) {
                setMessage('✅ Date de péremption modifiée avec succès !');
                handleCloseExpiryEdit();
                fetchStock();
            } else {
                const errorData = await res.json();
                alert(errorData.message || 'Erreur lors de la modification.');
            }
        } catch (err) {
            console.error(err);
            alert('Erreur serveur.');
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    // Derived states
    const filteredStocks = stocks.filter(s => (s.type || 'sample') === activeAssignmentTab && s.quantity > 0);

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Tableau de Bord Pharmacienne</h2>

            {message && (
                <div className={`p-4 mb-6 rounded-md text-sm border font-medium ${message.includes('réussie') || message.includes('✅') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {message}
                </div>
            )}

            <div className="flex flex-col xl:flex-row gap-8">
                {/* Left side: Batch Assignment Workspace */}
                <div className="xl:w-3/5 flex flex-col gap-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-800 mb-4 pb-2 border-b border-gray-300">
                            1. Sélection des Délégués
                        </h3>
                        <div className="flex gap-2 mb-4">
                            <button onClick={selectAllUsers} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition-colors text-gray-700 font-medium">Tout sélectionner</button>
                            <button onClick={clearUserSelection} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition-colors text-gray-700 font-medium">Tout effacer</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {users.map(user => (
                                <label key={user._id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedUsers.includes(user._id) ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200 hover:bg-gray-100'}`}>
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" 
                                        checked={selectedUsers.includes(user._id)}
                                        onChange={() => toggleUser(user._id)}
                                    />
                                    <span className="text-sm font-medium text-gray-700 truncate">{user.username}</span>
                                </label>
                            ))}
                        </div>
                        <div className="mt-3 text-xs text-indigo-600 font-bold">
                            {selectedUsers.length} délégué(s) sélectionné(s)
                        </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-800 mb-4 pb-2 border-b border-gray-300">
                            2. Quantités à Assigner (Par Délégué)
                        </h3>

                        {/* Form Tabs */}
                        <div className="flex border-b border-gray-300 mb-4">
                            <button
                                onClick={() => setActiveAssignmentTab('sample')}
                                className={`flex-1 py-3 text-sm font-bold uppercase transition-all ${activeAssignmentTab === 'sample' ? 'text-green-700 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:bg-white'}`}
                            >
                                Médicaments
                            </button>
                            <button
                                onClick={() => setActiveAssignmentTab('material')}
                                className={`flex-1 py-3 text-sm font-bold uppercase transition-all ${activeAssignmentTab === 'material' ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-white'}`}
                            >
                                Matériel Promo
                            </button>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100/50">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 border-b">Produit</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 border-b">Dispo. (Total)</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 border-b w-32">Qté par délégué</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStocks.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-8 text-center text-gray-400 italic">
                                                Aucun produit disponible en stock.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStocks.map(stock => {
                                            const totalNeeded = (parseInt(quantities[stock._id]) || 0) * (selectedUsers.length || 1);
                                            const isOver = totalNeeded > stock.quantity;
                                            return (
                                                <tr key={stock._id} className="border-b last:border-0 hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm font-bold text-gray-800">{stock.name}</div>
                                                        {activeAssignmentTab === 'sample' && (
                                                            <div className="text-xs text-gray-500 font-mono mt-1 flex flex-col gap-1">
                                                                <span>Lot: {stock.batchNumber}</span>
                                                                <span className="flex items-center gap-2">
                                                                    Péremption: {stock.expiryDate ? new Date(stock.expiryDate).toLocaleDateString('fr-FR') : 'N/A'}
                                                                    <button 
                                                                        onClick={() => handleOpenExpiryEdit(stock)}
                                                                        className="text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 p-1 rounded"
                                                                        title="Modifier la date de péremption"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                        </svg>
                                                                    </button>
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                                                        {stock.quantity}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            value={quantities[stock._id] || ''}
                                                            onChange={(e) => handleQuantityChange(stock._id, e.target.value)}
                                                            className={`w-full text-center border rounded-md p-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isOver ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <button
                            onClick={handleBatchAssign}
                            disabled={loading || selectedUsers.length === 0}
                            className={`mt-6 w-full py-4 rounded-xl text-white font-bold text-lg transition-all shadow-md active:scale-[0.98] flex justify-center items-center gap-2 ${loading || selectedUsers.length === 0 ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'}`}
                        >
                            {loading ? (
                                <span>Traitement en cours...</span>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Assigner aux {selectedUsers.length} délégué(s)
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right side: Inventaire des délégués (Preview) */}
                <div className="xl:w-2/5">
                    <h3 className="font-semibold text-lg mb-4 text-gray-700">Inventaire Actuel des Délégués</h3>
                    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 h-full max-h-[800px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Délégué</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Possessions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="2" className="px-6 py-4 text-center text-sm text-gray-500">Aucun délégué trouvé.</td>
                                    </tr>
                                ) : (
                                    users.map(user => {
                                        const samples = (user.samples || []).filter(s => (s.itemType || 'sample') === 'sample');
                                        const materials = (user.samples || []).filter(s => s.itemType === 'material');

                                        return (
                                            <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 align-top">
                                                    <div className="text-sm font-bold text-gray-900">{user.username}</div>
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {samples.length === 0 && materials.length === 0 ? (
                                                        <span className="text-gray-400 italic">Vide</span>
                                                    ) : (
                                                        <div className="flex flex-col gap-1.5">
                                                            {samples.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {samples.map((s, idx) => (
                                                                        <button 
                                                                            key={idx} 
                                                                            onClick={() => handleOpenReturnModal(user, s)}
                                                                            title="Cliquer pour restituer ce produit"
                                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:border-green-300 transition-colors"
                                                                        >
                                                                            {s.name}: {s.count} <span className="text-[8px] opacity-70 ml-0.5">↺</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {materials.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {materials.map((m, idx) => (
                                                                        <button 
                                                                            key={idx} 
                                                                            onClick={() => handleOpenReturnModal(user, m)}
                                                                            title="Cliquer pour restituer ce matériel"
                                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                                                                        >
                                                                            {m.name}: {m.count} <span className="text-[8px] opacity-70 ml-0.5">↺</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
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
            <div className="mt-8 flex justify-end border-t border-gray-100 pt-6">
                <button
                    onClick={handleResetSamples}
                    disabled={loading}
                    className="bg-white text-red-600 hover:bg-red-50 border border-red-200 px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Réinitialiser tous les inventaires
                </button>
            </div>

            {/* Return Modal Overlay */}
            {returnModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-lg">Restituer au stock</h3>
                            <button onClick={handleCloseReturnModal} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleReturnSubmit} className="p-6">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-1">Délégué : <strong className="text-gray-900">{returnModal.delegateName}</strong></p>
                                <p className="text-sm text-gray-600 mb-1">Produit : <strong className="text-gray-900">{returnModal.sampleName}</strong> {returnModal.batchNumber && <span className="text-xs text-gray-500 font-mono">(Lot: {returnModal.batchNumber})</span>}</p>
                                <p className="text-sm text-gray-600 mb-4">Quantité possédée : <strong className="text-indigo-600">{returnModal.maxCount}</strong></p>
                                
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantité à restituer</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max={returnModal.maxCount}
                                    value={returnModal.returnCount}
                                    onChange={(e) => setReturnModal({...returnModal, returnCount: e.target.value})}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-3"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button 
                                    type="button" 
                                    onClick={handleCloseReturnModal}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                >
                                    Annuler
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Traitement...' : 'Confirmer restitution'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Expiry Edit Modal Overlay */}
            {expiryEditModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-lg">Modifier la Péremption</h3>
                            <button onClick={handleCloseExpiryEdit} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleExpirySubmit} className="p-6">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-4">Produit : <strong className="text-gray-900">{expiryEditModal.stockName}</strong></p>
                                
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nouvelle Date de Péremption</label>
                                <input 
                                    type="date"
                                    value={expiryEditModal.currentExpiry}
                                    onChange={(e) => setExpiryEditModal({...expiryEditModal, currentExpiry: e.target.value})}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-3"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button 
                                    type="button" 
                                    onClick={handleCloseExpiryEdit}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                >
                                    Annuler
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Traitement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

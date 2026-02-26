import React from 'react';
import { Plus, Trash2, Code, Terminal, Search } from 'lucide-react';

const PracticeListView = ({ challenges, navigate, handleDelete }) => {
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-primary-900">Practice Arena</h1>
                    <p className="text-slate-500 mt-1">Manage coding challenges for students</p>
                </div>
                <button
                    onClick={() => navigate('new')}
                    className="btn-instructor-primary flex items-center gap-2"
                >
                    <Plus size={18} /> Create Challenge
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {challenges.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <Terminal size={48} className="mx-auto mb-4 opacity-20" />
                        <h3 className="font-bold text-lg text-slate-700">No Challenges Yet</h3>
                        <p className="text-sm mb-6">Create your first coding practice challenge</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="p-4 pl-6">Title</th>
                                    <th className="p-4">Difficulty</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4 text-right pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {challenges.map((item) => (
                                    <tr key={item.challenge_id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="font-bold text-slate-800">{item.title}</div>
                                            <div className="text-xs text-slate-500 line-clamp-1 max-w-sm">{item.description}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                                                    item.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-rose-100 text-rose-700'
                                                }`}>
                                                {item.difficulty}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs font-mono text-slate-500 uppercase">{item.type}</td>
                                        <td className="p-4 text-right pr-6">
                                            <button
                                                onClick={() => handleDelete(item.challenge_id)}
                                                className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-colors"
                                                title="Delete Challenge"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PracticeListView;

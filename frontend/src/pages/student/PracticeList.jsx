import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import api from '../../api/axios';
import { auth } from '../../auth/firebase';

const PracticeList = () => {
    const navigate = useNavigate();
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChallenges = async () => {
            if (!auth.currentUser) return;
            try {
                const token = await auth.currentUser.getIdToken();
                const res = await api.get('/api/practice', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setChallenges(res.data);
            } catch (err) {
                console.error("Failed to fetch challenges", err);
            } finally {
                setLoading(false);
            }
        };
        fetchChallenges();
    }, []);

    const getDifficultyColor = (diff) => {
        switch (diff?.toLowerCase()) {
            case 'easy': return 'bg-green-100 text-green-700';
            case 'medium': return 'bg-yellow-100 text-yellow-700';
            case 'hard': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading challenges...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-primary-900 mb-2">Practice Zone</h1>
                <p className="text-slate-500">Sharpen your coding skills with these challenges.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {challenges.map(challenge => (
                    <div
                        key={challenge.challenge_id}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all p-6 cursor-pointer group"
                        onClick={() => navigate(`/student/practice/session/${challenge.challenge_id}`)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Code size={20} />
                            </div>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${getDifficultyColor(challenge.difficulty)}`}>
                                {challenge.difficulty}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">
                            {challenge.title}
                        </h3>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                            {challenge.description}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            {/* Placeholder stats */}
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Clock size={14} /> 15 mins
                            </div>
                            <button className="text-sm font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                Solve <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {challenges.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <Code size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No active challenges found.</p>
                </div>
            )}
        </div>
    );
};

export default PracticeList;

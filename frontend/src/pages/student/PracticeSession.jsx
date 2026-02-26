import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import ProblemDescription from '../../components/exam/ProblemDescription';
import CodeEditorPanel from '../../components/exam/CodeEditorPanel';
import api from '../../api/axios';

const PracticeSession = ({ question: propQuestion, value, onChange }) => {
    const { challengeId } = useParams();
    const navigate = useNavigate();

    const isEmbedded = !!propQuestion;

    const [fetchedQuestion, setFetchedQuestion] = useState(null);
    const [loading, setLoading] = useState(!isEmbedded);
    const [consoleOutput, setConsoleOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('javascript');
    const [code, setCode] = useState('');

    const question = isEmbedded ? propQuestion : fetchedQuestion;

    const languageTemplates = {
        javascript: '// Write your JavaScript code here\n',
        python: '# Write your Python code here\n',
        java: '// Write your Java code here\npublic class Solution {\n    // methods\n}',
        cpp: '// Write your C++ code here\n',
        go: '// Write your Go code here\n'
    };

    // ✅ Fetch question from backend
useEffect(() => {
    if (isEmbedded) {
        setCode(value || propQuestion.starterCode || languageTemplates.javascript);
        setLoading(false);
        return;
    }

    const fetchQuestion = async () => {
        try {
            const res = await api.get(`/api/practice/${challengeId}`);

            const data = res.data;

            // 🔥 map DB → frontend
            const mapped = {
                id: data.challenge_id,
                title: data.title,
                description: data.description,
                starterCode: data.starter_code,
                testCases: data.test_cases
            };

            setFetchedQuestion(mapped);
            setCode(mapped.starterCode || languageTemplates.javascript);

        } catch (err) {
            console.error("Failed to fetch challenge:", err);
        }
        setLoading(false);
    };

    fetchQuestion();
}, [challengeId, isEmbedded, propQuestion, value]);


    const handleLanguageChange = (lang) => {
        setSelectedLanguage(lang);
        const template = languageTemplates[lang] || '';
        setCode(template);
        if (isEmbedded && onChange) onChange(template);
    };

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        if (isEmbedded && onChange) onChange(newCode);
    };

    // ✅ Send code to backend instead of Piston
 const handleRun = async () => {
    setIsRunning(true);
    setConsoleOutput([]);

    try {
        const res = await api.post('/api/practice/run', {
            code,
            language: selectedLanguage,
            challengeId
        });

        setConsoleOutput(res.data.results);
    } catch (err) {
        setConsoleOutput([
            { type: 'error', msg: err.response?.data?.message || err.message }
        ]);
    }

    setIsRunning(false);
};


    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading challenge...</div>;
    }

    if (!question) {
        return <div className="p-8 text-center text-slate-500">Challenge not found.</div>;
    }

    const content = (
        <div className="flex h-full overflow-hidden">
            <div className="w-[40%] h-full border-r border-slate-200 bg-slate-50">
                <ProblemDescription question={question} />
            </div>

            <div className="w-[60%] h-full relative">
                <CodeEditorPanel
                    question={question}
                    startCode={code}
                    language={selectedLanguage}
                    onLanguageChange={handleLanguageChange}
                    onCodeChange={handleCodeChange}
                    onRun={handleRun}
                    onSubmit={isEmbedded ? null : () => {}}
                    isRunning={isRunning}
                    consoleOutput={consoleOutput}
                    isEmbedded={isEmbedded}
                />
            </div>
        </div>
    );

    if (isEmbedded) {
        return (
            <div className="h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {content}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden m-6">
            <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                <button
                    onClick={() => navigate('/student/practice')}
                    className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2"
                >
                    &larr; Back to Challenges
                </button>
            </div>
            <div className="flex-1 overflow-hidden">{content}</div>
        </div>
    );
};

export default PracticeSession;

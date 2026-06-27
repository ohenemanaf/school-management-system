import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { 
    IconReportAnalytics, 
    IconTrendingUp, 
    IconTrophy,
    IconBooks,
    IconAward
} from '@tabler/icons-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const StudentResults = () => {
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGrades = async () => {
            try {
                const response = await api.get('/grades');
                setGrades(response.data);
            } catch (error) {
                console.error('Failed to fetch grades:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchGrades();
    }, []);

    if (loading) {
        return (
            <div className="p-6 lg:p-10 flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    // --- Data Processing ---
    // 1. Map to raw percentages
    const processedGrades = grades.map(g => ({
        ...g,
        percentage: (Number(g.score) / Number(g.max_score)) * 100,
        dateObj: new Date(g.created_at)
    }));

    // 2. Compute Overall Stats
    const totalAssessments = processedGrades.length;
    const overallAverage = totalAssessments > 0 
        ? processedGrades.reduce((acc, curr) => acc + curr.percentage, 0) / totalAssessments 
        : 0;

    // 3. Subject Averages (For Bar Chart & Radar & Best Subject)
    const subjectMap = {};
    processedGrades.forEach(g => {
        if (!subjectMap[g.class_name]) {
            subjectMap[g.class_name] = { totalPercentage: 0, count: 0 };
        }
        subjectMap[g.class_name].totalPercentage += g.percentage;
        subjectMap[g.class_name].count += 1;
    });

    const subjectData = Object.keys(subjectMap).map(subject => ({
        subject,
        average: Number((subjectMap[subject].totalPercentage / subjectMap[subject].count).toFixed(2)),
        fullMark: 100
    }));

    // Find Best Subject
    let bestSubject = { name: 'N/A', average: 0 };
    subjectData.forEach(sub => {
        if (sub.average > bestSubject.average) {
            bestSubject = { name: sub.subject, average: sub.average };
        }
    });

    // 4. Trend over time (Line Chart)
    // Sort chronological
    const trendData = [...processedGrades]
        .sort((a, b) => a.dateObj - b.dateObj)
        .map(g => ({
            name: g.assessment_name,
            score: Number(g.percentage.toFixed(2)),
            subject: g.class_name
        }));

    return (
        <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                    <IconReportAnalytics size={36} className="text-primary-600" />
                    My Results & Analysis
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Track your academic progress and analytical performance.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-primary-500 to-indigo-400 opacity-10 rounded-bl-full transition-transform group-hover:scale-110"></div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-400 text-white flex items-center justify-center mb-4 shadow-lg">
                        <IconTrendingUp size={24} />
                    </div>
                    <p className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                        {totalAssessments > 0 ? overallAverage.toFixed(1) : '--'}%
                    </p>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Average</span>
                </div>

                <div className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-400 opacity-10 rounded-bl-full transition-transform group-hover:scale-110"></div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white flex items-center justify-center mb-4 shadow-lg">
                        <IconTrophy size={24} />
                    </div>
                    <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-1 truncate">
                        {bestSubject.name}
                    </p>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Best Subject ({bestSubject.average.toFixed(1)}%)</span>
                </div>

                <div className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-400 opacity-10 rounded-bl-full transition-transform group-hover:scale-110"></div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 text-white flex items-center justify-center mb-4 shadow-lg">
                        <IconBooks size={24} />
                    </div>
                    <p className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                        {totalAssessments}
                    </p>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Assessments</span>
                </div>
            </div>

            {totalAssessments === 0 ? (
                <div className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 rounded-3xl p-12 text-center shadow-sm">
                    <IconAward size={48} className="mx-auto text-slate-300 mb-4" />
                    <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Results Found</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Your grades will appear here and graphs will automatically generate once your lecturers publish your results.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Performance Trend (Line Chart) */}
                    <div className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-6 lg:col-span-2">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                            <span className="w-2 h-6 bg-primary-500 rounded-full"></span>
                            Performance Trend
                        </h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value, name, props) => [`${value}%`, props.payload.subject]}
                                    />
                                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Subject Proficiency (Bar Chart) */}
                    <div className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                            Subject Averages
                        </h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={subjectData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                    <YAxis type="category" dataKey="subject" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={100} />
                                    <RechartsTooltip 
                                        cursor={{fill: '#f8fafc'}}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [`${value}%`, 'Average']}
                                    />
                                    <Bar dataKey="average" fill="#10b981" radius={[0, 6, 6, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Cognitive Mapping (Radar Chart) */}
                    <div className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                            <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
                            Skill Mapping
                        </h3>
                        <div className="h-72 w-full flex items-center justify-center">
                            {subjectData.length >= 3 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={subjectData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Student" dataKey="average" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                                        <RechartsTooltip formatter={(value) => [`${value}%`, 'Proficiency']} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-slate-400 text-sm font-medium text-center px-4">Need grades in at least 3 subjects to map cognitive radar.</p>
                            )}
                        </div>
                    </div>

                    {/* Detailed Grades Table */}
                    <div className="glass bg-white dark:bg-slate-800/70 border border-white dark:border-slate-700/50 shadow-sm rounded-3xl p-6 lg:col-span-2 overflow-hidden flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 shrink-0">
                            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                            Recent Assessments
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                                        <th className="px-6 py-4 rounded-tl-xl">Assessment</th>
                                        <th className="px-6 py-4">Subject</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Score</th>
                                        <th className="px-6 py-4 text-right rounded-tr-xl">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/50 text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {processedGrades.map(g => (
                                        <tr key={g.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{g.assessment_name}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{g.class_name}</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{g.dateObj.toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right font-bold">
                                                {g.score} <span className="text-slate-400 text-xs font-normal">/ {g.max_score}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    g.percentage >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                    g.percentage >= 60 ? 'bg-blue-100 text-blue-700' :
                                                    g.percentage >= 40 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {g.percentage >= 80 ? 'A' : g.percentage >= 60 ? 'B' : g.percentage >= 40 ? 'C' : 'F'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentResults;

import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconPlus, IconX } from '@tabler/icons-react';
import api from '../../utils/api';
import { Panel, Button, Input, Select, Badge, Note } from './ui';
import { errorMessage } from './constants';

// Streams (Gold, Diamond, …) and which stream each class belongs to.
const ClassesTab = ({ setup, reload }) => {
    const [name, setName] = useState('');

    const run = async (fn, success) => {
        try {
            await fn();
            if (success) toast.success(success);
            await reload();
        } catch (error) {
            toast.error(errorMessage(error, 'Something went wrong'));
        }
    };

    const addStream = (e) => {
        e.preventDefault();
        run(async () => { await api.post('/scheduler/streams', { name: name.trim(), sort_order: setup.streams.length }); setName(''); }, 'Stream added');
    };

    const byLevel = setup.classes.reduce((map, c) => {
        const level = c.level || 'No level';
        (map[level] = map[level] || []).push(c);
        return map;
    }, {});

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Panel title="Streams" subtitle="Parallel sections of the same level, e.g. Form 1 Gold and Form 1 Diamond.">
                <form onSubmit={addStream} className="flex gap-2 mb-4">
                    <Input required maxLength={50} placeholder="e.g. Gold" value={name} onChange={(e) => setName(e.target.value)} />
                    <Button type="submit" variant="primary"><IconPlus size={16} /> Add</Button>
                </form>
                {setup.streams.length === 0 ? <Note>No streams yet.</Note> : (
                    <div className="flex flex-wrap gap-2">
                        {setup.streams.map((s) => (
                            <span key={s.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 text-sm font-semibold">
                                {s.name}
                                <button type="button" aria-label={`Remove ${s.name}`} className="p-0.5 rounded-full hover:bg-primary-100 dark:hover:bg-primary-500/20 cursor-pointer"
                                    onClick={() => window.confirm(`Remove the ${s.name} stream? Its classes stay, without a stream.`) && run(() => api.delete(`/scheduler/streams/${s.id}`), 'Stream removed')}>
                                    <IconX size={14} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </Panel>

            <div className="xl:col-span-2">
                <Panel title="Classes by level" subtitle="Classes come from the Classes page. Give each one its stream here.">
                    {setup.classes.length === 0 ? <Note>No classes yet. Create them on the Classes page first.</Note> : (
                        <div className="flex flex-col gap-5">
                            {Object.entries(byLevel).map(([level, classes]) => (
                                <div key={level}>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{level}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {classes.map((c) => (
                                            <div key={c.id} className="flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.size} students{c.program_name ? ` · ${c.program_name}` : ''}</p>
                                                </div>
                                                <Select className="max-w-[9rem]" aria-label={`Stream for ${c.name}`} value={c.stream_id || ''}
                                                    onChange={(e) => run(() => api.put(`/scheduler/classes/${c.id}/stream`, { stream_id: e.target.value || null }))}>
                                                    <option value="">No stream</option>
                                                    {setup.streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </Select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {setup.streams.length > 0 && setup.classes.some((c) => !c.stream_id) && (
                        <p className="mt-4"><Badge tone="amber">Some classes have no stream yet</Badge></p>
                    )}
                </Panel>
            </div>
        </div>
    );
};

export default ClassesTab;

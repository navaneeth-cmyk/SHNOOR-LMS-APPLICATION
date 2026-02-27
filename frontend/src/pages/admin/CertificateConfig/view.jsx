import React from 'react';
import { Award, Type, Image, Save, Pen } from 'lucide-react';

const CertificateConfigView = ({ loading, config, setConfig, handleSave }) => {

    if (loading) return (
        <div className="flex items-center justify-center min-h-[500px]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium text-sm">Loading settings...</p>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col font-sans max-w-[1440px] mx-auto space-y-6">
            {/* GRADIENT HEADER */}
            <div className="relative overflow-hidden rounded-2xl p-6 lg:p-8" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)' }}>
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                        <Award size={24} className="text-amber-300" />
                    </div>
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">Certificate Configuration</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Customize the certificates issued to students.</p>
                    </div>
                </div>
                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }}></div>
            </div>

            {/* FORM */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <form onSubmit={handleSave} className="p-6 lg:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Type size={12} /> Issuer Name
                            </label>
                            <input value={config.issuerName} onChange={e => setConfig({ ...config, issuerName: e.target.value })}
                                placeholder="e.g. SHNOOR Academy"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium
                                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Pen size={12} /> Signing Authority Title
                            </label>
                            <input value={config.authorityName} onChange={e => setConfig({ ...config, authorityName: e.target.value })}
                                placeholder="e.g. Program Director"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium
                                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300" />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Image size={12} /> Background Template URL
                            </label>
                            <input value={config.templateUrl} onChange={e => setConfig({ ...config, templateUrl: e.target.value })}
                                placeholder="https://example.com/cert-bg.png"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium
                                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300" />
                            <p className="text-[10px] text-slate-300 font-medium">Provide a direct link to an image to be used as the certificate background.</p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Pen size={12} /> Signature Image URL
                            </label>
                            <input value={config.signatureUrl} onChange={e => setConfig({ ...config, signatureUrl: e.target.value })}
                                placeholder="https://example.com/signature.png"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium
                                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300" />
                        </div>
                    </div>

                    {/* PREVIEW */}
                    <div className="rounded-2xl border border-slate-100 p-6 mb-6 text-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">Certificate Preview</h4>

                        <div className="w-full max-w-md mx-auto aspect-[1.4] bg-white relative shadow-lg rounded-xl overflow-hidden border border-slate-200">
                            {config.templateUrl && (
                                <img src={config.templateUrl} alt="Bg" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                            )}
                            <div className="relative z-10 p-6 h-full flex flex-col items-center justify-center font-serif text-slate-800">
                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-2 border border-amber-100">
                                    <Award size={20} className="text-amber-500" />
                                </div>
                                <h3 className="text-xl italic mb-2">Certificate of Completion</h3>
                                <p className="text-sm">Awarded to <strong>Student Name</strong></p>

                                <div className="mt-auto ml-auto w-32 flex flex-col items-center">
                                    {config.signatureUrl ? (
                                        <img src={config.signatureUrl} alt="Sign" className="h-8 object-contain mb-1" />
                                    ) : (
                                        <div className="text-lg mb-1" style={{ fontFamily: 'cursive' }}>Signature</div>
                                    )}
                                    <div className="w-full border-t border-slate-900 mb-1"></div>
                                    <small className="text-[10px] uppercase font-bold text-slate-500">{config.authorityName}</small>
                                </div>
                            </div>
                            <div className="absolute top-0 left-0 border-t-[40px] border-r-[40px] border-t-slate-800 border-r-transparent"></div>
                            <div className="absolute bottom-0 right-0 border-b-[40px] border-l-[40px] border-b-slate-800 border-l-transparent"></div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-5 border-t border-slate-100">
                        <button type="submit"
                            className="flex items-center gap-2 px-8 py-2.5 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] hover:shadow-xl text-sm"
                            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' }}>
                            <Save size={16} /> Save Configuration
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CertificateConfigView;

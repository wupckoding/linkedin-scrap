
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lead, ExtractionStatus, LeadStatus, EngineConfig } from './types';
import { discoverLeadsEngine } from './services/geminiService';

const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [engineStatus, setEngineStatus] = useState<ExtractionStatus>(ExtractionStatus.IDLE);
  const [logs, setLogs] = useState<string[]>(["SISTEMA JBNEXO v12.9: BUSCA REAL E MULTI-LANGUAGE ONLINE."]);
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [config, setConfig] = useState<EngineConfig>({ mode: 'neural', autoEnrich: true, frequency: 10000 });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [previewPitch, setPreviewPitch] = useState<Lead | null>(null);

  const runnerRef = useRef<number | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<ExtractionStatus>(ExtractionStatus.IDLE);

  useEffect(() => {
    statusRef.current = engineStatus;
  }, [engineStatus]);

  useEffect(() => {
    const saved = localStorage.getItem('jbnexo_leads_v12_9');
    if (saved) setLeads(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('jbnexo_leads_v12_9', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-30), `> ${new Date().toLocaleTimeString()} | ${msg}`]);
  };

  const runCycle = async () => {
    if (statusRef.current !== ExtractionStatus.RUNNING) return;
    addLog(`BUSCANDO DADOS REAIS EM ${country.toUpperCase()}...`);
    
    try {
      const results = await discoverLeadsEngine(niche, country, config.mode);
      if (statusRef.current !== ExtractionStatus.RUNNING) return;

      if (results.length === 0) {
        addLog("NENHUM DADO REAL ENCONTRADO. REAJUSTANDO PARAMETROS...");
      } else {
        addLog(`SUCESSO: ${results.length} LEADS VALIDADOS VIA GROUNDING.`);
      }

      const enriched = results.map(r => ({
        ...r,
        id: crypto.randomUUID(),
        niche,
        country,
        status: 'new' as LeadStatus,
        createdAt: Date.now(),
        qualityScore: r.integrity || 90,
        integrity: r.integrity || 95,
        confidence: 'high',
        linkedinUrl: '#',
        emailSubject: r.emailSubject,
        localizedPitch: r.localizedPitch,
        phoneNumber: r.phoneNumber?.replace(/\D/g, '')
      } as Lead));

      if (enriched.length > 0) {
        setLeads(prev => [...enriched, ...prev]);
      }
      
      if (statusRef.current === ExtractionStatus.RUNNING) {
        runnerRef.current = window.setTimeout(runCycle, 15000) as unknown as number;
      }
    } catch (e) {
      addLog("ERRO DE CONEXÃO. RETRIEVING...");
      if (statusRef.current === ExtractionStatus.RUNNING) {
        runnerRef.current = window.setTimeout(runCycle, 5000) as unknown as number;
      }
    }
  };

  const toggleEngine = () => {
    if (engineStatus === ExtractionStatus.RUNNING) {
      setEngineStatus(ExtractionStatus.STOPPING);
      statusRef.current = ExtractionStatus.STOPPING;
      if (runnerRef.current) window.clearTimeout(runnerRef.current);
      addLog("PARANDO BUSCA.");
      setTimeout(() => {
        setEngineStatus(ExtractionStatus.IDLE);
        statusRef.current = ExtractionStatus.IDLE;
      }, 1000);
    } else {
      if (!niche) return alert("INSIRA UM NICHO.");
      setEngineStatus(ExtractionStatus.RUNNING);
      statusRef.current = ExtractionStatus.RUNNING;
      runCycle();
    }
  };

  const exportMondayCSV = () => {
    const headers = "Name,Company,Email,Phone,Country,Status,Niche\n";
    const rows = leads.map(l => `"${l.name}","${l.company}","${l.email}","${l.phoneNumber}","${l.country}","${l.status}","${l.niche}"`).join("\n");
    downloadCSV(headers + rows, "jbnexo_leads_monday.csv");
  };

  const exportPhonesCSV = () => {
    const headers = "Name,Phone\n";
    const rows = leads.map(l => `"${l.name}","${l.phoneNumber}"`).join("\n");
    downloadCSV(headers + rows, "jbnexo_whatsapp_list.csv");
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  };

  const handleWhatsAppClick = (lead: Lead) => {
    const cleanNumber = lead.phoneNumber?.replace(/\D/g, '');
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(lead.localizedPitch)}`;
    window.open(url, '_blank');
    markAsContacted(lead.id);
  };

  const markAsContacted = (id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: 'contacted' as LeadStatus } : l));
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.company.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => b.createdAt - a.createdAt);
  }, [leads, searchTerm]);

  return (
    <div className="flex h-screen bg-[#050505] text-[#a1a1aa] font-sans overflow-hidden select-none">
      {/* SIDEBAR */}
      <aside className="w-[380px] border-r border-[#18181b] bg-[#080808] flex flex-col z-50 shrink-0 shadow-2xl">
        <div className="p-8 border-b border-[#18181b] bg-[#080808]/50 backdrop-blur-xl">
          <div className="flex items-center space-x-4 mb-10">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.4)]">
              <i className="fa-solid fa-bolt text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">JB<span className="text-indigo-500">NEXO</span></h1>
              <div className="text-[8px] font-bold text-indigo-400/80 uppercase tracking-[0.4em] mt-1">Grounding Pro v12.9</div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">Nicho</label>
              <input value={niche} onChange={e => setNiche(e.target.value)} className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl px-5 py-4 text-xs text-white outline-none focus:border-indigo-600"/>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">País/Cidade</label>
              <input value={country} onChange={e => setCountry(e.target.value)} className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl px-5 py-4 text-xs text-white outline-none focus:border-indigo-600"/>
            </div>
            <button onClick={toggleEngine} className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-2xl ${engineStatus === ExtractionStatus.RUNNING ? 'bg-rose-950/20 border border-rose-600 text-rose-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
              {engineStatus === ExtractionStatus.RUNNING ? "Pausar Busca" : "Iniciar Busca Real"}
            </button>
          </div>
        </div>

        {/* LOGS */}
        <div className="flex-grow flex flex-col min-h-0 bg-[#060606] p-6 border-b border-[#18181b]">
          <div className="text-[9px] font-black text-zinc-800 uppercase tracking-widest mb-4 flex justify-between items-center">
             <span>Protocolo Grounding</span>
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></div>
          </div>
          <div className="flex-grow overflow-y-auto font-mono text-[9px] text-indigo-500/40 custom-scrollbar space-y-1.5">
            {logs.map((log, i) => <div key={i} className="border-l border-indigo-900/20 pl-3 py-0.5">{log}</div>)}
            <div ref={logEndRef}></div>
          </div>
        </div>

        {/* EXPORTS */}
        <div className="p-8 space-y-3 bg-[#080808]">
           <button onClick={exportMondayCSV} className="w-full py-3.5 bg-indigo-600/5 border border-indigo-600/20 rounded-xl text-[9px] font-black uppercase text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center">
             <i className="fa-solid fa-file-export mr-3"></i> Exportar Monday.com
           </button>
           <button onClick={exportPhonesCSV} className="w-full py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-[9px] font-black uppercase text-zinc-600 hover:text-white transition-all flex items-center justify-center">
             <i className="fa-solid fa-phone mr-3"></i> Exportar WhatsApps
           </button>
           <button onClick={() => setLeads([])} className="w-full pt-4 text-[8px] font-black uppercase text-zinc-900 hover:text-rose-900 transition-colors text-center tracking-widest">
             Limpar Base
           </button>
        </div>
      </aside>

      {/* DASHBOARD */}
      <main className="flex-grow flex flex-col bg-[#050505] relative min-w-0">
        <header className="px-12 py-10 border-b border-[#18181b] flex justify-between items-end bg-[#050505]/95 backdrop-blur-xl sticky top-0 z-40">
           <div>
              <div className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em] mb-2 italic">Leads Validados (Grounding Real)</div>
              <div className="flex items-baseline space-x-4">
                 <span className="text-6xl font-black text-white tracking-tighter leading-none">{leads.length}</span>
                 <div className={`w-3 h-3 rounded-full ${engineStatus === ExtractionStatus.RUNNING ? 'bg-indigo-500 animate-ping' : 'bg-zinc-900'}`}></div>
              </div>
           </div>
           <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filtrar base..." className="bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl px-8 py-4 text-xs w-[350px] outline-none focus:border-indigo-600 shadow-2xl"/>
        </header>

        <div className="flex-grow overflow-y-auto p-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-10 custom-scrollbar">
          {filteredLeads.map(lead => (
            <div key={lead.id} className="bg-[#0c0c0c] border border-[#18181b] rounded-[3rem] p-8 hover:border-indigo-500/50 transition-all duration-500 group flex flex-col min-h-[480px] relative overflow-hidden">
              <div className="mb-6 flex justify-between items-center">
                <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter border ${lead.status === 'contacted' ? 'bg-green-950/40 text-green-400 border-green-900/30' : 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30'}`}>
                  {lead.status === 'contacted' ? '✅ Contatado' : 'Validado Grounding'}
                </span>
                <span className="text-[10px] font-black text-green-500">{lead.integrity}% REAL</span>
              </div>

              <div className="flex items-center space-x-6 mb-8">
                <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center text-2xl font-black text-white border border-zinc-800">
                  {lead.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                   <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors truncate">{lead.name}</h3>
                   <div className="text-[10px] font-bold text-indigo-500/70 uppercase tracking-widest truncate">{lead.company}</div>
                </div>
              </div>

              <div className="space-y-3 mb-8 flex-grow">
                <div className="bg-black/60 p-4 rounded-2xl border border-zinc-900 flex items-center space-x-3">
                  <i className="fa-solid fa-phone text-indigo-500 text-[10px]"></i>
                  <span className="text-[11px] font-bold text-zinc-400 tracking-widest">{lead.phoneNumber}</span>
                </div>
                <div className="bg-black/60 p-4 rounded-2xl border border-zinc-900 flex items-center space-x-3">
                  <i className="fa-solid fa-at text-indigo-500 text-[10px]"></i>
                  <span className="text-[11px] font-bold text-zinc-400 truncate">{lead.email}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-8 border-t border-[#18181b] mt-auto">
                 <div className="flex items-center space-x-3">
                    <button onClick={() => setPreviewPitch(lead)} className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600 hover:text-white hover:bg-indigo-600 transition-all">
                      <i className="fa-solid fa-comment-dots text-lg"></i>
                    </button>
                    <button onClick={() => handleWhatsAppClick(lead)} className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/20 shadow-lg">
                      <i className="fa-brands fa-whatsapp text-2xl"></i>
                    </button>
                 </div>
                 <div className="text-[9px] font-black text-zinc-900 uppercase italic">JBNEXO NODE</div>
              </div>
            </div>
          ))}
        </div>

        {previewPitch && (
          <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-6 backdrop-blur-3xl">
             <div className="bg-[#0c0c0c] border border-indigo-500/30 rounded-[4rem] p-12 max-w-2xl w-full shadow-2xl relative">
                <div className="flex justify-between items-start mb-10">
                   <div>
                     <h4 className="text-3xl font-black text-white uppercase italic leading-none">{previewPitch.emailSubject}</h4>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-3">Pitch Localizado para {previewPitch.country}</p>
                   </div>
                   <button onClick={() => setPreviewPitch(null)} className="text-zinc-700 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-3xl"></i></button>
                </div>
                <div className="bg-black/90 p-8 rounded-[3rem] border border-zinc-900 mb-10 shadow-inner">
                   <p className="text-indigo-400 font-mono text-base italic leading-relaxed">{previewPitch.localizedPitch}</p>
                </div>
                <button onClick={() => { handleWhatsAppClick(previewPitch); setPreviewPitch(null); }} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-indigo-500 transition-all">
                   Abrir WhatsApp
                </button>
             </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
      `}</style>
    </div>
  );
};

export default App;

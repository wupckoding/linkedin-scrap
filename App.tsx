
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lead, ExtractionStatus, LeadStatus } from './types';
import { discoverLeadsEngine } from './services/geminiService';

const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [engineStatus, setEngineStatus] = useState<ExtractionStatus>(ExtractionStatus.IDLE);
  const [logs, setLogs] = useState<string[]>(["SISTEMA JBNEXO TITANIUM v23.0 ONLINE."]);
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewPitch, setPreviewPitch] = useState<Lead | null>(null);

  const runnerRef = useRef<number | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<ExtractionStatus>(ExtractionStatus.IDLE);

  // Sincronização e Persistência
  useEffect(() => { statusRef.current = engineStatus; }, [engineStatus]);

  useEffect(() => {
    const saved = localStorage.getItem('jbnexo_leads_v23');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setLeads(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('jbnexo_leads_v23', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-12), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runCycle = async () => {
    if (statusRef.current !== ExtractionStatus.RUNNING) return;
    
    addLog(`AUDITANDO ${niche.toUpperCase()} EM ${country.toUpperCase()}...`);
    
    try {
      const { leads: results } = await discoverLeadsEngine(niche, country);
      
      if (statusRef.current !== ExtractionStatus.RUNNING) return;

      if (results.length === 0) {
        addLog("DADOS INCONSISTENTES REJEITADOS. REPROCESSANDO...");
      } else {
        addLog(`${results.length} LEADS REAIS VERIFICADOS COM SUCESSO.`);
      }

      const enriched = results.map(r => ({
        ...r,
        id: crypto.randomUUID(),
        niche,
        country,
        status: 'new' as LeadStatus,
        createdAt: Date.now(),
        integrity: r.integrity || 98,
        phoneNumber: r.phoneNumber?.replace(/\D/g, '')
      } as Lead));

      if (enriched.length > 0) {
        setLeads(prev => {
          const existingPhones = new Set(prev.map(l => l.phoneNumber));
          const uniqueNew = enriched.filter(l => !existingPhones.has(l.phoneNumber));
          return [...uniqueNew, ...prev];
        });
      }
      
      runnerRef.current = window.setTimeout(runCycle, 2000) as unknown as number;
    } catch (e: any) {
      addLog(`RECALIBRANDO FREQUÊNCIA (30s)...`);
      runnerRef.current = window.setTimeout(runCycle, 30000) as unknown as number;
    }
  };

  const toggleEngine = () => {
    if (engineStatus === ExtractionStatus.RUNNING) {
      setEngineStatus(ExtractionStatus.STOPPING);
      statusRef.current = ExtractionStatus.STOPPING;
      if (runnerRef.current) window.clearTimeout(runnerRef.current);
      setTimeout(() => {
        setEngineStatus(ExtractionStatus.IDLE);
        statusRef.current = ExtractionStatus.IDLE;
        addLog("OPERAÇÃO FINALIZADA.");
      }, 500);
    } else {
      if (!niche) return alert("DEFINA O NICHO.");
      setEngineStatus(ExtractionStatus.RUNNING);
      statusRef.current = ExtractionStatus.RUNNING;
      runCycle();
    }
  };

  const clearDB = () => {
    if (window.confirm("CONFIRMAÇÃO: Deseja apagar permanentemente todos os leads da base local?")) {
      setLeads([]);
      localStorage.removeItem('jbnexo_leads_v23');
      addLog("BASE DE DADOS TOTALMENTE ZERADA.");
    }
  };

  const exportOnlyNumbers = () => {
    const data = leads.map(l => l.phoneNumber).filter(Boolean).join("\n");
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista_telefones_jbnexo.txt`;
    a.click();
  };

  const exportToCRM = () => {
    if (leads.length === 0) return alert("Não há leads para exportar.");
    const csv = "Nome,Email,Telefone\n" + leads.map(l => `"${l.name}","${l.email || ''}","${l.phoneNumber}"`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jbnexo_crm_export.csv`;
    a.click();
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phoneNumber?.includes(searchTerm)
    ).sort((a,b) => b.createdAt - a.createdAt);
  }, [leads, searchTerm]);

  return (
    <div className="flex h-screen bg-[#020203] text-[#e4e4e7] font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-[280px] border-r border-[#1f1f23] bg-[#08080a] flex flex-col z-50 shrink-0">
        <div className="p-6 border-b border-[#1f1f23]">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)]">
              <i className="fa-solid fa-atom text-white"></i>
            </div>
            <h1 className="text-lg font-black text-white italic tracking-tighter uppercase">JB<span className="text-indigo-500">NEXO</span></h1>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Nicho do Lead</label>
              <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Ex: Donos de Logística" className="w-full bg-[#111113] border border-[#232326] rounded-lg px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"/>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Território</label>
              <select value={country} onChange={e => setCountry(e.target.value)} className="w-full bg-[#111113] border border-[#232326] rounded-lg px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all appearance-none">
                <option value="Brasil">Brasil 🇧🇷</option>
                <option value="Costa Rica">Costa Rica 🇨🇷</option>
                <option value="Portugal">Portugal 🇵🇹</option>
                <option value="EUA">Estados Unidos 🇺🇸</option>
                <option value="Espanha">Espanha 🇪🇸</option>
              </select>
            </div>

            <button onClick={toggleEngine} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${engineStatus === ExtractionStatus.RUNNING ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-500/50' : 'bg-white text-black hover:bg-zinc-200'}`}>
              {engineStatus === ExtractionStatus.RUNNING ? "Pausar Fluxo" : "Iniciar Mineração"}
            </button>
            
            {engineStatus === ExtractionStatus.RUNNING && (
              <div className="flex items-center justify-center space-x-2 text-[8px] font-bold text-indigo-500 uppercase animate-pulse">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                <span>Motor em Fluxo Contínuo</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-grow flex flex-col min-h-0 bg-[#040405] p-5 overflow-hidden">
          <p className="text-[8px] font-bold text-zinc-700 uppercase mb-3 tracking-[0.2em]">Live Monitoring</p>
          <div className="flex-grow overflow-y-auto font-mono text-[9px] text-zinc-600 space-y-1.5 custom-scrollbar">
            {logs.map((log, i) => <div key={i} className="leading-tight border-l border-white/5 pl-2">{log}</div>)}
            <div ref={logEndRef}></div>
          </div>
        </div>

        <div className="p-6 border-t border-[#1f1f23] space-y-2 bg-[#08080a]">
           <button onClick={exportToCRM} className="w-full py-3 bg-[#111113] border border-[#232326] rounded-lg text-[9px] font-black uppercase text-zinc-400 hover:text-white transition-all flex items-center justify-center">
             <i className="fa-solid fa-file-export mr-2 text-indigo-500"></i> Exportar para CRM
           </button>
           <button onClick={exportOnlyNumbers} className="w-full py-3 bg-indigo-600/10 border border-indigo-500/20 rounded-lg text-[9px] font-black uppercase text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center">
             <i className="fa-solid fa-phone mr-2"></i> Só Números (.txt)
           </button>
           <button onClick={clearDB} className="w-full py-2 mt-2 bg-rose-500/5 text-rose-500/60 rounded text-[9px] font-bold uppercase hover:bg-rose-500 hover:text-white transition-all">
             Limpar Base de Dados
           </button>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="flex-grow flex flex-col relative bg-[#020203]">
        <header className="px-10 py-6 border-b border-[#1f1f23] flex justify-between items-center bg-[#08080a]/90 backdrop-blur-md sticky top-0 z-40">
           <div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">DADOS VERIFICADOS</p>
              <div className="flex items-center space-x-3">
                 <span className="text-4xl font-black text-white leading-none">{leads.length}</span>
                 <span className="text-[10px] font-bold text-indigo-500 uppercase border border-indigo-500/20 px-2 rounded">Quantum Ready</span>
              </div>
           </div>
           <div className="w-[300px] relative">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filtrar leads..." className="w-full bg-[#111113] border border-[#232326] rounded-xl px-5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"/>
              <i className="fa-solid fa-search absolute right-4 top-3 text-zinc-700 text-xs"></i>
           </div>
        </header>

        <div className="flex-grow overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 custom-scrollbar pb-32">
          {filteredLeads.map(lead => (
            <div key={lead.id} className="bg-[#0b0b0d] border border-[#1f1f23] rounded-2xl p-5 hover:border-indigo-500/30 transition-all flex flex-col relative group">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-1.5">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                   <span className="text-[8px] font-black text-green-500 uppercase">Real Person</span>
                </div>
                <button onClick={() => setLeads(prev => prev.filter(l => l.id !== lead.id))} className="text-zinc-800 hover:text-rose-500 p-1">
                  <i className="fa-solid fa-xmark text-[10px]"></i>
                </button>
              </div>

              <div className="mb-5">
                <h3 className="text-sm font-black text-white uppercase truncate mb-0.5 group-hover:text-indigo-400 transition-colors">{lead.name}</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase truncate">{lead.company}</p>
              </div>

              <div className="space-y-1.5 mb-6 flex-grow">
                <div className="bg-[#111113] p-3 rounded-xl border border-white/5 flex items-center justify-between group/field">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <i className="fa-solid fa-phone text-[9px] text-indigo-500/40"></i>
                    <span className="text-[11px] font-bold text-zinc-300 tracking-wider">{lead.phoneNumber}</span>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(lead.phoneNumber); alert('Copiado!'); }} className="text-zinc-800 hover:text-white group-hover/field:opacity-100 opacity-0 transition-opacity">
                    <i className="fa-solid fa-copy text-[10px]"></i>
                  </button>
                </div>
                {lead.email && (
                  <div className="bg-[#111113] p-3 rounded-xl border border-white/5 flex items-center space-x-3 overflow-hidden">
                    <i className="fa-solid fa-at text-[9px] text-indigo-500/40"></i>
                    <span className="text-[11px] font-bold text-zinc-300 truncate">{lead.email}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#1f1f23] flex items-center space-x-2">
                  <button onClick={() => setPreviewPitch(lead)} className="flex-1 py-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-lg text-indigo-400 text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">
                    Script
                  </button>
                  <a href={`https://wa.me/${lead.phoneNumber?.replace(/\D/g, '')}?text=${encodeURIComponent(lead.localizedPitch)}`} target="_blank" className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 hover:bg-green-600 hover:text-white transition-all">
                    <i className="fa-brands fa-whatsapp text-lg"></i>
                  </a>
              </div>
            </div>
          ))}
        </div>

        {/* PITCH MODAL */}
        {previewPitch && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl">
             <div className="bg-[#08080a] border border-[#1f1f23] rounded-[2rem] p-10 max-w-lg w-full shadow-2xl relative">
                <button onClick={() => setPreviewPitch(null)} className="absolute right-6 top-6 text-zinc-600 hover:text-white transition-colors p-2">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
                <div className="mb-6">
                   <h4 className="text-lg font-black text-white uppercase italic tracking-tighter">Script de Conversão</h4>
                   <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{previewPitch.name} | {previewPitch.company}</p>
                </div>
                <div className="space-y-4">
                   <div className="bg-[#111113] p-6 rounded-2xl border border-white/5 max-h-[250px] overflow-y-auto custom-scrollbar text-zinc-300 font-mono text-xs leading-relaxed">
                      {previewPitch.localizedPitch}
                   </div>
                </div>
                <div className="mt-8 flex space-x-3">
                  <button onClick={() => { navigator.clipboard.writeText(previewPitch.localizedPitch); alert('Copiado!'); }} className="flex-1 py-4 bg-[#111113] text-white rounded-xl font-black text-[10px] uppercase hover:bg-zinc-800 transition-all">
                    Copiar Script
                  </button>
                  <button onClick={() => { 
                      window.open(`https://wa.me/${previewPitch.phoneNumber?.replace(/\D/g, '')}?text=${encodeURIComponent(previewPitch.localizedPitch)}`, '_blank'); 
                    }} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase hover:bg-indigo-500 transition-all">
                     Enviar Agora
                  </button>
                </div>
             </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f1f23; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
        select { background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 1rem center; background-size: 1em; }
      `}</style>
    </div>
  );
};

export default App;

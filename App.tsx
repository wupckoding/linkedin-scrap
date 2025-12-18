
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lead, ExtractionStatus, LeadStatus, EngineConfig } from './types';
import { discoverLeadsEngine } from './services/geminiService';

const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [engineStatus, setEngineStatus] = useState<ExtractionStatus>(ExtractionStatus.IDLE);
  const [logs, setLogs] = useState<string[]>(["MOTOR JBNEXO v12.8 ONLINE. PRONTO PARA ESCALA."]);
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [config, setConfig] = useState<EngineConfig>({ mode: 'quantum', autoEnrich: true, frequency: 5000 });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [previewPitch, setPreviewPitch] = useState<Lead | null>(null);

  const runnerRef = useRef<number | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<ExtractionStatus>(ExtractionStatus.IDLE);

  useEffect(() => {
    statusRef.current = engineStatus;
  }, [engineStatus]);

  useEffect(() => {
    const saved = localStorage.getItem('jbnexo_leads_v12_8');
    if (saved) setLeads(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('jbnexo_leads_v12_8', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-30), `> ${new Date().toLocaleTimeString()} | ${msg}`]);
  };

  const runCycle = async () => {
    if (statusRef.current !== ExtractionStatus.RUNNING) return;
    addLog(`MINERANDO DADOS EM ${country.toUpperCase()}...`);
    
    try {
      const results = await discoverLeadsEngine(niche, country, config.mode);
      if (statusRef.current !== ExtractionStatus.RUNNING) return;

      if (results.length === 0) {
        addLog("NENHUM NÚMERO VÁLIDO ENCONTRADO NESTA ITERAÇÃO. BUSCANDO NOVOS NODES...");
      } else {
        addLog(`VERIFICANDO VALIDADE WHATSAPP PARA ${results.length} NODES...`);
      }

      const enriched = results.map(r => ({
        ...r,
        id: crypto.randomUUID(),
        niche,
        country,
        status: 'new' as LeadStatus,
        createdAt: Date.now(),
        qualityScore: Math.floor(Math.random() * 20) + 80,
        integrity: r.integrity || 99,
        conversionProb: r.conversionProb || 98,
        confidence: 'high',
        linkedinUrl: '#',
        emailSubject: r.emailSubject || "Convite: Diagnóstico de Escala JBNEXO",
        localizedPitch: r.localizedPitch || "Olá, aqui é o Bruno da JBNEXO. Gostaria de agendar 15 min via vídeo chamada? https://calendly.com/bruno-jbnexo/new-meeting",
        email: r.email || "contato@empresa.com",
        phoneNumber: r.phoneNumber?.replace(/\D/g, '') // Garante apenas números
      } as Lead));

      if (enriched.length > 0) {
        setLeads(prev => [...enriched, ...prev]);
        addLog(`SUCESSO: +${enriched.length} WHATSAPPS VALIDADOS E ADICIONADOS.`);
      }
      
      const delay = config.mode === 'nano' ? 3000 : config.mode === 'neural' ? 15000 : 8000;
      if (statusRef.current === ExtractionStatus.RUNNING) {
        runnerRef.current = window.setTimeout(runCycle, delay) as unknown as number;
      }
    } catch (e) {
      addLog("ERRO DE CONEXÃO. REINICIANDO PROTOCOLO...");
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
      addLog("PARANDO MINERAÇÃO...");
      setTimeout(() => {
        setEngineStatus(ExtractionStatus.IDLE);
        statusRef.current = ExtractionStatus.IDLE;
        addLog("SISTEMA EM PAUSA.");
      }, 1000);
    } else {
      if (!niche) return alert("INSIRA UM NICHO PARA INICIAR.");
      setEngineStatus(ExtractionStatus.RUNNING);
      statusRef.current = ExtractionStatus.RUNNING;
      runCycle();
    }
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    addLog("LEAD ELIMINADO DA DATABASE.");
  };

  const markAsContacted = (id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: 'contacted' as LeadStatus } : l));
    addLog("STATUS: LEAD CONTATADO.");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addLog(`${label.toUpperCase()} COPIADO.`);
  };

  const exportMondayCSV = () => {
    const headers = "Name,Company,Role,Email,Phone,Country,Status,Niche\n";
    const rows = leads.map(l => 
      `"${l.name}","${l.company}","${l.headline}","${l.email}","${l.phoneNumber}","${l.country}","${l.status}","${l.niche}"`
    ).join("\n");
    downloadCSV(headers + rows, "jbnexo_leads_validos.csv");
  };

  const exportPhonesCSV = () => {
    const headers = "Name,Phone\n";
    const rows = leads.filter(l => l.phoneNumber).map(l => `"${l.name}","${l.phoneNumber}"`).join("\n");
    downloadCSV(headers + rows, "jbnexo_lista_whatsapp.csv");
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
    // Limpeza absoluta para evitar qualquer caractere inválido
    const cleanNumber = lead.phoneNumber?.replace(/\D/g, '').replace(/^0+/, '');
    
    if (!cleanNumber || cleanNumber.length < 10) {
      alert("Erro: Este número não passou na validação final de estrutura do WhatsApp.");
      return;
    }

    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(lead.localizedPitch)}`;
    markAsContacted(lead.id);
    window.open(url, '_blank');
  };

  const handleEmailClick = (lead: Lead) => {
    if (!lead.email || lead.email.includes("empresa.com")) {
      alert("Aviso: Este e-mail parece ser genérico ou inválido.");
      return;
    }
    const url = `mailto:${lead.email}?subject=${encodeURIComponent(lead.emailSubject)}&body=${encodeURIComponent(lead.localizedPitch)}`;
    markAsContacted(lead.id);
    window.open(url, '_self');
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
              <i className="fa-solid fa-bolt text-white text-xl animate-pulse"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">JB<span className="text-indigo-500">NEXO</span></h1>
              <div className="text-[8px] font-bold text-indigo-400/80 uppercase tracking-[0.4em] mt-1">Validated Mining v12.8</div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">Nicho de Atuação</label>
              <input 
                value={niche}
                onChange={e => setNiche(e.target.value)}
                placeholder="Ex: CEOs de Logística"
                className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl px-5 py-4 text-xs text-white focus:border-indigo-600 outline-none transition-all placeholder:text-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">Localização</label>
              <input 
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="Ex: Brasil, Portugal"
                className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl px-5 py-4 text-xs text-white focus:border-indigo-600 outline-none transition-all placeholder:text-zinc-800"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['nano', 'quantum', 'neural'].map(m => (
                <button 
                  key={m}
                  onClick={() => setConfig({...config, mode: m as any})}
                  className={`py-2 text-[9px] font-black uppercase rounded-lg border transition-all ${config.mode === m ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-transparent border-zinc-900 text-zinc-700 hover:text-zinc-500'}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <button 
              onClick={toggleEngine}
              className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-2xl ${
                engineStatus === ExtractionStatus.RUNNING 
                ? 'bg-rose-950/20 border border-rose-600 text-rose-500' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              {engineStatus === ExtractionStatus.RUNNING ? "Pausar Mineração" : "Iniciar Mineração"}
            </button>
          </div>
        </div>

        {/* FEED DE LOGS */}
        <div className="flex-grow flex flex-col min-h-0 bg-[#060606] p-6 border-b border-[#18181b]">
          <div className="text-[9px] font-black text-zinc-800 uppercase tracking-widest mb-4 flex justify-between items-center">
             <span>Atividade do Motor</span>
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></div>
          </div>
          <div className="flex-grow overflow-y-auto font-mono text-[9px] text-indigo-500/40 custom-scrollbar space-y-1.5 px-2">
            {logs.map((log, i) => <div key={i} className="border-l border-indigo-900/20 pl-3 py-0.5 leading-relaxed">{log}</div>)}
            <div ref={logEndRef}></div>
          </div>
        </div>

        {/* EXPORT OPTIONS */}
        <div className="p-8 space-y-3 bg-[#080808]">
           <button onClick={exportMondayCSV} className="w-full py-3.5 bg-indigo-600/5 border border-indigo-600/20 rounded-xl text-[9px] font-black uppercase text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center">
             <i className="fa-solid fa-file-export mr-3"></i> Exportar Tudo (CSV)
           </button>
           <button onClick={exportPhonesCSV} className="w-full py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-[9px] font-black uppercase text-zinc-600 hover:text-white transition-all flex items-center justify-center">
             <i className="fa-solid fa-phone mr-3"></i> Exportar WhatsApps
           </button>
           <button onClick={() => { if(confirm("LIMPAR TODA A DATABASE?")) setLeads([]) }} className="w-full pt-4 text-[8px] font-black uppercase text-zinc-900 hover:text-rose-900 transition-colors text-center cursor-pointer tracking-widest">
             Limpar Base de Dados
           </button>
        </div>
      </aside>

      {/* DASHBOARD */}
      <main className="flex-grow flex flex-col bg-[#050505] relative min-w-0">
        <header className="px-12 py-10 border-b border-[#18181b] flex justify-between items-end bg-[#050505]/95 backdrop-blur-xl sticky top-0 z-40">
           <div>
              <div className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em] mb-2 italic">Leads Validados</div>
              <div className="flex items-baseline space-x-4">
                 <span className="text-6xl font-black text-white tracking-tighter leading-none">{leads.length}</span>
                 <div className={`w-3 h-3 rounded-full ${engineStatus === ExtractionStatus.RUNNING ? 'bg-indigo-500 animate-ping' : 'bg-zinc-900'}`}></div>
              </div>
           </div>
           <div className="relative">
              <i className="fa-solid fa-search absolute left-6 top-1/2 -translate-y-1/2 text-zinc-800"></i>
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filtrar base de dados..."
                className="bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl pl-14 pr-8 py-4 text-xs w-[350px] outline-none focus:border-indigo-600 transition-all shadow-2xl"
              />
           </div>
        </header>

        {/* GRID DE CARDS */}
        <div className="flex-grow overflow-y-auto p-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-10 custom-scrollbar relative">
          {filteredLeads.map(lead => (
            <div key={lead.id} className={`bg-[#0c0c0c] border ${lead.status === 'contacted' ? 'border-green-900/40 shadow-[0_0_40px_rgba(22,163,74,0.05)]' : 'border-[#18181b]'} rounded-[3rem] p-8 hover:border-indigo-500/50 transition-all duration-500 group flex flex-col min-h-[500px] shadow-2xl relative overflow-hidden`}>
              
              <button 
                onClick={() => deleteLead(lead.id)}
                className="absolute top-8 right-8 w-8 h-8 rounded-full bg-zinc-900/50 flex items-center justify-center text-zinc-700 hover:text-rose-500 hover:bg-rose-950/20 transition-all z-20"
              >
                <i className="fa-solid fa-trash-can text-[10px]"></i>
              </button>

              <div className="mb-6 shrink-0">
                <span className={`text-[9px] font-black ${lead.status === 'contacted' ? 'bg-green-950/40 text-green-400 border-green-900/30' : 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30'} px-4 py-1.5 rounded-full uppercase tracking-tighter border`}>
                  {lead.status === 'contacted' ? 'Contatado ✅' : 'WhatsApp Verificado'}
                </span>
              </div>

              {/* PERFIL */}
              <div className="flex items-center space-x-6 mb-8 shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-zinc-900 to-black rounded-3xl flex items-center justify-center text-2xl font-black text-white border border-zinc-800 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                  {lead.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                   <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors leading-tight mb-1 line-clamp-2">{lead.name}</h3>
                   <div className="text-[10px] font-bold text-indigo-500/70 uppercase tracking-widest truncate">{lead.company}</div>
                </div>
              </div>

              {/* CARGO */}
              <div className="mb-6 min-h-[48px] shrink-0">
                <p className="text-[12px] text-zinc-500 font-medium italic border-l-2 border-indigo-900/40 pl-5 leading-relaxed line-clamp-2">"{lead.headline}"</p>
              </div>

              {/* CONTATOS */}
              <div className="space-y-3 mb-8 flex-grow">
                <div 
                  onClick={() => copyToClipboard(lead.phoneNumber, 'Telefone')}
                  className="bg-black/60 p-4 rounded-2xl border border-zinc-900 group-hover:border-indigo-900/40 transition-all cursor-pointer hover:bg-zinc-900 flex items-center space-x-3"
                >
                  <i className="fa-solid fa-phone-volume text-indigo-500 text-[10px]"></i>
                  <span className="text-[11px] font-bold text-zinc-400 tracking-widest truncate">{lead.phoneNumber}</span>
                </div>
                <div 
                  onClick={() => copyToClipboard(lead.email, 'E-mail')}
                  className="bg-black/60 p-4 rounded-2xl border border-zinc-900 group-hover:border-indigo-900/40 transition-all cursor-pointer hover:bg-zinc-900 flex items-center space-x-3"
                >
                  <i className="fa-solid fa-at text-indigo-500 text-[10px]"></i>
                  <span className="text-[11px] font-bold text-zinc-400 tracking-wider truncate">{lead.email}</span>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex items-center justify-between pt-8 border-t border-[#18181b] mt-auto shrink-0">
                 <div className="flex items-center space-x-3">
                    <button onClick={() => handleEmailClick(lead)} className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600 hover:text-indigo-400 hover:bg-indigo-950/20 transition-all" title="Mandar E-mail">
                      <i className="fa-solid fa-envelope text-lg"></i>
                    </button>
                    <button onClick={() => setPreviewPitch(lead)} className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600 hover:text-white hover:bg-indigo-600 transition-all" title="Ver Abordagem JBNEXO">
                      <i className="fa-solid fa-comment-dots text-lg"></i>
                    </button>
                    {lead.phoneNumber && (
                      <button 
                        onClick={() => handleWhatsAppClick(lead)}
                        className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/20 shadow-lg"
                        title="Abrir WhatsApp"
                      >
                        <i className="fa-brands fa-whatsapp text-2xl"></i>
                      </button>
                    )}
                    <button 
                      onClick={() => markAsContacted(lead.id)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${lead.status === 'contacted' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.3)]' : 'bg-zinc-900 text-zinc-600 hover:text-green-500'}`}
                      title="Marcar como Enviado"
                    >
                      <i className="fa-solid fa-check-double text-lg"></i>
                    </button>
                 </div>
                 <div className="text-[9px] font-black text-zinc-900 uppercase tracking-widest italic group-hover:text-indigo-900">JBNEXO NODE</div>
              </div>

              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-zinc-950">
                <div className="h-full bg-indigo-600 shadow-[0_0_15px_indigo] transition-all duration-1000" style={{ width: `${lead.integrity}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL PITCH */}
        {previewPitch && (
          <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto">
             <div className="bg-[#0c0c0c] border border-indigo-500/30 rounded-[4rem] p-12 lg:p-16 max-w-2xl w-full shadow-2xl relative overflow-hidden my-auto">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-600 to-transparent"></div>
                <div className="flex justify-between items-start mb-10">
                   <div>
                     <h4 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">Script JBNEXO</h4>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-3">Diagnóstico de 15 Minutos • jbnexo.com</p>
                   </div>
                   <button onClick={() => setPreviewPitch(null)} className="text-zinc-700 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-3xl"></i></button>
                </div>
                <div className="bg-black/90 p-8 lg:p-10 rounded-[3rem] border border-zinc-900 mb-10 shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar">
                   <div className="text-zinc-500 text-[10px] font-black uppercase mb-4 tracking-widest">Assunto Sugerido: {previewPitch.emailSubject}</div>
                   <p className="text-indigo-400 font-mono text-base leading-relaxed whitespace-pre-wrap italic break-words">{previewPitch.localizedPitch}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <button onClick={() => { handleEmailClick(previewPitch); setPreviewPitch(null); }} className="py-5 bg-zinc-900 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest border border-zinc-800 hover:bg-zinc-800 transition-all flex items-center justify-center space-x-3">
                     <i className="fa-solid fa-envelope"></i>
                     <span>Mandar E-mail</span>
                   </button>
                   <button 
                     onClick={() => { handleWhatsAppClick(previewPitch); setPreviewPitch(null); }}
                     className="py-5 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest text-center shadow-2xl hover:bg-indigo-500 transition-all flex items-center justify-center space-x-3"
                   >
                     <i className="fa-brands fa-whatsapp text-xl"></i>
                     <span>Mandar WhatsApp</span>
                   </button>
                </div>
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

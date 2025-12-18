
# 🚀 JBNEXO Growth Node v12.8

A JBNEXO Growth Node é uma ferramenta de elite para inteligência de dados e prospecção automatizada, focada em converter leads de alto ticket para a agência JBNEXO. Desenvolvida com tecnologia de ponta em Inteligência Artificial, a plataforma simula o comportamento de um minerador de dados sênior para encontrar oportunidades reais de negócio.

**Desenvolvido por: [brunxsousa](https://github.com/brunxsousa)**

---

## 🛠 Funcionalidades Principais

### 1. Mineração de Dados Inteligente (Gemini AI)
A ferramenta utiliza os modelos mais avançados da série Gemini para realizar varreduras lógicas e encontrar leads específicos por nicho e localização. Diferente de scrapers comuns, ela valida a relevância do cargo e da empresa antes de entregar o node.

### 2. Protocolo Anti-Erro de WhatsApp
Implementamos um sistema de limpeza e validação rigorosa para números de telefone:
- **Verificação de Integridade:** Descarta números sequenciais ou fictícios.
- **Sanitização Neural:** Remove automaticamente caracteres especiais (+, -, espaços, parênteses) que causam o erro de "número inválido" no WhatsApp Web.
- **Formatação Internacional:** Garante que o código do país e DDD estejam corretos para abertura imediata do chat.

### 3. Modos de Processamento (Potência do Motor)
- **Modo Neural:** Alta precisão e análise profunda (ideal para leads High-Ticket).
- **Modo Quantum:** Equilíbrio entre velocidade de extração e qualidade dos dados.
- **Modo Nano:** Foco em volume e rapidez de varredura.

### 4. Outreach Multicanal Automatizado
- **WhatsApp Direto:** Botão que abre o chat já com um pitch personalizado no idioma do lead.
- **E-mail Estratégico:** Substituindo links genéricos, o sistema gera e-mails com assuntos impactantes e abre seu cliente de e-mail pronto para o envio.
- **Scripts Personalizados:** Geração automática de abordagens focadas em agendar reuniões de 15 minutos (Calendly JBNEXO).

### 5. Gestão de Base de Dados e CRM
- **Exportação Monday.com:** Formatação de CSV otimizada para importação direta no CRM Monday.
- **Exportação de Telefones:** Gera uma lista limpa apenas com nomes e números para campanhas de marketing ou CRM.
- **Dashboard em Tempo Real:** Acompanhamento de quantos leads foram validados e status de cada node.
- **Logs de Sistema:** Monitoramento em tempo real de toda a atividade do motor de busca.

---

## 🧬 Tecnologias Utilizadas
- **Frontend:** React + TypeScript.
- **Estilização:** Tailwind CSS (UI Futurista/Dark Mode).
- **Core AI:** Google Gemini API (@google/genai).
- **Ícones:** Font Awesome 6.

---

## 🛡 Segurança e Qualidade
A ferramenta possui um filtro de integridade no `geminiService.ts` que descarta automaticamente qualquer lead que tenha score de integridade abaixo de 85%, garantindo que você gaste tempo apenas com contatos que realmente possuem WhatsApp ativo.

---

**© 2024 JBNEXO Intelligence Engine. Todos os direitos reservados para brunxsousa.**

# Prompt para Claude Code — App de Agendamento Multi-Nicho

Copie e cole o texto abaixo no Claude Code para iniciar o projeto.

---

## PROMPT

Quero construir um SaaS de agendamento online (tipo Calendly), mas com suporte a **múltiplos nichos de profissionais autônomos** (psicólogos, personal trainers, cabeleireiros, etc.), onde cada profissional define seus próprios tipos de atendimento com duração, regras e campos customizados diferentes.

### Objetivo do projeto

Criar uma plataforma onde:

1. Um profissional se cadastra e configura sua agenda
2. Ele cria "tipos de serviço" (ex: "Primeira consulta", "Sessão de retorno"), cada um com duração própria, descrição, e se exige ou não um formulário extra antes da confirmação
3. Ele define disponibilidade geral (dias/horários) e pode ter regras de disponibilidade específicas por tipo de serviço
4. Gera um link público único (ex: `/profissional-nome`)
5. Um cliente acessa esse link, escolhe o tipo de serviço, vê apenas os horários realmente livres (calculados dinamicamente considerando a duração do serviço escolhido), preenche o formulário customizado se houver, e confirma o agendamento
6. Ambas as partes recebem confirmação por e-mail

### Stack técnica desejada

- Frontend: React (Vite) + TailwindCSS
- Backend: Node.js com Express (ou Next.js API routes, se preferir monolito)
- Banco de dados: PostgreSQL
- ORM: Prisma
- Autenticação: JWT ou solução simples de sessão (não precisa OAuth social por enquanto)
- Envio de e-mail: usar um serviço simples (Resend ou Nodemailer com SMTP de teste)

Sinta-se livre para sugerir ajustes nessa stack se enxergar algo mais adequado, mas mantenha simplicidade de deploy (idealmente gratuito em Vercel/Railway/Render).

### Modelagem de dados (ponto de partida — pode refinar)

- **User** (profissional): id, nome, email, senha, slug (usado na URL pública), fuso horário
- **ServiceType** (tipo de serviço): id, userId, nome, duração (minutos), descrição, requiresCustomForm (boolean)
- **CustomFormField** (campo customizado do formulário): id, serviceTypeId, label, tipo (texto, número, seleção, textarea), obrigatório (boolean), ordem
- **Availability** (disponibilidade geral do profissional): id, userId, diaDaSemana, horaInicio, horaFim
- **ServiceTypeAvailabilityRule** (regra específica por tipo de serviço, opcional — sobrescreve ou restringe a disponibilidade geral): id, serviceTypeId, diaDaSemana, horaInicio, horaFim
- **Booking** (agendamento confirmado): id, serviceTypeId, clienteNome, clienteEmail, dataHoraInicio, dataHoraFim, status (confirmado/cancelado), respostasFormulario (JSON, guarda as respostas dos campos customizados)
- **BlockedSlot** (bloqueios manuais, ex: feriado, compromisso pessoal): id, userId, data, horaInicio, horaFim, motivo

### Regras de negócio importantes

1. **Cálculo dinâmico de horários livres**: dado um `serviceTypeId`, o sistema deve calcular os slots disponíveis considerando a duração daquele serviço específico, a disponibilidade geral do profissional, as regras específicas daquele tipo de serviço (se existirem), os agendamentos já confirmados, e os bloqueios manuais. Dois tipos de serviço com durações diferentes vão gerar grades de horários diferentes no mesmo dia.
2. **Sem sobreposição**: nunca permitir dois agendamentos que se sobrepõem no tempo para o mesmo profissional, mesmo que sejam de tipos de serviço diferentes.
3. **Formulário dinâmico**: os campos customizados de cada tipo de serviço devem ser renderizados dinamicamente no frontend a partir dos dados salvos no banco (não hardcodar campos no código).
4. **Concorrência**: se dois clientes tentarem agendar o mesmo horário ao mesmo tempo, apenas um deve conseguir confirmar (tratar isso com transação/lock no banco).

### Fluxos a implementar

**Painel do profissional (autenticado):**

- Login/cadastro
- CRUD de tipos de serviço (incluindo os campos customizados de cada um)
- Configuração de disponibilidade geral (dias e horários)
- Configuração de regras específicas de disponibilidade por tipo de serviço (opcional, avançado)
- Visualização de agenda (lista ou calendário dos agendamentos confirmados)
- Bloquear horários manualmente
- Cancelar um agendamento

**Página pública de agendamento (sem login):**

- Acessar via slug do profissional
- Escolher tipo de serviço
- Ver calendário/lista de horários disponíveis para aquele serviço
- Preencher formulário customizado (se aplicável) + dados básicos (nome, email)
- Confirmar agendamento
- Receber confirmação por e-mail

### Casos de demonstração (seed de dados)

Ao final, popule o banco com dois profissionais de exemplo para demonstrar a flexibilidade da plataforma:

1. **Psicólogo** — tipos de serviço: "Primeira consulta" (60min, com formulário de anamnese: campos como "queixa principal", "já fez terapia antes?", "está em uso de medicação?"), "Sessão de retorno" (50min, sem formulário extra)
2. **Personal trainer** — tipos de serviço: "Avaliação física" (90min, com formulário: "objetivo", "lesões ou restrições", "nível de atividade atual"), "Treino" (60min, sem formulário extra)

### Entregáveis esperados

1. Estrutura de projeto organizada (backend e frontend separados ou monolito, como preferir)
2. Migrations do banco de dados (Prisma)
3. Seed com os dois profissionais de exemplo
4. README completo explicando: o que o projeto faz, como rodar localmente, variáveis de ambiente necessárias, e um resumo da arquitetura (especialmente a lógica de cálculo de horários disponíveis)
5. Deploy funcional (ou instruções claras de como fazer o deploy em Vercel + Railway/Supabase)

### Como quero trabalhar

Vamos construir isso de forma incremental. Comece propondo a estrutura de pastas e o schema do Prisma para eu validar antes de gerar o código. Depois disso, seguimos para autenticação, depois CRUD de tipos de serviço, depois a lógica de cálculo de disponibilidade (a parte mais crítica), e por último a página pública de agendamento e envio de e-mail.

**Sobre estilização:** não estilize as telas ainda com estilo genérico. Existe um `DESIGN.md` que será gerado separadamente (combinando referências de design). Assim que ele existir na raiz do projeto, use-o como fonte de verdade para cores, tipografia e componentes visuais. Até lá, foque em estrutura e funcionalidade, com Tailwind apenas no essencial (layout, espaçamento básico), sem definir uma identidade visual final.

---

**Dica de uso:** cole esse prompt inteiro na primeira mensagem do Claude Code. Se ele responder com perguntas de esclarecimento, responda antes de deixá-lo gerar código — isso evita retrabalho.

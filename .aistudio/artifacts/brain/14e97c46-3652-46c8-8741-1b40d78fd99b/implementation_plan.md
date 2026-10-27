# MotoristaPro — Reorganização Visual e Calendário Multi-Visão

Reorganização visual e ergonômica da interface do MotoristaPro para desktop e dispositivos móveis, consolidando uma tela principal limpa com os quatro cards essenciais, navegação rápida padronizada, menu lateral para funcionalidades secundárias e calendário com alternância entre visualizações por Dia, Semana e Mês.

---

## Revisão do Usuário e Decisões Críticas

> [!IMPORTANT]
> **Garantia de Regras de Negócio e Persistência:**
> Nenhuma fórmula financeira, regra de vencimento, lógica de dias de trabalho/folga ou arquivo de cálculo (`src/utils/calculator.ts`) será alterado. Toda a implementação é estritamente visual e de roteamento de componentes, reutilizando os dados reais já calculados pelo sistema e a sincronização com o Supabase.

- **Topo do Dashboard Limpo**: A área superior mantém exclusivamente a identidade visual do app e o indicador de status de sincronização com a nuvem (`synced`, `saving`, `error`, `local_only`). As informações secundárias e botões utilitários são realocados para o menu lateral.
- **Quatro Cards Principais no Topo**:
  1. *Dias de trabalho*: Total de dias úteis/trabalhados no mês corrente.
  2. *Dias de folga*: Total de folgas programadas/ajustadas no mês corrente.
  3. *Meta de hoje*: Valor diário calculado para hoje (ou indicação de "Folga").
  4. *Total de contas*: Somatório total das contas cadastradas (`totalMonthlyBills`).
- **Quatro Acessos Rápidos com Rótulos Padronizados**:
  1. *Calendário e Diárias* (aba `calendar`)
  2. *Fechamento do dia* (aba `closure`)
  3. *Cofre e Metas* (aba `vault`)
  4. *Contas e Folgas* (aba `settings`)
- **Menu Lateral Retrátil (Drawer)**:
  - No celular: Gaveta deslizante lateral com botão hambúrguer (`Menu`), overlay escuro e botão de fechar (`X`).
  - No desktop: Acessível por botão discreto no cabeçalho ou menu lateral expansível.
  - Agrupa: Informações de perfil/e-mail, resumo financeiro detalhado ("Já Reservado"), Exportar/Restaurar Backup, Zerar/Ajustar Mês, Reabrir Assistente e Sair da Conta (Logout).
- **Três Modos de Visualização do Calendário (Dia, Semana, Mês)**:
  - Seletor de visualização segmented no cabeçalho do calendário.
  - *Modo Mês*: Grade completa de 30/31 dias com badges de fechamento e vencimento (padrão no desktop).
  - *Modo Semana*: 7 dias da semana selecionada em cards horizontais legíveis sem rolagem lateral (padrão no celular).
  - *Modo Dia*: Visão focada do dia com metas por conta, status de reserva e botão direto para fechamento.
  - Botão *Hoje* para retorno imediato à data atual em qualquer modo.

---

## 1. Visão Geral e Conceito

O objetivo desta reorganização é transformar o MotoristaPro em uma ferramenta ágil, profissional e sem ruído visual para o motorista de aplicativo, tanto no computador quanto no celular dentro do veículo.

A tela principal passa a priorizar o que o motorista precisa consultar em segundos:
1. Como está a sincronização com a nuvem.
2. A escala de trabalho e a meta do dia atual.
3. Os acessos rápidos às quatro ferramentas essenciais.
4. O calendário com a granularidade ideal para cada momento (mês para planejamento, semana para ritmo de trabalho e dia para execução).

Todas as configurações de conta, restauração de arquivos e ações administrativas saem da área nobre e ficam acessíveis a um toque no menu lateral.

---

## 2. Experiência do Usuário e Design Visual

### Fluxos Principais
1. **Entrada no Dashboard**:
   - O motorista visualiza o cabeçalho limpo com o status da nuvem à direita.
   - Imediatamente abaixo, os 4 cards apresentam a síntese do mês e o objetivo do dia.
   - Uma barra de 4 acessos rápidos permite alternar de forma imediata entre Calendário, Fechamento, Cofre e Contas.
2. **Navegação do Calendário Multi-Visão**:
   - No celular, o calendário inicia na visão **Semana**, facilitando a leitura diária em telas estreitas sem necessidade de rolagem horizontal ou números minúsculos.
   - No desktop, o calendário inicia na visão **Mês** aproveitando o espaço panorâmico.
   - O motorista pode alternar entre **Dia**, **Semana** e **Mês** com um toque no seletor segmentado.
   - Ao tocar em um dia na visão Mês ou Semana, pode ver os detalhes ou saltar para o fechamento.
   - O botão "Hoje" reorienta o foco para o dia atual em qualquer dos modos.
3. **Acesso ao Menu Lateral (Drawer)**:
   - O motorista toca no ícone de menu (três barras) no topo.
   - A gaveta lateral desliza suavemente sobre a tela com fundo semitransparente escuro.
   - Permite gerenciar Backup JSON, zerar o mês, acionar o assistente ou deslogar.

### Linguagem Visual e Tokens de Design
- **Paleta**: Tema escuro profissional (`bg-slate-950` / `bg-slate-900`) com acentos em verde esmeralda (`emerald-500`, `emerald-400`), âmbar para metas diárias (`amber-400`) e ardósia neutra (`slate-800` / `slate-700`) para bordas e contenções.
- **Tipografia**: Tabular figures (`tabular-nums` / `font-mono`) para valores monetários e metas, evitando que números tremam ou desalinhem.
- **Ergonomia Móvel**: Áreas de toque de no mínimo 44x44px nos seletores e acessos rápidos, evitando toques acidentais durante a rotina do motorista.

---

## 3. Decisões de Produto e Trade-Offs

| Decisão | Abordagem Escolhida | Justificativa | Alternativa Descartada |
| :--- | :--- | :--- | :--- |
| **Cabeçalho Superior** | Apenas logo, data e indicador de sincronização da nuvem | Elimina excesso de números no topo e foca na segurança da sincronização | Manter cards de faturamento e contas no topo (causava poluição visual) |
| **Cards Principais** | 4 cards fixos: Dias de Trabalho, Dias de Folga, Meta de Hoje, Total de Contas | Responde exatamente às 4 perguntas diárias do motorista | Cards redundantes com dados já presentes no Cofre |
| **Visão Inicial Calendário** | Semana no mobile, Mês no desktop | Evita que os dias do mês fiquem espremidos no celular | Forçar Mês no celular (células ficavam muito apertadas) |
| **Menu Lateral** | Gaveta deslizante responsiva (Drawer) | Libera a tela principal sem esconder funcionalidades essenciais | Manter botões de backup e reset soltos no meio da página |

---

## 4. Arquitetura Técnica e Estrutura de Componentes

### Diagrama de Componentes e Fluxo de Dados

```
┌────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                 │
│  State: activeTab, bills, schedule, closures, syncStatus, userEmail    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼───────────────────────────┐
       ▼                            ▼                           ▼
┌──────────────┐          ┌───────────────────┐       ┌──────────────────┐
│  Header.tsx  │          │    SidebarMenu    │       │ Main Dashboard   │
│ (Logo + Sync │          │     (Drawer)      │       │ (4 Cards + Quick │
│ Status Pill) │          │(Backup, Reset,    │       │ Access Buttons)  │
└──────────────┘          │ Perfil, Sair)     │       └─────────┬────────┘
                          └───────────────────┘                 │
                                                                ▼
                                                      ┌──────────────────┐
                                                      │CalendarView.tsx  │
                                                      │ Selector:        │
                                                      │ [Dia|Semana|Mês] │
                                                      │ + "Hoje" button  │
                                                      └──────────────────┘
```

### Componentes Envolvidos
1. **`src/components/Header.tsx`**:
   - Simplificação do topo: remoção dos 3 cards estatísticos inline.
   - Manutenção do indicador de nuvem (`synced`, `saving`, `error`, `local_only`).
   - Botão para abrir o menu lateral (tanto no desktop quanto no mobile).
2. **`src/components/SidebarMenu.tsx` (Novo componente reutilizável)**:
   - Drawer deslizante animado com backdrop.
   - Mostra e-mail conectado e status da conta.
   - Ações: Gerenciar Backup, Zerar Mês, Assistente Passo a Passo, Sair da Conta.
   - Resumo secundário: Valor Total Já Reservado no mês.
3. **`src/components/DashboardStats.tsx` ou integrado no topo da visualização**:
   - Grade dos 4 cards principais: Dias de Trabalho, Dias de Folga, Meta de Hoje, Total de Contas.
   - Grid de 4 colunas no desktop (`lg:grid-cols-4`) e 2 colunas no celular (`grid-cols-2`).
4. **`src/components/QuickAccessNav.tsx`**:
   - Barra de 4 acessos rápidos com os nomes exatos solicitados:
     - *Calendário e Diárias*
     - *Fechamento do dia*
     - *Cofre e Metas*
     - *Contas e Folgas*
5. **`src/components/CalendarView.tsx`**:
   - Adição do estado `viewMode: 'day' | 'week' | 'month'`.
   - Adição do seletor visual segmentado no topo do calendário.
   - Implementação das renderizações:
     - `renderMonthView()` (preserva grade atual de 7 colunas e cálculos).
     - `renderWeekView()` (grade semanal focada nos 7 dias da semana da data selecionada).
     - `renderDayView()` (painel detalhado da data com lista de metas e status).
   - Preservação integral de `calculateDaySchedule`, abertura de fechamentos e modal de detalhes.

---

## 5. Plano de Implementação em Fases

1. **Fase 1: Criação do Menu Lateral (`SidebarMenu.tsx`) e Limpeza do `Header.tsx`**
   - Construir o componente `SidebarMenu` com gaveta deslizante, backdrop e suporte a acessibilidade (fechar com clique fora ou tecla Escape).
   - Integrar Perfil, Backup, Reset do Mês, Assistente e Logout no menu lateral.
   - Limpar o `Header.tsx` para exibir unicamente a logo e o indicador de sincronização da nuvem.

2. **Fase 2: Quatro Cards Principais e Barra de 4 Acessos Rápidos**
   - Posicionar os 4 cards essenciais no topo do dashboard com layout responsivo (4 colunas desktop, 2x2 mobile).
   - Posicionar a barra dos 4 botões de acesso rápido com os rótulos exatos requisitados.
   - Conectar os acessos para alternar a visualização ativa (`activeTab`).

3. **Fase 3: Três Modos de Visualização do Calendário (`CalendarView.tsx`)**
   - Implementar o seletor segmentado `[Dia | Semana | Mês]` e o botão "Hoje".
   - Estruturar a visão **Semana** aproveitando a largura total no celular.
   - Estruturar a visão **Dia** com cards detalhados das contas do dia e atalho para fechamento.
   - Preservar a visão **Mês** com navegação mensal original.
   - Configurar o modo inicial responsivo (Semana no mobile, Mês no desktop).

4. **Fase 4: Validação, Compilação e Testes**
   - Executar `compile_applet` e `lint_applet` (`tsc --noEmit`).
   - Validar responsividade e ergonomia em resoluções mobile (375px–430px) e desktop (1440px).
   - Confirmar ausência de toques em `src/utils/calculator.ts` e preservação dos cálculos.

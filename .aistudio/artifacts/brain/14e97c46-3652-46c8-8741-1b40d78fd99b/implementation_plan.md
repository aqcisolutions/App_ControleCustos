# MotoristaPro — Reorganização e Simplificação Visual da Interface

Diagnóstico técnico da estrutura atual e plano de implementação para simplificação da tela principal do MotoristaPro, mantendo os quatro cards essenciais, acessos rápidos padronizados e calendário recolhível com as opções Dia, Semana e Mês.

---

## Revisão do Usuário e Decisões Críticas

> [!IMPORTANT]
> **Garantia de Regras de Negócio e Persistência:**
> Nenhuma fórmula financeira, cálculo de diárias/metas (`src/utils/calculator.ts`), processo de fechamento diário, autenticação ou sincronização com o Supabase será alterado. A tarefa é 100% de organização visual e apresentação de interface.

- **Tela Principal Simplificada**: A tela inicial do painel exibirá unicamente as informações essenciais, sem sobrecarga de elementos ou rolagem vertical desnecessária.
- **Quatro Cards Principais no Topo**:
  1. *Dias de trabalho*: Dias úteis do mês corrente.
  2. *Dias de folga*: Folgas programadas do mês corrente.
  3. *Meta de hoje*: Valor calculado para a diária de hoje (ou indicação de folga).
  4. *Total de contas*: Soma total das despesas cadastradas no mês.
- **Quatro Acessos Rápidos Padronizados**:
  1. *Calendário e Diárias*
  2. *Fechamento do dia*
  3. *Cofre e Metas*
  4. *Contas e Folgas*
- **Calendário Recolhido por Padrão na Tela Inicial**:
  - A tela inicial não exibe a grade completa do calendário de forma imediata.
  - Apresenta um card central elegante com o resumo do dia de hoje e o botão destacado **"Ver Calendário"**.
  - Ao acionar "Ver Calendário", o usuário consulta o calendário completo com o seletor entre **Dia**, **Semana** e **Mês**, podendo recolher a qualquer momento.
- **Funcionalidades Secundárias no Menu Lateral**:
  - As ações "Zerar" e "Ajustar Mês" continuam exclusivamente no menu lateral, com seus respectivos diálogos de confirmação protegidos.
  - Backup/Restauração, perfil conectado e saída da conta permanecem centralizados no menu lateral.

---

## 1. Arquivos e Componentes Atuais Envolvidos

```
┌────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                 │
│  Gerencia estado global (bills, schedule, closures, auth, activeTab)   │
│  Renderiza: Header, 4 Cards, 4 Acessos Rápidos, Card Resumo / Calendário│
└───────────────────┬────────────────────────────────────────────────────┘
                    │
      ┌─────────────┼─────────────────────────────┐
      ▼             ▼                             ▼
┌───────────┐ ┌───────────────┐        ┌───────────────────────┐
│Header.tsx │ │SidebarMenu.tsx│        │  Visão Principal      │
│(Logo, Nuvem│ │(Zerar, Ajustar│        │  - 4 Cards de Métricas│
│e Menu)    │ │Backup, Logout)│        │  - 4 Acessos Rápidos  │
└───────────┘ └───────────────┘        │  - [Ver Calendário]   │
                                       └──────────┬────────────┘
                                                  ▼
                                       ┌───────────────────────┐
                                       │   CalendarView.tsx    │
                                       │  Seletor de modos:    │
                                       │  [Dia | Semana | Mês] │
                                       │  + DayDetailsModal    │
                                       └───────────────────────┘
```

1. **`src/App.tsx`**:
   - Ponto de entrada do painel principal autenticado.
   - Contém a definição e cálculo dos 4 cards principais:
     - `currentMonthWorkDays`
     - `currentMonthRestDays`
     - `todaySchedule.totalDayTarget`
     - `totalMonthlyBills`
   - Contém a barra de navegação com os 4 botões de acesso rápido.
   - Atualmente renderiza o `<CalendarView />` completo imediatamente abaixo dos botões na aba `calendar`.
2. **`src/components/Header.tsx`**:
   - Barra superior com logo, status de sincronização (`synced`, `saving`, `error`, `local_only`) e botão de abertura do menu lateral.
3. **`src/components/SidebarMenu.tsx`**:
   - Drawer deslizante onde estão centralizadas as ações secundárias: Zerar, Ajustar Mês, Backup, Assistente e Logout.
4. **`src/components/CalendarView.tsx`**:
   - Componente que já possui a implementação dos modos **Dia**, **Semana** e **Mês**, navegação mensal/semanal/diária e botão "Hoje".

---

## 2. Diagnóstico do Calendário Atual

- **Modos existentes**: O componente `CalendarView.tsx` já foi construído com suporte a `viewMode: 'day' | 'week' | 'month'`.
  - **Mês**: Exibe a matriz dos 30/31 dias com badges de fechamento e vencimentos de contas.
  - **Semana**: Exibe os 7 dias da semana selecionada em blocos compactos com foco na meta e atalhos rápidos.
  - **Dia**: Exibe o detalhamento completo da data selecionada, contas ativas daquele dia e botão para alternar entre dia de trabalho e folga.
- **Situação a aprimorar**:
  - Atualmente, ao abrir a tela principal, o calendário abre imediatamente expandido na grade de datas, ocupando a maior parte da tela inicial.
  - O objetivo é recolher essa grade por padrão na tela inicial, oferecendo a opção explícita **"Ver Calendário"** que abre a experiência completa de navegação (Dia / Semana / Mês) sem perder nenhum dado.

---

## 3. Alterações Visuais Propostas

1. **Painel Inicial Simplificado (`App.tsx`)**:
   - Exibir no topo os 4 cards principais padronizados (2x2 no mobile, 4 colunas no desktop).
   - Exibir a barra dos 4 acessos rápidos com os rótulos exatos:
     - *Calendário e Diárias*
     - *Fechamento do dia*
     - *Cofre e Metas*
     - *Contas e Folgas*
   - Na aba inicial, quando o calendário estiver recolhido:
     - Exibir um card resumido e focado: **Status de Hoje** (Data, se é dia de trabalho ou folga, meta do dia recomendada e se o fechamento de hoje já foi feito).
     - Botão em destaque visual: **"Ver Calendário Completo"** com ícone intuitivo de expansão.
   - Ao acionar "Ver Calendário" (ou ao tocar no acesso rápido de Calendário):
     - Revela suavemente a área do calendário com os controles **Dia**, **Semana** e **Mês** e a opção de recolher de volta.
2. **Ergonomia e Responsividade**:
   - **Desktop**: Espaçamento horizontal equilibrado, sem elementos esticados em excesso, cards com alinhamento visual proporcional.
   - **Celular**: Cards compactos de fácil leitura, botões com altura mínima de 44px para toque ágil, evitando rolagem vertical excessiva.

---

## 4. Garantia de Preservação dos Dados e Cálculos

- **`src/utils/calculator.ts` intacto**: As fórmulas de amortização de contas, divisão por dias úteis restantes e cálculo de meta diária não serão tocadas.
- **Persistência e Supabase**: As funções em `src/services/dataService.ts` e o estado em `src/App.tsx` não sofrerão alterações lógicas.
- **Fechamento diário**: O fluxo do `DailyClosureView.tsx` e o acúmulo da reserva permanecem exatamente como estão.
- **Ações "Zerar" e "Ajustar Mês"**: Continuam isoladas no menu lateral com seus modais de confirmação já validados.

---

## 5. Riscos e Mitigações

| Risco | Impacto | Mitigação |
| :--- | :--- | :--- |
| Usuário achar que o calendário foi removido | Baixo / Percepção | Botão "Ver Calendário" terá destaque visual claro (ícone de calendário + texto evidente + resumo do dia atual visível). |
| Densidade de informação no celular | Médio / Usabilidade | No mobile, quando o calendário for expandido, priorizar o modo "Semana" por padrão para evitar números minúsculos na grade mensal. |
| Perda de contexto ao selecionar uma data | Baixo | O clique em qualquer data no calendário preserva a abertura do `DayDetailsModal` ou o encaminhamento para o Fechamento do Dia. |

---

## 6. Etapas de Execução

1. **Etapa 1 — Estruturação do Estado de Visualização no `App.tsx`**:
   - Introduzir o controle de visibilidade do calendário na tela principal (modo recolhido com botão "Ver Calendário" vs. modo expandido).
2. **Etapa 2 — Construção do Card Resumo Inicial**:
   - Desenhar o bloco central conciso exibindo a meta de hoje, status de trabalho/folga e o botão em destaque "Ver Calendário".
3. **Etapa 3 — Integração e Refinamento do `CalendarView.tsx`**:
   - Assegurar a transição limpa entre os modos Dia, Semana e Mês e botão de recolhimento.
4. **Etapa 4 — Validação Visual e Compilação**:
   - Executar `compile_applet` e `lint_applet`.
   - Testar o comportamento responsivo em telas desktop e dispositivos móveis.

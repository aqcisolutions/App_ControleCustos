# MotoristaPro — Módulo Diário de Corridas

Planejamento técnico e arquitetural para a implementação do novo módulo **Diário de Corridas** no MotoristaPro, concebido de forma 100% independente do sistema de contas fixas, escala e Cofre.

---

## Revisão do Usuário e Decisões Críticas

> [!IMPORTANT]
> **Garantia de Isolamento Total:**
> O Diário de Corridas não altera nem interfere nas regras atuais do sistema:
> - O `src/utils/calculator.ts` (cálculo de contas e diárias das despesas) **permanece intacto**.
> - O `DailyClosure` (fechamento diário focado no pagamento de contas e reserva do cofre) **permanece separado**.
> - Nenhum cálculo de meta do calendário ou saldo do cofre sofrerá impacto com este novo módulo.

- **Registro Consolidado por Dia:** Um único lançamento diário consolida os períodos trabalhados (manhã, tarde, noite) sem exigir múltiplos turnos.
- **Plataformas Restritas:** Aceita exclusivamente `Uber`, `99` ou `Ambas`.
- **Métricas Sem Falsas Promessas:** O indicador de faturamento bruto menos combustível é chamado estritamente de **"Valor após combustível"**, deixando explícito que não representa lucro líquido real.
- **Tratamento de Exceções Matemáticas:** Divisões por zero, horas zeradas ou corridas não informadas retornam `0` formatado, prevenindo `NaN`, `Infinity` ou layouts quebrados.

---

## 1. Visão Geral e Conceito

O **Diário de Corridas** tem como finalidade oferecer ao motorista de aplicativo uma visão operacional pura sobre o seu desempenho ao volante:
- Quanto gerou por quilômetro rodado e por hora trabalhada.
- Eficiência das corridas (tempo gasto vs. quantidade de viagens).
- Impacto imediato do abastecimento no faturamento bruto do dia.

O módulo atende à rotina real do motorista, permitindo que ele dirija em múltiplos turnos e preencha uma única vez ao chegar em casa, visualizando imediatamente seus indicadores de produtividade.

---

## 2. Estrutura Funcional e Experiência do Usuário

O módulo é composto por 3 áreas complementares:

### Área A — Registrar Dia
Formulário com preenchimento rápido e otimizado para celulares:
1. **Data**: Seletor de data (padrão na data atual `YYYY-MM-DD`).
2. **Plataforma**: Seletor segmentado com três opções exclusivas:
   - `Uber`
   - `99`
   - `Ambas`
3. **Quilômetros rodados**: Input numérico para o total percorrido no dia (ex.: `185.4 km`).
4. **Horas efetivamente dirigidas**: Tempo total ao volante somando os períodos e excluindo pausas. Interface com suporte a horas decimais ou seletor amigável (Horas e Minutos, ex.: `8h 30m` = `8.5h`).
5. **Total de corridas**: Quantidade total de passageiros/corridas atendidas (ex.: `16 corridas`).
6. **Faturamento bruto**: Valor total ganho somando as plataformas (ex.: `R$ 420,00`).
7. **Gasto com combustível**: Valor total abastecido no dia (ex.: `R$ 110,00`).
8. **Ações do formulário**:
   - Botão **"Salvar Registro do Dia"** (ou **"Atualizar Registro"** caso já exista lançamento na data).
   - Botão para limpar campos.

### Área B — Desempenho
Cálculo automático e exibição imediata das 6 métricas operacionais:

| Métrica | Fórmula de Cálculo | Tratamento de Divisão por Zero |
| :--- | :--- | :--- |
| **1. Ganhos brutos por hora** | `faturamentoBruto / horasDirigidas` | Se `horasDirigidas <= 0`, exibe `R$ 0,00/h` |
| **2. Valor médio por corrida** | `faturamentoBruto / totalCorridas` | Se `totalCorridas <= 0`, exibe `R$ 0,00/corrida` |
| **3. Faturamento por quilômetro** | `faturamentoBruto / kmRodados` | Se `kmRodados <= 0`, exibe `R$ 0,00/km` |
| **4. Corridas por hora** | `totalCorridas / horasDirigidas` | Se `horasDirigidas <= 0`, exibe `0,0 corridas/h` |
| **5. Valor após combustível** | `faturamentoBruto - gastoCombustivel` | Não há divisão; subtrai diretamente |
| **6. Gasto com combustível por km** | `gastoCombustivel / kmRodados` | Se `kmRodados <= 0`, exibe `R$ 0,00/km` |

> [!NOTE]
> Todos os cards de desempenho terão rótulos claros e legendas contextuais explicando a métrica (ex.: *"Representa o faturamento bruto menos o gasto informado com combustível, sem descontar manutenção, pneus ou depreciação"*).

### Área C — Histórico e Consulta
Painel histórico com filtros e ações de gestão:
- **Filtro por Período / Mês**: Seletor de mês/ano para analisar o histórico consolidado.
- **Card de Resumo do Período**: Total de km rodados, total de horas dirigidas, total faturado e média geral de R$/hora do mês.
- **Lista de Dias Registrados**:
  - Cards ordenados cronologicamente (do mais recente para o mais antigo).
  - Indicador da plataforma utilizada (`Uber`, `99` ou `Ambas`).
  - Resumo das métricas calculadas daquele dia.
  - Botão **Editar**: Carrega os dados no formulário para correção.
  - Botão **Excluir**: Modal de confirmação antes de remover o registro.
- **Filtro / Busca por Data Específica**: Localização imediata de um dia pesquisado.

---

## 3. Arquitetura Técnica e Modelo de Dados

### Modelo TypeScript (`src/types/index.ts`)
```ts
export type RidePlatform = 'uber' | '99' | 'ambas';

export interface RideLogEntry {
  id: string;
  date: string; // 'YYYY-MM-DD' (único por dia)
  platform: RidePlatform;
  kmDriven: number;
  hoursDriven: number; // Armazenado em formato decimal de horas (ex: 7.5 = 7h30)
  totalRides: number;
  grossEarnings: number;
  fuelExpenses: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RidePerformanceMetrics {
  grossPerHour: number;
  averagePerRide: number;
  grossPerKm: number;
  ridesPerHour: number;
  valueAfterFuel: number;
  fuelCostPerKm: number;
}
```

### Funções de Cálculo Seguras (`src/utils/rideCalculator.ts`)
Novo arquivo utilitário dedicado exclusivamente a este módulo para não poluir `calculator.ts`:
```ts
export function calculateRideMetrics(
  entry: Pick<RideLogEntry, 'grossEarnings' | 'fuelExpenses' | 'hoursDriven' | 'kmDriven' | 'totalRides'>
): RidePerformanceMetrics {
  const { grossEarnings = 0, fuelExpenses = 0, hoursDriven = 0, kmDriven = 0, totalRides = 0 } = entry;

  return {
    grossPerHour: hoursDriven > 0 ? grossEarnings / hoursDriven : 0,
    averagePerRide: totalRides > 0 ? grossEarnings / totalRides : 0,
    grossPerKm: kmDriven > 0 ? grossEarnings / kmDriven : 0,
    ridesPerHour: hoursDriven > 0 ? totalRides / hoursDriven : 0,
    valueAfterFuel: grossEarnings - fuelExpenses,
    fuelCostPerKm: kmDriven > 0 ? fuelExpenses / kmDriven : 0,
  };
}
```

### Estrutura de Componentes
```
┌────────────────────────────────────────────────────────┐
│                        App.tsx                         │
│  State: activeTab === 'rides'                          │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐
│     SidebarMenu       │        │     RidesDiaryView    │
│ Opção: Diário de      │        │ - Sub-aba: Registro   │
│ Corridas              │        │ - Sub-aba: Desempenho │
└───────────────────────┘        │ - Sub-aba: Histórico  │
                                 └───────────────────────┘
```

1. **`src/components/RidesDiaryView.tsx`**: Componente principal do módulo, contendo:
   - Alternador de abas internas: `Registrar Dia`, `Desempenho` e `Histórico`.
   - Formulário de lançamento com feedback visual imediato.
   - Grade de cartões de métricas responsiva.
   - Lista histórica com paginação/scroll e busca por data.
2. **`src/utils/rideStorage.ts`**:
   - Chave `motoristapro_rides_v1` em `localStorage`.
   - Métodos seguros `loadRideLogs()`, `saveRideLog()`, `deleteRideLog()`.
3. **`src/components/SidebarMenu.tsx`**:
   - Novo item de menu "Diário de Corridas" com ícone representativo (`Gauge` ou `Route`), permitindo acesso direto sem sobrecarregar a barra principal de 4 botões.

---

## 4. Plano de Implementação em Etapas Seguras

1. **Etapa 1: Definição de Tipos e Funções de Cálculo**
   - Adicionar as interfaces `RideLogEntry` e `RidePerformanceMetrics` em `src/types/index.ts`.
   - Criar `src/utils/rideCalculator.ts` com validação matemática estrita e proteção contra `NaN` e divisão por zero.
2. **Etapa 2: Módulo de Armazenamento Local (`rideStorage.ts`)**
   - Implementar funções de carregar, salvar e deletar registros de corridas com tratamento de erros.
3. **Etapa 3: Construção do Componente `RidesDiaryView.tsx`**
   - Construir o formulário de lançamento consolidado do dia.
   - Implementar os cards das 6 métricas de desempenho.
   - Implementar a tabela/lista de histórico com suporte a filtro de período, busca por data e edição.
4. **Etapa 4: Integração de Navegação**
   - Adicionar o atalho no menu lateral (`SidebarMenu.tsx`).
   - Adicionar a rota/aba correspondente no `src/App.tsx`.
5. **Etapa 5: Validação, Compilação e Lint**
   - Executar `compile_applet` e `lint_applet` (`tsc --noEmit`).
   - Confirmar responsividade tanto no desktop quanto no smartphone.

import React, { useState } from 'react';
import { Plus, Trash2, ArrowRight, ArrowLeft, Check, Calendar, DollarSign, Car, Sparkles, HelpCircle } from 'lucide-react';
import { Bill, WorkSchedule, BillCategory } from '../types';
import { formatCurrency, WEEKDAYS_BR, generateUUID } from '../utils/formatters';

interface SetupWizardProps {
  initialBills: Bill[];
  initialSchedule: WorkSchedule;
  onFinish: (bills: Bill[], schedule: WorkSchedule) => void;
  onCancel?: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  initialBills,
  initialSchedule,
  onFinish,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [schedule, setSchedule] = useState<WorkSchedule>(initialSchedule);

  // Form fields for Step 1
  const [desc, setDesc] = useState('');
  const [val, setVal] = useState('');
  const [due, setDue] = useState('10');
  const [initialAcc, setInitialAcc] = useState('');
  const [isRecurring, setIsRecurring] = useState<boolean>(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [cat, setCat] = useState<BillCategory>('carro');

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(val.replace(',', '.'));
    const dueDay = parseInt(due, 10);
    const parsedAcc = parseFloat(initialAcc.replace(',', '.')) || 0;

    if (!desc.trim() || isNaN(amount) || amount <= 0) return;

    const newBill: Bill = {
      id: generateUUID(),
      description: desc.trim(),
      amount,
      dueDay: Math.min(31, Math.max(1, isNaN(dueDay) ? 1 : dueDay)),
      isRecurring,
      initialAccumulated: parsedAcc > 0 ? parsedAcc : undefined,
      startDate: startDate.trim() || new Date().toISOString().slice(0, 10),
      category: cat,
      createdAt: new Date().toISOString(),
    };

    setBills([...bills, newBill]);
    setDesc('');
    setVal('');
    setDue('10');
    setInitialAcc('');
    setIsRecurring(true);
    setStartDate(new Date().toISOString().slice(0, 10));
  };

  const handleRemoveBill = (id: string) => {
    setBills(bills.filter((b) => b.id !== id));
  };

  const handleToggleOffDay = (weekdayId: number) => {
    const isOff = schedule.offWeekdays.includes(weekdayId);
    let newOff: number[];
    if (isOff) {
      newOff = schedule.offWeekdays.filter((id) => id !== weekdayId);
    } else {
      newOff = [...schedule.offWeekdays, weekdayId];
    }
    setSchedule({ ...schedule, offWeekdays: newOff });
  };

  const handleApplyUserExample = () => {
    // Aluguel 1680.00 dia 10 com acumulado 1200, Luz 350.00 dia 20 com acumulado 100, Agua 150.00 dia 25
    const today = new Date().toISOString().slice(0, 10);
    setBills([
      {
        id: 'bill-1',
        description: 'Aluguel',
        amount: 1680.00,
        dueDay: 10,
        initialAccumulated: 1200.00,
        startDate: today,
        category: 'moradia',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bill-2',
        description: 'Luz',
        amount: 350.00,
        dueDay: 20,
        initialAccumulated: 100.00,
        startDate: today,
        category: 'utilidades',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bill-3',
        description: 'Agua',
        amount: 150.00,
        dueDay: 25,
        initialAccumulated: 0,
        startDate: today,
        category: 'utilidades',
        createdAt: new Date().toISOString(),
      },
    ]);
    // Quarta (3), Sábado (6), Domingo (0)
    setSchedule({
      ...schedule,
      offWeekdays: [0, 3, 6],
    });
  };

  const totalWeeklyWorkDays = 7 - schedule.offWeekdays.length;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Step Indicator Header */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-100">
                  Assistente de Configuração
                </h2>
                <span className="text-xs text-slate-400">
                  Defina suas contas e folgas para calcular a reserva diária
                </span>
              </div>
            </div>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-slate-400 hover:text-white"
              >
                Voltar
              </button>
            )}
          </div>

          {/* Stepper bar */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div
              className={`h-2 rounded-full transition-all ${
                step >= 1 ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            />
            <div
              className={`h-2 rounded-full transition-all ${
                step >= 2 ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            />
          </div>
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
            <span className={step === 1 ? 'text-emerald-400' : ''}>Passo 1: Inserir Contas</span>
            <span className={step === 2 ? 'text-emerald-400' : ''}>Passo 2: Dias de Folga</span>
          </div>
        </div>

        {/* STEP 1: CADASTRO DE CONTAS */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60">
              <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center justify-between">
                <span>Cadastrar Nova Conta</span>
                <button
                  type="button"
                  onClick={handleApplyUserExample}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Carregar Exemplo (Aluguel, Luz, Água)
                </button>
              </h3>

              <form onSubmit={handleAddBill} className="space-y-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Descrição da Conta
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Aluguel"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="1680.00"
                      value={val}
                      onChange={(e) => setVal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Dia Vencimento
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="12"
                      value={due}
                      onChange={(e) => setDue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Initial accumulated value for mid-month onboarding */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                    Valor Já Guardado neste Mês (R$) · Opcional
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00 (deixe vazio se ainda não guardou nada)"
                    value={initialAcc}
                    onChange={(e) => setInitialAcc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-emerald-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Como o mês já começou, informe quanto você já tem guardado para esta conta para que o cálculo comece certo.
                  </span>
                </div>

                {/* Data do Lançamento da Conta */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Data do Lançamento da Conta
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Data em que a conta foi informada. O 1º ciclo calculará desta data até o vencimento (dia {due || '10'}).
                  </span>
                </div>

                {/* Essa conta se repete? */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Essa conta se repete todos os meses?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRecurring(true)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                        isRecurring
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span>🔁 Sim (Recorrente todo mês)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsRecurring(false)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                        !isRecurring
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span>📄 Não (Conta única / avulsa)</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-850 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    {isRecurring ? (
                      <span>
                        🔁 <strong>Recorrente:</strong> Do lançamento ({startDate}) até o vencimento ({due}), divide o que sobra após descontar o que já tem guardado. A partir do <strong>dia seguinte ao vencimento</strong> até o próximo vencimento, o sistema pega o <strong>valor total da conta</strong> e divide pelos próximos dias trabalhados!
                      </span>
                    ) : (
                      <span>
                        📄 <strong>Única:</strong> Divide o valor menos o saldo acumulado do dia {startDate} até o vencimento (dia {due}) nos dias trabalhados. A conta encerra no vencimento.
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Conta à Lista</span>
                  </button>
                </div>
              </form>
            </div>

            {/* List of current bills */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                <span>Contas Inseridas ({bills.length})</span>
                <span className="text-emerald-400">
                  Total: {formatCurrency(bills.reduce((s, b) => s + b.amount, 0))}
                </span>
              </div>

              {bills.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-800/30 border border-dashed border-slate-700 text-slate-400 text-xs">
                  Nenhuma conta inserida ainda. Adicione pelo menos uma conta acima para avançar.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {bills.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-100 text-sm">{b.description}</span>
                        <div className="text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span>Vencimento todo dia <strong className="text-slate-300">{b.dueDay}</strong></span>
                          {b.isRecurring === false ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                              Conta Única (Início: {b.startDate})
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                              Recorrente Mensal
                            </span>
                          )}
                          {b.initialAccumulated && b.initialAccumulated > 0 ? (
                            <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                              Já guardado: {formatCurrency(b.initialAccumulated)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-emerald-400">
                          {formatCurrency(b.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBill(b.id)}
                          className="p-1 text-rose-400 hover:text-rose-200"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Next button */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                disabled={bills.length === 0}
                onClick={() => setStep(2)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all ${
                  bills.length > 0
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Próximo: Escolher Dias de Folga</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DIAS QUE NÃO IRÁ TRABALHAR */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Quais dias da semana você NÃO irá trabalhar?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Marque os dias de folga (exemplo: quarta-feira, sábado e domingo). O sistema irá calcular a reserva diária considerando exclusivamente os dias de trabalho.
              </p>
            </div>

            {/* Weekdays Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {WEEKDAYS_BR.map((wd) => {
                const isOff = schedule.offWeekdays.includes(wd.id);

                return (
                  <button
                    key={wd.id}
                    type="button"
                    onClick={() => handleToggleOffDay(wd.id)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      isOff
                        ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                        : 'bg-emerald-950/40 border-emerald-600/70 text-emerald-300 shadow-sm'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider block">
                      {wd.short}
                    </span>
                    <span className="text-[11px] font-semibold">
                      {isOff ? '😴 Folga' : '💼 Trabalha'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Weekly summary */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">
                Sua escala semanal configurada:
              </span>
              <span className="text-emerald-400 font-bold text-sm">
                {totalWeeklyWorkDays} dias de trabalho / {schedule.offWeekdays.length} folgas
              </span>
            </div>

            {/* Quick preset as user requested */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSchedule({ ...schedule, offWeekdays: [0, 3, 6] })}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline-offset-4 hover:underline"
              >
                + Aplicar exemplo: Folga Quarta-feira, Sábado e Domingo
              </button>
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Contas</span>
              </button>

              <button
                type="button"
                onClick={() => onFinish(bills, schedule)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all"
              >
                <span>Concluir e Ver Calendário</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

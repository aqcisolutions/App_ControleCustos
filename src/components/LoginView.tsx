import React, { useState } from 'react';
import {
  Car,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Smartphone,
  Laptop,
  Check,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { extractErrorMessage } from '../services/dataService';

interface LoginViewProps {
  onLoginSuccess?: (email: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!configured || !supabase) {
      setErrorMsg(
        'O Supabase ainda não está configurado. Verifique as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.'
      );
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMsg('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    // Forgot password flow
    if (mode === 'forgot') {
      try {
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setSuccessMsg('Link de redefinição de senha enviado para seu e-mail! Verifique sua caixa de entrada.');
      } catch (err: unknown) {
        setErrorMsg(extractErrorMessage(err, 'Falha ao solicitar redefinição de senha.'));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    try {
      setLoading(true);

      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.user) {
          onLoginSuccess?.(data.user.email || email.trim());
        }
      } else {
        // Signup flow
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session && data.user) {
          onLoginSuccess?.(data.user.email || email.trim());
        } else {
          setSuccessMsg(
            'Cadastro realizado! Se o projeto exigir confirmação de e-mail, verifique sua caixa de entrada antes de entrar.'
          );
          setMode('login');
        }
      }
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err, 'Erro ao processar autenticação.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Background ambient decorative light */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-950/60 text-white mb-3 ring-1 ring-emerald-400/20">
            <Car className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">MotoristaPro</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Pessoal
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Controle de Custos & Metas Diárias com Sincronização em Tempo Real
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />

          {/* Title based on current mode */}
          <div className="mb-5">
            <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">Acesso Seguro</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              {mode === 'login' && 'Entrar na sua Conta'}
              {mode === 'signup' && 'Criar Nova Conta'}
              {mode === 'forgot' && 'Recuperar Senha'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'login' && 'Informe suas credenciais para acessar seus dados sincronizados'}
              {mode === 'signup' && 'Cadastre-se para sincronizar seus fechamentos no celular e PC'}
              {mode === 'forgot' && 'Digite seu e-mail cadastrado para receber o link de redefinição'}
            </p>
          </div>

          {/* Configuration warning if Supabase keys missing */}
          {!configured && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção:</strong> As variáveis de ambiente do Supabase não foram detectadas.
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !configured}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer mt-2"
            >
              {loading ? (
                <span className="inline-block animate-spin w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" />
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar no MotoristaPro</span>
                </>
              ) : mode === 'signup' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrar Conta</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Enviar Link de Recuperação</span>
                </>
              )}
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col gap-2.5 text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="hover:text-emerald-400 text-slate-300 transition-colors cursor-pointer"
                >
                  Não tem conta? <strong className="text-emerald-400">Cadastre-se gratuitamente</strong>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Esqueceu sua senha?
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="hover:text-emerald-400 text-slate-300 transition-colors cursor-pointer"
              >
                Já possui conta cadastrada? <strong className="text-emerald-400">Fazer login</strong>
              </button>
            )}
          </div>
        </div>

        {/* Feature Badges Footer */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-center gap-2 text-xs text-slate-300">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Celular & Computador</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Privacidade Isolada RLS</span>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          MotoristaPro — Versão Pessoal com Sincronização Online
        </p>
      </div>
    </div>
  );
};

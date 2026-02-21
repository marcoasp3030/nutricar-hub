import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-nutricar.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader } from "@/components/ui/card";
import { Lock, Mail, User, Building2, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatCnpj = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.replace(/^(\d{0,2})/, '($1');
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [financialEmail, setFinancialEmail] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("login");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
        setLoginAttempts(0);
      } else {
        setLockCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const lookupCnpj = async (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 14) return;
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (res.ok) {
        const data = await res.json();
        const razao = data.razao_social || data.nome_fantasia || '';
        if (razao) {
          setFullName(razao);
          toast.success(`Razão social: ${razao}`);
        }
      } else {
        toast.error("CNPJ não encontrado");
      }
    } catch {
      toast.error("Erro ao consultar CNPJ");
    } finally {
      setCnpjLoading(false);
    }
  };

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast.error(`Muitas tentativas. Aguarde ${lockCountdown}s para tentar novamente.`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockedUntil(lockTime);
        toast.error(`Conta bloqueada temporariamente. Tente novamente em ${LOCKOUT_SECONDS} segundos.`);
      } else {
        toast.error(`Credenciais inválidas. ${MAX_ATTEMPTS - newAttempts} tentativa(s) restante(s).`);
      }
    } else {
      setLoginAttempts(0);
      setLockedUntil(null);
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, cnpj: cnpj.replace(/\D/g, '') || null, phone: phone || null, financial_email: financialEmail || null } },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Aguarde a aprovação do administrador para acessar o portal.");
      setTab("login");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={logo} alt="Nutricar Brasil" className="h-14 object-contain" />
          <p className="text-sm text-muted-foreground">Portal do Fornecedor</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2 pt-6">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="login-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  {isLocked && (
                    <p className="text-sm text-destructive text-center font-medium">
                      Bloqueado por {lockCountdown}s — muitas tentativas falhas
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={loading || isLocked}>
                    {isLocked ? `Aguarde ${lockCountdown}s` : loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-cnpj">CNPJ</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-cnpj"
                        placeholder="00.000.000/0000-00"
                        value={cnpj}
                        onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                        onBlur={() => lookupCnpj(cnpj)}
                        className="pl-10"
                        maxLength={18}
                      />
                      {cnpjLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Ao preencher, a razão social será buscada automaticamente.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome / Razão Social</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="signup-name" placeholder="Seu nome ou razão social" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefone para contato</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="signup-phone" type="tel" placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className="pl-10" required maxLength={15} />
                    </div>
                    <p className="text-xs text-muted-foreground">Celular ou fixo</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-financial-email">E-mail financeiro <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="signup-financial-email" type="email" placeholder="financeiro@empresa.com" value={financialEmail} onChange={(e) => setFinancialEmail(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="signup-password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Criando..." : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Nutricar Brasil. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

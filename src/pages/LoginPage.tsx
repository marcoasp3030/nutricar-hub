import { useState } from "react";
import logo from "@/assets/logo-nutricar.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Lock, Mail } from "lucide-react";

interface LoginPageProps {
  onLogin: (email: string, role: "fornecedor" | "admin") => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock login - will be replaced with real auth
    setTimeout(() => {
      const role = email.includes("admin") ? "admin" : "fornecedor";
      onLogin(email, role);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={logo} alt="Nutricar Brasil" className="h-14 object-contain" />
          <p className="text-sm text-muted-foreground">Portal do Fornecedor</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4 pt-6 text-center">
            <h1 className="text-xl font-semibold text-foreground">Entrar</h1>
            <p className="text-sm text-muted-foreground">
              Acesse sua conta para ver produtos e movimentações
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Esqueceu sua senha? Contate o administrador.
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Nutricar Brasil. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

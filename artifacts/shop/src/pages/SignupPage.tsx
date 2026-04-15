import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendOtp, verifyOtp } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Stage = "form" | "otp";

export function SignupPage() {
  const [, setLocation] = useLocation();
  const { signUp } = useAuth();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast({ variant: "destructive", title: "Please enter your name." }); return; }
    if (!email.trim()) { toast({ variant: "destructive", title: "Please enter your email." }); return; }
    if (password.length < 6) { toast({ variant: "destructive", title: "Password must be at least 6 characters." }); return; }

    setLoading(true);
    try {
      await sendOtp(email.trim());
      setStage("otp");
      toast({ title: "Code sent!", description: `Check your inbox at ${email}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not send code", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndCreate = async () => {
    if (otp.length !== 6) { toast({ variant: "destructive", title: "Please enter the 6-digit code." }); return; }

    setLoading(true);
    try {
      await verifyOtp(email.trim(), otp);
      await signUp(email.trim(), password, name.trim());
      toast({ title: "Account created!", description: "Welcome to Advize Store." });
      setLocation("/onboarding");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Verification failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await sendOtp(email.trim());
      setOtp("");
      toast({ title: "New code sent!", description: "Check your inbox." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not resend", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
          <p className="text-muted-foreground mt-1 text-sm">Start selling in minutes</p>
        </div>

        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-5">
          {stage === "form" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Priya Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-11 rounded-xl"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 rounded-xl"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 rounded-xl pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send verification code
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground">Enter the 6-digit code</p>
                <p className="text-sm text-muted-foreground">Sent to <span className="font-medium">{email}</span></p>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full h-11 rounded-xl"
                onClick={handleVerifyAndCreate}
                disabled={loading || otp.length !== 6}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify & Create Account
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => { setStage("form"); setOtp(""); }}
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={handleResend}
                  disabled={loading}
                >
                  Resend code
                </button>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground pt-2">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
